import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  fixtureConstraints,
  fixtureRounds,
  fixtureVersions,
} from "@/db/schema";

const TOURNAMENT_ID = 91_001;
const GROUP_STAGE_ID = 91_001;
const QUARTER_FINAL_STAGE_ID = 91_002;
const GROUP_A_ID = 91_001;
const GROUP_B_ID = 91_002;

const FIXTURE_VERSION_ID = 94_001;
const FIXTURE_VERSION_NUMBER = 1;

interface FixtureRoundSeed {
  fixtureVersionId: number;
  id: number;
  pairingMethod: string;
  roundName: string;
  roundNumber: number;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
  stageGroupId?: number;
  stageId: number;
  status: string;
  tournamentId: number;
}

interface FixtureConstraintSeed {
  constraintType: string;
  id: number;
  priority: number;
  rule: string;
  stageId: number;
  teamId?: number;
  tournamentId: number;
  venueId?: number;
}

const FIXTURE_ROUND_SEEDS: FixtureRoundSeed[] = [
  {
    id: 94_011,
    tournamentId: TOURNAMENT_ID,
    stageId: GROUP_STAGE_ID,
    stageGroupId: GROUP_A_ID,
    fixtureVersionId: FIXTURE_VERSION_ID,
    roundNumber: 1,
    roundName: "Group A - Round 1",
    pairingMethod: "manual",
    status: "draft",
    scheduledStartAt: new Date("2026-04-03T08:30:00.000Z"),
    scheduledEndAt: new Date("2026-04-03T16:30:00.000Z"),
  },
  {
    id: 94_012,
    tournamentId: TOURNAMENT_ID,
    stageId: GROUP_STAGE_ID,
    stageGroupId: GROUP_B_ID,
    fixtureVersionId: FIXTURE_VERSION_ID,
    roundNumber: 1,
    roundName: "Group B - Round 1",
    pairingMethod: "manual",
    status: "draft",
    scheduledStartAt: new Date("2026-04-04T08:30:00.000Z"),
    scheduledEndAt: new Date("2026-04-04T16:30:00.000Z"),
  },
  {
    id: 94_021,
    tournamentId: TOURNAMENT_ID,
    stageId: QUARTER_FINAL_STAGE_ID,
    fixtureVersionId: FIXTURE_VERSION_ID,
    roundNumber: 1,
    roundName: "Quarter Finals",
    pairingMethod: "manual",
    status: "draft",
    scheduledStartAt: new Date("2026-04-20T08:30:00.000Z"),
    scheduledEndAt: new Date("2026-04-20T20:30:00.000Z"),
  },
] as const;

const FIXTURE_CONSTRAINT_SEEDS: FixtureConstraintSeed[] = [
  {
    id: 94_101,
    tournamentId: TOURNAMENT_ID,
    stageId: GROUP_STAGE_ID,
    teamId: 91_101,
    constraintType: "venue_blacklist",
    priority: 10,
    rule: JSON.stringify({
      blockedVenueIds: [92_003],
      reason: "travel_limit",
    }),
  },
  {
    id: 94_102,
    tournamentId: TOURNAMENT_ID,
    stageId: GROUP_STAGE_ID,
    teamId: 91_108,
    constraintType: "no_back_to_back",
    priority: 8,
    rule: JSON.stringify({
      minRestHours: 24,
    }),
  },
  {
    id: 94_103,
    tournamentId: TOURNAMENT_ID,
    stageId: QUARTER_FINAL_STAGE_ID,
    venueId: 92_001,
    constraintType: "venue_lock",
    priority: 6,
    rule: JSON.stringify({
      matchWindow: "knockout",
    }),
  },
] as const;

const seedFixtures = async () => {
  await db.transaction(async (tx) => {
    const getFixtureVersionId = async () => {
      const [fixtureVersion] = await tx
        .select({ id: fixtureVersions.id })
        .from(fixtureVersions)
        .where(
          and(
            eq(fixtureVersions.tournamentId, TOURNAMENT_ID),
            eq(fixtureVersions.versionNumber, FIXTURE_VERSION_NUMBER)
          )
        )
        .limit(1);

      if (!fixtureVersion) {
        throw new Error("Failed to resolve fixture version id after upsert.");
      }

      return fixtureVersion.id;
    };

    const findExistingFixtureRoundId = async (
      fixtureRound: FixtureRoundSeed
    ) => {
      const stageGroupCondition =
        fixtureRound.stageGroupId === undefined
          ? isNull(fixtureRounds.stageGroupId)
          : eq(fixtureRounds.stageGroupId, fixtureRound.stageGroupId);

      const [existingRound] = await tx
        .select({ id: fixtureRounds.id })
        .from(fixtureRounds)
        .where(
          and(
            eq(fixtureRounds.tournamentId, fixtureRound.tournamentId),
            eq(fixtureRounds.stageId, fixtureRound.stageId),
            stageGroupCondition,
            eq(fixtureRounds.roundNumber, fixtureRound.roundNumber)
          )
        )
        .limit(1);

      return existingRound?.id;
    };

    await tx
      .insert(fixtureVersions)
      .values({
        id: FIXTURE_VERSION_ID,
        tournamentId: TOURNAMENT_ID,
        versionNumber: FIXTURE_VERSION_NUMBER,
        status: "draft",
        label: "Initial fixture plan",
      })
      .onConflictDoUpdate({
        target: [fixtureVersions.tournamentId, fixtureVersions.versionNumber],
        set: {
          tournamentId: TOURNAMENT_ID,
          versionNumber: FIXTURE_VERSION_NUMBER,
          status: "draft",
          label: "Initial fixture plan",
        },
      });

    const fixtureVersionId = await getFixtureVersionId();

    for (const fixtureRound of FIXTURE_ROUND_SEEDS) {
      const existingRoundId = await findExistingFixtureRoundId(fixtureRound);
      const resolvedRoundId = existingRoundId ?? fixtureRound.id;

      await tx
        .insert(fixtureRounds)
        .values({
          ...fixtureRound,
          id: resolvedRoundId,
          fixtureVersionId,
        })
        .onConflictDoUpdate({
          target: fixtureRounds.id,
          set: {
            tournamentId: fixtureRound.tournamentId,
            stageId: fixtureRound.stageId,
            stageGroupId: fixtureRound.stageGroupId ?? null,
            fixtureVersionId,
            roundNumber: fixtureRound.roundNumber,
            roundName: fixtureRound.roundName,
            pairingMethod: fixtureRound.pairingMethod,
            status: fixtureRound.status,
            scheduledStartAt: fixtureRound.scheduledStartAt,
            scheduledEndAt: fixtureRound.scheduledEndAt,
          },
        });
    }

    for (const fixtureConstraint of FIXTURE_CONSTRAINT_SEEDS) {
      await tx
        .insert(fixtureConstraints)
        .values(fixtureConstraint)
        .onConflictDoUpdate({
          target: fixtureConstraints.id,
          set: {
            tournamentId: fixtureConstraint.tournamentId,
            stageId: fixtureConstraint.stageId,
            teamId: fixtureConstraint.teamId ?? null,
            venueId: fixtureConstraint.venueId ?? null,
            constraintType: fixtureConstraint.constraintType,
            priority: fixtureConstraint.priority,
            rule: fixtureConstraint.rule,
          },
        });
    }
  });
};

await seedFixtures();
