import { eq } from "drizzle-orm";
import { FOLLOW_ON_LEAD_THRESHOLD } from "@/config/constants";
import { db } from "@/db";
import { innings, matches } from "@/db/schema";

interface InningsSequenceRow {
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber: number;
  isCompleted: boolean | null;
  totalScore: number;
}

function resolveScheduledInningsCount(match: { inningsPerSide: number }) {
  const scheduledInningsCount = match.inningsPerSide * 2;
  if (scheduledInningsCount === 2 || scheduledInningsCount === 4) {
    return scheduledInningsCount;
  }

  throw new Error("Matches must be configured for 2 or 4 innings");
}

function isFollowOnEligible(params: {
  battingTeamId: number;
  inningsNumber: number;
  inningsRows: InningsSequenceRow[];
  scheduledInningsCount: number;
  followOnAllowed: boolean;
}) {
  if (
    !params.followOnAllowed ||
    params.scheduledInningsCount !== 4 ||
    params.inningsNumber !== 3 ||
    params.inningsRows.length !== 2
  ) {
    return false;
  }

  const [firstInnings, secondInnings] = params.inningsRows;
  if (!(firstInnings && secondInnings)) {
    return false;
  }

  if (!(firstInnings.isCompleted && secondInnings.isCompleted)) {
    return false;
  }

  if (params.battingTeamId !== secondInnings.battingTeamId) {
    return false;
  }

  return (
    firstInnings.totalScore - secondInnings.totalScore >=
    FOLLOW_ON_LEAD_THRESHOLD
  );
}

