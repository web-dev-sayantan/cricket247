import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  deliveries,
  innings,
  matches,
  matchLineup,
  playerInningsStats,
  players,
  teamPlayers,
} from "@/db/schema";
import type { NewDelivery } from "@/db/types";
import { createNewBallAction } from "@/services/ball.service";
import {
  createInningsAction,
  updateInningsAction,
} from "@/services/innings.service";
import { getMatchById } from "@/services/match.service";
import {
  getMatchFormatRulesByInningsId,
  getMatchFormatRulesByMatchId,
} from "@/services/match-format.service";
import {
  createPlayerPerformanceAction,
  getPlayerMatchPerformance,
} from "@/services/player.service";

interface LegacyBallInput {
  assistPlayerId?: number | null;
  ballNumber?: number;
  bowlerId: number;
  dismissedPlayerId?: number | null;
  id?: number;
  inningsId: number;
  isBye?: boolean;
  isLegBye?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  isWide?: boolean;
  nonStrikerId: number;
  runsScored?: number;
  strikerId: number;
  wicketType?: string;
}

interface InitializeMatchScoringInput {
  matchId: number;
  nonStrikerId: number;
  openingBowlerId: number;
  strikerId: number;
  tossDecision: "bat" | "bowl";
  tossWinnerId: number;
}

interface CreateNextScoringDeliveryInput {
  inningsId: number;
  nextBowlerId: number;
  nextNonStrikerId: number;
  nextStrikerId: number;
}

function getSequenceMeta(sequenceNo: number, ballsPerOver: number) {
  const normalized = Math.max(1, sequenceNo);
  return {
    sequenceNo: normalized,
    overNumber: Math.floor((normalized - 1) / ballsPerOver) + 1,
    ballInOver: ((normalized - 1) % ballsPerOver) + 1,
  };
}

function deriveBattingAndBowlingTeamIds(params: {
  team1Id: number;
  team2Id: number;
  tossDecision: "bat" | "bowl";
  tossWinnerId: number;
}) {
  const tossLoserId =
    params.tossWinnerId === params.team1Id ? params.team2Id : params.team1Id;

  if (params.tossDecision === "bat") {
    return {
      battingTeamId: params.tossWinnerId,
      bowlingTeamId: tossLoserId,
    };
  }

  return {
    battingTeamId: tossLoserId,
    bowlingTeamId: params.tossWinnerId,
  };
}

function toDeliveryPayload(
  input: LegacyBallInput,
  ballsPerOver: number
): Omit<NewDelivery, "id"> {
  const sequenceNo = input.ballNumber ?? 1;
  const { overNumber, ballInOver } = getSequenceMeta(sequenceNo, ballsPerOver);

  const runsScored = input.runsScored ?? 0;
  const isWide = Boolean(input.isWide);
  const isNoBall = Boolean(input.isNoBall);
  const isBye = Boolean(input.isBye);
  const isLegBye = Boolean(input.isLegBye);

  const batterRuns = isBye || isLegBye ? 0 : runsScored;
  const wideRuns = isWide ? 1 : 0;
  const noBallRuns = isNoBall ? 1 : 0;
  const byeRuns = isBye ? runsScored : 0;
  const legByeRuns = isLegBye ? runsScored : 0;
  const penaltyRuns = 0;
  const totalRuns =
    batterRuns + wideRuns + noBallRuns + byeRuns + legByeRuns + penaltyRuns;

  const dismissedById =
    input.isWicket && input.wicketType !== "run out" ? input.bowlerId : null;

  return {
    inningsId: input.inningsId,
    sequenceNo,
    overNumber,
    ballInOver,
    isLegalDelivery: !(isWide || isNoBall),
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    bowlerId: input.bowlerId,
    batterRuns,
    wideRuns,
    noBallRuns,
    byeRuns,
    legByeRuns,
    penaltyRuns,
    totalRuns,
    isWicket: Boolean(input.isWicket),
    wicketType: input.wicketType ?? null,
    dismissedPlayerId: input.dismissedPlayerId ?? null,
    dismissedById,
    assistedById: input.assistPlayerId ?? null,
  };
}

async function syncInningsAndStats(inningsId: number) {
  const rules = await getMatchFormatRulesByInningsId(inningsId);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Scoring state synchronization is intentionally centralized.
  await db.transaction(async (tx) => {
    const inningsRow = await tx.query.innings.findFirst({
      where: {
        id: inningsId,
      },
    });

    if (!inningsRow) {
      throw new Error("Innings not found");
    }

    const deliveryRows = await tx
      .select()
      .from(deliveries)
      .where(eq(deliveries.inningsId, inningsId))
      .orderBy(deliveries.sequenceNo);

    let totalScore = 0;
    let wickets = 0;
    let ballsBowled = 0;
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;
    let penaltyRuns = 0;
    let batterRunsTotal = 0;

    for (const delivery of deliveryRows) {
      totalScore += delivery.totalRuns;
      batterRunsTotal += delivery.batterRuns;
      if (delivery.isWicket) {
        wickets += 1;
      }
      if (delivery.isLegalDelivery) {
        ballsBowled += 1;
      }
      wides += delivery.wideRuns;
      noBalls += delivery.noBallRuns;
      byes += delivery.byeRuns;
      legByes += delivery.legByeRuns;
      penaltyRuns += delivery.penaltyRuns;
    }

    const others =
      totalScore -
      (batterRunsTotal + wides + noBalls + byes + legByes + penaltyRuns);

    await tx
      .update(innings)
      .set({
        totalScore,
        wickets,
        ballsBowled,
        wides,
        noBalls,
        byes,
        legByes,
        penaltyRuns,
        others: Math.max(0, others),
        status: deliveryRows.length > 0 ? "in_progress" : "not_started",
      })
      .where(eq(innings.id, inningsId));

    const battingOrderRows = await tx
      .select({
        playerId: matchLineup.playerId,
        battingOrder: matchLineup.battingOrder,
      })
      .from(matchLineup)
      .where(
        and(
          eq(matchLineup.matchId, inningsRow.matchId),
          eq(matchLineup.teamId, inningsRow.battingTeamId)
        )
      );

    const battingOrderByPlayer = new Map<number, number | null>();
    for (const row of battingOrderRows) {
      battingOrderByPlayer.set(row.playerId, row.battingOrder);
    }

    interface MutableStats {
      assistedById: number | null;
      ballsBowled: number;
      ballsFaced: number;
      battingOrder: number | null;
      catches: number;
      dismissalType: string | null;
      dismissedById: number | null;
      dotBalls: number;
      fours: number;
      inningsId: number;
      isDismissed: boolean;
      maidens: number;
      matchId: number;
      noBalls: number;
      playerId: number;
      runOuts: number;
      runsConceded: number;
      runsScored: number;
      sixes: number;
      stumpings: number;
      teamId: number;
      wicketsTaken: number;
      wides: number;
    }

    const statsByPlayer = new Map<number, MutableStats>();

    const ensureStats = (playerId: number, teamId: number): MutableStats => {
      const existing = statsByPlayer.get(playerId);
      if (existing) {
        return existing;
      }

      const next: MutableStats = {
        inningsId,
        matchId: inningsRow.matchId,
        playerId,
        teamId,
        battingOrder: battingOrderByPlayer.get(playerId) ?? null,
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isDismissed: false,
        dismissalType: null,
        dismissedById: null,
        assistedById: null,
        ballsBowled: 0,
        maidens: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        wides: 0,
        noBalls: 0,
        dotBalls: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
      };

      statsByPlayer.set(playerId, next);
      return next;
    };

    const overBowlerTracker = new Map<
      string,
      { legalBalls: number; runs: number }
    >();

    for (const delivery of deliveryRows) {
      const strikerStats = ensureStats(
        delivery.strikerId,
        inningsRow.battingTeamId
      );
      const bowlerStats = ensureStats(
        delivery.bowlerId,
        inningsRow.bowlingTeamId
      );

      const countsAsBallFaced =
        delivery.isLegalDelivery ||
        (delivery.noBallRuns > 0 &&
          delivery.batterRuns > 0 &&
          delivery.wideRuns === 0);

      if (countsAsBallFaced) {
        strikerStats.ballsFaced += 1;
      }

      strikerStats.runsScored += delivery.batterRuns;
      if (delivery.batterRuns === 4) {
        strikerStats.fours += 1;
      }
      if (delivery.batterRuns === 6) {
        strikerStats.sixes += 1;
      }

      if (delivery.isWicket && delivery.dismissedPlayerId) {
        const dismissedStats = ensureStats(
          delivery.dismissedPlayerId,
          inningsRow.battingTeamId
        );
        dismissedStats.isDismissed = true;
        dismissedStats.dismissalType = delivery.wicketType ?? null;
        dismissedStats.dismissedById = delivery.dismissedById ?? null;
        dismissedStats.assistedById = delivery.assistedById ?? null;
      }

      if (delivery.isLegalDelivery) {
        bowlerStats.ballsBowled += 1;
      }

      const concededByBowler =
        delivery.batterRuns +
        delivery.wideRuns +
        delivery.noBallRuns +
        delivery.penaltyRuns;

      bowlerStats.runsConceded += concededByBowler;
      bowlerStats.wides += delivery.wideRuns;
      bowlerStats.noBalls += delivery.noBallRuns;
      if (delivery.isLegalDelivery && delivery.totalRuns === 0) {
        bowlerStats.dotBalls += 1;
      }

      if (
        delivery.isWicket &&
        delivery.dismissedById === delivery.bowlerId &&
        delivery.wicketType !== "run out"
      ) {
        bowlerStats.wicketsTaken += 1;
      }

      if (delivery.assistedById && delivery.isWicket) {
        const assistingStats = ensureStats(
          delivery.assistedById,
          inningsRow.bowlingTeamId
        );

        if (delivery.wicketType === "caught") {
          assistingStats.catches += 1;
        } else if (delivery.wicketType === "stumped") {
          assistingStats.stumpings += 1;
        } else if (delivery.wicketType === "run out") {
          assistingStats.runOuts += 1;
        }
      }

      const overKey = `${delivery.bowlerId}:${delivery.overNumber}`;
      const overState = overBowlerTracker.get(overKey) ?? {
        legalBalls: 0,
        runs: 0,
      };
      overState.runs += concededByBowler;
      if (delivery.isLegalDelivery) {
        overState.legalBalls += 1;
      }
      overBowlerTracker.set(overKey, overState);
    }

    for (const [overKey, state] of overBowlerTracker.entries()) {
      if (state.legalBalls === rules.ballsPerOver && state.runs === 0) {
        const [bowlerIdRaw] = overKey.split(":");
        const bowlerId = Number(bowlerIdRaw);
        const bowlerStats = statsByPlayer.get(bowlerId);
        if (bowlerStats) {
          bowlerStats.maidens += 1;
        }
      }
    }

    await tx
      .delete(playerInningsStats)
      .where(eq(playerInningsStats.inningsId, inningsId));

    const statsValues = [...statsByPlayer.values()];
    if (statsValues.length > 0) {
      await tx.insert(playerInningsStats).values(statsValues);
    }
  });
}

