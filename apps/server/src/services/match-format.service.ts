import { eq } from "drizzle-orm";
import { db } from "@/db";
import { innings, tournamentStages, tournaments } from "@/db/schema";

const DEFAULT_BALLS_PER_OVER = 6;

export interface MatchFormatRules {
  ballsPerOver: number;
  formatLabel: string;
  matchFormatId: number | null;
  maxLegalBallsPerInnings: number | null;
  maxOversPerBowler: number | null;
  noOfOvers: number | null;
}

interface MatchCreationFormatInput {
  matchFormatId?: number;
  stageId?: number;
  tournamentId: number;
}

function toPositiveIntOrNull(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.trunc(value);
}

function deriveMaxLegalBallsPerInnings(params: {
  ballsPerOver: number;
  maxLegalBallsPerInnings?: number | null;
  noOfOvers?: number | null;
}): number | null {
  const explicit = toPositiveIntOrNull(params.maxLegalBallsPerInnings);
  if (explicit) {
    return explicit;
  }

  const noOfOvers = toPositiveIntOrNull(params.noOfOvers);
  if (!noOfOvers) {
    return null;
  }

  return noOfOvers * params.ballsPerOver;
}

function normalizeBallsPerOver(value: number | null | undefined): number {
  return toPositiveIntOrNull(value) ?? DEFAULT_BALLS_PER_OVER;
}

async function resolveFormatIdForMatch(params: MatchCreationFormatInput) {
  if (params.matchFormatId) {
    return params.matchFormatId;
  }

  if (params.stageId) {
    const stage = await db.query.tournamentStages.findFirst({
      where: {
        id: params.stageId,
      },
    });

    if (stage?.matchFormatId) {
      return stage.matchFormatId;
    }
  }

  const tournament = await db.query.tournaments.findFirst({
    where: {
      id: params.tournamentId,
    },
  });

  return tournament?.defaultMatchFormatId ?? null;
}

export async function resolveMatchFormatForCreation(
  input: MatchCreationFormatInput
): Promise<MatchFormatRules | null> {
  const resolvedFormatId = await resolveFormatIdForMatch(input);
  if (!resolvedFormatId) {
    return null;
  }

  const format = await db.query.matchFormats.findFirst({
    where: {
      id: resolvedFormatId,
    },
  });

  if (!format) {
    return null;
  }

  const ballsPerOver = normalizeBallsPerOver(format.ballsPerOver);

  return {
    matchFormatId: format.id,
    formatLabel: format.name,
    ballsPerOver,
    noOfOvers: toPositiveIntOrNull(format.noOfOvers),
    maxOversPerBowler: toPositiveIntOrNull(format.maxOversPerBowler),
    maxLegalBallsPerInnings: deriveMaxLegalBallsPerInnings({
      ballsPerOver,
      maxLegalBallsPerInnings: format.maxLegalBallsPerInnings,
      noOfOvers: format.noOfOvers,
    }),
  };
}

export async function getMatchFormatRulesByMatchId(
  matchId: number
): Promise<MatchFormatRules> {
  const match = await db.query.matches.findFirst({
    where: {
      id: matchId,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  const stageMatchFormatId = match.stageId
    ? (
        await db
          .select({ matchFormatId: tournamentStages.matchFormatId })
          .from(tournamentStages)
          .where(eq(tournamentStages.id, match.stageId))
          .limit(1)
      ).at(0)?.matchFormatId
    : null;

  const tournamentDefaultFormatId = (
    await db
      .select({ defaultMatchFormatId: tournaments.defaultMatchFormatId })
      .from(tournaments)
      .where(eq(tournaments.id, match.tournamentId))
      .limit(1)
  ).at(0)?.defaultMatchFormatId;

  const resolvedFormatId =
    match.matchFormatId ??
    stageMatchFormatId ??
    tournamentDefaultFormatId ??
    null;

  const format = resolvedFormatId
    ? await db.query.matchFormats.findFirst({
        where: {
          id: resolvedFormatId,
        },
      })
    : null;

  const formatBallsPerOver = normalizeBallsPerOver(format?.ballsPerOver);
  const ballsPerOver =
    toPositiveIntOrNull(match.ballsPerOverSnapshot) ?? formatBallsPerOver;

  const maxLegalBallsPerInnings =
    toPositiveIntOrNull(match.maxLegalBallsPerInningsSnapshot) ??
    deriveMaxLegalBallsPerInnings({
      ballsPerOver,
      maxLegalBallsPerInnings: format?.maxLegalBallsPerInnings,
      noOfOvers: format?.noOfOvers ?? match.oversPerSide,
    });

  return {
    matchFormatId: resolvedFormatId,
    formatLabel: format?.name ?? match.format,
    ballsPerOver,
    noOfOvers:
      toPositiveIntOrNull(format?.noOfOvers) ??
      toPositiveIntOrNull(match.oversPerSide),
    maxOversPerBowler:
      toPositiveIntOrNull(match.maxOversPerBowlerSnapshot) ??
      toPositiveIntOrNull(format?.maxOversPerBowler) ??
      toPositiveIntOrNull(match.maxOverPerBowler),
    maxLegalBallsPerInnings,
  };
}

export async function getMatchFormatRulesByInningsId(
  inningsId: number
): Promise<MatchFormatRules> {
  const inningsRow = await db
    .select({ matchId: innings.matchId })
    .from(innings)
    .where(eq(innings.id, inningsId))
    .limit(1);

  const matchId = inningsRow.at(0)?.matchId;
  if (!matchId) {
    throw new Error("Innings not found");
  }

  return getMatchFormatRulesByMatchId(matchId);
}
