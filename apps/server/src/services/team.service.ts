import { db } from "@/db";
import { teamPlayers, teams } from "@/db/schema";

export const getAllTeams = () => db.select().from(teams);

export async function createTeamAction({
  name,
  shortName,
  captain,
}: {
  name: string;
  shortName: string;
  captain: number;
}) {
  const result = await db
    .insert(teams)
    .values({
      name,
      shortName,
    })
    .returning();
  if (result) {
    await db
      .insert(teamPlayers)
      .values({ teamId: result[0].id, playerId: captain, isCaptain: true });
    return result[0].id;
  }
  return null;
}

export async function createTeamPlayerAction({
  teamId,
  playerId,
  isCaptain,
}: {
  teamId: number;
  playerId: number;
  isCaptain: boolean;
}) {
  const result = await db
    .insert(teamPlayers)
    .values({ teamId, playerId, isCaptain });
  if (result) {
    return result;
  }
  return null;
}
