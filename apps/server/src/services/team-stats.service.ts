import { compareDesc } from "date-fns";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  innings,
  matches,
  teamCareerStats,
  teams,
  teamTournamentStats,
  tournaments,
  tournamentTeams,
} from "@/db/schema";
import { getCurrentDate } from "@/utils";

const POINTS_FOR_WIN = 2;
const POINTS_FOR_TIE = 1;
const POINTS_FOR_DRAW = 1;
const POINTS_FOR_ABANDONED = 1;
const RECENT_FORM_LIMIT = 5;

type FormCode = "W" | "L" | "T" | "D" | "A";

interface MutableStats {
  ballsBowled: number;
  ballsFaced: number;
  battingOversEquivalent: number;
  bowlingOversEquivalent: number;
  matchesAbandoned: number;
  matchesDrawn: number;
  matchesLost: number;
  matchesPlayed: number;
  matchesTied: number;
  matchesWon: number;
  points: number;
  recentForm: FormCode[];
  runsConceded: number;
  runsScored: number;
}

function createEmptyStats(): MutableStats {
  return {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesTied: 0,
    matchesDrawn: 0,
    matchesAbandoned: 0,
    points: 0,
    runsScored: 0,
    runsConceded: 0,
    ballsFaced: 0,
    ballsBowled: 0,
    battingOversEquivalent: 0,
    bowlingOversEquivalent: 0,
    recentForm: [],
  };
}

function roundTo2(value: number): number {
  return Number(value.toFixed(2));
}

function toOvers(balls: number, ballsPerOver: number): number {
  if (balls <= 0) {
    return 0;
  }

  return balls / ballsPerOver;
}

function computeWinPercentage(
  matchesWon: number,
  matchesPlayed: number
): number {
  if (matchesPlayed <= 0) {
    return 0;
  }

  return roundTo2((matchesWon * 100) / matchesPlayed);
}

function computeNetRunRate(
  runsScored: number,
  oversFaced: number,
  runsConceded: number,
  oversBowled: number
): number {
  if (oversFaced <= 0 || oversBowled <= 0) {
    return 0;
  }

  const forRate = runsScored / oversFaced;
  const againstRate = runsConceded / oversBowled;

  return roundTo2(forRate - againstRate);
}

function isMatchFinalized(match: typeof matches.$inferSelect): boolean {
  return (
    match.isCompleted ||
    match.isAbandoned ||
    match.isTied ||
    typeof match.winnerId === "number" ||
    (typeof match.result === "string" && match.result.trim().length > 0)
  );
}

function isDrawResult(result: string | null): boolean {
  if (typeof result !== "string") {
    return false;
  }

  return result.trim().toLowerCase().includes("draw");
}

function classifyOutcome(
  match: typeof matches.$inferSelect,
  teamId: number
): FormCode {
  if (match.isAbandoned) {
    return "A";
  }

  if (match.isTied) {
    return "T";
  }

  if (isDrawResult(match.result)) {
    return "D";
  }

  if (typeof match.winnerId === "number") {
    return match.winnerId === teamId ? "W" : "L";
  }

  return "A";
}

function applyOutcome(stats: MutableStats, outcome: FormCode): void {
  stats.matchesPlayed += 1;

  if (outcome === "W") {
    stats.matchesWon += 1;
    stats.points += POINTS_FOR_WIN;
  } else if (outcome === "L") {
    stats.matchesLost += 1;
  } else if (outcome === "T") {
    stats.matchesTied += 1;
    stats.points += POINTS_FOR_TIE;
  } else if (outcome === "D") {
    stats.matchesDrawn += 1;
    stats.points += POINTS_FOR_DRAW;
  } else {
    stats.matchesAbandoned += 1;
    stats.points += POINTS_FOR_ABANDONED;
  }

  if (stats.recentForm.length < RECENT_FORM_LIMIT) {
    stats.recentForm.push(outcome);
  }
}

async function collectTrophiesCount(teamId: number): Promise<number> {
  const wonTournaments = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.championTeamId, teamId));

  return wonTournaments.length;
}

async function getFinalizedMatchesForTeam(teamId: number) {
  const teamMatches = await db
    .select()
    .from(matches)
    .where(or(eq(matches.team1Id, teamId), eq(matches.team2Id, teamId)));

  return teamMatches.filter((match) => isMatchFinalized(match));
}

