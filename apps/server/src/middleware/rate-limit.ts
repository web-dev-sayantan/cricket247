import type { Context, Next } from "hono";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const identifier =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();

    const requestData = requestCounts.get(identifier);

    if (!requestData || now > requestData.resetTime) {
      requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      await next();
      return;
    }

    if (requestData.count >= maxRequests) {
      return c.json(
        {
          success: false,
          error: "Too many requests",
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
          timestamp: new Date().toISOString(),
        },
        429
      );
    }

    requestData.count += 1;
    await next();
  };
}
