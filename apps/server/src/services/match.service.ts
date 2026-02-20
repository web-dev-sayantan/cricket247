import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";

export function getLiveMatches() {
  return db.query.matches.findMany({
    where: eq(matches.isLive, true),
    with: {
      team1: true,
      team2: true,
      tossWinner: true,
      innings: true,
    },
  });
}

export function getCompletedMatches() {
  return db.query.matches.findMany({
    where: eq(matches.isCompleted, true),
    with: {
      team1: true,
      team2: true,
      tossWinner: true,
      winner: true,
      innings: true,
    },
    orderBy: (matches, { desc }) => [desc(matches.matchDate)],
  });
}

export async function getAllMatches() {
  const allMatches = await db.query.matches.findMany({
    with: {
      innings: true,
      team1: true,
      team2: true,
      tossWinner: true,
    },
  });
  return allMatches;
}

export async function getMatchById(id: number) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    with: {
      team1: {
        with: {
          teamPlayers: {
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      team2: {
        with: {
          teamPlayers: {
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return match;
}

export async function createMatchAction({
  matchDate,
  tossWinnerId,
  tournamentId,
  tossDecision,
  team1Id,
  team2Id,
  oversPerSide,
  maxOverPerBowler,
  winnerId,
  result,
  ranked,
  hasLBW,
  hasBye,
  hasLegBye,
  hasBoundaryOut,
  hasSuperOver,
  venueId,
  notes,
}: {
  matchDate?: Date;
  tournamentId?: number;
  tossWinnerId: number;
  tossDecision: string;
  team1Id: number;
  team2Id: number;
  oversPerSide: number;
  maxOverPerBowler: number;
  winnerId?: number;
  result?: string;
  ranked?: boolean;
  hasLBW?: boolean;
  hasBye?: boolean;
  hasLegBye?: boolean;
  hasBoundaryOut?: boolean;
  hasSuperOver?: boolean;
  venueId?: number;
  notes?: string;
}) {
  const newMatch = await db.insert(matches).values({
    matchDate: matchDate ? new Date(matchDate) : new Date(),
    tournamentId,
    tossWinnerId,
    tossDecision,
    team1Id,
    team2Id,
    oversPerSide,
    maxOverPerBowler,
    winnerId,
    result,
    ranked,
    hasLBW,
    hasBye,
    hasLegBye,
    hasBoundaryOut,
    hasSuperOver,
    venueId: venueId || null,
    notes: notes || "",
    isLive: false,
  });

  return newMatch.rows;
}
