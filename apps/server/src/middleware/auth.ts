import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { USER_ROLES } from "@/config/constants";
import { auth } from "@/lib/auth";

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  c.set("session", session);
  c.set("user", session.user);

  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (!roles.includes(user.role)) {
      throw new HTTPException(403, {
        message: "Forbidden: Insufficient permissions",
      });
    }

    await next();
  };
}

export const requireAdmin = requireRole(USER_ROLES.ADMIN);
export const requireScorer = requireRole(USER_ROLES.ADMIN, USER_ROLES.SCORER);
