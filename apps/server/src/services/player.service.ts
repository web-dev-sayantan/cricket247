import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  organizations,
  playerInningsStats,
  players,
  teamPlayers,
  teams,
  tournaments,
} from "@/db/schema";
import type {
  CurrentTeamRegistration,
  NewPlayerInningsStats,
  Player,
  PlayerWithCurrentTeams,
} from "@/db/types";

export const getAllPlayers: () => Promise<Player[]> = async () =>
  await db.select().from(players);

export const getPlayersWithCurrentTeams: () => Promise<
  PlayerWithCurrentTeams[]
> = async () => {
  const now = new Date();
  const [allPlayers, liveTournamentMemberships] = await Promise.all([
    db.select().from(players),
    db
      .select({
        isCaptain: teamPlayers.isCaptain,
        isViceCaptain: teamPlayers.isViceCaptain,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        playerId: teamPlayers.playerId,
        teamId: teams.id,
        teamName: teams.name,
        teamShortName: teams.shortName,
        tournamentCategory: tournaments.category,
        tournamentId: tournaments.id,
        tournamentName: tournaments.name,
      })
      .from(teamPlayers)
      .innerJoin(teams, eq(teamPlayers.teamId, teams.id))
      .innerJoin(tournaments, eq(teamPlayers.tournamentId, tournaments.id))
      .innerJoin(
        organizations,
        eq(tournaments.organizationId, organizations.id)
      )
      .where(
        and(lte(tournaments.startDate, now), gte(tournaments.endDate, now))
      ),
  ]);

  const currentTeamsByPlayerId = new Map<number, CurrentTeamRegistration[]>();

  for (const row of liveTournamentMemberships) {
    const current = currentTeamsByPlayerId.get(row.playerId) ?? [];
    current.push({
      isCaptain: row.isCaptain,
      isViceCaptain: row.isViceCaptain,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortName: row.teamShortName,
      tournamentCategory: row.tournamentCategory,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
    });
    currentTeamsByPlayerId.set(row.playerId, current);
  }

  return allPlayers.map((player) => ({
    ...player,
    currentTeams: currentTeamsByPlayerId.get(player.id) ?? [],
  }));
};

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
