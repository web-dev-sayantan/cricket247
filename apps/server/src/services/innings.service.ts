import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { innings } from "@/db/schema";

export function getInningsById(id: number) {
  return db.query.innings.findFirst({
    where: eq(innings.id, id),
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
    },
  });
}
export function getInningsByMatchId(id: number) {
  return db.query.innings.findMany({
    where: eq(innings.matchId, id),
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
      balls: true,
    },
  });
}

export function getInningsByMatchIdAndTeamId(matchId: number, teamId?: number) {
  if (!teamId) {
    return;
  }
  return db.query.innings.findFirst({
    where: and(eq(innings.matchId, matchId), eq(innings.battingTeamId, teamId)),
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
    },
  });
}

export async function createInningsAction({
  matchId,
  battingTeamId,
  bowlingTeamId,
  wickets = 0,
  ballsBowled = 0,
  extras = 0,
  totalScore = 0,
}: {
  matchId: number;
  battingTeamId: number;
  bowlingTeamId: number;
  wickets: number;
  ballsBowled: number;
  extras: number;
  totalScore: number;
}) {
  const newInnings = await db.insert(innings).values({
    matchId,
    battingTeamId,
    bowlingTeamId,
    wickets,
    ballsBowled,
    extras,
    totalScore,
  });
  return newInnings.lastInsertRowid;
}

export async function updateInningsAction({
  id,
  wickets = 0,
  ballsBowled = 0,
  extras = 0,
  totalScore = 0,
}: {
  id: number;
  wickets: number;
  ballsBowled: number;
  extras: number;
  totalScore: number;
}) {
  const newInnings = await db
    .update(innings)
    .set({
      id,
      wickets,
      ballsBowled,
      extras,
      totalScore,
    })
    .where(eq(innings.id, id))
    .returning();
  return newInnings[0];
}
