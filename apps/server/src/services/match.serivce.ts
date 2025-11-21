import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";

export function getLiveMatches() {
  return db.query.matches.findMany({
    where: eq(matches.isLive, true),
    with: {
      team1: true,
      team2: true,
    },
  });
}
