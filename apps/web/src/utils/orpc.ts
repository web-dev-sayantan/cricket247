import type { AppRouterClient } from "@cricket247/server/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DEFAULT_QUERY_RETRY_LIMIT = 3;

interface RateLimitedErrorShape {
  data?: {
    retryAfter?: number;
  };
  status?: number;
}

function isRateLimitedError(
  error: unknown
): error is Error & RateLimitedErrorShape {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status === 429
  );
}

export function getRateLimitedRetryAfter(error: unknown) {
  if (!isRateLimitedError(error)) {
    return undefined;
  }

  const retryAfter = error.data?.retryAfter;
  return typeof retryAfter === "number" ? retryAfter : undefined;
}

export function getOrpcErrorToastMessage(error: unknown) {
  if (isRateLimitedError(error)) {
    const retryAfter = getRateLimitedRetryAfter(error);

    if (typeof retryAfter === "number" && retryAfter > 0) {
      return `Rate limit exceeded. Try again in ${retryAfter}s.`;
    }

    return "Rate limit exceeded. Try again soon.";
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return "Error: Request failed";
}

export function shouldRetryOrpcRequest(failureCount: number, error: unknown) {
  if (isRateLimitedError(error)) {
    return false;
  }

  return failureCount < DEFAULT_QUERY_RETRY_LIMIT;
}

function handleOrpcError(error: Error) {
  toast.error(getOrpcErrorToastMessage(error), {
    action: {
      label: "retry",
      onClick: () => {
        queryClient.invalidateQueries();
      },
    },
  });
}

function resolveRpcUrl() {
  if (typeof window === "undefined") {
    return "/rpc";
  }

  try {
    return new URL("/rpc", window.location.href).toString();
  } catch {
    return "http://localhost/rpc";
  }
}

const rpcUrl = resolveRpcUrl();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryOrpcRequest,
    },
  },
  mutationCache: new MutationCache({
    onError: handleOrpcError,
  }),
  queryCache: new QueryCache({
    onError: handleOrpcError,
  }),
});

export const link = new RPCLink({
  url: rpcUrl,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
