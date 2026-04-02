import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { players, teamPlayers, user } from "@/db/schema";

interface MatchScoringContext {
  team1Id: null | number;
  team2Id: null | number;
  tournamentId: number;
}

interface UserSummary {
  id: number;
  role: string;
}

export interface TournamentScoringPermissionContext {
  canScoreAnyMatch: boolean;
  eligibleTeamIds: Set<number>;
}

async function getUserSummaryByEmail(
  email: string
): Promise<null | UserSummary> {
  const rows = await db
    .select({
      id: user.id,
      role: user.role,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return rows[0] ?? null;
}

async function getLinkedPlayerIdByUserId(userId: number) {
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.userId, userId))
    .limit(1);

  return rows[0]?.id ?? null;
}

export async function getTournamentScoringPermissionContext(params: {
  email?: string;
  tournamentId: number;
}): Promise<TournamentScoringPermissionContext> {
  if (!params.email) {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const userRecord = await getUserSummaryByEmail(params.email);
  if (!userRecord) {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  if (userRecord.role === "admin") {
    return {
      canScoreAnyMatch: true,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const linkedPlayerId = await getLinkedPlayerIdByUserId(userRecord.id);
  if (typeof linkedPlayerId !== "number") {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const rows = await db
    .select({ teamId: teamPlayers.teamId })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, params.tournamentId),
        eq(teamPlayers.playerId, linkedPlayerId)
      )
    );

  return {
    canScoreAnyMatch: false,
    eligibleTeamIds: new Set(rows.map((row) => row.teamId)),
  };
}

export function canCurrentUserScoreFixtureMatch(
  match: Pick<MatchScoringContext, "team1Id" | "team2Id">,
  scoringPermission: TournamentScoringPermissionContext
) {
  if (typeof match.team1Id !== "number" || typeof match.team2Id !== "number") {
    return false;
  }

  if (scoringPermission.canScoreAnyMatch) {
    return true;
  }

  return (
    scoringPermission.eligibleTeamIds.has(match.team1Id) ||
    scoringPermission.eligibleTeamIds.has(match.team2Id)
  );
}

export async function canUserScoreMatchByEmail(params: {
  email?: string;
  match: MatchScoringContext;
}) {
  if (!params.email) {
    return false;
  }

  const userRecord = await getUserSummaryByEmail(params.email);
  if (!userRecord) {
    return false;
  }

  if (
    typeof params.match.team1Id !== "number" ||
    typeof params.match.team2Id !== "number"
  ) {
    return false;
  }

  if (userRecord.role === "admin") {
    return true;
  }

  const linkedPlayerId = await getLinkedPlayerIdByUserId(userRecord.id);
  if (typeof linkedPlayerId !== "number") {
    return false;
  }

  const rows = await db
    .select({ id: teamPlayers.id })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, params.match.tournamentId),
        eq(teamPlayers.playerId, linkedPlayerId),
        inArray(teamPlayers.teamId, [
          params.match.team1Id,
          params.match.team2Id,
        ])
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function requireScoreAccessByEmail(params: {
  email: string;
  match: MatchScoringContext;
}) {
  const canScore = await canUserScoreMatchByEmail(params);
  if (!canScore) {
    throw new ORPCError("FORBIDDEN");
  }
}

export function getScoringMatchById(matchId: number) {
  return db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    columns: {
      id: true,
      tournamentId: true,
      team1Id: true,
      team2Id: true,
    },
  });
}

export function getScoringMatchStatusById(matchId: number) {
  return db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    columns: {
      id: true,
      isLive: true,
      tournamentId: true,
      team1Id: true,
      team2Id: true,
    },
  });
}

export function getScoringMatchLineupConfigById(matchId: number) {
  return db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    columns: {
      id: true,
      tournamentId: true,
      team1Id: true,
      team2Id: true,
      playersPerSide: true,
    },
  });
}

export async function getScoringMatchByInningsId(inningsId: number) {
  const inningsRow = await db.query.innings.findFirst({
    where: {
      id: inningsId,
    },
    columns: {
      matchId: true,
    },
  });

  if (!inningsRow) {
    return null;
  }

  return getScoringMatchById(inningsRow.matchId);
}

export async function getScoringMatchByDeliveryId(deliveryId: number) {
  const deliveryRow = await db.query.deliveries.findFirst({
    where: {
      id: deliveryId,
    },
    columns: {
      inningsId: true,
    },
  });

  if (!deliveryRow) {
    return null;
  }

  return getScoringMatchByInningsId(deliveryRow.inningsId);
}
