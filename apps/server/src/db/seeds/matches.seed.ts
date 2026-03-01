import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  fixtureRounds,
  fixtureVersionMatches,
  fixtureVersions,
  matches,
  matchParticipantSources,
} from "@/db/schema";

const TOURNAMENT_ID = 91_001;
const FIXTURE_VERSION_NUMBER = 1;
const GROUP_STAGE_ID = 91_001;
const QUARTER_FINAL_STAGE_ID = 91_002;
const GROUP_A_ID = 91_001;
const GROUP_B_ID = 91_002;

interface MatchSeed {
  fixtureRoundId: number;
  fixtureStatus: string;
  id: number;
  matchDate: Date;
  matchFormatId: number;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
  stageGroupId?: number;
  stageId: number;
  stageRound: number;
  stageSequence: number;
  team1Id: number;
  team2Id: number;
  tournamentId: number;
  venueId: number;
}

interface ParticipantSourceSeed {
  id: number;
  matchId: number;
  sourcePosition?: number;
  sourceStageGroupId?: number;
  sourceStageId?: number;
  sourceTeamId?: number;
  sourceType: string;
  teamSlot: number;
}

const MATCH_SEEDS: MatchSeed[] = [
  {
    id: 95_001,
    tournamentId: TOURNAMENT_ID,
    matchFormatId: 91_001,
    matchDate: new Date("2026-04-03T09:30:00.000Z"),
    team1Id: 91_101,
    team2Id: 91_102,
    stageId: GROUP_STAGE_ID,
    stageGroupId: GROUP_A_ID,
    fixtureRoundId: 94_011,
    stageRound: 1,
    stageSequence: 1,
    fixtureStatus: "published",
    scheduledStartAt: new Date("2026-04-03T09:30:00.000Z"),
    scheduledEndAt: new Date("2026-04-03T13:30:00.000Z"),
    venueId: 92_001,
  },
  {
    id: 95_002,
    tournamentId: TOURNAMENT_ID,
    matchFormatId: 91_001,
    matchDate: new Date("2026-04-04T10:00:00.000Z"),
    team1Id: 91_107,
    team2Id: 91_108,
    stageId: GROUP_STAGE_ID,
    stageGroupId: GROUP_B_ID,
    fixtureRoundId: 94_012,
    stageRound: 1,
    stageSequence: 1,
    fixtureStatus: "published",
    scheduledStartAt: new Date("2026-04-04T10:00:00.000Z"),
    scheduledEndAt: new Date("2026-04-04T14:00:00.000Z"),
    venueId: 92_002,
  },
  {
    id: 95_003,
    tournamentId: TOURNAMENT_ID,
    matchFormatId: 91_001,
    matchDate: new Date("2026-04-20T11:00:00.000Z"),
    team1Id: 91_101,
    team2Id: 91_108,
    stageId: QUARTER_FINAL_STAGE_ID,
    fixtureRoundId: 94_021,
    stageRound: 1,
    stageSequence: 1,
    fixtureStatus: "draft",
    scheduledStartAt: new Date("2026-04-20T11:00:00.000Z"),
    scheduledEndAt: new Date("2026-04-20T15:00:00.000Z"),
    venueId: 92_003,
  },
] as const;

const PARTICIPANT_SOURCE_SEEDS: ParticipantSourceSeed[] = [
  {
    id: 95_101,
    matchId: 95_001,
    teamSlot: 1,
    sourceType: "team",
    sourceTeamId: 91_101,
  },
  {
    id: 95_102,
    matchId: 95_001,
    teamSlot: 2,
    sourceType: "team",
    sourceTeamId: 91_102,
  },
  {
    id: 95_103,
    matchId: 95_002,
    teamSlot: 1,
    sourceType: "team",
    sourceTeamId: 91_107,
  },
  {
    id: 95_104,
    matchId: 95_002,
    teamSlot: 2,
    sourceType: "team",
    sourceTeamId: 91_108,
  },
  {
    id: 95_105,
    matchId: 95_003,
    teamSlot: 1,
    sourceType: "advancement",
    sourceStageId: GROUP_STAGE_ID,
    sourceStageGroupId: GROUP_A_ID,
    sourcePosition: 1,
  },
  {
    id: 95_106,
    matchId: 95_003,
    teamSlot: 2,
    sourceType: "advancement",
    sourceStageId: GROUP_STAGE_ID,
    sourceStageGroupId: GROUP_B_ID,
    sourcePosition: 2,
  },
] as const;

