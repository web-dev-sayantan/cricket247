import type { Context as HonoContext } from "hono";
import { auth } from "./auth";
import { getClientIp, type RateLimiterNamespaceLike } from "./rate-limit";

export interface CreateContextOptions {
  context: HonoContext;
}

export async function createContext({ context }: CreateContextOptions) {
  const headers = context.req.raw.headers;
  const session = await auth.api.getSession({
    headers,
  });
  const runtimeContext = context as HonoContext & {
    env?: {
      RATE_LIMITER?: RateLimiterNamespaceLike;
    };
  };

  return {
    clientIp: getClientIp(headers),
    headers,
    rateLimiter: runtimeContext.env?.RATE_LIMITER,
    resHeaders: undefined as Headers | undefined,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
