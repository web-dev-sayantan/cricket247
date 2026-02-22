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
  country,
  captain,
}: {
  name: string;
  shortName: string;
  country: string;
  captain?: number;
}) {
  const [result] = await db
    .insert(teams)
    .values({
      name,
      shortName,
      country,
    })
    .returning();

  if (!result) {
    return null;
  }

  if (captain) {
    await db
      .insert(teamPlayers)
      .values({ teamId: result.id, playerId: captain, isCaptain: true })
      .onConflictDoNothing({
        target: [teamPlayers.teamId, teamPlayers.playerId],
      });
  }

  return result.id;
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
    .values({ teamId, playerId, isCaptain })
    .onConflictDoNothing({
      target: [teamPlayers.teamId, teamPlayers.playerId],
    });

  if (result) {
    return result;
  }
  return null;
}