export async function saveBallData(
  input: LegacyBallInput,
  _inningsState: {
    inningsId: number;
    wickets: number;
    balls: number;
    extras: number;
    totalScore: number;
  },
  _matchState: {
    matchId: number;
  }
) {
  const rules = await getMatchFormatRulesByInningsId(input.inningsId);

  await db.transaction(async (tx) => {
    let existingDelivery:
      | {
          id: number;
          inningsId: number;
          sequenceNo: number;
          overNumber: number;
          ballInOver: number;
        }
      | undefined;

    if (input.id) {
      [existingDelivery] = await tx
        .select({
          id: deliveries.id,
          inningsId: deliveries.inningsId,
          sequenceNo: deliveries.sequenceNo,
          overNumber: deliveries.overNumber,
          ballInOver: deliveries.ballInOver,
        })
        .from(deliveries)
        .where(eq(deliveries.id, input.id))
        .limit(1);
    }

    if (existingDelivery && existingDelivery.inningsId !== input.inningsId) {
      throw new Error("Delivery does not belong to the innings");
    }

    let payload = toDeliveryPayload(input, rules.ballsPerOver);
    if (existingDelivery && typeof input.ballNumber !== "number") {
      payload = {
        ...payload,
        sequenceNo: existingDelivery.sequenceNo,
        overNumber: existingDelivery.overNumber,
        ballInOver: existingDelivery.ballInOver,
      };
    }

    if (input.id) {
      if (existingDelivery) {
        await tx
          .update(deliveries)
          .set(payload)
          .where(eq(deliveries.id, input.id));
      } else {
        await tx.insert(deliveries).values({ ...payload, id: input.id });
      }
    } else {
      await tx.insert(deliveries).values(payload);
    }
  });

  await syncInningsAndStats(input.inningsId);
}

