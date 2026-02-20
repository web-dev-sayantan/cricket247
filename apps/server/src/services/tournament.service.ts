import { and, asc, desc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";

export function getLiveTournaments() {
  const now = new Date();
  return db.query.tournaments.findMany({
    where: and(lte(tournaments.startDate, now), gte(tournaments.endDate, now)),
    orderBy: [asc(tournaments.startDate)],
  });
}

export function getAllTournaments() {
  return db.query.tournaments.findMany({
    orderBy: [desc(tournaments.startDate)],
  });
}