const FIXTURE_VERSION_MATCH_SEEDS = [
  {
    id: 95_201,
    matchId: 95_001,
    sequence: 1,
  },
  {
    id: 95_202,
    matchId: 95_002,
    sequence: 2,
  },
  {
    id: 95_203,
    matchId: 95_003,
    sequence: 3,
  },
] as const;

const seedMatches = async () => {
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
        throw new Error("Fixture version not found. Run fixtures seed first.");
      }

      return fixtureVersion.id;
    };

    const getFixtureRoundId = async (match: MatchSeed) => {
      const stageGroupCondition =
        match.stageGroupId === undefined
          ? isNull(fixtureRounds.stageGroupId)
          : eq(fixtureRounds.stageGroupId, match.stageGroupId);

      const [fixtureRound] = await tx
        .select({ id: fixtureRounds.id })
        .from(fixtureRounds)
        .where(
          and(
            eq(fixtureRounds.tournamentId, match.tournamentId),
            eq(fixtureRounds.stageId, match.stageId),
            stageGroupCondition,
            eq(fixtureRounds.roundNumber, match.stageRound)
          )
        )
        .limit(1);

      if (!fixtureRound) {
        throw new Error(
          `Fixture round not found for stage ${match.stageId}, group ${match.stageGroupId ?? "none"}, round ${match.stageRound}.`
        );
      }

      return fixtureRound.id;
    };

    const fixtureVersionId = await getFixtureVersionId();

    for (const match of MATCH_SEEDS) {
      const fixtureRoundId = await getFixtureRoundId(match);

      await tx
        .insert(matches)
        .values({
          ...match,
          fixtureRoundId,
        })
        .onConflictDoUpdate({
          target: matches.id,
          set: {
            tournamentId: match.tournamentId,
            matchFormatId: match.matchFormatId,
            matchDate: match.matchDate,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            stageId: match.stageId,
            stageGroupId: match.stageGroupId ?? null,
            fixtureRoundId,
            stageRound: match.stageRound,
            stageSequence: match.stageSequence,
            fixtureStatus: match.fixtureStatus,
            scheduledStartAt: match.scheduledStartAt,
            scheduledEndAt: match.scheduledEndAt,
            venueId: match.venueId,
          },
        });
    }

    for (const participantSource of PARTICIPANT_SOURCE_SEEDS) {
      await tx
        .insert(matchParticipantSources)
        .values(participantSource)
        .onConflictDoUpdate({
          target: matchParticipantSources.id,
          set: {
            matchId: participantSource.matchId,
            teamSlot: participantSource.teamSlot,
            sourceType: participantSource.sourceType,
            sourceTeamId: participantSource.sourceTeamId ?? null,
            sourceStageId: participantSource.sourceStageId ?? null,
            sourceStageGroupId: participantSource.sourceStageGroupId ?? null,
            sourcePosition: participantSource.sourcePosition ?? null,
          },
        });
    }

    for (const fixtureVersionMatch of FIXTURE_VERSION_MATCH_SEEDS) {
      await tx
        .insert(fixtureVersionMatches)
        .values({
          ...fixtureVersionMatch,
          fixtureVersionId,
        })
        .onConflictDoUpdate({
          target: fixtureVersionMatches.id,
          set: {
            fixtureVersionId,
            matchId: fixtureVersionMatch.matchId,
            sequence: fixtureVersionMatch.sequence,
            snapshot: "{}",
          },
        });
    }
  });
};

await seedMatches();