function getInningsByMatchIds(matchIds: number[]) {
  if (matchIds.length === 0) {
    return Promise.resolve([] as (typeof innings.$inferSelect)[]);
  }

  return db.select().from(innings).where(inArray(innings.matchId, matchIds));
}

function aggregateStats(
  targetTeamId: number,
  relevantMatches: (typeof matches.$inferSelect)[],
  relevantInnings: (typeof innings.$inferSelect)[]
): MutableStats {
  const stats = createEmptyStats();
  const matchesById = new Map(
    relevantMatches.map((match) => [match.id, match])
  );
  const sortedMatches = [...relevantMatches].sort((first, second) =>
    compareDesc(first.matchDate, second.matchDate)
  );

  for (const match of sortedMatches) {
    const outcome = classifyOutcome(match, targetTeamId);
    applyOutcome(stats, outcome);
  }

  for (const inning of relevantInnings) {
    const match = matchesById.get(inning.matchId);
    const ballsPerOver = match?.ballsPerOverSnapshot ?? 6;

    if (inning.battingTeamId === targetTeamId) {
      stats.runsScored += inning.totalScore;
      stats.ballsFaced += inning.ballsBowled;
      stats.battingOversEquivalent += toOvers(inning.ballsBowled, ballsPerOver);
    }

    if (inning.bowlingTeamId === targetTeamId) {
      stats.runsConceded += inning.totalScore;
      stats.ballsBowled += inning.ballsBowled;
      stats.bowlingOversEquivalent += toOvers(inning.ballsBowled, ballsPerOver);
    }
  }

  return stats;
}

async function upsertCareerStats(
  teamId: number,
  stats: MutableStats,
  trophiesWon: number
) {
  const now = getCurrentDate();
  const winPercentage = computeWinPercentage(
    stats.matchesWon,
    stats.matchesPlayed
  );
  const netRunRate = computeNetRunRate(
    stats.runsScored,
    stats.battingOversEquivalent,
    stats.runsConceded,
    stats.bowlingOversEquivalent
  );
  const recentForm = JSON.stringify(stats.recentForm);

  await db
    .insert(teamCareerStats)
    .values({
      teamId,
      matchesPlayed: stats.matchesPlayed,
      matchesWon: stats.matchesWon,
      matchesLost: stats.matchesLost,
      matchesTied: stats.matchesTied,
      matchesDrawn: stats.matchesDrawn,
      matchesAbandoned: stats.matchesAbandoned,
      points: stats.points,
      winPercentage,
      runsScored: stats.runsScored,
      runsConceded: stats.runsConceded,
      ballsFaced: stats.ballsFaced,
      ballsBowled: stats.ballsBowled,
      netRunRate,
      trophiesWon,
      recentForm,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: teamCareerStats.teamId,
      set: {
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesLost,
        matchesTied: stats.matchesTied,
        matchesDrawn: stats.matchesDrawn,
        matchesAbandoned: stats.matchesAbandoned,
        points: stats.points,
        winPercentage,
        runsScored: stats.runsScored,
        runsConceded: stats.runsConceded,
        ballsFaced: stats.ballsFaced,
        ballsBowled: stats.ballsBowled,
        netRunRate,
        trophiesWon,
        recentForm,
        updatedAt: now,
      },
    });
}

