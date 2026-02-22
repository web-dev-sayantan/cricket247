import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playerInningsStats, players } from "@/db/schema";
import type { NewPlayerInningsStats, Player } from "@/db/types";

export const getAllPlayers: () => Promise<Player[]> = async () =>
  await db.select().from(players);

export async function getPlayerById(id: number) {
  return await db.select().from(players).where(eq(players.id, id)).limit(1);
}

export async function getPlayerMatchPerformance(
  playerId: number,
  matchId: number,
  inningsId?: number
) {
  return await db
    .select()
    .from(playerInningsStats)
    .where(
      inningsId
        ? and(
            eq(playerInningsStats.playerId, playerId),
            eq(playerInningsStats.matchId, matchId),
            eq(playerInningsStats.inningsId, inningsId)
          )
        : and(
            eq(playerInningsStats.playerId, playerId),
            eq(playerInningsStats.matchId, matchId)
          )
    )
    .orderBy(desc(playerInningsStats.id))
    .limit(1);
}

export async function createPlayerAction({
  name,
  dob,
  sex,
  role,
  battingStance,
  bowlingStance,
  isWicketKeeper,
  nationality,
  image,
}: {
  name: string;
  dob: Date;
  sex: string;
  role: string;
  battingStance: string;
  bowlingStance?: string;
  isWicketKeeper?: boolean;
  nationality?: string;
  image?: string;
}) {
  const result = await db.insert(players).values({
    name,
    dob,
    sex,
    role,
    battingStance,
    bowlingStance,
    isWicketKeeper: !!isWicketKeeper,
    nationality,
    image,
  });

  return result ?? null;
}

export async function createPlayerPerformanceAction({
  inningsId,
  matchId,
  playerId,
  teamId,
  battingOrder,
}: Pick<
  NewPlayerInningsStats,
  "inningsId" | "matchId" | "playerId" | "teamId" | "battingOrder"
>) {
  await db
    .insert(playerInningsStats)
    .values({
      inningsId,
      matchId,
      playerId,
      teamId,
      battingOrder,
    })
    .onConflictDoNothing({
      target: [playerInningsStats.inningsId, playerInningsStats.playerId],
    });
}

export async function updatePlayerPerformanceAction(
  playerStats: NewPlayerInningsStats
) {
  if (!(playerStats.inningsId && playerStats.playerId)) {
    throw new Error("inningsId and playerId are required to update stats");
  }

  await db
    .update(playerInningsStats)
    .set(playerStats)
    .where(
      and(
        eq(playerInningsStats.inningsId, playerStats.inningsId),
        eq(playerInningsStats.playerId, playerStats.playerId)
      )
    );
}
