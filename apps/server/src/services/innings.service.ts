import { eq } from "drizzle-orm";

import { db } from "@/db";
import { innings } from "@/db/schema";

export function getInningsById(id: number) {
  return db.query.innings.findFirst({
    where: {
      id,
    },
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
      bowlingTeam: true,
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
  });
}

export function getInningsByMatchId(id: number) {
  return db.query.innings.findMany({
    where: {
      matchId: id,
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
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });
}

export function getInningsByMatchIdAndTeamId(matchId: number, teamId?: number) {
  if (!teamId) {
    return;
  }
  return db.query.innings.findFirst({
    where: {
      matchId,
      battingTeamId: teamId,
    },
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });
}

export async function createInningsAction({
  matchId,
  battingTeamId,
  bowlingTeamId,
  inningsNumber = 1,
  status = "not_started",
  wickets = 0,
  ballsBowled = 0,
  totalScore = 0,
  wides = 0,
  noBalls = 0,
  byes = 0,
  legByes = 0,
  penaltyRuns = 0,
  others = 0,
  targetRuns,
}: {
  matchId: number;
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber?: number;
  status?: string;
  wickets?: number;
  ballsBowled?: number;
  totalScore?: number;
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
  penaltyRuns?: number;
  others?: number;
  targetRuns?: number | null;
}) {
  const newInnings = await db.insert(innings).values({
    matchId,
    battingTeamId,
    bowlingTeamId,
    inningsNumber,
    status,
    wickets,
    ballsBowled,
    totalScore,
    wides,
    noBalls,
    byes,
    legByes,
    penaltyRuns,
    others,
    targetRuns,
  });
  return newInnings.lastInsertRowid;
}

export async function updateInningsAction({
  id,
  status,
  wickets,
  ballsBowled,
  totalScore,
  wides,
  noBalls,
  byes,
  legByes,
  penaltyRuns,
  others,
  targetRuns,
  isCompleted,
}: {
  id: number;
  status?: string;
  wickets?: number;
  ballsBowled?: number;
  totalScore?: number;
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
  penaltyRuns?: number;
  others?: number;
  targetRuns?: number | null;
  isCompleted?: boolean;
}) {
  const updated = await db
    .update(innings)
    .set({
      status,
      wickets,
      ballsBowled,
      totalScore,
      wides,
      noBalls,
      byes,
      legByes,
      penaltyRuns,
      others,
      targetRuns,
      isCompleted,
    })
    .where(eq(innings.id, id))
    .returning();

  return updated[0] ?? null;
}