async function validateInningsCreation(params: {
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber: number;
  matchId: number;
}) {
  const match = await db.query.matches.findFirst({
    where: {
      id: params.matchId,
    },
    columns: {
      followOnAllowedSnapshot: true,
      id: true,
      inningsPerSide: true,
      team1Id: true,
      team2Id: true,
    },
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (typeof match.team1Id !== "number" || typeof match.team2Id !== "number") {
    throw new Error("Match participants are not finalized");
  }

  const participantIds = new Set([match.team1Id, match.team2Id]);
  if (
    params.battingTeamId === params.bowlingTeamId ||
    !participantIds.has(params.battingTeamId) ||
    !participantIds.has(params.bowlingTeamId)
  ) {
    throw new Error("Innings teams must match the two teams in the match");
  }

  const inningsRows = await db.query.innings.findMany({
    where: {
      matchId: params.matchId,
    },
    columns: {
      battingTeamId: true,
      bowlingTeamId: true,
      inningsNumber: true,
      isCompleted: true,
      totalScore: true,
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  const expectedInningsNumber = inningsRows.length + 1;
  if (params.inningsNumber !== expectedInningsNumber) {
    throw new Error("Innings must be created in sequence");
  }

  const scheduledInningsCount = resolveScheduledInningsCount(match);
  if (params.inningsNumber > scheduledInningsCount) {
    throw new Error("This match has no innings remaining");
  }

  const previousInnings = inningsRows.at(-1);
  if (
    previousInnings &&
    params.battingTeamId === previousInnings.battingTeamId &&
    !isFollowOnEligible({
      battingTeamId: params.battingTeamId,
      inningsNumber: params.inningsNumber,
      inningsRows,
      scheduledInningsCount,
      followOnAllowed: Boolean(match.followOnAllowedSnapshot),
    })
  ) {
    throw new Error(
      "Teams cannot bat in consecutive innings unless a follow-on is enforced"
    );
  }
}

export async function getInningsById(id: number) {
  const inningsRow = await db.query.innings.findFirst({
    where: {
      id,
    },
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
      bowlingTeam: true,
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
  });

  if (!inningsRow) {
    return null;
  }

  const [matchRow] = await db
    .select({ tournamentId: matches.tournamentId })
    .from(matches)
    .where(eq(matches.id, inningsRow.matchId))
    .limit(1);

  if (!(matchRow && inningsRow.battingTeam)) {
    return inningsRow;
  }

  return {
    ...inningsRow,
    battingTeam: {
      ...inningsRow.battingTeam,
      teamPlayers: inningsRow.battingTeam.teamPlayers.filter(
        (teamPlayer) => teamPlayer.tournamentId === matchRow.tournamentId
      ),
    },
  };
}

export function getInningsByMatchId(id: number) {
  return db.query.innings.findMany({
    where: {
      matchId: id,
    },
    with: {
      battingTeam: {
        columns: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      bowlingTeam: {
        columns: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });
}

export async function getInningsByMatchIdAndTeamId(
  matchId: number,
  teamId?: number
) {
  if (!teamId) {
    return;
  }
  const inningsRow = await db.query.innings.findFirst({
    where: {
      matchId,
      battingTeamId: teamId,
    },
    with: {
      battingTeam: {
        with: {
          teamPlayers: true,
        },
      },
      deliveries: {
        orderBy: {
          sequenceNo: "asc",
        },
      },
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  if (!inningsRow) {
    return null;
  }

  const [matchRow] = await db
    .select({ tournamentId: matches.tournamentId })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!(matchRow && inningsRow.battingTeam)) {
    return inningsRow;
  }

  return {
    ...inningsRow,
    battingTeam: {
      ...inningsRow.battingTeam,
      teamPlayers: inningsRow.battingTeam.teamPlayers.filter(
        (teamPlayer) => teamPlayer.tournamentId === matchRow.tournamentId
      ),
    },
  };
}

export async function createInningsAction({
  matchId,
  battingTeamId,
  bowlingTeamId,
  inningsNumber = 1,
  status = "not_started",
  wickets = 0,
  ballsBowled = 0,
  totalScore = 0,
  wides = 0,
  noBalls = 0,
  byes = 0,
  legByes = 0,
  penaltyRuns = 0,
  others = 0,
  targetRuns,
  openingStrikerId,
  openingNonStrikerId,
  openingBowlerId,
}: {
  matchId: number;
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber?: number;
  status?: string;
  wickets?: number;
  ballsBowled?: number;
  totalScore?: number;
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
  penaltyRuns?: number;
  others?: number;
  targetRuns?: number | null;
  openingStrikerId?: number | null;
  openingNonStrikerId?: number | null;
  openingBowlerId?: number | null;
}) {
  await validateInningsCreation({
    matchId,
    battingTeamId,
    bowlingTeamId,
    inningsNumber,
  });

  const newInnings = await db.insert(innings).values({
    matchId,
    battingTeamId,
    bowlingTeamId,
    inningsNumber,
    status,
    wickets,
    ballsBowled,
    totalScore,
    wides,
    noBalls,
    byes,
    legByes,
    penaltyRuns,
    others,
    targetRuns,
    openingStrikerId,
    openingNonStrikerId,
    openingBowlerId,
  });
  return newInnings.lastInsertRowid;
}

export async function updateInningsAction({
  id,
  status,
  wickets,
  ballsBowled,
  totalScore,
  wides,
  noBalls,
  byes,
  legByes,
  penaltyRuns,
  others,
  targetRuns,
  isCompleted,
  openingStrikerId,
  openingNonStrikerId,
  openingBowlerId,
}: {
  id: number;
  status?: string;
  wickets?: number;
  ballsBowled?: number;
  totalScore?: number;
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
  penaltyRuns?: number;
  others?: number;
  targetRuns?: number | null;
  isCompleted?: boolean;
  openingStrikerId?: number | null;
  openingNonStrikerId?: number | null;
  openingBowlerId?: number | null;
}) {
  const updated = await db
    .update(innings)
    .set({
      status,
      wickets,
      ballsBowled,
      totalScore,
      wides,
      noBalls,
      byes,
      legByes,
      penaltyRuns,
      others,
      targetRuns,
      isCompleted,
      openingStrikerId,
      openingNonStrikerId,
      openingBowlerId,
    })
    .where(eq(innings.id, id))
    .returning();

  return updated[0] ?? null;
}
