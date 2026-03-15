import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { teamPlayers } from "@/db/schema";
import { measureDevTiming } from "@/lib/dev-timing";
import {
  protectedProcedure,
  publicProcedure,
  sensitiveProcedure,
} from "@/lib/orpc";
import {
  canUserScoreMatchByEmail,
  getScoringMatchByDeliveryId,
  getScoringMatchById,
  getScoringMatchByInningsId,
  getScoringMatchLineupConfigById,
  getScoringMatchStatusById,
  requireScoreAccessByEmail,
} from "@/routers/helpers/scoring-access";
import { getBallsOfSameOver } from "@/services/ball.service";
import {
  getMatchById as getMatchByIdService,
  getMatchScorecard,
} from "@/services/match.service";
import type { getSavedMatchLineup } from "@/services/scoring.service";
import {
  closeCurrentScoringInnings as closeCurrentScoringInningsAction,
  createNextScoringDelivery as createNextScoringDeliveryAction,
  deleteScoringDelivery as deleteScoringDeliveryAction,
  endInnings,
  getMatchScoringSession,
  initializeMatchScoring as initializeMatchScoringAction,
  recordScoringDelivery as recordScoringDeliveryAction,
  replaceMatchLineupForMatch,
  saveBallData,
  startScoringInnings as startScoringInningsAction,
  updateScoringDelivery as updateScoringDeliveryAction,
} from "@/services/scoring.service";

const MatchScoringSetupInputSchema = z.object({
  matchId: z.number().int().positive(),
});

const StartMatchScoringInputSchema = MatchScoringSetupInputSchema;
const TossDecisionInputSchema = z.enum(["bat", "bowl"]);

const MatchTeamLineupInputSchema = z.object({
  playerIds: z.array(z.number().int().positive()).min(1),
  captainPlayerId: z.number().int().positive().optional(),
  viceCaptainPlayerId: z.number().int().positive().optional(),
  wicketKeeperPlayerId: z.number().int().positive().optional(),
});

const SaveMatchLineupInputSchema = z.object({
  matchId: z.number().int().positive(),
  team1: MatchTeamLineupInputSchema,
  team2: MatchTeamLineupInputSchema,
});

const InitializeMatchScoringInputSchema = z.object({
  matchId: z.number().int().positive(),
  tossWinnerId: z.number().int().positive(),
  tossDecision: TossDecisionInputSchema,
  strikerId: z.number().int().positive(),
  nonStrikerId: z.number().int().positive(),
  openingBowlerId: z.number().int().positive(),
});

const DeliveryDraftInputSchema = z.object({
  inningsId: z.number().int().positive(),
  strikerId: z.number().int().positive(),
  nonStrikerId: z.number().int().positive(),
  bowlerId: z.number().int().positive(),
  batterRuns: z.number().int().min(0).optional(),
  wideRuns: z.number().int().min(0).optional(),
  noBallRuns: z.number().int().min(0).optional(),
  byeRuns: z.number().int().min(0).optional(),
  legByeRuns: z.number().int().min(0).optional(),
  penaltyRuns: z.number().int().min(0).optional(),
  wicketType: z.string().optional(),
  assistedById: z.number().int().positive().nullable().optional(),
  dismissedPlayerId: z.number().int().positive().nullable().optional(),
});

const StartScoringInningsInputSchema = z.object({
  matchId: z.number().int().positive(),
  inningsNumber: z.number().int().positive().optional(),
  battingTeamId: z.number().int().positive(),
  bowlingTeamId: z.number().int().positive(),
  strikerId: z.number().int().positive(),
  nonStrikerId: z.number().int().positive(),
  openingBowlerId: z.number().int().positive(),
  tossWinnerId: z.number().int().positive().optional(),
  tossDecision: TossDecisionInputSchema.optional(),
});

const UpdateScoringDeliveryInputSchema = DeliveryDraftInputSchema.extend({
  deliveryId: z.number().int().positive(),
});

