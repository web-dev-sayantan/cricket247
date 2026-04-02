import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function getUserRoleByEmail(email: string) {
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return rows[0]?.role ?? null;
}

export async function requireAdminByEmail(email: string) {
  const role = await getUserRoleByEmail(email);
  if (role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
}
