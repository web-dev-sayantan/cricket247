import { db } from "@/db";
import { getCurrentDate } from "@/utils";

export function getLiveTournaments() {
  const now = getCurrentDate();
  return db.query.tournaments.findMany({
    where: {
      startDate: {
        lte: now,
      },
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });
}

export function getAllTournaments() {
  return db.query.tournaments.findMany({
    orderBy: {
      startDate: "desc",
    },
  });
}

export function getTournamentStructure(tournamentId: number) {
  return db.query.tournamentStages.findMany({
    where: {
      tournamentId,
    },
    orderBy: {
      sequence: "asc",
    },
    with: {
      groups: {
        orderBy: {
          sequence: "asc",
        },
      },
      teamEntries: true,
      sourceAdvancements: true,
      targetAdvancements: true,
      matches: true,
    },
  });
}

export async function getTournamentPlayers(tournamentId: number) {
  const registrations = await db.query.teamPlayers.findMany({
    where: {
      tournamentId,
    },
    with: {
      player: true,
      team: true,
    },
  });

  const registrationsWithDetails = registrations.filter(
    (
      registration
    ): registration is typeof registration & {
      player: NonNullable<typeof registration.player>;
      team: NonNullable<typeof registration.team>;
    } => registration.player !== null && registration.team !== null
  );

  return registrationsWithDetails
    .sort((first, second) =>
      first.player.name.localeCompare(second.player.name)
    )
    .map((registration) => ({
      playerId: registration.player.id,
      playerName: registration.player.name,
      teamId: registration.team.id,
      teamName: registration.team.name,
    }));
}
