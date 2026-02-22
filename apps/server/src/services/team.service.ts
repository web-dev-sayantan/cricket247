import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { teamPlayers, teams, tournamentTeams } from "@/db/schema";

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
}: {
  name: string;
  shortName: string;
  country: string;
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

  return result.id;
}

export class TeamPlayerRegistrationError extends Error {
  code: "PLAYER_ALREADY_REGISTERED_IN_TOURNAMENT" | "TEAM_NOT_IN_TOURNAMENT";
  existingTeamId?: number;

  constructor(
    code: "PLAYER_ALREADY_REGISTERED_IN_TOURNAMENT" | "TEAM_NOT_IN_TOURNAMENT",
    existingTeamId?: number
  ) {
    super(code);
    this.code = code;
    this.existingTeamId = existingTeamId;
  }
}

export async function registerPlayerForTournamentTeam({
  tournamentId,
  teamId,
  playerId,
  isCaptain = false,
  isViceCaptain = false,
}: {
  tournamentId: number;
  teamId: number;
  playerId: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}) {
  const [teamInTournament] = await db
    .select({ id: tournamentTeams.id })
    .from(tournamentTeams)
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentTeams.teamId, teamId)
      )
    )
    .limit(1);

  if (!teamInTournament) {
    throw new TeamPlayerRegistrationError("TEAM_NOT_IN_TOURNAMENT");
  }

  const [existingRegistration] = await db
    .select()
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, tournamentId),
        eq(teamPlayers.playerId, playerId)
      )
    )
    .limit(1);

  if (existingRegistration) {
    if (existingRegistration.teamId !== teamId) {
      throw new TeamPlayerRegistrationError(
        "PLAYER_ALREADY_REGISTERED_IN_TOURNAMENT",
        existingRegistration.teamId
      );
    }

    return existingRegistration;
  }

  const [created] = await db
    .insert(teamPlayers)
    .values({
      tournamentId,
      teamId,
      playerId,
      isCaptain,
      isViceCaptain,
    })
    .returning();

  if (created) {
    return created;
  }

  const [fallback] = await db
    .select()
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, tournamentId),
        eq(teamPlayers.playerId, playerId)
      )
    )
    .limit(1);

  if (!fallback) {
    throw new Error("Failed to create team player registration");
  }

  return fallback;
}

export async function createTeamPlayerAction({
  tournamentId,
  teamId,
  playerId,
  isCaptain,
  isViceCaptain,
}: {
  tournamentId: number;
  teamId: number;
  playerId: number;
  isCaptain: boolean;
  isViceCaptain?: boolean;
}) {
  return await registerPlayerForTournamentTeam({
    tournamentId,
    teamId,
    playerId,
    isCaptain,
    isViceCaptain,
  });
}
