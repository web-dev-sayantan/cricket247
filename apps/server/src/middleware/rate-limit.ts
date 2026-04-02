import type { Context, Next } from "hono";
import { auth } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  getRateLimitHeaders,
  getRateLimitPrincipalKey,
  type RateLimiterNamespaceLike,
} from "@/lib/rate-limit";

type RestRateLimitBucket = "protected" | "public" | "sensitive";

function getRestRateLimitBucket(
  pathname: string,
  method: string
): RestRateLimitBucket {
  if (pathname.startsWith("/api/auth/")) {
    return "sensitive";
  }

  if (method === "GET" || method === "HEAD") {
    return "public";
  }

  return "protected";
}

function getRateLimiterNamespace(c: Context) {
  const runtimeContext = c as Context & {
    env?: {
      RATE_LIMITER?: RateLimiterNamespaceLike;
    };
  };

  return runtimeContext.env?.RATE_LIMITER;
}

export async function apiRateLimitMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();
  if (method === "OPTIONS") {
    await next();
    return;
  }

  const pathname = c.req.path;
  const bucket = getRestRateLimitBucket(pathname, method);
  const headers = c.req.raw.headers;
  const clientIp = getClientIp(headers);

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    // Keep auth lookup non-blocking for request execution.
    console.error("Rate limit session lookup failed:", error);
  }

  const principalKey = getRateLimitPrincipalKey(session, clientIp);

  try {
    const evaluation = await consumeRateLimit({
      bucket,
      key: `rest:${bucket}:${principalKey}`,
      namespace: getRateLimiterNamespace(c),
    });

    const rateLimitHeaders = getRateLimitHeaders(evaluation);
    for (const [name, value] of Object.entries(rateLimitHeaders)) {
      c.header(name, value);
    }

    if (!evaluation.allowed) {
      c.header("Retry-After", evaluation.retryAfter.toString());

      return c.json(
        {
          error: "Too many requests",
          success: false,
        },
        429
      );
    }
  } catch (error) {
    // Intentionally fail-open while rate limiter reliability is being improved.
    console.error("REST rate limiter unavailable:", error);
  }

  await next();
}
