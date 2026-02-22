import { ORPCError, os } from "@orpc/server";
import { auth } from "./auth";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

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

export const protectedProcedure = publicProcedure.use(requireAuth);
export const sensitiveProcedure = publicProcedure.use(requireSensitiveAuth);
