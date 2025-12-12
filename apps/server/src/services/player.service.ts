import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playerMatchPerformance, players } from "@/db/schema";
import type { NewPlayerMatchPerformance, Player } from "@/db/types";

export const getAllPlayers: () => Promise<Player[]> = async () =>
  await db.select().from(players);

export async function getPlayerById(id: number) {
  return await db.select().from(players).where(eq(players.id, id)).limit(1);
}

export async function getPlayerMatchPerformance(
  playerId: number,
  matchId: number
) {
  return await db
    .select()
    .from(playerMatchPerformance)
    .where(
      and(
        eq(playerMatchPerformance.playerId, playerId),
        eq(playerMatchPerformance.matchId, matchId)
      )
    )
    .limit(1);
}

export async function createPlayerAction({
  name,
  age,
  battingStance,
  bowlingStance,
  isWicketKeeper,
}: {
  name: string;
  age: number;
  battingStance: string;
  bowlingStance: string;
  isWicketKeeper?: boolean;
}) {
  const result = await db.insert(players).values({
    name,
    age,
    battingStance,
    bowlingStance,
    isWicketKeeper: !!isWicketKeeper,
  });
  if (result) {
    return result;
  }
  return null;
}

export async function createPlayerPerformanceAction({
  matchId,
  playerId,
  teamId,
}: NewPlayerMatchPerformance) {
  await db.insert(playerMatchPerformance).values({
    matchId,
    playerId,
    teamId,
  });
}

export async function updatePlayerPerformanceAction(
  playerMatchPerformanceStats: NewPlayerMatchPerformance
) {
  await db
    .update(playerMatchPerformance)
    .set(playerMatchPerformanceStats)
    .where(
      and(
        eq(
          playerMatchPerformance.playerId,
          playerMatchPerformanceStats.playerId
        ),
        eq(playerMatchPerformance.matchId, playerMatchPerformanceStats.matchId)
      )
    );
}
