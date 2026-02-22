import { db } from "@/db";

export function getLiveTournaments() {
  const now = new Date();
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