export async function onSelectCurrentBattersAndBowler({
  matchId,
  bowlingTeamId,
  ballNumber,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  bowlingTeamId: number;
  ballNumber: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  const match = await getMatchById(matchId);
  if (!match) {
    throw new Error("Match not found");
  }
  if (typeof match.team1Id !== "number" || typeof match.team2Id !== "number") {
    throw new Error("Match participants are not finalized yet");
  }

  const existingInnings = await db.query.innings.findMany({
    where: {
      matchId,
    },
  });

  const nextInningsNumber = existingInnings.length + 1;

  const inningsId = await createInningsAction({
    matchId,
    battingTeamId: match.team1Id,
    bowlingTeamId,
    inningsNumber: nextInningsNumber,
    status: "in_progress",
  });

  if (!inningsId) {
    throw new Error("Innings not created");
  }

  const rules = await getMatchFormatRulesByMatchId(matchId);
  const { sequenceNo, overNumber, ballInOver } = getSequenceMeta(
    ballNumber,
    rules.ballsPerOver
  );

  await createNewBallAction({
    inningsId: Number(inningsId),
    sequenceNo,
    overNumber,
    ballInOver,
    isLegalDelivery: true,
    strikerId,
    nonStrikerId,
    bowlerId,
    batterRuns: 0,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    penaltyRuns: 0,
    totalRuns: 0,
    isWicket: false,
  });

  await Promise.all([
    createPlayerPerformanceAction({
      inningsId: Number(inningsId),
      playerId: strikerId,
      matchId,
      teamId: match.team1Id,
    }),
    createPlayerPerformanceAction({
      inningsId: Number(inningsId),
      playerId: nonStrikerId,
      matchId,
      teamId: match.team1Id,
    }),
    createPlayerPerformanceAction({
      inningsId: Number(inningsId),
      playerId: bowlerId,
      matchId,
      teamId: match.team2Id,
    }),
  ]);
}

export async function setMatchLiveStatus({
  matchId,
  isLive,
}: {
  matchId: number;
  isLive: boolean;
}) {
  return await db
    .update(matches)
    .set({ isLive })
    .where(eq(matches.id, matchId));
}

export async function initializeMatchScoring(
  input: InitializeMatchScoringInput
) {
  const match = await db.query.matches.findFirst({
    where: {
      id: input.matchId,
    },
    columns: {
      id: true,
      playersPerSide: true,
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

  if (![match.team1Id, match.team2Id].includes(input.tossWinnerId)) {
    throw new Error("Invalid toss winner");
  }

  const existingInnings = await db.query.innings.findFirst({
    where: {
      matchId: input.matchId,
    },
    columns: {
      id: true,
    },
  });

  if (existingInnings) {
    throw new Error("Scoring has already started for this match");
  }

  const lineupRows = await getSavedMatchLineup(input.matchId);
  const team1Lineup = lineupRows.filter((row) => row.teamId === match.team1Id);
  const team2Lineup = lineupRows.filter((row) => row.teamId === match.team2Id);

  if (
    team1Lineup.length !== match.playersPerSide ||
    team2Lineup.length !== match.playersPerSide
  ) {
    throw new Error("Playing lineup is incomplete");
  }

  const { battingTeamId, bowlingTeamId } = deriveBattingAndBowlingTeamIds({
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    tossWinnerId: input.tossWinnerId,
    tossDecision: input.tossDecision,
  });

  const battingLineup = lineupRows.filter(
    (row) => row.teamId === battingTeamId
  );
  const bowlingLineup = lineupRows.filter(
    (row) => row.teamId === bowlingTeamId
  );
  const battingPlayerSet = new Set(battingLineup.map((row) => row.playerId));
  const bowlingPlayerSet = new Set(bowlingLineup.map((row) => row.playerId));

  if (
    !(
      battingPlayerSet.has(input.strikerId) &&
      battingPlayerSet.has(input.nonStrikerId)
    )
  ) {
    throw new Error("Openers must belong to the batting lineup");
  }

  if (input.strikerId === input.nonStrikerId) {
    throw new Error("Openers must be two different players");
  }

  if (!bowlingPlayerSet.has(input.openingBowlerId)) {
    throw new Error("Opening bowler must belong to the bowling lineup");
  }

  const [created] = await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({
        tossWinnerId: input.tossWinnerId,
        tossDecision: input.tossDecision,
      })
      .where(eq(matches.id, input.matchId));

    const [newInnings] = await tx
      .insert(innings)
      .values({
        matchId: input.matchId,
        battingTeamId,
        bowlingTeamId,
        inningsNumber: 1,
        status: "in_progress",
      })
      .returning({
        id: innings.id,
      });

    if (!newInnings) {
      throw new Error("Failed to create innings");
    }

    const [newDelivery] = await tx
      .insert(deliveries)
      .values({
        inningsId: newInnings.id,
        sequenceNo: 1,
        overNumber: 1,
        ballInOver: 1,
        isLegalDelivery: true,
        strikerId: input.strikerId,
        nonStrikerId: input.nonStrikerId,
        bowlerId: input.openingBowlerId,
        batterRuns: 0,
        wideRuns: 0,
        noBallRuns: 0,
        byeRuns: 0,
        legByeRuns: 0,
        penaltyRuns: 0,
        totalRuns: 0,
        isWicket: false,
      })
      .returning({
        id: deliveries.id,
      });

    if (!newDelivery) {
      throw new Error("Failed to create opening delivery");
    }

    await tx
      .update(matches)
      .set({
        isLive: true,
      })
      .where(eq(matches.id, input.matchId));

    return [{ inningsId: newInnings.id, deliveryId: newDelivery.id }];
  });

  if (!created) {
    throw new Error("Failed to initialize match scoring");
  }

  return created;
}

export async function createNextScoringDelivery(
  input: CreateNextScoringDeliveryInput
) {
  const inningsRow = await db.query.innings.findFirst({
    where: {
      id: input.inningsId,
    },
    columns: {
      id: true,
      isCompleted: true,
      matchId: true,
      battingTeamId: true,
      bowlingTeamId: true,
    },
  });

  if (!inningsRow) {
    throw new Error("Innings not found");
  }

  if (inningsRow.isCompleted) {
    throw new Error("Innings already completed");
  }

  const lineupRows = await db.query.matchLineup.findMany({
    where: {
      matchId: inningsRow.matchId,
    },
    columns: {
      playerId: true,
      teamId: true,
    },
  });

  const battingPlayerSet = new Set(
    lineupRows
      .filter((row) => row.teamId === inningsRow.battingTeamId)
      .map((row) => row.playerId)
  );
  const bowlingPlayerSet = new Set(
    lineupRows
      .filter((row) => row.teamId === inningsRow.bowlingTeamId)
      .map((row) => row.playerId)
  );

  if (
    !(
      battingPlayerSet.has(input.nextStrikerId) &&
      battingPlayerSet.has(input.nextNonStrikerId)
    )
  ) {
    throw new Error("Batters must belong to the batting lineup");
  }

  if (input.nextStrikerId === input.nextNonStrikerId) {
    throw new Error("Batters must be different players");
  }

  if (!bowlingPlayerSet.has(input.nextBowlerId)) {
    throw new Error("Bowler must belong to the bowling lineup");
  }

  const latestDelivery = await db.query.deliveries.findFirst({
    where: {
      inningsId: input.inningsId,
    },
    orderBy: {
      sequenceNo: "desc",
    },
    columns: {
      ballInOver: true,
      isLegalDelivery: true,
      overNumber: true,
      sequenceNo: true,
    },
  });

  if (!latestDelivery) {
    throw new Error("No deliveries found for innings");
  }

  const rules = await getMatchFormatRulesByInningsId(input.inningsId);
  const nextSequenceNo = latestDelivery.sequenceNo + 1;
  const nextBallInOver = latestDelivery.isLegalDelivery
    ? latestDelivery.ballInOver + 1
    : latestDelivery.ballInOver;
  const overWrapped = nextBallInOver > rules.ballsPerOver;

  const nextOverNumber = overWrapped
    ? latestDelivery.overNumber + 1
    : latestDelivery.overNumber;
  const nextBallInOverNormalized = overWrapped ? 1 : nextBallInOver;

  const [newDelivery] = await db
    .insert(deliveries)
    .values({
      inningsId: input.inningsId,
      sequenceNo: nextSequenceNo,
      overNumber: nextOverNumber,
      ballInOver: nextBallInOverNormalized,
      isLegalDelivery: true,
      strikerId: input.nextStrikerId,
      nonStrikerId: input.nextNonStrikerId,
      bowlerId: input.nextBowlerId,
      batterRuns: 0,
      wideRuns: 0,
      noBallRuns: 0,
      byeRuns: 0,
      legByeRuns: 0,
      penaltyRuns: 0,
      totalRuns: 0,
      isWicket: false,
    })
    .returning({
      id: deliveries.id,
    });

  if (!newDelivery) {
    throw new Error("Failed to create next delivery");
  }

  return {
    deliveryId: newDelivery.id,
    inningsId: input.inningsId,
  };
}

export interface MatchLineupSelection {
  captainPlayerId?: number;
  playerIds: number[];
  viceCaptainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

export async function getSavedMatchLineup(matchId: number) {
  return await db.query.matchLineup.findMany({
    where: {
      matchId,
    },
    orderBy: {
      battingOrder: "asc",
    },
    with: {
      player: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function replaceMatchLineupForMatch({
  matchId,
  team1,
  team1Id,
  team2,
  team2Id,
}: {
  matchId: number;
  team1: MatchLineupSelection;
  team1Id: number;
  team2: MatchLineupSelection;
  team2Id: number;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(matchLineup)
      .where(
        and(
          eq(matchLineup.matchId, matchId),
          inArray(matchLineup.teamId, [team1Id, team2Id])
        )
      );

    const lineupRows = [
      ...team1.playerIds.map((playerId, index) => ({
        matchId,
        teamId: team1Id,
        playerId,
        battingOrder: index + 1,
        isCaptain: team1.captainPlayerId === playerId,
        isViceCaptain: team1.viceCaptainPlayerId === playerId,
        isWicketKeeper: team1.wicketKeeperPlayerId === playerId,
        isSubstitute: false,
      })),
      ...team2.playerIds.map((playerId, index) => ({
        matchId,
        teamId: team2Id,
        playerId,
        battingOrder: index + 1,
        isCaptain: team2.captainPlayerId === playerId,
        isViceCaptain: team2.viceCaptainPlayerId === playerId,
        isWicketKeeper: team2.wicketKeeperPlayerId === playerId,
        isSubstitute: false,
      })),
    ];

    if (lineupRows.length > 0) {
      await tx.insert(matchLineup).values(lineupRows);
    }
  });

  return await db.query.matchLineup.findMany({
    where: {
      matchId,
    },
    orderBy: {
      battingOrder: "asc",
    },
    with: {
      player: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function onSelectNewBatter({
  matchId,
  teamId,
  inningsId,
  isExtra,
  ballNumber,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  teamId: number;
  inningsId: number;
  ballNumber: number;
  isExtra: boolean;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  const nextSequenceNo = isExtra ? ballNumber : ballNumber + 1;
  const rules = await getMatchFormatRulesByInningsId(inningsId);
  const { sequenceNo, overNumber, ballInOver } = getSequenceMeta(
    nextSequenceNo,
    rules.ballsPerOver
  );

  await createNewBallAction({
    inningsId,
    sequenceNo,
    overNumber,
    ballInOver,
    isLegalDelivery: !isExtra,
    strikerId,
    nonStrikerId,
    bowlerId,
    batterRuns: 0,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    penaltyRuns: 0,
    totalRuns: 0,
    isWicket: false,
  });

  await Promise.all([
    createPlayerPerformanceAction({
      inningsId,
      playerId: strikerId,
      matchId,
      teamId,
    }),
    createPlayerPerformanceAction({
      inningsId,
      playerId: nonStrikerId,
      matchId,
      teamId,
    }),
  ]);
}

export async function onSelectNewBowler({
  matchId,
  teamId,
  inningsId,
  ballNumber,
  runScored,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  teamId: number;
  inningsId: number;
  ballNumber: number;
  runScored: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  const nextSequenceNo = ballNumber + 1;
  const rules = await getMatchFormatRulesByInningsId(inningsId);
  const { sequenceNo, overNumber, ballInOver } = getSequenceMeta(
    nextSequenceNo,
    rules.ballsPerOver
  );

  await createNewBallAction({
    inningsId,
    sequenceNo,
    overNumber,
    ballInOver,
    isLegalDelivery: true,
    strikerId: runScored % 2 === 1 ? strikerId : nonStrikerId,
    nonStrikerId: runScored % 2 === 1 ? nonStrikerId : strikerId,
    bowlerId,
    batterRuns: 0,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    penaltyRuns: 0,
    totalRuns: 0,
    isWicket: false,
  });

  const bowlerPerformance = await getPlayerMatchPerformance(
    bowlerId,
    matchId,
    inningsId
  );

  if (bowlerPerformance.length === 0) {
    await createPlayerPerformanceAction({
      inningsId,
      playerId: bowlerId,
      matchId,
      teamId,
    });
  }
}

export async function endInnings(inningsId: number) {
  await updateInningsAction({
    id: inningsId,
    status: "completed",
    isCompleted: true,
  });
}

export type ScoringPhase =
  | "completed"
  | "inningsSetup"
  | "lineup"
  | "scoring"
  | "toss";

export interface ScoringSessionPlayerOption {
  battingOrder: null | number;
  id: number;
  name: string;
  teamId: number;
}

export interface ScoringEntryContext {
  ballInOver: number;
  battingTeamId: number | null;
  bowlerId: number | null;
  bowlingTeamId: number | null;
  dismissedPlayerId: number | null;
  inningsId: number | null;
  inningsNumber: number | null;
  nonStrikerId: number | null;
  overNumber: number;
  strikerId: number | null;
}

export interface ScoringRequiredSelections {
  battingTeam: boolean;
  bowler: boolean;
  bowlingTeam: boolean;
  nonStriker: boolean;
  striker: boolean;
}

export interface DeliveryDraftInput {
  assistedById?: number | null;
  batterRuns?: number;
  bowlerId: number;
  byeRuns?: number;
  dismissedPlayerId?: number | null;
  inningsId: number;
  legByeRuns?: number;
  noBallRuns?: number;
  nonStrikerId: number;
  penaltyRuns?: number;
  strikerId: number;
  wicketType?: null | string;
  wideRuns?: number;
}

export interface StartScoringInningsInput {
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber?: number;
  matchId: number;
  nonStrikerId: number;
  openingBowlerId: number;
  strikerId: number;
  tossDecision?: "bat" | "bowl";
  tossWinnerId?: number;
}

export interface UpdateScoringDeliveryInput extends DeliveryDraftInput {
  deliveryId: number;
}

const NON_BOWLER_WICKETS = new Set<string>([
  "handled the ball",
  "obstructing the field",
  "retired hurt",
  "retired out",
  "run out",
  "timed out",
]);

const ASSIST_REQUIRED_WICKETS = new Set<string>([
  "boundary out",
  "caught",
  "run out",
  "stumped",
]);

function buildSavedTeamLineup(
  rows: Awaited<ReturnType<typeof getSavedMatchLineup>>,
  teamId: number
) {
  const teamRows = rows.filter((row) => row.teamId === teamId);

  return {
    playerIds: teamRows.map((row) => row.playerId),
    captainPlayerId: teamRows.find((row) => row.isCaptain)?.playerId,
    viceCaptainPlayerId: teamRows.find((row) => row.isViceCaptain)?.playerId,
    wicketKeeperPlayerId: teamRows.find((row) => row.isWicketKeeper)?.playerId,
  };
}

function normalizeRuns(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.trunc(value);
}

function getMovementRuns(input: {
  batterRuns: number;
  byeRuns: number;
  legByeRuns: number;
  noBallRuns: number;
  wideRuns: number;
}) {
  const noBallMovement = input.noBallRuns > 0 ? input.noBallRuns - 1 : 0;
  const wideMovement = input.wideRuns > 0 ? input.wideRuns - 1 : 0;

  return (
    input.batterRuns +
    input.byeRuns +
    input.legByeRuns +
    Math.max(0, noBallMovement) +
    Math.max(0, wideMovement)
  );
}

function isLegalDeliveryFromRuns(input: {
  noBallRuns: number;
  wideRuns: number;
}) {
  return input.noBallRuns === 0 && input.wideRuns === 0;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Delivery validation intentionally centralizes the scoring rule matrix.
function validateDeliveryDraft(params: {
  canDismissNonStriker: boolean;
  draft: DeliveryDraftInput;
  hasBoundaryOut: boolean;
  hasBye: boolean;
  hasLBW: boolean;
  hasLegBye: boolean;
  hasNoBalls: boolean;
  hasPenaltyRuns: boolean;
  hasWides: boolean;
  nonStrikerId: number;
  strikerId: number;
}) {
  const batterRuns = normalizeRuns(params.draft.batterRuns);
  const byeRuns = normalizeRuns(params.draft.byeRuns);
  const legByeRuns = normalizeRuns(params.draft.legByeRuns);
  const noBallRuns = normalizeRuns(params.draft.noBallRuns);
  const penaltyRuns = normalizeRuns(params.draft.penaltyRuns);
  const wideRuns = normalizeRuns(params.draft.wideRuns);
  const wicketType = params.draft.wicketType?.trim().toLowerCase() ?? null;
  const dismissedPlayerId = params.draft.dismissedPlayerId ?? null;
  const isWicket = wicketType !== null || typeof dismissedPlayerId === "number";

  if (wideRuns > 0 && !params.hasWides) {
    throw new Error("Wides are not enabled for this match");
  }

  if (noBallRuns > 0 && !params.hasNoBalls) {
    throw new Error("No-balls are not enabled for this match");
  }

  if (byeRuns > 0 && !params.hasBye) {
    throw new Error("Byes are not enabled for this match");
  }

  if (legByeRuns > 0 && !params.hasLegBye) {
    throw new Error("Leg byes are not enabled for this match");
  }

  if (penaltyRuns > 0 && !params.hasPenaltyRuns) {
    throw new Error("Penalty runs are not enabled for this match");
  }

  if (wideRuns > 0 && noBallRuns > 0) {
    throw new Error("A delivery cannot be both a wide and a no-ball");
  }

  if (wideRuns > 0 && (batterRuns > 0 || byeRuns > 0 || legByeRuns > 0)) {
    throw new Error("Wide runs must be recorded in the wide field only");
  }

  if (byeRuns > 0 && legByeRuns > 0) {
    throw new Error("A delivery cannot be both bye and leg bye");
  }

  if ((byeRuns > 0 || legByeRuns > 0) && batterRuns > 0) {
    throw new Error("Bat runs cannot be combined with byes or leg byes");
  }

  if (wideRuns > 0 && wideRuns < 1) {
    throw new Error("Wide runs must be at least one");
  }

  if (noBallRuns > 0 && noBallRuns < 1) {
    throw new Error("No-ball runs must be at least one");
  }

  if (isWicket) {
    if (!(wicketType && typeof dismissedPlayerId === "number")) {
      throw new Error("Dismissal type and dismissed player are required");
    }

    if (
      dismissedPlayerId !== params.strikerId &&
      dismissedPlayerId !== params.nonStrikerId
    ) {
      throw new Error("Dismissed player must be one of the current batters");
    }

    if (
      dismissedPlayerId === params.nonStrikerId &&
      !params.canDismissNonStriker &&
      wicketType !== "run out"
    ) {
      throw new Error("Only run out can dismiss the non-striker here");
    }

    if (wicketType === "lbw" && !params.hasLBW) {
      throw new Error("LBW is not enabled for this match");
    }

    if (wicketType === "boundary out" && !params.hasBoundaryOut) {
      throw new Error("Boundary out is not enabled for this match");
    }

    if (
      ASSIST_REQUIRED_WICKETS.has(wicketType) &&
      typeof params.draft.assistedById !== "number"
    ) {
      throw new Error("This dismissal requires an assisting fielder");
    }
  }

  return {
    assistedById: params.draft.assistedById ?? null,
    batterRuns,
    byeRuns,
    dismissedPlayerId,
    isLegalDelivery: isLegalDeliveryFromRuns({
      noBallRuns,
      wideRuns,
    }),
    isWicket,
    legByeRuns,
    noBallRuns,
    penaltyRuns,
    totalRuns:
      batterRuns + byeRuns + legByeRuns + noBallRuns + penaltyRuns + wideRuns,
    wicketType,
    wideRuns,
  };
}

function getDismissedPlayerIds(
  deliveryRows: Array<{
    dismissedPlayerId: null | number;
    isWicket: boolean;
  }>
) {
  return new Set(
    deliveryRows
      .filter(
        (delivery) =>
          delivery.isWicket && typeof delivery.dismissedPlayerId === "number"
      )
      .map((delivery) => delivery.dismissedPlayerId as number)
  );
}

function getBowlerLegalBallCounts(
  deliveryRows: Array<{
    bowlerId: number;
    isLegalDelivery: boolean;
  }>
) {
  const counts = new Map<number, number>();

  for (const delivery of deliveryRows) {
    if (!delivery.isLegalDelivery) {
      continue;
    }
    counts.set(delivery.bowlerId, (counts.get(delivery.bowlerId) ?? 0) + 1);
  }

  return counts;
}

function getNextBallPosition(params: {
  ballInOver: number;
  currentOverNumber: number;
  isLegalDelivery: boolean;
  rulesBallsPerOver: number;
}) {
  if (!params.isLegalDelivery) {
    return {
      ballInOver: params.ballInOver,
      overNumber: params.currentOverNumber,
    };
  }

  if (params.ballInOver >= params.rulesBallsPerOver) {
    return {
      ballInOver: 1,
      overNumber: params.currentOverNumber + 1,
    };
  }

  return {
    ballInOver: params.ballInOver + 1,
    overNumber: params.currentOverNumber,
  };
}

function getTeamAggregate(
  inningsRows: Array<{
    battingTeamId: number;
    isCompleted: boolean | null;
    totalScore: number;
  }>,
  teamId: number
) {
  return inningsRows
    .filter((inning) => inning.battingTeamId === teamId && inning.isCompleted)
    .reduce((sum, inning) => sum + inning.totalScore, 0);
}

function getCompletedInningsCount(
  inningsRows: Array<{
    battingTeamId: number;
    isCompleted: boolean | null;
  }>,
  teamId: number
) {
  return inningsRows.filter(
    (inning) => inning.battingTeamId === teamId && inning.isCompleted
  ).length;
}

function resolveNextInningsTeams(params: {
  inningsRows: Array<{
    battingTeamId: number;
    bowlingTeamId: number;
    inningsNumber: number;
  }>;
  team1Id: number;
  team2Id: number;
}) {
  const nextInningsNumber = params.inningsRows.length + 1;
  const shouldFlip = nextInningsNumber % 2 === 0;

  if (params.inningsRows.length === 0) {
    return {
      battingTeamId: params.team1Id,
      bowlingTeamId: params.team2Id,
      inningsNumber: 1,
    };
  }

  const previous = params.inningsRows.at(-1);
  if (!previous) {
    return null;
  }

  return {
    battingTeamId: shouldFlip ? previous.bowlingTeamId : previous.battingTeamId,
    bowlingTeamId: shouldFlip ? previous.battingTeamId : previous.bowlingTeamId,
    inningsNumber: nextInningsNumber,
  };
}

function deriveTargetRunsForInnings(params: {
  inningsPerSide: number;
  inningsRows: Array<{
    battingTeamId: number;
    isCompleted: boolean | null;
    totalScore: number;
  }>;
  battingTeamId: number;
  bowlingTeamId: number;
}) {
  const battingCompleted = getCompletedInningsCount(
    params.inningsRows,
    params.battingTeamId
  );
  const bowlingCompleted = getCompletedInningsCount(
    params.inningsRows,
    params.bowlingTeamId
  );

  if (
    battingCompleted !== params.inningsPerSide - 1 ||
    bowlingCompleted !== params.inningsPerSide
  ) {
    return null;
  }

  const battingAggregate = getTeamAggregate(
    params.inningsRows,
    params.battingTeamId
  );
  const bowlingAggregate = getTeamAggregate(
    params.inningsRows,
    params.bowlingTeamId
  );

  return Math.max(1, bowlingAggregate - battingAggregate + 1);
}

function shouldAutoCompleteInnings(params: {
  ballsBowled: number;
  matchRulesMaxLegalBallsPerInnings: null | number;
  playersPerSide: number;
  targetRuns: null | number;
  totalScore: number;
  wickets: number;
}) {
  if (params.wickets >= params.playersPerSide - 1) {
    return true;
  }

  if (
    typeof params.matchRulesMaxLegalBallsPerInnings === "number" &&
    params.ballsBowled >= params.matchRulesMaxLegalBallsPerInnings
  ) {
    return true;
  }

  if (
    typeof params.targetRuns === "number" &&
    params.totalScore >= params.targetRuns
  ) {
    return true;
  }

  return false;
}

async function resequenceDeliveriesForInnings(inningsId: number) {
  const rules = await getMatchFormatRulesByInningsId(inningsId);
  const deliveryRows = await db.query.deliveries.findMany({
    where: {
      inningsId,
    },
    orderBy: {
      sequenceNo: "asc",
    },
  });

  let nextOverNumber = 1;
  let nextBallInOver = 1;

  for (const [index, delivery] of deliveryRows.entries()) {
    const nextSequenceNo = index + 1;

    await db
      .update(deliveries)
      .set({
        sequenceNo: nextSequenceNo,
        overNumber: nextOverNumber,
        ballInOver: nextBallInOver,
      })
      .where(eq(deliveries.id, delivery.id));

    const nextMeta = getNextBallPosition({
      currentOverNumber: nextOverNumber,
      ballInOver: nextBallInOver,
      isLegalDelivery: Boolean(delivery.isLegalDelivery),
      rulesBallsPerOver: rules.ballsPerOver,
    });

    nextOverNumber = nextMeta.overNumber;
    nextBallInOver = nextMeta.ballInOver;
  }
}

async function syncReplayState(inningsId: number) {
  await resequenceDeliveriesForInnings(inningsId);
  await syncInningsAndStats(inningsId);
}

function mapLineupPlayers(
  lineupRows: Awaited<ReturnType<typeof getSavedMatchLineup>>,
  teamId: number
): ScoringSessionPlayerOption[] {
  return lineupRows
    .filter((row) => row.teamId === teamId)
    .map((row) => ({
      battingOrder: row.battingOrder,
      id: row.playerId,
      name: row.player?.name ?? "Unknown",
      teamId: row.teamId,
    }))
    .sort(
      (a, b) =>
        (a.battingOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.battingOrder ?? Number.MAX_SAFE_INTEGER)
    );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Entry context derivation combines innings setup, strike rotation, and next-ball requirements.
function getEntryContext(params: {
  battingPlayers: ScoringSessionPlayerOption[];
  bowlingPlayers: ScoringSessionPlayerOption[];
  inningsRow: {
    ballInOver?: number;
    battingTeamId: number;
    bowlingTeamId: number;
    id: number;
    inningsNumber: number;
    openingBowlerId: null | number;
    openingNonStrikerId: null | number;
    openingStrikerId: null | number;
    targetRuns: null | number;
  };
  matchRules: {
    ballsPerOver: number;
    maxOversPerBowler: null | number;
  };
  playersPerSide: number;
  timeline: Array<{
    ballInOver: number;
    batterRuns: number;
    bowlerId: number;
    byeRuns: number;
    dismissedPlayerId: null | number;
    isLegalDelivery: boolean;
    isWicket: boolean;
    legByeRuns: number;
    noBallRuns: number;
    nonStrikerId: number;
    overNumber: number;
    strikerId: number;
    totalScore?: number;
    totalRuns: number;
    wideRuns: number;
  }>;
}) {
  const dismissedSet = getDismissedPlayerIds(params.timeline);
  const battingIds = new Set(params.battingPlayers.map((player) => player.id));
  const bowlingIds = new Set(params.bowlingPlayers.map((player) => player.id));

  if (params.timeline.length === 0) {
    const bowlerId =
      params.inningsRow.openingBowlerId &&
      bowlingIds.has(params.inningsRow.openingBowlerId)
        ? params.inningsRow.openingBowlerId
        : null;
    const strikerId =
      params.inningsRow.openingStrikerId &&
      battingIds.has(params.inningsRow.openingStrikerId)
        ? params.inningsRow.openingStrikerId
        : null;
    const nonStrikerId =
      params.inningsRow.openingNonStrikerId &&
      battingIds.has(params.inningsRow.openingNonStrikerId)
        ? params.inningsRow.openingNonStrikerId
        : null;

    return {
      availableBatters: params.battingPlayers.filter(
        (player) =>
          !dismissedSet.has(player.id) &&
          player.id !== strikerId &&
          player.id !== nonStrikerId
      ),
      availableBowlers: params.bowlingPlayers,
      entryContext: {
        inningsId: params.inningsRow.id,
        inningsNumber: params.inningsRow.inningsNumber,
        battingTeamId: params.inningsRow.battingTeamId,
        bowlingTeamId: params.inningsRow.bowlingTeamId,
        strikerId,
        nonStrikerId,
        bowlerId,
        overNumber: 1,
        ballInOver: 1,
        dismissedPlayerId: null,
      } satisfies ScoringEntryContext,
      requiredSelections: {
        battingTeam: false,
        bowlingTeam: false,
        striker: strikerId === null,
        nonStriker: nonStrikerId === null,
        bowler: bowlerId === null,
      } satisfies ScoringRequiredSelections,
    };
  }

  const last = params.timeline.at(-1);
  if (!last) {
    throw new Error("Timeline is missing last delivery");
  }

  const movementRuns = getMovementRuns(last);
  const rotateStrike = movementRuns % 2 === 1;
  let strikerId = rotateStrike ? last.nonStrikerId : last.strikerId;
  let nonStrikerId = rotateStrike ? last.strikerId : last.nonStrikerId;
  let bowlerId = last.bowlerId;

  const overComplete =
    last.isLegalDelivery && last.ballInOver >= params.matchRules.ballsPerOver;

  if (overComplete) {
    const swappedStrikerId = nonStrikerId;
    nonStrikerId = strikerId;
    strikerId = swappedStrikerId;
    bowlerId = 0;
  }

  let dismissedPlayerId: null | number = null;
  if (last.isWicket && typeof last.dismissedPlayerId === "number") {
    dismissedPlayerId = last.dismissedPlayerId;
    if (dismissedPlayerId === strikerId) {
      strikerId = 0;
    }
    if (dismissedPlayerId === nonStrikerId) {
      nonStrikerId = 0;
    }
  }

  const nextMeta = getNextBallPosition({
    currentOverNumber: last.overNumber,
    ballInOver: last.ballInOver,
    isLegalDelivery: Boolean(last.isLegalDelivery),
    rulesBallsPerOver: params.matchRules.ballsPerOver,
  });

  const bowlerBallCounts = getBowlerLegalBallCounts(params.timeline);
  const maxBowlerBalls =
    typeof params.matchRules.maxOversPerBowler === "number"
      ? params.matchRules.maxOversPerBowler * params.matchRules.ballsPerOver
      : null;

  return {
    availableBatters: params.battingPlayers.filter(
      (player) =>
        !dismissedSet.has(player.id) &&
        player.id !== strikerId &&
        player.id !== nonStrikerId
    ),
    availableBowlers: params.bowlingPlayers.filter((player) => {
      if (!overComplete) {
        return player.id === last.bowlerId;
      }

      if (player.id === last.bowlerId) {
        return false;
      }

      if (
        typeof maxBowlerBalls === "number" &&
        (bowlerBallCounts.get(player.id) ?? 0) >= maxBowlerBalls
      ) {
        return false;
      }

      return true;
    }),
    entryContext: {
      inningsId: params.inningsRow.id,
      inningsNumber: params.inningsRow.inningsNumber,
      battingTeamId: params.inningsRow.battingTeamId,
      bowlingTeamId: params.inningsRow.bowlingTeamId,
      strikerId: strikerId === 0 ? null : strikerId,
      nonStrikerId: nonStrikerId === 0 ? null : nonStrikerId,
      bowlerId: bowlerId === 0 ? null : bowlerId,
      overNumber: nextMeta.overNumber,
      ballInOver: nextMeta.ballInOver,
      dismissedPlayerId,
    } satisfies ScoringEntryContext,
    requiredSelections: {
      battingTeam: false,
      bowlingTeam: false,
      striker: strikerId === 0,
      nonStriker: nonStrikerId === 0,
      bowler: overComplete,
    } satisfies ScoringRequiredSelections,
  };
}

function getMatchCompletionSnapshot(params: {
  inningsPerSide: number;
  inningsRows: Array<{
    battingTeamId: number;
    bowlingTeamId: number;
    id: number;
    inningsNumber: number;
    isCompleted: boolean | null;
    totalScore: number;
    wickets: number;
  }>;
  match: {
    id: number;
    team1Id: number;
    team2Id: number;
  };
}) {
  const maxInnings = params.inningsPerSide * 2;
  const completedInnings = params.inningsRows.filter(
    (inning) => inning.isCompleted
  );
  const team1Aggregate = getTeamAggregate(
    completedInnings,
    params.match.team1Id
  );
  const team2Aggregate = getTeamAggregate(
    completedInnings,
    params.match.team2Id
  );
  const hasReachedScheduledEnd = completedInnings.length >= maxInnings;

  if (!hasReachedScheduledEnd) {
    return {
      isCompleted: false,
      isTied: false,
      margin: null,
      result: null,
      winnerId: null,
    };
  }

  if (team1Aggregate === team2Aggregate) {
    return {
      isCompleted: true,
      isTied: true,
      margin: "Scores level",
      result: "Match tied",
      winnerId: null,
    };
  }

  const winnerId =
    team1Aggregate > team2Aggregate
      ? params.match.team1Id
      : params.match.team2Id;
  const margin = `${Math.abs(team1Aggregate - team2Aggregate)} runs`;
  const winnerLabel = winnerId === params.match.team1Id ? "Team 1" : "Team 2";

  return {
    isCompleted: true,
    isTied: false,
    margin,
    result: `${winnerLabel} won by ${margin}`,
    winnerId,
  };
}

async function refreshMatchCompletion(matchId: number) {
  const match = await db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    columns: {
      id: true,
      inningsPerSide: true,
      team1Id: true,
      team2Id: true,
    },
  });

  if (
    !match ||
    typeof match.team1Id !== "number" ||
    typeof match.team2Id !== "number"
  ) {
    throw new Error("Match not found");
  }

  const inningsRows = await db.query.innings.findMany({
    where: {
      matchId,
    },
    columns: {
      id: true,
      inningsNumber: true,
      battingTeamId: true,
      bowlingTeamId: true,
      totalScore: true,
      wickets: true,
      isCompleted: true,
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  const activeInningsExists = inningsRows.some((inning) => !inning.isCompleted);
  const nextState = getMatchCompletionSnapshot({
    inningsPerSide: match.inningsPerSide,
    inningsRows,
    match: {
      id: match.id,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
    },
  });

  await db
    .update(matches)
    .set({
      isCompleted: nextState.isCompleted,
      isLive: activeInningsExists || !nextState.isCompleted,
      isTied: nextState.isTied,
      margin: nextState.margin,
      result: nextState.result,
      winnerId: nextState.winnerId,
    })
    .where(eq(matches.id, matchId));
}

function getActiveLineupPlayers(params: {
  fallbackTeamId: number | null | undefined;
  team1Id: number;
  team1LineupPlayers: ScoringSessionPlayerOption[];
  team2Id: number;
  team2LineupPlayers: ScoringSessionPlayerOption[];
}) {
  if (params.fallbackTeamId === params.team1Id) {
    return params.team1LineupPlayers;
  }

  if (params.fallbackTeamId === params.team2Id) {
    return params.team2LineupPlayers;
  }

  return params.team1LineupPlayers;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Session assembly intentionally returns the full scorer contract in one query path.
export async function getMatchScoringSession(matchId: number) {
  const match = await getMatchById(matchId);
  if (!match) {
    return null;
  }

  if (typeof match.team1Id !== "number" || typeof match.team2Id !== "number") {
    throw new Error("Match participants are not finalized");
  }

  const rosterRows = await db
    .select({
      teamId: teamPlayers.teamId,
      playerId: players.id,
      name: players.name,
      role: players.role,
      isCaptain: teamPlayers.isCaptain,
      isViceCaptain: teamPlayers.isViceCaptain,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(players.id, teamPlayers.playerId))
    .where(
      and(
        eq(teamPlayers.tournamentId, match.tournamentId),
        inArray(teamPlayers.teamId, [match.team1Id, match.team2Id])
      )
    );

  const team1Roster = rosterRows
    .filter((row) => row.teamId === match.team1Id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const team2Roster = rosterRows
    .filter((row) => row.teamId === match.team2Id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const savedLineupRows = await getSavedMatchLineup(match.id);
  const savedLineup = {
    team1: buildSavedTeamLineup(savedLineupRows, match.team1Id),
    team2: buildSavedTeamLineup(savedLineupRows, match.team2Id),
  };

  const team1LineupPlayers = mapLineupPlayers(savedLineupRows, match.team1Id);
  const team2LineupPlayers = mapLineupPlayers(savedLineupRows, match.team2Id);
  const lineupComplete =
    savedLineup.team1.playerIds.length === match.playersPerSide &&
    savedLineup.team2.playerIds.length === match.playersPerSide;

  const inningsRows = await db.query.innings.findMany({
    where: {
      matchId: match.id,
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
      openingStriker: {
        columns: {
          id: true,
          name: true,
        },
      },
      openingNonStriker: {
        columns: {
          id: true,
          name: true,
        },
      },
      openingBowler: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  const inningsWithDeliveries = await Promise.all(
    inningsRows.map(async (inningsRow) => ({
      ...inningsRow,
      deliveries: await db.query.deliveries.findMany({
        where: {
          inningsId: inningsRow.id,
        },
        with: {
          striker: {
            columns: {
              id: true,
              name: true,
            },
          },
          nonStriker: {
            columns: {
              id: true,
              name: true,
            },
          },
          bowler: {
            columns: {
              id: true,
              name: true,
            },
          },
          dismissedPlayer: {
            columns: {
              id: true,
              name: true,
            },
          },
          assistedBy: {
            columns: {
              id: true,
              name: true,
            },
          },
          dismissedBy: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          sequenceNo: "asc",
        },
      }),
    }))
  );

  const currentInnings =
    inningsWithDeliveries.find((inning) => !inning.isCompleted) ??
    inningsWithDeliveries.at(-1) ??
    null;

  const matchRules = await getMatchFormatRulesByMatchId(match.id);
  const nextInningsDefaults = resolveNextInningsTeams({
    inningsRows: inningsRows.map((row) => ({
      battingTeamId: row.battingTeamId,
      bowlingTeamId: row.bowlingTeamId,
      inningsNumber: row.inningsNumber,
    })),
    team1Id: match.team1Id,
    team2Id: match.team2Id,
  });

  let phase: ScoringPhase = "inningsSetup";
  if (!lineupComplete) {
    phase = "lineup";
  } else if (!(currentInnings || match.tossWinnerId)) {
    phase = "toss";
  } else if (match.isCompleted) {
    phase = "completed";
  } else if (currentInnings && !currentInnings.isCompleted) {
    phase = "scoring";
  }

  const activeBattingPlayers = getActiveLineupPlayers({
    fallbackTeamId:
      currentInnings?.battingTeamId ?? nextInningsDefaults?.battingTeamId,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1LineupPlayers,
    team2LineupPlayers,
  });
  const activeBowlingPlayers = getActiveLineupPlayers({
    fallbackTeamId:
      currentInnings?.bowlingTeamId ?? nextInningsDefaults?.bowlingTeamId,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    team1LineupPlayers,
    team2LineupPlayers,
  });

  const inningsEntryContext = currentInnings
    ? getEntryContext({
        battingPlayers: activeBattingPlayers,
        bowlingPlayers: activeBowlingPlayers,
        inningsRow: {
          id: currentInnings.id,
          inningsNumber: currentInnings.inningsNumber,
          battingTeamId: currentInnings.battingTeamId,
          bowlingTeamId: currentInnings.bowlingTeamId,
          openingStrikerId: currentInnings.openingStrikerId,
          openingNonStrikerId: currentInnings.openingNonStrikerId,
          openingBowlerId: currentInnings.openingBowlerId,
          targetRuns: currentInnings.targetRuns,
        },
        matchRules: {
          ballsPerOver: matchRules.ballsPerOver,
          maxOversPerBowler: matchRules.maxOversPerBowler,
        },
        playersPerSide: match.playersPerSide,
        timeline: currentInnings.deliveries,
      })
    : null;

  return {
    match,
    playersPerSide: match.playersPerSide,
    team1Roster,
    team2Roster,
    savedLineup,
    lineupComplete,
    matchRules,
    innings: inningsWithDeliveries,
    currentInnings,
    phase,
    entryContext: inningsEntryContext?.entryContext ?? {
      inningsId: null,
      inningsNumber: nextInningsDefaults?.inningsNumber ?? null,
      battingTeamId: nextInningsDefaults?.battingTeamId ?? null,
      bowlingTeamId: nextInningsDefaults?.bowlingTeamId ?? null,
      strikerId: null,
      nonStrikerId: null,
      bowlerId: null,
      overNumber: 1,
      ballInOver: 1,
      dismissedPlayerId: null,
    },
    requiredSelections:
      inningsEntryContext?.requiredSelections ??
      ({
        battingTeam: true,
        bowlingTeam: true,
        striker: true,
        nonStriker: true,
        bowler: true,
      } satisfies ScoringRequiredSelections),
    availableBatters:
      inningsEntryContext?.availableBatters ?? activeBattingPlayers,
    availableBowlers:
      inningsEntryContext?.availableBowlers ?? activeBowlingPlayers,
    teamLineupPlayers: {
      team1: team1LineupPlayers,
      team2: team2LineupPlayers,
    },
    nextInningsDefaults,
  };
}

async function assertLineupMembership(params: {
  inningsRow: {
    battingTeamId: number;
    bowlingTeamId: number;
    matchId: number;
  };
  nextBowlerId: number;
  nextNonStrikerId: number;
  nextStrikerId: number;
}) {
  const lineupRows = await db.query.matchLineup.findMany({
    where: {
      matchId: params.inningsRow.matchId,
    },
    columns: {
      playerId: true,
      teamId: true,
    },
  });

  const battingPlayerSet = new Set(
    lineupRows
      .filter((row) => row.teamId === params.inningsRow.battingTeamId)
      .map((row) => row.playerId)
  );
  const bowlingPlayerSet = new Set(
    lineupRows
      .filter((row) => row.teamId === params.inningsRow.bowlingTeamId)
      .map((row) => row.playerId)
  );

  if (
    !(
      battingPlayerSet.has(params.nextStrikerId) &&
      battingPlayerSet.has(params.nextNonStrikerId)
    )
  ) {
    throw new Error("Batters must belong to the batting lineup");
  }

  if (params.nextStrikerId === params.nextNonStrikerId) {
    throw new Error("Striker and non-striker must be different");
  }

  if (!bowlingPlayerSet.has(params.nextBowlerId)) {
    throw new Error("Bowler must belong to the bowling lineup");
  }
}

async function getInningsRowForMutation(inningsId: number) {
  const inningsRow = await db.query.innings.findFirst({
    where: {
      id: inningsId,
    },
    columns: {
      id: true,
      matchId: true,
      battingTeamId: true,
      bowlingTeamId: true,
      inningsNumber: true,
      targetRuns: true,
      isCompleted: true,
      openingStrikerId: true,
      openingNonStrikerId: true,
      openingBowlerId: true,
    },
  });

  if (!inningsRow) {
    throw new Error("Innings not found");
  }

  return inningsRow;
}

export async function startScoringInnings(input: StartScoringInningsInput) {
  const match = await db.query.matches.findFirst({
    where: {
      id: input.matchId,
    },
    columns: {
      id: true,
      inningsPerSide: true,
      team1Id: true,
      team2Id: true,
      playersPerSide: true,
    },
  });

  if (
    !match ||
    typeof match.team1Id !== "number" ||
    typeof match.team2Id !== "number"
  ) {
    throw new Error("Match not found");
  }

  const inningsRows = await db.query.innings.findMany({
    where: {
      matchId: input.matchId,
    },
    columns: {
      id: true,
      inningsNumber: true,
      battingTeamId: true,
      bowlingTeamId: true,
      totalScore: true,
      isCompleted: true,
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  if (inningsRows.some((inning) => !inning.isCompleted)) {
    throw new Error("An innings is already in progress");
  }

  const inningsNumber = input.inningsNumber ?? inningsRows.length + 1;
  if (inningsNumber > match.inningsPerSide * 2) {
    throw new Error("This match has no innings remaining");
  }

  await assertLineupMembership({
    inningsRow: {
      matchId: input.matchId,
      battingTeamId: input.battingTeamId,
      bowlingTeamId: input.bowlingTeamId,
    },
    nextStrikerId: input.strikerId,
    nextNonStrikerId: input.nonStrikerId,
    nextBowlerId: input.openingBowlerId,
  });

  const targetRuns = deriveTargetRunsForInnings({
    inningsPerSide: match.inningsPerSide,
    inningsRows,
    battingTeamId: input.battingTeamId,
    bowlingTeamId: input.bowlingTeamId,
  });

  const inningsId = await createInningsAction({
    matchId: input.matchId,
    battingTeamId: input.battingTeamId,
    bowlingTeamId: input.bowlingTeamId,
    inningsNumber,
    status: "in_progress",
    targetRuns,
    openingStrikerId: input.strikerId,
    openingNonStrikerId: input.nonStrikerId,
    openingBowlerId: input.openingBowlerId,
  });

  if (!inningsId) {
    throw new Error("Failed to create innings");
  }

  await db
    .update(matches)
    .set({
      isLive: true,
      tossWinnerId: input.tossWinnerId,
      tossDecision: input.tossDecision,
    })
    .where(eq(matches.id, input.matchId));

  await refreshMatchCompletion(input.matchId);

  return Number(inningsId);
}

export async function recordScoringDelivery(input: DeliveryDraftInput) {
  const inningsRow = await getInningsRowForMutation(input.inningsId);
  if (inningsRow.isCompleted) {
    throw new Error("Innings already completed");
  }

  const session = await getMatchScoringSession(inningsRow.matchId);
  if (!session?.currentInnings) {
    throw new Error("Scoring session not available");
  }

  await assertLineupMembership({
    inningsRow,
    nextStrikerId: input.strikerId,
    nextNonStrikerId: input.nonStrikerId,
    nextBowlerId: input.bowlerId,
  });

  const normalized = validateDeliveryDraft({
    draft: input,
    hasBoundaryOut: Boolean(session.match.hasBoundaryOut),
    hasBye: Boolean(session.match.hasBye),
    hasLBW: Boolean(session.match.hasLBW),
    hasLegBye: Boolean(session.match.hasLegBye),
    hasNoBalls: Boolean(session.match.hasNoBalls),
    hasPenaltyRuns: Boolean(session.match.hasPenaltyRuns),
    hasWides: Boolean(session.match.hasWides),
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    canDismissNonStriker: true,
  });

  const currentEntry = session.entryContext;
  const sequenceNo = session.currentInnings.deliveries.length + 1;

  await db.insert(deliveries).values({
    inningsId: input.inningsId,
    sequenceNo,
    overNumber: currentEntry.overNumber,
    ballInOver: currentEntry.ballInOver,
    isLegalDelivery: normalized.isLegalDelivery,
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    bowlerId: input.bowlerId,
    batterRuns: normalized.batterRuns,
    wideRuns: normalized.wideRuns,
    noBallRuns: normalized.noBallRuns,
    byeRuns: normalized.byeRuns,
    legByeRuns: normalized.legByeRuns,
    penaltyRuns: normalized.penaltyRuns,
    totalRuns: normalized.totalRuns,
    isWicket: normalized.isWicket,
    wicketType: normalized.wicketType,
    dismissedPlayerId: normalized.dismissedPlayerId,
    dismissedById:
      normalized.isWicket &&
      normalized.wicketType &&
      !NON_BOWLER_WICKETS.has(normalized.wicketType)
        ? input.bowlerId
        : null,
    assistedById: normalized.assistedById,
  });

  await syncReplayState(input.inningsId);

  const updatedInnings = await db.query.innings.findFirst({
    where: {
      id: input.inningsId,
    },
    columns: {
      id: true,
      matchId: true,
      ballsBowled: true,
      targetRuns: true,
      totalScore: true,
      wickets: true,
    },
  });

  if (!updatedInnings) {
    throw new Error("Innings not found after save");
  }

  if (
    shouldAutoCompleteInnings({
      ballsBowled: updatedInnings.ballsBowled,
      matchRulesMaxLegalBallsPerInnings:
        session.matchRules.maxLegalBallsPerInnings,
      playersPerSide: session.playersPerSide,
      targetRuns: updatedInnings.targetRuns,
      totalScore: updatedInnings.totalScore,
      wickets: updatedInnings.wickets,
    })
  ) {
    await closeCurrentScoringInnings(updatedInnings.id);
  }

  return await getMatchScoringSession(inningsRow.matchId);
}

export async function updateScoringDelivery(input: UpdateScoringDeliveryInput) {
  const existingDelivery = await db.query.deliveries.findFirst({
    where: {
      id: input.deliveryId,
    },
    columns: {
      id: true,
      inningsId: true,
    },
  });

  if (!existingDelivery || existingDelivery.inningsId !== input.inningsId) {
    throw new Error("Delivery not found");
  }

  const inningsRow = await getInningsRowForMutation(input.inningsId);
  if (inningsRow.isCompleted) {
    throw new Error("Completed innings cannot be edited");
  }

  const session = await getMatchScoringSession(inningsRow.matchId);
  if (!session) {
    throw new Error("Scoring session not available");
  }

  await assertLineupMembership({
    inningsRow,
    nextStrikerId: input.strikerId,
    nextNonStrikerId: input.nonStrikerId,
    nextBowlerId: input.bowlerId,
  });

  const normalized = validateDeliveryDraft({
    draft: input,
    hasBoundaryOut: Boolean(session.match.hasBoundaryOut),
    hasBye: Boolean(session.match.hasBye),
    hasLBW: Boolean(session.match.hasLBW),
    hasLegBye: Boolean(session.match.hasLegBye),
    hasNoBalls: Boolean(session.match.hasNoBalls),
    hasPenaltyRuns: Boolean(session.match.hasPenaltyRuns),
    hasWides: Boolean(session.match.hasWides),
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    canDismissNonStriker: true,
  });

  await db
    .update(deliveries)
    .set({
      isLegalDelivery: normalized.isLegalDelivery,
      strikerId: input.strikerId,
      nonStrikerId: input.nonStrikerId,
      bowlerId: input.bowlerId,
      batterRuns: normalized.batterRuns,
      wideRuns: normalized.wideRuns,
      noBallRuns: normalized.noBallRuns,
      byeRuns: normalized.byeRuns,
      legByeRuns: normalized.legByeRuns,
      penaltyRuns: normalized.penaltyRuns,
      totalRuns: normalized.totalRuns,
      isWicket: normalized.isWicket,
      wicketType: normalized.wicketType,
      dismissedPlayerId: normalized.dismissedPlayerId,
      dismissedById:
        normalized.isWicket &&
        normalized.wicketType &&
        !NON_BOWLER_WICKETS.has(normalized.wicketType)
          ? input.bowlerId
          : null,
      assistedById: normalized.assistedById,
    })
    .where(eq(deliveries.id, input.deliveryId));

  await syncReplayState(input.inningsId);
  return await getMatchScoringSession(inningsRow.matchId);
}

export async function deleteScoringDelivery(deliveryId: number) {
  const existingDelivery = await db.query.deliveries.findFirst({
    where: {
      id: deliveryId,
    },
    columns: {
      id: true,
      inningsId: true,
    },
  });

  if (!existingDelivery) {
    throw new Error("Delivery not found");
  }

  const inningsRow = await getInningsRowForMutation(existingDelivery.inningsId);
  if (inningsRow.isCompleted) {
    throw new Error("Completed innings cannot be edited");
  }

  await db.delete(deliveries).where(eq(deliveries.id, deliveryId));
  await syncReplayState(existingDelivery.inningsId);
  return await getMatchScoringSession(inningsRow.matchId);
}

export async function closeCurrentScoringInnings(inningsId: number) {
  const inningsRow = await getInningsRowForMutation(inningsId);
  await updateInningsAction({
    id: inningsId,
    status: "completed",
    isCompleted: true,
  });
  await refreshMatchCompletion(inningsRow.matchId);
  return await getMatchScoringSession(inningsRow.matchId);
}

export const scoringSessionInternals = {
  deriveTargetRunsForInnings,
  getMatchCompletionSnapshot,
  getMovementRuns,
  getNextBallPosition,
  isLegalDeliveryFromRuns,
  shouldAutoCompleteInnings,
  validateDeliveryDraft,
};
