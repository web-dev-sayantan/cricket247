import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import {
  players,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
} from "@/db/schema";
import { getCurrentDate } from "@/utils";

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

export const getTeamTournaments = (teamId: number) =>
  db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
    })
    .from(tournamentTeams)
    .innerJoin(tournaments, eq(tournaments.id, tournamentTeams.tournamentId))
    .where(eq(tournamentTeams.teamId, teamId));

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

export class TeamRosterManagementError extends Error {
  code:
    | "TEAM_NOT_IN_TOURNAMENT"
    | "TOURNAMENT_NOT_FOUND"
    | "ASSIGNMENT_NOT_FOUND"
    | "PLAYER_NOT_REGISTERED_IN_TOURNAMENT"
    | "ASSIGNMENT_CHANGED"
    | "REASSIGN_CONFIRMATION_REQUIRED"
    | "REASSIGN_NOT_ALLOWED_AFTER_START";

  constructor(
    code:
      | "TEAM_NOT_IN_TOURNAMENT"
      | "TOURNAMENT_NOT_FOUND"
      | "ASSIGNMENT_NOT_FOUND"
      | "PLAYER_NOT_REGISTERED_IN_TOURNAMENT"
      | "ASSIGNMENT_CHANGED"
      | "REASSIGN_CONFIRMATION_REQUIRED"
      | "REASSIGN_NOT_ALLOWED_AFTER_START"
  ) {
    super(code);
    this.code = code;
  }
}

async function assertTeamInTournamentOrThrow(params: {
  tournamentId: number;
  teamId: number;
}) {
  const [teamInTournament] = await db
    .select({ id: tournamentTeams.id })
    .from(tournamentTeams)
    .where(
      and(
        eq(tournamentTeams.tournamentId, params.tournamentId),
        eq(tournamentTeams.teamId, params.teamId)
      )
    )
    .limit(1);

  if (!teamInTournament) {
    throw new TeamRosterManagementError("TEAM_NOT_IN_TOURNAMENT");
  }
}

export async function getTournamentTeamRoster({
  tournamentId,
  teamId,
}: {
  tournamentId: number;
  teamId: number;
}) {
  await assertTeamInTournamentOrThrow({ tournamentId, teamId });

  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new TeamRosterManagementError("TOURNAMENT_NOT_FOUND");
  }

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      shortName: teams.shortName,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    throw new TeamRosterManagementError("TEAM_NOT_IN_TOURNAMENT");
  }

  const rosterRows = await db
    .select({
      playerId: players.id,
      playerName: players.name,
      playerRole: players.role,
      playerNationality: players.nationality,
      playerImage: players.image,
      registrationId: teamPlayers.id,
      registrationTeamId: teamPlayers.teamId,
      isCaptain: teamPlayers.isCaptain,
      isViceCaptain: teamPlayers.isViceCaptain,
      assignedTeamName: teams.name,
      assignedTeamShortName: teams.shortName,
    })
    .from(players)
    .leftJoin(
      teamPlayers,
      and(
        eq(teamPlayers.playerId, players.id),
        eq(teamPlayers.tournamentId, tournamentId)
      )
    )
    .leftJoin(teams, eq(teams.id, teamPlayers.teamId))
    .orderBy(players.name);

  const assignedPlayers = rosterRows
    .filter(
      (row) =>
        typeof row.registrationId === "number" &&
        row.registrationTeamId === teamId
    )
    .map((row) => ({
      registrationId: row.registrationId,
      playerId: row.playerId,
      name: row.playerName,
      role: row.playerRole,
      nationality: row.playerNationality,
      image: row.playerImage,
      isCaptain: row.isCaptain ?? false,
      isViceCaptain: row.isViceCaptain ?? false,
    }));

  const availablePlayers = rosterRows
    .filter((row) => row.registrationId === null)
    .map((row) => ({
      playerId: row.playerId,
      name: row.playerName,
      role: row.playerRole,
      nationality: row.playerNationality,
      image: row.playerImage,
    }));

  const conflictedPlayers = rosterRows
    .filter(
      (row) =>
        typeof row.registrationId === "number" &&
        row.registrationTeamId !== null &&
        row.registrationTeamId !== teamId
    )
    .map((row) => ({
      registrationId: row.registrationId,
      playerId: row.playerId,
      name: row.playerName,
      role: row.playerRole,
      nationality: row.playerNationality,
      image: row.playerImage,
      assignedTeamId: row.registrationTeamId,
      assignedTeamName: row.assignedTeamName,
      assignedTeamShortName: row.assignedTeamShortName,
    }));

  return {
    tournament,
    team,
    assignedPlayers,
    availablePlayers,
    conflictedPlayers,
  };
}

export async function unassignPlayerFromTournamentTeam({
  tournamentId,
  teamId,
  playerId,
}: {
  tournamentId: number;
  teamId: number;
  playerId: number;
}) {
  await assertTeamInTournamentOrThrow({ tournamentId, teamId });

  const deletedRows = await db
    .delete(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, tournamentId),
        eq(teamPlayers.teamId, teamId),
        eq(teamPlayers.playerId, playerId)
      )
    )
    .returning({ id: teamPlayers.id });

  if (deletedRows.length === 0) {
    throw new TeamRosterManagementError("ASSIGNMENT_NOT_FOUND");
  }

  return {
    tournamentId,
    teamId,
    playerId,
  };
}

export async function reassignPlayerInTournament({
  tournamentId,
  toTeamId,
  playerId,
  confirmReassign,
  expectedFromTeamId,
}: {
  tournamentId: number;
  toTeamId: number;
  playerId: number;
  confirmReassign: boolean;
  expectedFromTeamId?: number;
}) {
  if (!confirmReassign) {
    throw new TeamRosterManagementError("REASSIGN_CONFIRMATION_REQUIRED");
  }

  await assertTeamInTournamentOrThrow({ tournamentId, teamId: toTeamId });

  const [tournament] = await db
    .select({
      id: tournaments.id,
      startDate: tournaments.startDate,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new TeamRosterManagementError("TOURNAMENT_NOT_FOUND");
  }

  if (tournament.startDate <= getCurrentDate()) {
    throw new TeamRosterManagementError("REASSIGN_NOT_ALLOWED_AFTER_START");
  }

  const [existingRegistration] = await db
    .select({
      id: teamPlayers.id,
      teamId: teamPlayers.teamId,
    })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, tournamentId),
        eq(teamPlayers.playerId, playerId)
      )
    )
    .limit(1);

  if (!existingRegistration) {
    throw new TeamRosterManagementError("PLAYER_NOT_REGISTERED_IN_TOURNAMENT");
  }

  if (
    typeof expectedFromTeamId === "number" &&
    existingRegistration.teamId !== expectedFromTeamId
  ) {
    throw new TeamRosterManagementError("ASSIGNMENT_CHANGED");
  }

  if (existingRegistration.teamId === toTeamId) {
    return {
      id: existingRegistration.id,
      tournamentId,
      teamId: toTeamId,
      playerId,
      isCaptain: false,
      isViceCaptain: false,
    };
  }

  const [updated] = await db
    .update(teamPlayers)
    .set({
      teamId: toTeamId,
      isCaptain: false,
      isViceCaptain: false,
    })
    .where(eq(teamPlayers.id, existingRegistration.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to reassign player");
  }

  return updated;
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
