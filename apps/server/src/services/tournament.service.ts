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
