import { toDate } from "date-fns";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { resolveMatchFormatForCreation } from "@/services/match-format.service";
import {
  getMatchScorecard as getMatchScorecardService,
  type ScorecardQuery,
} from "@/services/scorecard.service";
import { getCurrentDate } from "@/utils";

export function getLiveMatches() {
  return db.query.matches.findMany({
    where: {
      isLive: true,
    },
    with: {
      team1: true,
      team2: true,
      tossWinner: true,
      innings: true,
    },
  });
}

export function getCompletedMatches() {
  return db.query.matches.findMany({
    where: {
      isCompleted: true,
    },
    with: {
      team1: true,
      team2: true,
      tossWinner: true,
      winner: true,
      innings: true,
    },
    orderBy: {
      matchDate: "desc",
    },
  });
}

export async function getAllMatches() {
  const allMatches = await db.query.matches.findMany({
    with: {
      innings: true,
      team1: true,
      team2: true,
      tossWinner: true,
    },
  });
  return allMatches;
}

export async function getMatchById(id: number) {
  const match = await db.query.matches.findFirst({
    where: {
      id,
    },
    with: {
      team1: {
        with: {
          teamPlayers: {
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      team2: {
        with: {
          teamPlayers: {
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!match) {
    return null;
  }

  return {
    ...match,
    team1: {
      ...match.team1,
      teamPlayers: match.team1.teamPlayers.filter(
        (teamPlayer) => teamPlayer.tournamentId === match.tournamentId
      ),
    },
    team2: {
      ...match.team2,
      teamPlayers: match.team2.teamPlayers.filter(
        (teamPlayer) => teamPlayer.tournamentId === match.tournamentId
      ),
    },
  };
}

export async function createMatchAction({
  matchDate,
  tossWinnerId,
  tournamentId,
  tossDecision,
  team1Id,
  team2Id,
  matchFormatId,
  oversPerSide,
  maxOverPerBowler,
  format,
  winnerId,
  result,
  ranked,
  hasLBW,
  hasBye,
  hasLegBye,
  hasBoundaryOut,
  hasSuperOver,
  venueId,
  notes,
  stageId,
  stageGroupId,
  stageRound,
  stageSequence,
  knockoutLeg,
}: {
  matchDate?: Date;
  tournamentId: number;
  tossWinnerId: number;
  tossDecision: string;
  team1Id: number;
  team2Id: number;
  matchFormatId?: number;
  oversPerSide: number;
  maxOverPerBowler: number;
  format?: string;
  winnerId?: number;
  result?: string;
  ranked?: boolean;
  hasLBW?: boolean;
  hasBye?: boolean;
  hasLegBye?: boolean;
  hasBoundaryOut?: boolean;
  hasSuperOver?: boolean;
  venueId?: number;
  notes?: string;
  stageId?: number;
  stageGroupId?: number;
  stageRound?: number;
  stageSequence?: number;
  knockoutLeg?: number;
}) {
  const resolvedFormat = await resolveMatchFormatForCreation({
    tournamentId,
    stageId,
    matchFormatId,
  });

  const effectiveOversPerSide = resolvedFormat?.noOfOvers ?? oversPerSide;
  const effectiveMaxOverPerBowler =
    resolvedFormat?.maxOversPerBowler ?? maxOverPerBowler;

  const newMatch = await db.insert(matches).values({
    matchDate: matchDate ? toDate(matchDate) : getCurrentDate(),
    tournamentId,
    tossWinnerId,
    tossDecision,
    team1Id,
    team2Id,
    matchFormatId: resolvedFormat?.matchFormatId ?? matchFormatId ?? null,
    oversPerSide: effectiveOversPerSide,
    maxOverPerBowler: effectiveMaxOverPerBowler,
    ballsPerOverSnapshot: resolvedFormat?.ballsPerOver ?? 6,
    maxLegalBallsPerInningsSnapshot:
      resolvedFormat?.maxLegalBallsPerInnings ??
      effectiveOversPerSide * (resolvedFormat?.ballsPerOver ?? 6),
    maxOversPerBowlerSnapshot: effectiveMaxOverPerBowler,
    winnerId,
    result,
    format: resolvedFormat?.formatLabel ?? format ?? "Custom",
    ranked,
    hasLBW,
    hasBye,
    hasLegBye,
    hasBoundaryOut,
    hasSuperOver,
    stageId,
    stageGroupId,
    stageRound,
    stageSequence,
    knockoutLeg,
    venueId: venueId || null,
    notes: notes || "",
    isLive: false,
  });

  return newMatch.rows;
}

export function getMatchScorecard(matchId: number, query: ScorecardQuery = {}) {
  return getMatchScorecardService(matchId, query);
}
