import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  fixtureChangeLog,
  fixtureRounds,
  fixtureVersionMatches,
  fixtureVersions,
  matches,
  tournamentStages,
  tournaments,
} from "@/db/schema";
import { getCurrentDate } from "@/utils";

const DEFAULT_MATCH_DURATION_MS = 3 * 60 * 60 * 1000;

type FixtureWorkflowErrorCode =
  | "TOURNAMENT_NOT_FOUND"
  | "STAGE_NOT_FOUND"
  | "FIXTURE_VERSION_NOT_FOUND"
  | "FIXTURE_VERSION_NOT_DRAFT"
  | "FIXTURE_VERSION_EMPTY"
  | "FIXTURE_VERSION_TOURNAMENT_MISMATCH"
  | "ROUND_ALREADY_EXISTS"
  | "INVALID_SCHEDULE_WINDOW";

export class FixtureWorkflowError extends Error {
  code: FixtureWorkflowErrorCode;

  constructor(code: FixtureWorkflowErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

interface CreateFixtureDraftInput {
  includeCurrentMatches?: boolean;
  label?: string;
  metadata?: Record<string, boolean | number | string>;
  stageId?: number;
  tournamentId: number;
}

interface CreateFixtureRoundInput {
  fixtureVersionId?: number;
  lockAt?: Date;
  metadata?: Record<string, boolean | number | string>;
  pairingMethod?: string;
  publishedAt?: Date;
  roundName?: string;
  roundNumber: number;
  scheduledEndAt?: Date;
  scheduledStartAt?: Date;
  stageGroupId?: number;
  stageId: number;
  tournamentId: number;
}

interface PublishFixtureVersionInput {
  fixtureVersionId: number;
  note?: string;
  tournamentId: number;
}

interface ValidateFixtureConflictsInput {
  excludeMatchId?: number;
  scheduledEndAt?: Date;
  scheduledStartAt: Date;
  stageId?: number;
  teamIds: number[];
  tournamentId: number;
  venueId?: number;
}

export interface FixtureConflictItem {
  conflictingTeamIds: number[];
  conflictType: "team" | "venue";
  matchId: number;
  stageId: null | number;
  venueId: null | number;
}

function toJson(value: Record<string, boolean | number | string> | undefined) {
  return value ? JSON.stringify(value) : null;
}

function getEffectiveEnd(startAt: Date, endAt?: Date | null) {
  if (endAt) {
    return endAt;
  }

  return new Date(startAt.getTime() + DEFAULT_MATCH_DURATION_MS);
}

function hasOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date
) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

async function requireTournamentExists(tournamentId: number) {
  const tournament = await db.query.tournaments.findFirst({
    where: {
      id: tournamentId,
    },
  });

  if (!tournament) {
    throw new FixtureWorkflowError("TOURNAMENT_NOT_FOUND");
  }

  return tournament;
}

async function requireStageInTournament(stageId: number, tournamentId: number) {
  const stage = await db.query.tournamentStages.findFirst({
    where: {
      id: stageId,
      tournamentId,
    },
  });

  if (!stage) {
    throw new FixtureWorkflowError("STAGE_NOT_FOUND");
  }

  return stage;
}

export async function createFixtureDraft(input: CreateFixtureDraftInput) {
  await requireTournamentExists(input.tournamentId);

  if (input.stageId) {
    await requireStageInTournament(input.stageId, input.tournamentId);
  }

  const currentVersion = await db
    .select({ versionNumber: fixtureVersions.versionNumber })
    .from(fixtureVersions)
    .where(eq(fixtureVersions.tournamentId, input.tournamentId))
    .orderBy(desc(fixtureVersions.versionNumber))
    .limit(1);

  const nextVersion = (currentVersion[0]?.versionNumber ?? 0) + 1;

  const result = await db.transaction(async (tx) => {
    const [createdVersion] = await tx
      .insert(fixtureVersions)
      .values({
        tournamentId: input.tournamentId,
        stageId: input.stageId ?? null,
        versionNumber: nextVersion,
        status: "draft",
        label: input.label,
        metadata: toJson(input.metadata),
      })
      .returning();

    let seededMatchCount = 0;

    if (input.includeCurrentMatches ?? true) {
      const matchFilters = [eq(matches.tournamentId, input.tournamentId)];
      if (input.stageId) {
        matchFilters.push(eq(matches.stageId, input.stageId));
      }

      const matchRows = await tx
        .select({
          id: matches.id,
          fixtureRoundId: matches.fixtureRoundId,
          matchDate: matches.matchDate,
          scheduledEndAt: matches.scheduledEndAt,
          scheduledStartAt: matches.scheduledStartAt,
          stageGroupId: matches.stageGroupId,
          stageId: matches.stageId,
          stageRound: matches.stageRound,
          stageSequence: matches.stageSequence,
          team1Id: matches.team1Id,
          team2Id: matches.team2Id,
          venueId: matches.venueId,
        })
        .from(matches)
        .where(and(...matchFilters))
        .orderBy(
          asc(matches.matchDate),
          asc(matches.stageRound),
          asc(matches.stageSequence),
          asc(matches.id)
        );

      seededMatchCount = matchRows.length;

      if (matchRows.length > 0) {
        await tx.insert(fixtureVersionMatches).values(
          matchRows.map((matchRow, index) => ({
            fixtureVersionId: createdVersion.id,
            matchId: matchRow.id,
            sequence: index + 1,
            snapshot: JSON.stringify(matchRow),
          }))
        );
      }
    }

    await tx.insert(fixtureChangeLog).values({
      tournamentId: input.tournamentId,
      stageId: input.stageId ?? null,
      fixtureVersionId: createdVersion.id,
      action: "fixture_version_created",
      payload: JSON.stringify({
        includeCurrentMatches: input.includeCurrentMatches ?? true,
        seededMatchCount,
      }),
    });

    return {
      fixtureVersion: createdVersion,
      seededMatchCount,
    };
  });

  return result;
}

export async function createFixtureRound(input: CreateFixtureRoundInput) {
  await requireTournamentExists(input.tournamentId);
  await requireStageInTournament(input.stageId, input.tournamentId);

  if (
    input.scheduledStartAt &&
    input.scheduledEndAt &&
    input.scheduledStartAt >= input.scheduledEndAt
  ) {
    throw new FixtureWorkflowError("INVALID_SCHEDULE_WINDOW");
  }

  if (input.fixtureVersionId) {
    const fixtureVersion = await db
      .select({
        id: fixtureVersions.id,
        stageId: fixtureVersions.stageId,
        tournamentId: fixtureVersions.tournamentId,
      })
      .from(fixtureVersions)
      .where(eq(fixtureVersions.id, input.fixtureVersionId))
      .limit(1);

    const version = fixtureVersion[0] ?? null;
    if (!version) {
      throw new FixtureWorkflowError("FIXTURE_VERSION_NOT_FOUND");
    }

    if (version.tournamentId !== input.tournamentId) {
      throw new FixtureWorkflowError("FIXTURE_VERSION_TOURNAMENT_MISMATCH");
    }

    if (version.stageId && version.stageId !== input.stageId) {
      throw new FixtureWorkflowError("FIXTURE_VERSION_TOURNAMENT_MISMATCH");
    }
  }

  const roundFilters = [
    eq(fixtureRounds.stageId, input.stageId),
    eq(fixtureRounds.roundNumber, input.roundNumber),
  ];

  if (input.stageGroupId) {
    roundFilters.push(eq(fixtureRounds.stageGroupId, input.stageGroupId));
  } else {
    roundFilters.push(isNull(fixtureRounds.stageGroupId));
  }

  const existing = await db
    .select({ id: fixtureRounds.id })
    .from(fixtureRounds)
    .where(and(...roundFilters))
    .limit(1);

  if ((existing[0]?.id ?? 0) > 0) {
    throw new FixtureWorkflowError("ROUND_ALREADY_EXISTS");
  }

  const createdRound = await db.transaction(async (tx) => {
    const [round] = await tx
      .insert(fixtureRounds)
      .values({
        tournamentId: input.tournamentId,
        stageId: input.stageId,
        stageGroupId: input.stageGroupId ?? null,
        fixtureVersionId: input.fixtureVersionId ?? null,
        roundNumber: input.roundNumber,
        roundName: input.roundName,
        pairingMethod: input.pairingMethod ?? "manual",
        status: "draft",
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        lockAt: input.lockAt,
        publishedAt: input.publishedAt,
        metadata: toJson(input.metadata),
      })
      .returning();

    await tx.insert(fixtureChangeLog).values({
      tournamentId: input.tournamentId,
      stageId: input.stageId,
      fixtureVersionId: input.fixtureVersionId ?? null,
      fixtureRoundId: round.id,
      action: "fixture_round_created",
      payload: JSON.stringify({
        roundNumber: input.roundNumber,
        stageGroupId: input.stageGroupId ?? null,
      }),
    });

    return round;
  });

  return createdRound;
}

export async function publishFixtureVersion(input: PublishFixtureVersionInput) {
  await requireTournamentExists(input.tournamentId);

  const fixtureVersionRows = await db
    .select()
    .from(fixtureVersions)
    .where(
      and(
        eq(fixtureVersions.id, input.fixtureVersionId),
        eq(fixtureVersions.tournamentId, input.tournamentId)
      )
    )
    .limit(1);

  const fixtureVersion = fixtureVersionRows[0] ?? null;
  if (!fixtureVersion) {
    throw new FixtureWorkflowError("FIXTURE_VERSION_NOT_FOUND");
  }

  if (fixtureVersion.status !== "draft") {
    throw new FixtureWorkflowError("FIXTURE_VERSION_NOT_DRAFT");
  }

  const linkedRows = await db
    .select({ matchId: fixtureVersionMatches.matchId })
    .from(fixtureVersionMatches)
    .where(eq(fixtureVersionMatches.fixtureVersionId, input.fixtureVersionId));

  if (linkedRows.length === 0) {
    throw new FixtureWorkflowError("FIXTURE_VERSION_EMPTY");
  }

  const linkedMatchIds = linkedRows.map((row) => row.matchId);
  const now = getCurrentDate();

  const stageRows = await db
    .select({ stageId: matches.stageId })
    .from(matches)
    .where(inArray(matches.id, linkedMatchIds));

  const stageIds = Array.from(
    new Set(
      stageRows
        .map((row) => row.stageId)
        .filter((stageId): stageId is number => stageId !== null)
    )
  );

  await db.transaction(async (tx) => {
    await tx
      .update(fixtureVersions)
      .set({
        status: "archived",
        archivedAt: now,
      })
      .where(
        and(
          eq(fixtureVersions.tournamentId, input.tournamentId),
          eq(fixtureVersions.status, "published"),
          ne(fixtureVersions.id, input.fixtureVersionId)
        )
      );

    await tx
      .update(fixtureVersions)
      .set({
        status: "published",
        publishedAt: now,
      })
      .where(eq(fixtureVersions.id, input.fixtureVersionId));

    await tx
      .update(tournaments)
      .set({
        fixturePublishedAt: now,
        activeFixtureVersion: fixtureVersion.versionNumber,
      })
      .where(eq(tournaments.id, input.tournamentId));

    await tx
      .update(matches)
      .set({
        fixtureStatus: "published",
        publishedAt: now,
        fixtureVersion: fixtureVersion.versionNumber,
      })
      .where(inArray(matches.id, linkedMatchIds));

    await tx
      .update(fixtureRounds)
      .set({
        status: "published",
        publishedAt: now,
      })
      .where(eq(fixtureRounds.fixtureVersionId, input.fixtureVersionId));

    if (stageIds.length > 0) {
      await tx
        .update(tournamentStages)
        .set({
          fixtureStatus: "published",
          publishedAt: now,
          fixtureVersion: fixtureVersion.versionNumber,
        })
        .where(inArray(tournamentStages.id, stageIds));
    }

    await tx.insert(fixtureChangeLog).values({
      tournamentId: input.tournamentId,
      stageId: fixtureVersion.stageId,
      fixtureVersionId: input.fixtureVersionId,
      action: "fixture_version_published",
      reason: input.note,
      payload: JSON.stringify({
        publishedMatchCount: linkedMatchIds.length,
        versionNumber: fixtureVersion.versionNumber,
      }),
    });
  });

  return {
    fixtureVersionId: input.fixtureVersionId,
    publishedAt: now,
    publishedMatchCount: linkedMatchIds.length,
    versionNumber: fixtureVersion.versionNumber,
  };
}

export async function validateFixtureConflicts(
  input: ValidateFixtureConflictsInput
) {
  await requireTournamentExists(input.tournamentId);

  const teamIds = Array.from(new Set(input.teamIds));
  const requestedEnd = getEffectiveEnd(
    input.scheduledStartAt,
    input.scheduledEndAt
  );

  if (requestedEnd <= input.scheduledStartAt) {
    throw new FixtureWorkflowError("INVALID_SCHEDULE_WINDOW");
  }

  const whereClauses = [eq(matches.tournamentId, input.tournamentId)];
  if (input.stageId) {
    whereClauses.push(eq(matches.stageId, input.stageId));
  }
  if (input.excludeMatchId) {
    whereClauses.push(ne(matches.id, input.excludeMatchId));
  }

  const existingMatches = await db
    .select({
      id: matches.id,
      scheduledEndAt: matches.scheduledEndAt,
      scheduledStartAt: matches.scheduledStartAt,
      stageId: matches.stageId,
      team1Id: matches.team1Id,
      team2Id: matches.team2Id,
      venueId: matches.venueId,
    })
    .from(matches)
    .where(and(...whereClauses));

  const conflicts: FixtureConflictItem[] = [];

  for (const scheduledMatch of existingMatches) {
    if (!scheduledMatch.scheduledStartAt) {
      continue;
    }

    const matchStart = scheduledMatch.scheduledStartAt;
    const matchEnd = getEffectiveEnd(
      scheduledMatch.scheduledStartAt,
      scheduledMatch.scheduledEndAt
    );

    if (
      !hasOverlap(input.scheduledStartAt, requestedEnd, matchStart, matchEnd)
    ) {
      continue;
    }

    const conflictingTeamIds = teamIds.filter(
      (teamId) =>
        teamId === scheduledMatch.team1Id || teamId === scheduledMatch.team2Id
    );

    if (conflictingTeamIds.length > 0) {
      conflicts.push({
        conflictType: "team",
        conflictingTeamIds,
        matchId: scheduledMatch.id,
        stageId: scheduledMatch.stageId,
        venueId: scheduledMatch.venueId,
      });
    }

    if (input.venueId && scheduledMatch.venueId === input.venueId) {
      conflicts.push({
        conflictType: "venue",
        conflictingTeamIds,
        matchId: scheduledMatch.id,
        stageId: scheduledMatch.stageId,
        venueId: scheduledMatch.venueId,
      });
    }
  }

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