async function upsertTournamentStatsForTeam(
  teamId: number,
  finalizedMatches: (typeof matches.$inferSelect)[],
  allInnings: (typeof innings.$inferSelect)[]
) {
  const tournamentIds = Array.from(
    new Set(finalizedMatches.map((match) => match.tournamentId))
  );

  if (tournamentIds.length === 0) {
    return;
  }

  const now = getCurrentDate();

  for (const tournamentId of tournamentIds) {
    const tournamentMatches = finalizedMatches.filter(
      (match) => match.tournamentId === tournamentId
    );
    const matchIds = tournamentMatches.map((match) => match.id);
    const tournamentInnings = allInnings.filter((inning) =>
      matchIds.includes(inning.matchId)
    );
    const stats = aggregateStats(teamId, tournamentMatches, tournamentInnings);
    const winPercentage = computeWinPercentage(
      stats.matchesWon,
      stats.matchesPlayed
    );
    const netRunRate = computeNetRunRate(
      stats.runsScored,
      stats.battingOversEquivalent,
      stats.runsConceded,
      stats.bowlingOversEquivalent
    );
    const recentForm = JSON.stringify(stats.recentForm);

    await db
      .insert(teamTournamentStats)
      .values({
        tournamentId,
        teamId,
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesLost,
        matchesTied: stats.matchesTied,
        matchesDrawn: stats.matchesDrawn,
        matchesAbandoned: stats.matchesAbandoned,
        points: stats.points,
        winPercentage,
        runsScored: stats.runsScored,
        runsConceded: stats.runsConceded,
        ballsFaced: stats.ballsFaced,
        ballsBowled: stats.ballsBowled,
        netRunRate,
        recentForm,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [teamTournamentStats.tournamentId, teamTournamentStats.teamId],
        set: {
          matchesPlayed: stats.matchesPlayed,
          matchesWon: stats.matchesWon,
          matchesLost: stats.matchesLost,
          matchesTied: stats.matchesTied,
          matchesDrawn: stats.matchesDrawn,
          matchesAbandoned: stats.matchesAbandoned,
          points: stats.points,
          winPercentage,
          runsScored: stats.runsScored,
          runsConceded: stats.runsConceded,
          ballsFaced: stats.ballsFaced,
          ballsBowled: stats.ballsBowled,
          netRunRate,
          recentForm,
          updatedAt: now,
        },
      });

    await db
      .update(tournamentTeams)
      .set({
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesLost,
        matchesTied: stats.matchesTied,
        matchesDrawn: stats.matchesDrawn,
        points: stats.points,
      })
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeams.teamId, teamId)
        )
      );
  }
}

function parseRecentForm(recentFormRaw: string): FormCode[] {
  try {
    const parsed = JSON.parse(recentFormRaw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is FormCode =>
      ["W", "L", "T", "D", "A"].includes(String(entry))
    );
  } catch {
    return [];
  }
}

export async function refreshTeamStats(teamId: number) {
  const targetTeam = await db.query.teams.findFirst({
    where: {
      id: teamId,
    },
  });

  if (!targetTeam) {
    return null;
  }

  const finalizedMatches = await getFinalizedMatchesForTeam(teamId);
  const inningsRows = await getInningsByMatchIds(
    finalizedMatches.map((match) => match.id)
  );
  const careerStats = aggregateStats(teamId, finalizedMatches, inningsRows);
  const trophiesWon = await collectTrophiesCount(teamId);

  await upsertCareerStats(teamId, careerStats, trophiesWon);
  await upsertTournamentStatsForTeam(teamId, finalizedMatches, inningsRows);

  return targetTeam;
}

export async function getTeamStatsById(teamId: number) {
  const targetTeam = await refreshTeamStats(teamId);
  if (!targetTeam) {
    return null;
  }

  const career = await db.query.teamCareerStats.findFirst({
    where: {
      teamId,
    },
  });

  const tournamentStats = await db.query.teamTournamentStats.findMany({
    where: {
      teamId,
    },
    with: {
      tournament: true,
    },
    orderBy: {
      tournamentId: "desc",
    },
  });

  return {
    team: targetTeam,
    career: career
      ? {
          ...career,
          recentForm: parseRecentForm(career.recentForm),
        }
      : null,
    tournaments: tournamentStats.map((entry) => ({
      ...entry,
      recentForm: parseRecentForm(entry.recentForm),
    })),
  };
}

export async function listTeamStats() {
  const allTeams = await db.select({ id: teams.id }).from(teams);

  for (const team of allTeams) {
    await refreshTeamStats(team.id);
  }

  const stats = await db.query.teamCareerStats.findMany({
    with: {
      team: true,
    },
    orderBy: {
      points: "desc",
    },
  });

  return stats.sort(
    (first, second) => second.winPercentage - first.winPercentage
  );
}

export async function getTeamTournamentStats(
  teamId: number,
  tournamentId: number
) {
  await refreshTeamStats(teamId);

  const row = await db.query.teamTournamentStats.findFirst({
    where: {
      teamId,
      tournamentId,
    },
    with: {
      tournament: true,
      team: true,
    },
  });

  if (!row) {
    return null;
  }

  return {
    ...row,
    recentForm: parseRecentForm(row.recentForm),
  };
}
