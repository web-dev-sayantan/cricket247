import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";
import {
  consumeRateLimit,
  getRateLimitBucketName,
  getRateLimitHeaders,
  getRateLimitPrincipalKey,
  isRateLimitExemptProcedure,
  type RateLimitBucketName,
  type RateLimitEvaluation,
} from "./rate-limit";

export const o = os.$context<Context>();

function createRateLimitMiddleware(
  defaultBucket: Exclude<RateLimitBucketName, "scoring">
) {
  return o.middleware(async ({ context, next, path }) => {
    const procedureName = path.at(-1);
    if (!procedureName || isRateLimitExemptProcedure(procedureName)) {
      return next();
    }

    const bucket = getRateLimitBucketName(procedureName, defaultBucket);
    const principalKey = getRateLimitPrincipalKey(
      context.session,
      context.clientIp
    );

    let evaluation: RateLimitEvaluation;
    try {
      evaluation = await consumeRateLimit({
        bucket,
        key: `rpc:${bucket}:${principalKey}`,
        namespace: context.rateLimiter,
      });
    } catch (error) {
      console.error("Rate limiter unavailable:", error);
      return next();
    }

    const headers = getRateLimitHeaders(evaluation);
    for (const [name, value] of Object.entries(headers)) {
      context.resHeaders?.set(name, value);
    }

    if (!evaluation.allowed) {
      context.resHeaders?.set("Retry-After", evaluation.retryAfter.toString());

      throw new ORPCError("TOO_MANY_REQUESTS", {
        data: {
          retryAfter: evaluation.retryAfter,
        },
        message: "Too many requests",
        status: 429,
      });
    }

    return next();
  });
}

export const publicProcedure = o.use(createRateLimitMiddleware("public"));

const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

const requireSensitiveAuth = o.middleware(async ({ context, next }) => {
  const { auth } = await import("./auth");

  const session = await auth.api.getSession({
    headers: context.headers,
    query: {
      disableCookieCache: true,
    },
  });

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session,
    },
  });
});

export const protectedProcedure = o
  .use(createRateLimitMiddleware("protected"))
  .use(requireAuth);

export const sensitiveProcedure = o
  .use(createRateLimitMiddleware("sensitive"))
  .use(requireSensitiveAuth);