const DeleteScoringDeliveryInputSchema = z.object({
  deliveryId: z.number().int().positive(),
});

const SaveScoringDeliveryInputSchema = z.object({
  id: z.number().int().positive(),
  inningsId: z.number().int().positive(),
  strikerId: z.number().int().positive(),
  nonStrikerId: z.number().int().positive(),
  bowlerId: z.number().int().positive(),
  runsScored: z.number().int().min(0),
  isWide: z.boolean().optional(),
  isNoBall: z.boolean().optional(),
  isBye: z.boolean().optional(),
  isLegBye: z.boolean().optional(),
  isWicket: z.boolean().optional(),
  wicketType: z.string().optional(),
  assistPlayerId: z.number().int().positive().optional(),
  dismissedPlayerId: z.number().int().positive().optional(),
});

const CreateNextScoringDeliveryInputSchema = z.object({
  inningsId: z.number().int().positive(),
  nextStrikerId: z.number().int().positive(),
  nextNonStrikerId: z.number().int().positive(),
  nextBowlerId: z.number().int().positive(),
});

const EndScoringInningsInputSchema = z.object({
  inningsId: z.number().int().positive(),
});

function hasUniquePlayerIds(playerIds: number[]) {
  return new Set(playerIds).size === playerIds.length;
}

function ensureOptionalSelectionBelongsToTeam(
  playerIds: number[],
  selectedPlayerId: number | undefined
) {
  if (typeof selectedPlayerId !== "number") {
    return;
  }

  if (!playerIds.includes(selectedPlayerId)) {
    throw new ORPCError("BAD_REQUEST");
  }
}

function buildSavedTeamLineup(
  rows: Awaited<ReturnType<typeof getSavedMatchLineup>>,
  teamId: number
) {
  const teamRows = rows.filter((row) => row.teamId === teamId);

  return {
    playerIds: teamRows.map((row) => row.playerId),
    captainPlayerId: teamRows.find((row) => row.isCaptain)?.playerId,
    viceCaptainPlayerId: teamRows.find((row) => row.isViceCaptain)?.playerId,
    wicketKeeperPlayerId: teamRows.find((row) => row.isWicketKeeper)?.playerId,
  };
}

async function withCurrentUserScoringRights<T extends object>(
  email: string | undefined,
  match: {
    team1Id: null | number;
    team2Id: null | number;
    tournamentId: number;
  },
  payload: T
) {
  const canCurrentUserScore = await canUserScoreMatchByEmail({
    email,
    match,
  });

  return {
    ...payload,
    canCurrentUserScore,
  };
}

async function requireTimedScoreAccess(params: {
  email: string;
  match: {
    id?: number;
    team1Id: null | number;
    team2Id: null | number;
    tournamentId: number;
  };
  scope: string;
}) {
  await measureDevTiming(
    "scoring.requireScoreAccessByEmail",
    async () =>
      await requireScoreAccessByEmail({
        email: params.email,
        match: params.match,
      }),
    params.scope
  );
}

