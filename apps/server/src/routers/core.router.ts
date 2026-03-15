import { protectedProcedure, publicProcedure } from "@/lib/orpc";
import { getUserRoleByEmail } from "@/routers/helpers/admin";

export const coreRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  currentUserRole: protectedProcedure.handler(async ({ context }) =>
    getUserRoleByEmail(context.session.user.email)
  ),
};
