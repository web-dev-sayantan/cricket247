import { db } from "@/db";
import { deliveries, innings, matchLineup } from "@/db/schema";

const MATCH_ID = 95_001;
const TEAM_1_ID = 91_101;
const TEAM_2_ID = 91_102;

interface MatchLineupSeed {
  battingOrder: number;
  id: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isWicketKeeper?: boolean;
  matchId: number;
  playerId: number;
  teamId: number;
}

interface InningsSeed {
  ballsBowled: number;
  battingTeamId: number;
  bowlingTeamId: number;
  id: number;
  inningsNumber: number;
  isCompleted: boolean;
  matchId: number;
  status: string;
  targetRuns?: number;
  totalScore: number;
  wickets: number;
}

const MATCH_LINEUP_SEEDS: MatchLineupSeed[] = [
  {
    id: 96_101,
    matchId: MATCH_ID,
    teamId: TEAM_1_ID,
    playerId: 93_101,
    battingOrder: 1,
    isCaptain: true,
  },
  {
    id: 96_102,
    matchId: MATCH_ID,
    teamId: TEAM_1_ID,
    playerId: 93_102,
    battingOrder: 2,
    isViceCaptain: true,
  },
  {
    id: 96_103,
    matchId: MATCH_ID,
    teamId: TEAM_2_ID,
    playerId: 93_103,
    battingOrder: 1,
    isCaptain: true,
  },
  {
    id: 96_104,
    matchId: MATCH_ID,
    teamId: TEAM_2_ID,
    playerId: 93_104,
    battingOrder: 2,
    isWicketKeeper: true,
    isViceCaptain: true,
  },
] as const;

const INNINGS_SEEDS: InningsSeed[] = [
  {
    id: 96_201,
    matchId: MATCH_ID,
    battingTeamId: TEAM_1_ID,
    bowlingTeamId: TEAM_2_ID,
    inningsNumber: 1,
    status: "completed",
    totalScore: 12,
    wickets: 1,
    ballsBowled: 6,
    isCompleted: true,
  },
  {
    id: 96_202,
    matchId: MATCH_ID,
    battingTeamId: TEAM_2_ID,
    bowlingTeamId: TEAM_1_ID,
    inningsNumber: 2,
    status: "in_progress",
    totalScore: 5,
    wickets: 0,
    ballsBowled: 3,
    targetRuns: 13,
    isCompleted: false,
  },
] as const;

const DELIVERY_SEEDS = [
  {
    id: 96_301,
    inningsId: 96_201,
    sequenceNo: 1,
    overNumber: 1,
    ballInOver: 1,
    strikerId: 93_101,
    nonStrikerId: 93_102,
    bowlerId: 93_103,
    batterRuns: 1,
    totalRuns: 1,
  },
  {
    id: 96_302,
    inningsId: 96_201,
    sequenceNo: 2,
    overNumber: 1,
    ballInOver: 2,
    strikerId: 93_102,
    nonStrikerId: 93_101,
    bowlerId: 93_103,
    batterRuns: 4,
    totalRuns: 4,
  },
  {
    id: 96_303,
    inningsId: 96_202,
    sequenceNo: 1,
    overNumber: 1,
    ballInOver: 1,
    strikerId: 93_103,
    nonStrikerId: 93_104,
    bowlerId: 93_101,
    batterRuns: 2,
    totalRuns: 2,
  },
  {
    id: 96_304,
    inningsId: 96_202,
    sequenceNo: 2,
    overNumber: 1,
    ballInOver: 2,
    strikerId: 93_103,
    nonStrikerId: 93_104,
    bowlerId: 93_101,
    batterRuns: 3,
    totalRuns: 3,
  },
] as const;

const seedScoring = async () => {
  await db.transaction(async (tx) => {
    for (const lineupEntry of MATCH_LINEUP_SEEDS) {
      await tx
        .insert(matchLineup)
        .values(lineupEntry)
        .onConflictDoUpdate({
          target: matchLineup.id,
          set: {
            matchId: lineupEntry.matchId,
            teamId: lineupEntry.teamId,
            playerId: lineupEntry.playerId,
            battingOrder: lineupEntry.battingOrder,
            isCaptain: lineupEntry.isCaptain ?? false,
            isViceCaptain: lineupEntry.isViceCaptain ?? false,
            isWicketKeeper: lineupEntry.isWicketKeeper ?? false,
          },
        });
    }

    for (const inningsEntry of INNINGS_SEEDS) {
      await tx
        .insert(innings)
        .values(inningsEntry)
        .onConflictDoUpdate({
          target: innings.id,
          set: {
            matchId: inningsEntry.matchId,
            battingTeamId: inningsEntry.battingTeamId,
            bowlingTeamId: inningsEntry.bowlingTeamId,
            inningsNumber: inningsEntry.inningsNumber,
            status: inningsEntry.status,
            totalScore: inningsEntry.totalScore,
            wickets: inningsEntry.wickets,
            ballsBowled: inningsEntry.ballsBowled,
            targetRuns: inningsEntry.targetRuns ?? null,
            isCompleted: inningsEntry.isCompleted,
          },
        });
    }

    for (const delivery of DELIVERY_SEEDS) {
      await tx
        .insert(deliveries)
        .values(delivery)
        .onConflictDoUpdate({
          target: deliveries.id,
          set: {
            inningsId: delivery.inningsId,
            sequenceNo: delivery.sequenceNo,
            overNumber: delivery.overNumber,
            ballInOver: delivery.ballInOver,
            strikerId: delivery.strikerId,
            nonStrikerId: delivery.nonStrikerId,
            bowlerId: delivery.bowlerId,
            batterRuns: delivery.batterRuns,
            totalRuns: delivery.totalRuns,
          },
        });
    }
  });
};

await seedScoring();
