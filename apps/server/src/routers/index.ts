import type { RouterClient } from "@orpc/server";
import { z } from "zod";
import { createMatchAction, getLiveMatches } from "@/services/match.service";
import { protectedProcedure, publicProcedure } from "../lib/orpc";

// Match creation schema matching the frontend MatchFormSchema
const CreateMatchInputSchema = z.object({
  matchDate: z.date(),
  tossWinnerId: z.number(),
  tossDecision: z.string(),
  team1Id: z.number(),
  team2Id: z.number(),
  oversPerSide: z.number().min(1),
  maxOverPerBowler: z.number().min(1),
  winnerId: z.number().optional(),
  result: z.string().optional(),
  hasLBW: z.boolean().optional(),
  hasBye: z.boolean().optional(),
  hasLegBye: z.boolean().optional(),
  hasBoundaryOut: z.boolean().optional(),
  hasSuperOver: z.boolean().optional(),
  venueId: z.number().optional(),
  format: z.string(),
  notes: z.string().optional(),
  ranked: z.boolean().optional(),
  isLive: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isAbandoned: z.boolean().optional(),
  isTied: z.boolean().optional(),
  margin: z.string().optional(),
  playerOfTheMatchId: z.number().optional(),
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  liveMatches: publicProcedure.handler(() => getLiveMatches()),
  createMatch: protectedProcedure
    .input(CreateMatchInputSchema)
    .handler(async ({ input }) => {
      const result = await createMatchAction(input);
      return result;
    }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