export const scoringRouter = {
  getMatchScoringSetup: publicProcedure
    .input(MatchScoringSetupInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getMatchByIdService(input.matchId);
      if (!match) {
        return null;
      }

      const session = await getMatchScoringSession(input.matchId);
      if (!session) {
        return null;
      }

      return withCurrentUserScoringRights(
        context.session?.user.email,
        {
          tournamentId: match.tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
        session
      );
    }),
  startMatchScoring: sensitiveProcedure
    .input(StartMatchScoringInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchStatusById(input.matchId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `saveMatchLineup:${input.matchId}`,
      });

      const existingInnings = await db.query.innings.findFirst({
        where: {
          matchId: match.id,
        },
        columns: {
          id: true,
        },
      });

      if (existingInnings) {
        throw new ORPCError("BAD_REQUEST");
      }

      return {
        matchId: match.id,
        isLive: Boolean(match.isLive),
      };
    }),
  saveMatchLineup: sensitiveProcedure
    .input(SaveMatchLineupInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchLineupConfigById(input.matchId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      if (
        typeof match.team1Id !== "number" ||
        typeof match.team2Id !== "number"
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `initializeMatchScoring:${input.matchId}`,
      });

      if (
        input.team1.playerIds.length !== match.playersPerSide ||
        input.team2.playerIds.length !== match.playersPerSide
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      if (
        !(
          hasUniquePlayerIds(input.team1.playerIds) &&
          hasUniquePlayerIds(input.team2.playerIds)
        )
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      const overlappingPlayers = input.team1.playerIds.filter((playerId) =>
        input.team2.playerIds.includes(playerId)
      );
      if (overlappingPlayers.length > 0) {
        throw new ORPCError("BAD_REQUEST");
      }

      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.captainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.viceCaptainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.wicketKeeperPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.captainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.viceCaptainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.wicketKeeperPlayerId
      );

      const selectedPlayerIds = [
        ...input.team1.playerIds,
        ...input.team2.playerIds,
      ];

      const rosterRows = await db
        .select({
          teamId: teamPlayers.teamId,
          playerId: teamPlayers.playerId,
        })
        .from(teamPlayers)
        .where(
          and(
            eq(teamPlayers.tournamentId, match.tournamentId),
            inArray(teamPlayers.teamId, [match.team1Id, match.team2Id]),
            inArray(teamPlayers.playerId, selectedPlayerIds)
          )
        );

      const team1RosterIds = new Set(
        rosterRows
          .filter((row) => row.teamId === match.team1Id)
          .map((row) => row.playerId)
      );
      const team2RosterIds = new Set(
        rosterRows
          .filter((row) => row.teamId === match.team2Id)
          .map((row) => row.playerId)
      );

      const isTeam1RosterValid = input.team1.playerIds.every((playerId) =>
        team1RosterIds.has(playerId)
      );
      const isTeam2RosterValid = input.team2.playerIds.every((playerId) =>
        team2RosterIds.has(playerId)
      );

      if (!(isTeam1RosterValid && isTeam2RosterValid)) {
        throw new ORPCError("BAD_REQUEST");
      }

      const savedLineupRows = await replaceMatchLineupForMatch({
        matchId: match.id,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1: input.team1,
        team2: input.team2,
      });

      return {
        matchId: match.id,
        savedLineup: {
          team1: buildSavedTeamLineup(savedLineupRows, match.team1Id),
          team2: buildSavedTeamLineup(savedLineupRows, match.team2Id),
        },
      };
    }),
  initializeMatchScoring: sensitiveProcedure
    .input(InitializeMatchScoringInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchById(input.matchId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `startScoringInnings:${input.matchId}`,
      });

      try {
        return await initializeMatchScoringAction(input);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Match not found") {
            throw new ORPCError("NOT_FOUND");
          }

          throw new ORPCError("BAD_REQUEST");
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  startScoringInnings: sensitiveProcedure
    .input(StartScoringInningsInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchById(input.matchId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `startScoringInnings:${input.matchId}`,
      });

      try {
        await startScoringInningsAction(input);
        const session = await getMatchScoringSession(input.matchId);
        if (!session) {
          throw new ORPCError("NOT_FOUND");
        }

        return {
          ...session,
          canCurrentUserScore: true,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  recordScoringDelivery: sensitiveProcedure
    .input(DeliveryDraftInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `recordScoringDelivery:${input.inningsId}`,
      });

      try {
        const session = await recordScoringDeliveryAction(input);
        if (!session) {
          throw new ORPCError("NOT_FOUND");
        }

        return {
          ...session,
          canCurrentUserScore: true,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  updateScoringDelivery: sensitiveProcedure
    .input(UpdateScoringDeliveryInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `updateScoringDelivery:${input.deliveryId}`,
      });

      try {
        const session = await updateScoringDeliveryAction(input);
        if (!session) {
          throw new ORPCError("NOT_FOUND");
        }

        return {
          ...session,
          canCurrentUserScore: true,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  deleteScoringDelivery: sensitiveProcedure
    .input(DeleteScoringDeliveryInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByDeliveryId(input.deliveryId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `deleteScoringDelivery:${input.deliveryId}`,
      });

      try {
        const session = await deleteScoringDeliveryAction(input.deliveryId);
        if (!session) {
          throw new ORPCError("NOT_FOUND");
        }

        return {
          ...session,
          canCurrentUserScore: true,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  closeCurrentScoringInnings: sensitiveProcedure
    .input(EndScoringInningsInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireTimedScoreAccess({
        email: context.session.user.email,
        match,
        scope: `closeCurrentScoringInnings:${input.inningsId}`,
      });

      try {
        const session = await closeCurrentScoringInningsAction(input.inningsId);
        if (!session) {
          throw new ORPCError("NOT_FOUND");
        }

        return {
          ...session,
          canCurrentUserScore: true,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  saveScoringDelivery: sensitiveProcedure
    .input(SaveScoringDeliveryInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireScoreAccessByEmail({
        email: context.session.user.email,
        match,
      });

      try {
        await saveBallData(
          input,
          {
            inningsId: input.inningsId,
            wickets: 0,
            balls: 0,
            extras: 0,
            totalScore: 0,
          },
          {
            matchId: match.id,
          }
        );

        const updatedInnings = await db.query.innings.findFirst({
          where: {
            id: input.inningsId,
          },
          with: {
            battingTeam: {
              columns: {
                id: true,
                name: true,
                shortName: true,
              },
            },
            bowlingTeam: {
              columns: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        });

        const updatedDelivery = await db.query.deliveries.findFirst({
          where: {
            id: input.id,
          },
          with: {
            striker: true,
            nonStriker: true,
            bowler: true,
            dismissedPlayer: true,
            dismissedBy: true,
            assistedBy: true,
          },
        });

        return {
          innings: updatedInnings,
          delivery: updatedDelivery,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  createNextScoringDelivery: sensitiveProcedure
    .input(CreateNextScoringDeliveryInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireScoreAccessByEmail({
        email: context.session.user.email,
        match,
      });

      try {
        const result = await createNextScoringDeliveryAction(input);
        const delivery = await db.query.deliveries.findFirst({
          where: {
            id: result.deliveryId,
          },
          with: {
            striker: true,
            nonStriker: true,
            bowler: true,
            dismissedPlayer: true,
            dismissedBy: true,
            assistedBy: true,
          },
        });

        return {
          ...result,
          delivery,
        };
      } catch (_error) {
        throw new ORPCError("BAD_REQUEST");
      }
    }),
  endScoringInnings: sensitiveProcedure
    .input(EndScoringInningsInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getScoringMatchByInningsId(input.inningsId);
      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireScoreAccessByEmail({
        email: context.session.user.email,
        match,
      });

      await endInnings(input.inningsId);
      return { inningsId: input.inningsId };
    }),
  getMatchScorecard: publicProcedure
    .input(
      z.object({
        matchId: z.number(),
        inningsNumber: z.number().optional(),
        includeBallByBall: z.boolean().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const scorecard = await measureDevTiming(
        "scoring.getMatchScorecard",
        async () =>
          await getMatchScorecard(input.matchId, {
            inningsNumber: input.inningsNumber,
            includeBallByBall: input.includeBallByBall,
          }),
        `matchId:${input.matchId}`
      );

      if (!scorecard) {
        return null;
      }

      const match = await getScoringMatchById(input.matchId);
      if (!match) {
        return {
          ...scorecard,
          canCurrentUserScore: false,
        };
      }

      return withCurrentUserScoringRights(
        context.session?.user.email,
        match,
        scorecard
      );
    }),
  getBallsOfSameOver: protectedProcedure
    .input(
      z.object({
        inningsId: z.number(),
        ballNumber: z.number(),
      })
    )
    .handler(({ input }) =>
      getBallsOfSameOver(input.inningsId, input.ballNumber)
    ),
};
