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
