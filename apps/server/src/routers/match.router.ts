import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tournamentTeams } from "@/db/schema";
import { publicProcedure, sensitiveProcedure } from "@/lib/orpc";
import { requireAdminByEmail } from "@/routers/helpers/admin";
import {
  canCurrentUserScoreFixtureMatch,
  getTournamentScoringPermissionContext,
} from "@/routers/helpers/scoring-access";
import { matchCrudService } from "@/services/crud.service";
import {
  createMatchAction,
  getCompletedMatches,
  getLiveMatches,
  getMatchById as getMatchByIdService,
} from "@/services/match.service";

const CreateMatchInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  matchDate: z.coerce.date(),
  tossWinnerId: z.number(),
  tossDecision: z.string(),
  team1Id: z.number(),
  team2Id: z.number(),
  matchFormatId: z.number().int().positive().optional(),
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
  format: z.string().optional(),
  notes: z.string().optional(),
  ranked: z.boolean().optional(),
  isLive: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isAbandoned: z.boolean().optional(),
  isTied: z.boolean().optional(),
  margin: z.string().optional(),
  playerOfTheMatchId: z.number().optional(),
  stageId: z.number().int().positive().optional(),
  stageGroupId: z.number().int().positive().optional(),
  stageRound: z.number().int().positive().optional(),
  stageSequence: z.number().int().positive().optional(),
  knockoutLeg: z.number().int().positive().optional(),
});

const UpdateMatchScheduleInputSchema = z.object({
  matchId: z.number().int().positive(),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.coerce.date().optional(),
});

export const matchRouter = {
  liveMatches: publicProcedure.handler(async ({ context }) => {
    const matches = await getLiveMatches();
    const tournamentIds = Array.from(
      new Set(matches.map((match) => match.tournamentId))
    );
    const scoringPermissions = await Promise.all(
      tournamentIds.map(async (tournamentId) => ({
        tournamentId,
        permission: await getTournamentScoringPermissionContext({
          email: context.session?.user.email,
          tournamentId,
        }),
      }))
    );
    const scoringPermissionByTournamentId = new Map(
      scoringPermissions.map((entry) => [entry.tournamentId, entry.permission])
    );

    return matches.map((match) => {
      const scoringPermission = scoringPermissionByTournamentId.get(
        match.tournamentId
      );
      const canCurrentUserScore = scoringPermission
        ? canCurrentUserScoreFixtureMatch(match, scoringPermission)
        : false;

      return {
        ...match,
        canCurrentUserScore,
      };
    });
  }),
  completedMatches: publicProcedure.handler(() => getCompletedMatches()),
  createMatch: sensitiveProcedure
    .input(CreateMatchInputSchema)
    .handler(async ({ input }) => {
      const registeredTeams = await db
        .select({ teamId: tournamentTeams.teamId })
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.tournamentId, input.tournamentId),
            inArray(tournamentTeams.teamId, [input.team1Id, input.team2Id])
          )
        );

      if (registeredTeams.length !== 2) {
        throw new ORPCError("BAD_REQUEST");
      }

      return createMatchAction(input);
    }),
  updateMatchSchedule: sensitiveProcedure
    .input(UpdateMatchScheduleInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const existingMatch = await matchCrudService.getById(input.matchId);
      if (!existingMatch) {
        throw new ORPCError("NOT_FOUND");
      }

      if (existingMatch.fixtureStatus !== "published") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only published matches can be rescheduled",
        });
      }

      if (existingMatch.isCompleted) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Completed matches cannot be rescheduled",
        });
      }

      if (
        input.scheduledEndAt &&
        input.scheduledEndAt <= input.scheduledStartAt
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Schedule end must be after the start time",
        });
      }

      const updatedMatch = await matchCrudService.update(input.matchId, {
        matchDate: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        scheduledStartAt: input.scheduledStartAt,
      });

      if (!updatedMatch) {
        throw new ORPCError("NOT_FOUND");
      }

      return updatedMatch;
    }),
  getMatchById: publicProcedure
    .input(z.number())
    .handler(({ input }) => getMatchByIdService(input)),
};
