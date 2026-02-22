import { ORPCError, type RouterClient } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getBallsOfSameOver } from "@/services/ball.service";
import { playerCrudService, teamCrudService } from "@/services/crud.service";
import {
  createMatchAction,
  getCompletedMatches,
  getLiveMatches,
  getMatchById,
  getMatchScorecard,
} from "@/services/match.service";
import { getAllPlayers } from "@/services/player.service";
import { getAllTeams, getTeamsByName } from "@/services/team.service";
import {
  getAllTournaments,
  getLiveTournaments,
} from "@/services/tournament.service";
import {
  protectedProcedure,
  publicProcedure,
  sensitiveProcedure,
} from "../lib/orpc";
import {
  createPlayerBodySchema,
  createTeamBodySchema,
} from "../schemas/crud.schemas";

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

const UpdatePlayerInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createPlayerBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTeamInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createTeamBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

async function getUserRoleByEmail(email: string) {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0]?.role ?? null;
}

async function requireAdminByEmail(email: string) {
  const role = await getUserRoleByEmail(email);
  if (role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
}

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  liveMatches: publicProcedure.handler(() => getLiveMatches()),
  currentUserRole: protectedProcedure.handler(async ({ context }) =>
    getUserRoleByEmail(context.session.user.email)
  ),
  liveTournaments: publicProcedure.handler(() => getLiveTournaments()),
  tournaments: publicProcedure.handler(() => getAllTournaments()),
  completedMatches: publicProcedure.handler(() => getCompletedMatches()),
  players: publicProcedure.handler(() => getAllPlayers()),
  teams: publicProcedure.handler(() => getAllTeams()),
  searchTeamsByName: publicProcedure
    .input(z.string())
    .handler(({ input }) => getTeamsByName(input)),
  getTeamById: publicProcedure.input(z.number()).handler(async ({ input }) => {
    const teams = await getAllTeams();
    return teams.find((team) => team.id === input) || null;
  }),
  createPlayer: sensitiveProcedure
    .input(createPlayerBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.create(input);
      if (!player) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return player;
    }),
  createTeam: sensitiveProcedure
    .input(createTeamBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.create(input);
      if (!team) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return team;
    }),
  createMatch: sensitiveProcedure
    .input(CreateMatchInputSchema)
    .handler(async ({ input }) => {
      const result = await createMatchAction(input);
      return result;
    }),
  getMatchById: publicProcedure.input(z.number()).handler(async ({ input }) => {
    return await getMatchById(input);
  }),
  getMatchScorecard: publicProcedure
    .input(
      z.object({
        matchId: z.number(),
        inningsNumber: z.number().optional(),
        includeBallByBall: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      return await getMatchScorecard(input.matchId, {
        inningsNumber: input.inningsNumber,
        includeBallByBall: input.includeBallByBall,
      });
    }),
  getBallsOfSameOver: protectedProcedure
    .input(
      z.object({
        inningsId: z.number(),
        ballNumber: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const balls = await getBallsOfSameOver(input.inningsId, input.ballNumber);
      return balls;
    }),
  updatePlayer: sensitiveProcedure
    .input(UpdatePlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.update(input.id, input.data);
      if (!player) {
        throw new ORPCError("NOT_FOUND");
      }

      return player;
    }),
  deletePlayer: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await playerCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  updateTeam: sensitiveProcedure
    .input(UpdateTeamInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.update(input.id, input.data);
      if (!team) {
        throw new ORPCError("NOT_FOUND");
      }

      return team;
    }),
  deleteTeam: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await teamCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
