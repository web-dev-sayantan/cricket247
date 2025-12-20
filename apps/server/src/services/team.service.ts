import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { teamPlayers, teams } from "@/db/schema";

export const getAllTeams = () => db.select().from(teams);

export const getTeamById = (id: number) =>
  db
    .select()
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1)
    .then((res) => res[0]);

export const getTeamsByName = (name: string) =>
  db
    .select()
    .from(teams)
    .where(like(teams.name, `${name}%`));

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
