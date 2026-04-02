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

    const statsByPlayer = new Map<number, MutableStats>();

    const overBowlerTracker = new Map<
      string,
      { legalBalls: number; runs: number }
    >();

    for (const delivery of deliveryRows) {
      const strikerStats = ensureMutableStats({
        battingOrderByPlayer,
        inningsId,
        matchId: inningsRow.matchId,
        playerId: delivery.strikerId,
        statsByPlayer,
        teamId: inningsRow.battingTeamId,
      });
      const bowlerStats = ensureMutableStats({
        battingOrderByPlayer,
        inningsId,
        matchId: inningsRow.matchId,
        playerId: delivery.bowlerId,
        statsByPlayer,
        teamId: inningsRow.bowlingTeamId,
      });

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
        const dismissedStats = ensureMutableStats({
          battingOrderByPlayer,
          inningsId,
          matchId: inningsRow.matchId,
          playerId: delivery.dismissedPlayerId,
          statsByPlayer,
          teamId: inningsRow.battingTeamId,
        });
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
        const assistingStats = ensureMutableStats({
          battingOrderByPlayer,
          inningsId,
          matchId: inningsRow.matchId,
          playerId: delivery.assistedById,
          statsByPlayer,
          teamId: inningsRow.bowlingTeamId,
        });

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

type ScoringDeliveryRecord = Pick<
  typeof deliveries.$inferSelect,
  | "assistedById"
  | "ballInOver"
  | "batterRuns"
  | "bowlerId"
  | "byeRuns"
  | "dismissedPlayerId"
  | "id"
  | "inningsId"
  | "isLegalDelivery"
  | "isWicket"
  | "legByeRuns"
  | "noBallRuns"
  | "nonStrikerId"
  | "overNumber"
  | "penaltyRuns"
  | "sequenceNo"
  | "strikerId"
  | "totalRuns"
  | "wicketType"
  | "wideRuns"
> & {
  dismissedById: number | null;
};

export interface ScoringMutationInningsSummary {
  ballsBowled: number;
  battingTeamId: number;
  bowlingTeamId: number;
  id: number;
  inningsNumber: number;
  isCompleted: boolean | null;
  targetRuns: number | null;
  totalScore: number;
  wickets: number;
}

export interface ScoringMutationMatchState {
  isCompleted: boolean | null;
  isLive: boolean | null;
  isTied: boolean | null;
  margin: string | null;
  result: string | null;
  winnerId: number | null;
}

export type ScoringMutationAction = "delete" | "record" | "update";
export type PendingInningsClosureReason =
  | "all_out"
  | "max_balls"
  | "target_reached";

export interface PendingInningsClosure {
  deliveryId: number;
  inningsId: number;
  reason: PendingInningsClosureReason;
}

export interface NextInningsFollowOnOption {
  battingTeamId: number;
  bowlingTeamId: number;
  isApplied: boolean;
}

export interface NextInningsDefaults {
  battingTeamId: number;
  bowlingTeamId: number;
  followOn: NextInningsFollowOnOption | null;
  inningsNumber: number;
}

export interface ScoringMutationResult {
  action: ScoringMutationAction;
  affectedInnings: ScoringMutationInningsSummary;
  availableBatters: ScoringSessionPlayerOption[];
  availableBowlers: ScoringSessionPlayerOption[];
  currentInnings: ScoringMutationInningsSummary | null;
  deletedDeliveryId: number | null;
  delivery: ScoringDeliveryRecord | null;
  entryContext: ScoringEntryContext;
  match: ScoringMutationMatchState;
  nextInningsDefaults: NextInningsDefaults | null;
  pendingInningsClosure: PendingInningsClosure | null;
  phase: ScoringPhase;
  requiredSelections: ScoringRequiredSelections;
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
const INNINGS_STATUS_AWAITING_CLOSE_CONFIRMATION =
  "awaiting_close_confirmation";

const NO_BALL_ALLOWED_WICKETS = new Set<string>(["run out"]);

const WIDE_ALLOWED_WICKETS = new Set<string>([
  "run out",
  "stumped",
  "hit wicket",
  "obstructing the field",
]);

const BATTER_RUN_WICKETS = new Set<string>([
  "run out",
  "obstructing the field",
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

function createEmptyMutableStats(params: {
  battingOrder: number | null;
  inningsId: number;
  matchId: number;
  playerId: number;
  teamId: number;
}): MutableStats {
  return {
    inningsId: params.inningsId,
    matchId: params.matchId,
    playerId: params.playerId,
    teamId: params.teamId,
    battingOrder: params.battingOrder,
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
}

function ensureMutableStats(params: {
  battingOrderByPlayer: Map<number, number | null>;
  inningsId: number;
  matchId: number;
  playerId: number;
  statsByPlayer: Map<number, MutableStats>;
  teamId: number;
}) {
  const existing = params.statsByPlayer.get(params.playerId);
  if (existing) {
    return existing;
  }

  const next = createEmptyMutableStats({
    inningsId: params.inningsId,
    matchId: params.matchId,
    playerId: params.playerId,
    teamId: params.teamId,
    battingOrder: params.battingOrderByPlayer.get(params.playerId) ?? null,
  });
  params.statsByPlayer.set(params.playerId, next);
  return next;
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

  if (wideRuns > 0 && (batterRuns > 0 || legByeRuns > 0)) {
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

    if (noBallRuns > 0 && !NO_BALL_ALLOWED_WICKETS.has(wicketType)) {
      throw new Error(
        "Only run out can be recorded as a dismissal on a no-ball"
      );
    }

    if (wideRuns > 0 && !WIDE_ALLOWED_WICKETS.has(wicketType)) {
      throw new Error(
        "Only run out, stumped, hit wicket, and obstructing the field can be recorded on a wide"
      );
    }

    if (batterRuns > 0 && !BATTER_RUN_WICKETS.has(wicketType)) {
      throw new Error(
        "Batter runs must be zero unless the dismissal is run out or obstructing the field"
      );
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

function getBowlerIdsForOver(
  deliveryRows: Array<{
    bowlerId: number;
    overNumber: number;
  }>,
  overNumber: number
) {
  if (overNumber < 1) {
    return new Set<number>();
  }

  return new Set(
    deliveryRows
      .filter((delivery) => delivery.overNumber === overNumber)
      .map((delivery) => delivery.bowlerId)
  );
}

function getMaxBowlerBalls(matchRules: {
  ballsPerOver: number;
  maxOversPerBowler: null | number;
}) {
  return typeof matchRules.maxOversPerBowler === "number"
    ? matchRules.maxOversPerBowler * matchRules.ballsPerOver
    : null;
}

function canBowlerCompleteRemainingOver(params: {
  bowlerBallCounts: Map<number, number>;
  bowlerId: number;
  matchRules: {
    ballsPerOver: number;
    maxOversPerBowler: null | number;
  };
  remainingLegalBallsInOver: number;
}) {
  const maxBowlerBalls = getMaxBowlerBalls(params.matchRules);
  if (typeof maxBowlerBalls !== "number") {
    return true;
  }

  return (
    (params.bowlerBallCounts.get(params.bowlerId) ?? 0) +
      params.remainingLegalBallsInOver <=
    maxBowlerBalls
  );
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

function buildAppendDeliveryPosition(params: {
  currentEntry: Pick<ScoringEntryContext, "ballInOver" | "overNumber">;
  deliveryCount: number;
}) {
  return {
    ballInOver: params.currentEntry.ballInOver,
    overNumber: params.currentEntry.overNumber,
    sequenceNo: params.deliveryCount + 1,
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

function resolveNextInningsSetup(params: {
  followOnApplied?: boolean;
  inningsPerSide: number;
  inningsRows: Array<{
    battingTeamId: number;
    bowlingTeamId: number;
    inningsNumber: number;
    isCompleted?: boolean | null;
    totalScore?: number;
  }>;
  team1Id: number;
  team2Id: number;
  tossDecision?: "bat" | "bowl" | null;
  tossWinnerId?: number | null;
}): NextInningsDefaults | null {
  const nextInningsNumber = params.inningsRows.length + 1;
  if (nextInningsNumber > params.inningsPerSide * 2) {
    return null;
  }

  if (params.inningsRows.length === 0) {
    const inningsOneTeams = deriveBattingAndBowlingTeamIds({
      team1Id: params.team1Id,
      team2Id: params.team2Id,
      tossDecision:
        params.tossDecision === "bat" || params.tossDecision === "bowl"
          ? params.tossDecision
          : "bat",
      tossWinnerId:
        typeof params.tossWinnerId === "number"
          ? params.tossWinnerId
          : params.team1Id,
    });

    return {
      battingTeamId: inningsOneTeams.battingTeamId,
      bowlingTeamId: inningsOneTeams.bowlingTeamId,
      followOn: null,
      inningsNumber: 1,
    };
  }

  const previous = params.inningsRows.at(-1);
  if (!previous) {
    return null;
  }

  if (nextInningsNumber === 3) {
    const firstInnings = params.inningsRows[0];
    const secondInnings = params.inningsRows[1];
    const followOnAvailable =
      Boolean(firstInnings?.isCompleted) &&
      Boolean(secondInnings?.isCompleted) &&
      typeof firstInnings?.totalScore === "number" &&
      typeof secondInnings?.totalScore === "number" &&
      firstInnings.totalScore - secondInnings.totalScore >= 200;
    const followOnTeams = {
      battingTeamId: previous.battingTeamId,
      bowlingTeamId: previous.bowlingTeamId,
    };
    const traditionalTeams = {
      battingTeamId: previous.bowlingTeamId,
      bowlingTeamId: previous.battingTeamId,
    };
    const nextTeams =
      followOnAvailable && params.followOnApplied
        ? followOnTeams
        : traditionalTeams;

    return {
      ...nextTeams,
      followOn: followOnAvailable
        ? {
            ...followOnTeams,
            isApplied: Boolean(params.followOnApplied),
          }
        : null,
      inningsNumber: nextInningsNumber,
    };
  }

  const shouldFlip = nextInningsNumber % 2 === 0;

  return {
    battingTeamId: shouldFlip ? previous.bowlingTeamId : previous.battingTeamId,
    bowlingTeamId: shouldFlip ? previous.battingTeamId : previous.bowlingTeamId,
    followOn: null,
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

function resolveAutoCompleteInningsReason(params: {
  ballsBowled: number;
  matchRulesMaxLegalBallsPerInnings: null | number;
  playersPerSide: number;
  targetRuns: null | number;
  totalScore: number;
  wickets: number;
}): null | PendingInningsClosureReason {
  if (params.wickets >= params.playersPerSide - 1) {
    return "all_out";
  }

  if (
    typeof params.matchRulesMaxLegalBallsPerInnings === "number" &&
    params.ballsBowled >= params.matchRulesMaxLegalBallsPerInnings
  ) {
    return "max_balls";
  }

  if (
    typeof params.targetRuns === "number" &&
    params.totalScore >= params.targetRuns
  ) {
    return "target_reached";
  }

  return null;
}

function shouldAutoCompleteInnings(params: {
  ballsBowled: number;
  matchRulesMaxLegalBallsPerInnings: null | number;
  playersPerSide: number;
  targetRuns: null | number;
  totalScore: number;
  wickets: number;
}) {
  return resolveAutoCompleteInningsReason(params) !== null;
}

function resolveLiveInningsStatus(params: {
  ballsBowled: number;
  hasPendingClosure: boolean;
}) {
  if (params.hasPendingClosure) {
    return INNINGS_STATUS_AWAITING_CLOSE_CONFIRMATION;
  }

  return params.ballsBowled > 0 ? "in_progress" : "not_started";
}

function toPendingInningsClosure(params: {
  deliveryId: number;
  inningsId: number;
  reason: null | PendingInningsClosureReason;
}): PendingInningsClosure | null {
  if (!params.reason) {
    return null;
  }

  return {
    deliveryId: params.deliveryId,
    inningsId: params.inningsId,
    reason: params.reason,
  };
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

async function syncReplayState(
  inningsId: number,
  mode: "append" | "rewrite" = "rewrite"
) {
  if (mode === "rewrite") {
    await resequenceDeliveriesForInnings(inningsId);
  }

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
function buildEntryContextFromState(params: {
  battingPlayers: ScoringSessionPlayerOption[];
  bowlerBallCounts: Map<number, number>;
  bowlingPlayers: ScoringSessionPlayerOption[];
  dismissedSet: Set<number>;
  inningsRow: {
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
    totalRuns: number;
    wideRuns: number;
  }>;
  lastDelivery: {
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
    totalRuns: number;
    wideRuns: number;
  } | null;
}) {
  const battingIds = new Set(params.battingPlayers.map((player) => player.id));
  const bowlingIds = new Set(params.bowlingPlayers.map((player) => player.id));

  if (!params.lastDelivery) {
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
          !params.dismissedSet.has(player.id) &&
          player.id !== strikerId &&
          player.id !== nonStrikerId
      ),
      availableBowlers: params.bowlingPlayers.filter((player) =>
        canBowlerCompleteRemainingOver({
          bowlerBallCounts: params.bowlerBallCounts,
          bowlerId: player.id,
          matchRules: params.matchRules,
          remainingLegalBallsInOver: params.matchRules.ballsPerOver,
        })
      ),
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

  const last = params.lastDelivery;

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
  const currentOverBowlerIds = getBowlerIdsForOver(
    params.timeline,
    last.overNumber
  );
  const previousOverBowlerIds = getBowlerIdsForOver(
    params.timeline,
    last.overNumber - 1
  );
  const remainingLegalBallsInOver = overComplete
    ? params.matchRules.ballsPerOver
    : params.matchRules.ballsPerOver - nextMeta.ballInOver + 1;

  return {
    availableBatters: params.battingPlayers.filter(
      (player) =>
        !params.dismissedSet.has(player.id) &&
        player.id !== strikerId &&
        player.id !== nonStrikerId
    ),
    availableBowlers: params.bowlingPlayers.filter((player) => {
      if (overComplete) {
        if (currentOverBowlerIds.has(player.id)) {
          return false;
        }

        return canBowlerCompleteRemainingOver({
          bowlerBallCounts: params.bowlerBallCounts,
          bowlerId: player.id,
          matchRules: params.matchRules,
          remainingLegalBallsInOver,
        });
      }

      if (player.id === last.bowlerId) {
        return canBowlerCompleteRemainingOver({
          bowlerBallCounts: params.bowlerBallCounts,
          bowlerId: player.id,
          matchRules: params.matchRules,
          remainingLegalBallsInOver,
        });
      }

      if (currentOverBowlerIds.has(player.id)) {
        return false;
      }

      if (previousOverBowlerIds.has(player.id)) {
        return false;
      }

      return canBowlerCompleteRemainingOver({
        bowlerBallCounts: params.bowlerBallCounts,
        bowlerId: player.id,
        matchRules: params.matchRules,
        remainingLegalBallsInOver,
      });
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
  return buildEntryContextFromState({
    battingPlayers: params.battingPlayers,
    bowlerBallCounts: getBowlerLegalBallCounts(params.timeline),
    bowlingPlayers: params.bowlingPlayers,
    dismissedSet: getDismissedPlayerIds(params.timeline),
    inningsRow: params.inningsRow,
    timeline: params.timeline,
    lastDelivery: params.timeline.at(-1) ?? null,
    matchRules: params.matchRules,
  });
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

  return {
    ...nextState,
    isLive: activeInningsExists || !nextState.isCompleted,
  } satisfies ScoringMutationMatchState;
}

function getMatchRulesFromSnapshot(match: {
  ballsPerOverSnapshot: number;
  format: string;
  maxLegalBallsPerInningsSnapshot: number | null;
  maxOverPerBowler: number;
  maxOversPerBowlerSnapshot: number | null;
  oversPerSide: number;
}) {
  const ballsPerOver =
    typeof match.ballsPerOverSnapshot === "number" &&
    match.ballsPerOverSnapshot > 0
      ? match.ballsPerOverSnapshot
      : 6;
  const maxLegalBallsPerInnings =
    typeof match.maxLegalBallsPerInningsSnapshot === "number" &&
    match.maxLegalBallsPerInningsSnapshot > 0
      ? match.maxLegalBallsPerInningsSnapshot
      : match.oversPerSide * ballsPerOver;

  return {
    ballsPerOver,
    formatLabel: match.format,
    matchFormatId: null,
    maxLegalBallsPerInnings,
    maxOversPerBowler:
      typeof match.maxOversPerBowlerSnapshot === "number" &&
      match.maxOversPerBowlerSnapshot > 0
        ? match.maxOversPerBowlerSnapshot
        : match.maxOverPerBowler,
    noOfOvers: match.oversPerSide,
  };
}

function getScoringSessionMatch(matchId: number) {
  return db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    columns: {
      id: true,
      tournamentId: true,
      tossWinnerId: true,
      tossDecision: true,
      team1Id: true,
      team2Id: true,
      inningsPerSide: true,
      oversPerSide: true,
      maxOverPerBowler: true,
      ballsPerOverSnapshot: true,
      maxLegalBallsPerInningsSnapshot: true,
      maxOversPerBowlerSnapshot: true,
      playersPerSide: true,
      result: true,
      winnerId: true,
      isLive: true,
      isCompleted: true,
      isTied: true,
      margin: true,
      hasLBW: true,
      hasBye: true,
      hasLegBye: true,
      hasBoundaryOut: true,
      hasWides: true,
      hasNoBalls: true,
      hasPenaltyRuns: true,
      format: true,
    },
    with: {
      team1: {
        columns: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      team2: {
        columns: {
          id: true,
          name: true,
          shortName: true,
        },
      },
    },
  });
}

function summarizeInningsForMutation(inningsRow: {
  ballsBowled: number;
  battingTeamId: number;
  bowlingTeamId: number;
  id: number;
  inningsNumber: number;
  isCompleted: boolean | null;
  targetRuns: number | null;
  totalScore: number;
  wickets: number;
}): ScoringMutationInningsSummary {
  return {
    ballsBowled: inningsRow.ballsBowled,
    battingTeamId: inningsRow.battingTeamId,
    bowlingTeamId: inningsRow.bowlingTeamId,
    id: inningsRow.id,
    inningsNumber: inningsRow.inningsNumber,
    isCompleted: inningsRow.isCompleted,
    targetRuns: inningsRow.targetRuns,
    totalScore: inningsRow.totalScore,
    wickets: inningsRow.wickets,
  };
}

function toScoringDeliveryRecord(delivery: {
  assistedById?: number | null;
  ballInOver: number;
  batterRuns: number;
  bowlerId: number;
  byeRuns: number;
  dismissedById?: number | null;
  dismissedPlayerId: number | null;
  id: number;
  inningsId: number;
  isLegalDelivery?: boolean;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStrikerId: number;
  overNumber: number;
  penaltyRuns?: number | null;
  sequenceNo: number;
  strikerId: number;
  totalRuns: number;
  wicketType: string | null;
  wideRuns: number;
}): ScoringDeliveryRecord {
  return {
    assistedById: delivery.assistedById ?? null,
    ballInOver: delivery.ballInOver,
    batterRuns: delivery.batterRuns,
    bowlerId: delivery.bowlerId,
    byeRuns: delivery.byeRuns,
    dismissedById: delivery.dismissedById ?? null,
    dismissedPlayerId: delivery.dismissedPlayerId,
    id: delivery.id,
    inningsId: delivery.inningsId,
    isLegalDelivery: Boolean(delivery.isLegalDelivery),
    isWicket: delivery.isWicket,
    legByeRuns: delivery.legByeRuns,
    noBallRuns: delivery.noBallRuns,
    nonStrikerId: delivery.nonStrikerId,
    overNumber: delivery.overNumber,
    penaltyRuns: delivery.penaltyRuns ?? 0,
    sequenceNo: delivery.sequenceNo,
    strikerId: delivery.strikerId,
    totalRuns: delivery.totalRuns,
    wicketType: delivery.wicketType,
    wideRuns: delivery.wideRuns,
  };
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
async function assembleMatchScoringSession(matchId: number) {
  const match = await getScoringSessionMatch(matchId);
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

  const currentInningsId =
    inningsRows.find((inning) => !inning.isCompleted)?.id ?? null;

  const inningsWithDeliveries = await Promise.all(
    inningsRows.map(async (inningsRow) => ({
      ...inningsRow,
      deliveries:
        inningsRow.id === currentInningsId
          ? await db.query.deliveries.findMany({
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
            })
          : [],
    }))
  );

  const currentInnings =
    inningsWithDeliveries.find((inning) => inning.id === currentInningsId) ??
    null;

  const matchRules = getMatchRulesFromSnapshot(match);
  const nextInningsDefaults = resolveNextInningsSetup({
    inningsPerSide: match.inningsPerSide,
    inningsRows: inningsRows.map((row) => ({
      battingTeamId: row.battingTeamId,
      bowlingTeamId: row.bowlingTeamId,
      inningsNumber: row.inningsNumber,
      isCompleted: row.isCompleted,
      totalScore: row.totalScore,
    })),
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    tossDecision:
      match.tossDecision === "bat" || match.tossDecision === "bowl"
        ? match.tossDecision
        : null,
    tossWinnerId: match.tossWinnerId,
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
  const pendingInningsClosure =
    currentInnings &&
    !currentInnings.isCompleted &&
    currentInnings.status === INNINGS_STATUS_AWAITING_CLOSE_CONFIRMATION
      ? toPendingInningsClosure({
          deliveryId: currentInnings.deliveries.at(-1)?.id ?? 0,
          inningsId: currentInnings.id,
          reason: resolveAutoCompleteInningsReason({
            ballsBowled: currentInnings.ballsBowled,
            matchRulesMaxLegalBallsPerInnings:
              matchRules.maxLegalBallsPerInnings,
            playersPerSide: match.playersPerSide,
            targetRuns: currentInnings.targetRuns,
            totalScore: currentInnings.totalScore,
            wickets: currentInnings.wickets,
          }),
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
    pendingInningsClosure:
      pendingInningsClosure?.deliveryId && pendingInningsClosure.reason
        ? pendingInningsClosure
        : null,
    teamLineupPlayers: {
      team1: team1LineupPlayers,
      team2: team2LineupPlayers,
    },
    nextInningsDefaults,
  };
}

export async function getMatchScoringSession(matchId: number) {
  return await assembleMatchScoringSession(matchId);
}

async function assertLineupMembership(params: {
  inningsRow: {
    battingTeamId: number;
    bowlingTeamId: number;
    matchId: number;
  };
  lineupRows?: Array<{
    playerId: number;
    teamId: number;
  }>;
  nextBowlerId: number;
  nextNonStrikerId: number;
  nextStrikerId: number;
}) {
  const lineupRows =
    params.lineupRows ??
    (await db.query.matchLineup.findMany({
      where: {
        matchId: params.inningsRow.matchId,
      },
      columns: {
        playerId: true,
        teamId: true,
      },
    }));

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

interface ScoringDeliveryContext {
  availableBatters: ScoringSessionPlayerOption[];
  availableBowlers: ScoringSessionPlayerOption[];
  battingOrderByPlayer: Map<number, number | null>;
  battingPlayers: ScoringSessionPlayerOption[];
  bowlerBallCounts: Map<number, number>;
  bowlingPlayers: ScoringSessionPlayerOption[];
  deliveryCount: number;
  dismissedSet: Set<number>;
  entryContext: ScoringEntryContext;
  inningsRow: {
    ballsBowled: number;
    battingTeamId: number;
    bowlingTeamId: number;
    byes: number;
    id: number;
    inningsNumber: number;
    isCompleted: boolean | null;
    legByes: number;
    matchId: number;
    noBalls: number;
    openingBowlerId: number | null;
    openingNonStrikerId: number | null;
    openingStrikerId: number | null;
    others: number;
    penaltyRuns: number;
    status: string;
    targetRuns: number | null;
    totalScore: number;
    wides: number;
    wickets: number;
  };
  lastDelivery: {
    ballInOver: number;
    batterRuns: number;
    bowlerId: number;
    byeRuns: number;
    dismissedPlayerId: number | null;
    isLegalDelivery: boolean;
    isWicket: boolean;
    legByeRuns: number;
    noBallRuns: number;
    nonStrikerId: number;
    overNumber: number;
    sequenceNo: number;
    strikerId: number;
    totalRuns: number;
    wideRuns: number;
  } | null;
  lineupRows: Awaited<ReturnType<typeof getSavedMatchLineup>>;
  match: {
    ballsPerOverSnapshot: number;
    format: string;
    hasBoundaryOut: boolean | null;
    hasBye: boolean;
    hasLBW: boolean | null;
    hasLegBye: boolean | null;
    hasNoBalls: boolean;
    hasPenaltyRuns: boolean | null;
    hasWides: boolean;
    id: number;
    inningsPerSide: number;
    isCompleted: boolean | null;
    isLive: boolean | null;
    isTied: boolean | null;
    margin: string | null;
    maxLegalBallsPerInningsSnapshot: number | null;
    maxOverPerBowler: number;
    maxOversPerBowlerSnapshot: number | null;
    oversPerSide: number;
    playersPerSide: number;
    result: string | null;
    team1Id: number;
    team2Id: number;
    tossDecision: string | null;
    tossWinnerId: number | null;
    winnerId: number | null;
  };
  matchRules: ReturnType<typeof getMatchRulesFromSnapshot>;
  requiredSelections: ScoringRequiredSelections;
  statsByPlayer: Map<number, MutableStats>;
  timeline: Array<{
    ballInOver: number;
    batterRuns: number;
    bowlerId: number;
    byeRuns: number;
    dismissedPlayerId: number | null;
    isLegalDelivery: boolean;
    isWicket: boolean;
    legByeRuns: number;
    noBallRuns: number;
    nonStrikerId: number;
    overNumber: number;
    sequenceNo: number;
    strikerId: number;
    totalRuns: number;
    wideRuns: number;
  }>;
}

function assertBowlerSelectionAllowed(params: {
  availableBowlers: ScoringSessionPlayerOption[];
  bowlerBallCounts: Map<number, number>;
  bowlerId: number;
  entryContext: Pick<ScoringEntryContext, "ballInOver" | "bowlerId">;
  lastDelivery: ScoringDeliveryContext["lastDelivery"];
  matchRules: Pick<
    ScoringDeliveryContext["matchRules"],
    "ballsPerOver" | "maxOversPerBowler"
  >;
  requiredSelections: Pick<ScoringRequiredSelections, "bowler">;
  timeline: ScoringDeliveryContext["timeline"];
}) {
  const previousOverBowlerIds = params.lastDelivery
    ? getBowlerIdsForOver(
        params.timeline,
        params.requiredSelections.bowler
          ? params.lastDelivery.overNumber
          : params.lastDelivery.overNumber - 1
      )
    : new Set<number>();
  const currentOverBowlerIds = params.lastDelivery
    ? getBowlerIdsForOver(params.timeline, params.lastDelivery.overNumber)
    : new Set<number>();
  const remainingLegalBallsInOver = params.requiredSelections.bowler
    ? params.matchRules.ballsPerOver
    : params.matchRules.ballsPerOver - params.entryContext.ballInOver + 1;
  const hasQuota = canBowlerCompleteRemainingOver({
    bowlerBallCounts: params.bowlerBallCounts,
    bowlerId: params.bowlerId,
    matchRules: params.matchRules,
    remainingLegalBallsInOver,
  });

  if (params.requiredSelections.bowler) {
    if (previousOverBowlerIds.has(params.bowlerId)) {
      throw new Error(
        "A bowler who bowled in the previous over cannot bowl the next over"
      );
    }

    if (!hasQuota) {
      throw new Error(
        "Bowler does not have enough quota left to complete this over"
      );
    }
  } else if (params.entryContext.bowlerId !== params.bowlerId) {
    if (currentOverBowlerIds.has(params.bowlerId)) {
      throw new Error("A bowler cannot bowl multiple spells in the same over");
    }

    if (previousOverBowlerIds.has(params.bowlerId)) {
      throw new Error(
        "A bowler who bowled the previous over cannot bowl this over"
      );
    }

    if (!hasQuota) {
      throw new Error(
        "Bowler does not have enough quota left to complete this over"
      );
    }
  } else if (!hasQuota) {
    throw new Error(
      "Bowler does not have enough quota left to complete this over"
    );
  }

  if (
    !params.availableBowlers.some((player) => player.id === params.bowlerId)
  ) {
    throw new Error("Selected bowler is not available for this over");
  }
}

async function getScoringDeliveryContext(
  inningsId: number
): Promise<ScoringDeliveryContext> {
  const baseRow = (
    await db
      .select({
        inningsId: innings.id,
        matchId: innings.matchId,
        inningsNumber: innings.inningsNumber,
        battingTeamId: innings.battingTeamId,
        bowlingTeamId: innings.bowlingTeamId,
        totalScore: innings.totalScore,
        wickets: innings.wickets,
        ballsBowled: innings.ballsBowled,
        wides: innings.wides,
        noBalls: innings.noBalls,
        byes: innings.byes,
        legByes: innings.legByes,
        penaltyRuns: innings.penaltyRuns,
        others: innings.others,
        targetRuns: innings.targetRuns,
        status: innings.status,
        inningsCompleted: innings.isCompleted,
        openingStrikerId: innings.openingStrikerId,
        openingNonStrikerId: innings.openingNonStrikerId,
        openingBowlerId: innings.openingBowlerId,
        matchPlayersPerSide: matches.playersPerSide,
        matchInningsPerSide: matches.inningsPerSide,
        team1Id: matches.team1Id,
        team2Id: matches.team2Id,
        tossWinnerId: matches.tossWinnerId,
        tossDecision: matches.tossDecision,
        matchCompleted: matches.isCompleted,
        matchLive: matches.isLive,
        matchTied: matches.isTied,
        matchMargin: matches.margin,
        matchResult: matches.result,
        winnerId: matches.winnerId,
        hasLBW: matches.hasLBW,
        hasBye: matches.hasBye,
        hasLegBye: matches.hasLegBye,
        hasBoundaryOut: matches.hasBoundaryOut,
        hasWides: matches.hasWides,
        hasNoBalls: matches.hasNoBalls,
        hasPenaltyRuns: matches.hasPenaltyRuns,
        ballsPerOverSnapshot: matches.ballsPerOverSnapshot,
        maxLegalBallsPerInningsSnapshot:
          matches.maxLegalBallsPerInningsSnapshot,
        maxOversPerBowlerSnapshot: matches.maxOversPerBowlerSnapshot,
        oversPerSide: matches.oversPerSide,
        maxOverPerBowler: matches.maxOverPerBowler,
        format: matches.format,
      })
      .from(innings)
      .innerJoin(matches, eq(matches.id, innings.matchId))
      .where(eq(innings.id, inningsId))
      .limit(1)
  ).at(0);

  if (
    !baseRow ||
    typeof baseRow.team1Id !== "number" ||
    typeof baseRow.team2Id !== "number"
  ) {
    throw new Error("Innings not found");
  }

  const [lineupRows, timeline, statsRows] = await Promise.all([
    getSavedMatchLineup(baseRow.matchId),
    db.query.deliveries.findMany({
      where: {
        inningsId,
      },
      columns: {
        ballInOver: true,
        batterRuns: true,
        bowlerId: true,
        byeRuns: true,
        dismissedPlayerId: true,
        isLegalDelivery: true,
        isWicket: true,
        legByeRuns: true,
        noBallRuns: true,
        nonStrikerId: true,
        overNumber: true,
        sequenceNo: true,
        strikerId: true,
        totalRuns: true,
        wideRuns: true,
      },
      orderBy: {
        sequenceNo: "asc",
      },
    }),
    db.query.playerInningsStats.findMany({
      where: {
        inningsId,
      },
      columns: {
        inningsId: true,
        matchId: true,
        playerId: true,
        teamId: true,
        battingOrder: true,
        runsScored: true,
        ballsFaced: true,
        fours: true,
        sixes: true,
        isDismissed: true,
        dismissalType: true,
        dismissedById: true,
        assistedById: true,
        ballsBowled: true,
        maidens: true,
        runsConceded: true,
        wicketsTaken: true,
        wides: true,
        noBalls: true,
        dotBalls: true,
        catches: true,
        runOuts: true,
        stumpings: true,
      },
    }),
  ]);

  const match = {
    ballsPerOverSnapshot: baseRow.ballsPerOverSnapshot,
    format: baseRow.format,
    hasBoundaryOut: baseRow.hasBoundaryOut,
    hasBye: baseRow.hasBye,
    hasLBW: baseRow.hasLBW,
    hasLegBye: baseRow.hasLegBye,
    hasNoBalls: baseRow.hasNoBalls,
    hasPenaltyRuns: baseRow.hasPenaltyRuns,
    hasWides: baseRow.hasWides,
    id: baseRow.matchId,
    inningsPerSide: baseRow.matchInningsPerSide,
    isCompleted: baseRow.matchCompleted,
    isLive: baseRow.matchLive,
    isTied: baseRow.matchTied,
    margin: baseRow.matchMargin,
    maxLegalBallsPerInningsSnapshot: baseRow.maxLegalBallsPerInningsSnapshot,
    maxOverPerBowler: baseRow.maxOverPerBowler,
    maxOversPerBowlerSnapshot: baseRow.maxOversPerBowlerSnapshot,
    oversPerSide: baseRow.oversPerSide,
    playersPerSide: baseRow.matchPlayersPerSide,
    result: baseRow.matchResult,
    team1Id: baseRow.team1Id,
    team2Id: baseRow.team2Id,
    tossDecision: baseRow.tossDecision,
    tossWinnerId: baseRow.tossWinnerId,
    winnerId: baseRow.winnerId,
  };
  const matchRules = getMatchRulesFromSnapshot(match);
  const battingPlayers = mapLineupPlayers(lineupRows, baseRow.battingTeamId);
  const bowlingPlayers = mapLineupPlayers(lineupRows, baseRow.bowlingTeamId);
  const battingOrderByPlayer = new Map<number, number | null>(
    lineupRows.map((row) => [row.playerId, row.battingOrder ?? null])
  );
  const statsByPlayer = new Map<number, MutableStats>(
    statsRows.map((row) => [row.playerId, row])
  );
  const dismissedSet = new Set(
    statsRows.filter((row) => row.isDismissed).map((row) => row.playerId)
  );
  const bowlerBallCounts = new Map(
    statsRows
      .filter((row) => row.teamId === baseRow.bowlingTeamId)
      .map((row) => [row.playerId, row.ballsBowled])
  );
  const inningsRow = {
    ballsBowled: baseRow.ballsBowled,
    battingTeamId: baseRow.battingTeamId,
    bowlingTeamId: baseRow.bowlingTeamId,
    byes: baseRow.byes,
    id: baseRow.inningsId,
    inningsNumber: baseRow.inningsNumber,
    isCompleted: baseRow.inningsCompleted,
    legByes: baseRow.legByes,
    matchId: baseRow.matchId,
    noBalls: baseRow.noBalls,
    openingBowlerId: baseRow.openingBowlerId,
    openingNonStrikerId: baseRow.openingNonStrikerId,
    openingStrikerId: baseRow.openingStrikerId,
    others: baseRow.others,
    penaltyRuns: baseRow.penaltyRuns,
    status: baseRow.status,
    targetRuns: baseRow.targetRuns,
    totalScore: baseRow.totalScore,
    wides: baseRow.wides,
    wickets: baseRow.wickets,
  };
  const lastDelivery = timeline.at(-1) ?? null;
  const nextState = buildEntryContextFromState({
    battingPlayers,
    bowlerBallCounts,
    bowlingPlayers,
    dismissedSet,
    inningsRow,
    timeline,
    lastDelivery: lastDelivery ?? null,
    matchRules,
  });

  return {
    availableBatters: nextState.availableBatters,
    availableBowlers: nextState.availableBowlers,
    battingOrderByPlayer,
    battingPlayers,
    bowlerBallCounts,
    bowlingPlayers,
    deliveryCount: lastDelivery?.sequenceNo ?? 0,
    dismissedSet,
    entryContext: nextState.entryContext,
    inningsRow,
    lastDelivery: lastDelivery ?? null,
    lineupRows,
    match,
    matchRules,
    requiredSelections: nextState.requiredSelections,
    statsByPlayer,
    timeline,
  };
}

function toScoringMutationMatchState(match: {
  isCompleted: boolean | null;
  isLive: boolean | null;
  isTied: boolean | null;
  margin: string | null;
  result: string | null;
  winnerId: number | null;
}): ScoringMutationMatchState {
  return {
    isCompleted: match.isCompleted,
    isLive: match.isLive,
    isTied: match.isTied,
    margin: match.margin,
    result: match.result,
    winnerId: match.winnerId,
  };
}

async function getScoringMutationDeliveryById(deliveryId: number) {
  const delivery = await db.query.deliveries.findFirst({
    where: {
      id: deliveryId,
    },
    columns: {
      assistedById: true,
      ballInOver: true,
      batterRuns: true,
      bowlerId: true,
      byeRuns: true,
      dismissedById: true,
      dismissedPlayerId: true,
      id: true,
      inningsId: true,
      isLegalDelivery: true,
      isWicket: true,
      legByeRuns: true,
      noBallRuns: true,
      nonStrikerId: true,
      overNumber: true,
      penaltyRuns: true,
      sequenceNo: true,
      strikerId: true,
      totalRuns: true,
      wicketType: true,
      wideRuns: true,
    },
  });

  return delivery ? toScoringDeliveryRecord(delivery) : null;
}

function buildRewriteScoringMutationResult(params: {
  action: "delete" | "update";
  context: ScoringDeliveryContext;
  deletedDeliveryId?: number;
  delivery?: ScoringDeliveryRecord | null;
  pendingInningsClosure?: PendingInningsClosure | null;
}): ScoringMutationResult {
  return {
    action: params.action,
    affectedInnings: summarizeInningsForMutation(params.context.inningsRow),
    availableBatters: params.context.availableBatters,
    availableBowlers: params.context.availableBowlers,
    currentInnings: summarizeInningsForMutation(params.context.inningsRow),
    deletedDeliveryId:
      params.action === "delete" ? (params.deletedDeliveryId ?? null) : null,
    delivery:
      params.action === "delete"
        ? null
        : (params.delivery ??
          (() => {
            throw new Error("Updated delivery missing after rewrite");
          })()),
    entryContext: params.context.entryContext,
    match: toScoringMutationMatchState(params.context.match),
    nextInningsDefaults: null,
    pendingInningsClosure: params.pendingInningsClosure ?? null,
    phase: "scoring",
    requiredSelections: params.context.requiredSelections,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Incremental stat updates keep the hot scoring path off the full replay flow.
function applyDeliveryToStats(params: {
  battingOrderByPlayer: Map<number, number | null>;
  ballsPerOver: number;
  delivery: ScoringDeliveryRecord;
  inningsRow: Pick<
    ScoringDeliveryContext["inningsRow"],
    "battingTeamId" | "bowlingTeamId" | "id" | "matchId"
  >;
  overRunsBeforeDelivery: number;
  statsByPlayer: Map<number, MutableStats>;
}) {
  const strikerStats = ensureMutableStats({
    battingOrderByPlayer: params.battingOrderByPlayer,
    inningsId: params.inningsRow.id,
    matchId: params.inningsRow.matchId,
    playerId: params.delivery.strikerId,
    statsByPlayer: params.statsByPlayer,
    teamId: params.inningsRow.battingTeamId,
  });
  const bowlerStats = ensureMutableStats({
    battingOrderByPlayer: params.battingOrderByPlayer,
    inningsId: params.inningsRow.id,
    matchId: params.inningsRow.matchId,
    playerId: params.delivery.bowlerId,
    statsByPlayer: params.statsByPlayer,
    teamId: params.inningsRow.bowlingTeamId,
  });
  const countsAsBallFaced =
    params.delivery.isLegalDelivery ||
    (params.delivery.noBallRuns > 0 &&
      params.delivery.batterRuns > 0 &&
      params.delivery.wideRuns === 0);

  if (countsAsBallFaced) {
    strikerStats.ballsFaced += 1;
  }

  strikerStats.runsScored += params.delivery.batterRuns;
  if (params.delivery.batterRuns === 4) {
    strikerStats.fours += 1;
  }
  if (params.delivery.batterRuns === 6) {
    strikerStats.sixes += 1;
  }

  if (params.delivery.isWicket && params.delivery.dismissedPlayerId) {
    const dismissedStats = ensureMutableStats({
      battingOrderByPlayer: params.battingOrderByPlayer,
      inningsId: params.inningsRow.id,
      matchId: params.inningsRow.matchId,
      playerId: params.delivery.dismissedPlayerId,
      statsByPlayer: params.statsByPlayer,
      teamId: params.inningsRow.battingTeamId,
    });
    dismissedStats.isDismissed = true;
    dismissedStats.dismissalType = params.delivery.wicketType ?? null;
    dismissedStats.dismissedById = params.delivery.dismissedById;
    dismissedStats.assistedById = params.delivery.assistedById;
  }

  if (params.delivery.isLegalDelivery) {
    bowlerStats.ballsBowled += 1;
  }

  const concededByBowler =
    params.delivery.batterRuns +
    params.delivery.wideRuns +
    params.delivery.noBallRuns +
    params.delivery.penaltyRuns;

  bowlerStats.runsConceded += concededByBowler;
  bowlerStats.wides += params.delivery.wideRuns;
  bowlerStats.noBalls += params.delivery.noBallRuns;
  if (params.delivery.isLegalDelivery && params.delivery.totalRuns === 0) {
    bowlerStats.dotBalls += 1;
  }

  if (
    params.delivery.isWicket &&
    params.delivery.dismissedById === params.delivery.bowlerId &&
    params.delivery.wicketType !== "run out"
  ) {
    bowlerStats.wicketsTaken += 1;
  }

  if (
    params.delivery.isLegalDelivery &&
    params.delivery.ballInOver === params.ballsPerOver &&
    params.overRunsBeforeDelivery + concededByBowler === 0
  ) {
    bowlerStats.maidens += 1;
  }

  if (params.delivery.assistedById && params.delivery.isWicket) {
    const assistingStats = ensureMutableStats({
      battingOrderByPlayer: params.battingOrderByPlayer,
      inningsId: params.inningsRow.id,
      matchId: params.inningsRow.matchId,
      playerId: params.delivery.assistedById,
      statsByPlayer: params.statsByPlayer,
      teamId: params.inningsRow.bowlingTeamId,
    });

    if (params.delivery.wicketType === "caught") {
      assistingStats.catches += 1;
    } else if (params.delivery.wicketType === "stumped") {
      assistingStats.stumpings += 1;
    } else if (params.delivery.wicketType === "run out") {
      assistingStats.runOuts += 1;
    }
  }
}

function buildOpenInningsMutationResult(params: {
  context: ScoringDeliveryContext;
  delivery: ScoringDeliveryRecord;
  pendingInningsClosure?: PendingInningsClosure | null;
  updatedInnings: ScoringMutationInningsSummary;
}): ScoringMutationResult {
  const dismissedSet = new Set(params.context.dismissedSet);
  if (params.delivery.isWicket && params.delivery.dismissedPlayerId) {
    dismissedSet.add(params.delivery.dismissedPlayerId);
  }

  const bowlerBallCounts = new Map(params.context.bowlerBallCounts);
  if (params.delivery.isLegalDelivery) {
    bowlerBallCounts.set(
      params.delivery.bowlerId,
      (bowlerBallCounts.get(params.delivery.bowlerId) ?? 0) + 1
    );
  }

  const nextState = buildEntryContextFromState({
    battingPlayers: params.context.battingPlayers,
    bowlerBallCounts,
    bowlingPlayers: params.context.bowlingPlayers,
    dismissedSet,
    inningsRow: params.context.inningsRow,
    timeline: [...params.context.timeline, params.delivery],
    lastDelivery: params.delivery,
    matchRules: params.context.matchRules,
  });

  return {
    action: "record",
    affectedInnings: params.updatedInnings,
    availableBatters: nextState.availableBatters,
    availableBowlers: nextState.availableBowlers,
    currentInnings: params.updatedInnings,
    deletedDeliveryId: null,
    delivery: params.delivery,
    entryContext: nextState.entryContext,
    match: toScoringMutationMatchState({
      isCompleted: params.context.match.isCompleted,
      isLive: true,
      isTied: params.context.match.isTied,
      margin: params.context.match.margin,
      result: params.context.match.result,
      winnerId: params.context.match.winnerId,
    }),
    nextInningsDefaults: null,
    pendingInningsClosure: params.pendingInningsClosure ?? null,
    phase: "scoring",
    requiredSelections: nextState.requiredSelections,
  };
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
      tossDecision: true,
      tossWinnerId: true,
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

  const nextInningsDefaults = resolveNextInningsSetup({
    inningsPerSide: match.inningsPerSide,
    inningsRows,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    tossDecision:
      input.tossDecision ??
      (match.tossDecision === "bat" || match.tossDecision === "bowl"
        ? match.tossDecision
        : null),
    tossWinnerId: input.tossWinnerId ?? match.tossWinnerId,
  });

  if (
    !nextInningsDefaults ||
    inningsNumber !== nextInningsDefaults.inningsNumber
  ) {
    throw new Error("This innings cannot be started");
  }

  const validTeamSelections = [
    {
      battingTeamId: nextInningsDefaults.battingTeamId,
      bowlingTeamId: nextInningsDefaults.bowlingTeamId,
    },
    ...(nextInningsDefaults.followOn
      ? [
          {
            battingTeamId: nextInningsDefaults.followOn.battingTeamId,
            bowlingTeamId: nextInningsDefaults.followOn.bowlingTeamId,
          },
        ]
      : []),
  ];
  const hasValidTeamSelection = validTeamSelections.some(
    (selection) =>
      selection.battingTeamId === input.battingTeamId &&
      selection.bowlingTeamId === input.bowlingTeamId
  );

  if (!hasValidTeamSelection) {
    throw new Error("Invalid innings team selection");
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

export async function recordScoringDelivery(
  input: DeliveryDraftInput
): Promise<ScoringMutationResult> {
  const mutationStartedAt = performance.now();
  const contextStartedAt = performance.now();
  const context = await getScoringDeliveryContext(input.inningsId);
  if (context.inningsRow.isCompleted) {
    throw new Error("Innings already completed");
  }
  if (
    context.inningsRow.status === INNINGS_STATUS_AWAITING_CLOSE_CONFIRMATION
  ) {
    throw new Error(
      "Review the last ball or confirm the innings end before recording another delivery"
    );
  }
  const contextMs = performance.now() - contextStartedAt;

  await assertLineupMembership({
    inningsRow: context.inningsRow,
    lineupRows: context.lineupRows,
    nextStrikerId: input.strikerId,
    nextNonStrikerId: input.nonStrikerId,
    nextBowlerId: input.bowlerId,
  });
  assertBowlerSelectionAllowed({
    availableBowlers: context.availableBowlers,
    bowlerBallCounts: context.bowlerBallCounts,
    bowlerId: input.bowlerId,
    entryContext: context.entryContext,
    lastDelivery: context.lastDelivery,
    matchRules: context.matchRules,
    requiredSelections: context.requiredSelections,
    timeline: context.timeline,
  });

  const normalized = validateDeliveryDraft({
    draft: input,
    hasBoundaryOut: Boolean(context.match.hasBoundaryOut),
    hasBye: Boolean(context.match.hasBye),
    hasLBW: Boolean(context.match.hasLBW),
    hasLegBye: Boolean(context.match.hasLegBye),
    hasNoBalls: Boolean(context.match.hasNoBalls),
    hasPenaltyRuns: Boolean(context.match.hasPenaltyRuns),
    hasWides: Boolean(context.match.hasWides),
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    canDismissNonStriker: true,
  });

  const deliveryPosition = buildAppendDeliveryPosition({
    currentEntry: context.entryContext,
    deliveryCount: context.deliveryCount,
  });
  const dismissedById =
    normalized.isWicket &&
    normalized.wicketType &&
    !NON_BOWLER_WICKETS.has(normalized.wicketType)
      ? input.bowlerId
      : null;
  let overRunsBeforeDelivery = 0;

  if (
    normalized.isLegalDelivery &&
    deliveryPosition.ballInOver === context.matchRules.ballsPerOver
  ) {
    const currentOverDeliveries = await db.query.deliveries.findMany({
      where: {
        inningsId: input.inningsId,
        overNumber: deliveryPosition.overNumber,
      },
      columns: {
        batterRuns: true,
        wideRuns: true,
        noBallRuns: true,
        penaltyRuns: true,
      },
    });
    overRunsBeforeDelivery = currentOverDeliveries.reduce(
      (sum, delivery) =>
        sum +
        delivery.batterRuns +
        delivery.wideRuns +
        delivery.noBallRuns +
        delivery.penaltyRuns,
      0
    );
  }

  const mutationWriteStartedAt = performance.now();
  const touchedPlayerIds = new Set<number>([input.strikerId, input.bowlerId]);
  if (typeof normalized.dismissedPlayerId === "number") {
    touchedPlayerIds.add(normalized.dismissedPlayerId);
  }
  if (typeof normalized.assistedById === "number") {
    touchedPlayerIds.add(normalized.assistedById);
  }

  let insertedDelivery: ScoringDeliveryRecord | null = null;
  const updatedInnings: ScoringMutationInningsSummary = {
    ballsBowled:
      context.inningsRow.ballsBowled + (normalized.isLegalDelivery ? 1 : 0),
    battingTeamId: context.inningsRow.battingTeamId,
    bowlingTeamId: context.inningsRow.bowlingTeamId,
    id: context.inningsRow.id,
    inningsNumber: context.inningsRow.inningsNumber,
    isCompleted: false,
    targetRuns: context.inningsRow.targetRuns,
    totalScore: context.inningsRow.totalScore + normalized.totalRuns,
    wickets: context.inningsRow.wickets + (normalized.isWicket ? 1 : 0),
  };

  await db.transaction(async (tx) => {
    const [deliveryRow] = await tx
      .insert(deliveries)
      .values({
        inningsId: input.inningsId,
        sequenceNo: deliveryPosition.sequenceNo,
        overNumber: deliveryPosition.overNumber,
        ballInOver: deliveryPosition.ballInOver,
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
        dismissedById,
        assistedById: normalized.assistedById,
      })
      .returning({
        id: deliveries.id,
      });

    if (!deliveryRow) {
      throw new Error("Failed to insert delivery");
    }

    insertedDelivery = toScoringDeliveryRecord({
      assistedById: normalized.assistedById,
      ballInOver: deliveryPosition.ballInOver,
      batterRuns: normalized.batterRuns,
      bowlerId: input.bowlerId,
      byeRuns: normalized.byeRuns,
      dismissedById,
      dismissedPlayerId: normalized.dismissedPlayerId,
      id: deliveryRow.id,
      inningsId: input.inningsId,
      isLegalDelivery: normalized.isLegalDelivery,
      isWicket: normalized.isWicket,
      legByeRuns: normalized.legByeRuns,
      noBallRuns: normalized.noBallRuns,
      nonStrikerId: input.nonStrikerId,
      overNumber: deliveryPosition.overNumber,
      penaltyRuns: normalized.penaltyRuns,
      sequenceNo: deliveryPosition.sequenceNo,
      strikerId: input.strikerId,
      totalRuns: normalized.totalRuns,
      wicketType: normalized.wicketType,
      wideRuns: normalized.wideRuns,
    });

    await tx
      .update(innings)
      .set({
        totalScore: updatedInnings.totalScore,
        wickets: updatedInnings.wickets,
        ballsBowled: updatedInnings.ballsBowled,
        wides: context.inningsRow.wides + normalized.wideRuns,
        noBalls: context.inningsRow.noBalls + normalized.noBallRuns,
        byes: context.inningsRow.byes + normalized.byeRuns,
        legByes: context.inningsRow.legByes + normalized.legByeRuns,
        penaltyRuns: context.inningsRow.penaltyRuns + normalized.penaltyRuns,
        others: context.inningsRow.others,
        status: "in_progress",
      })
      .where(eq(innings.id, input.inningsId));

    if (!insertedDelivery) {
      throw new Error("Inserted delivery is unavailable");
    }

    applyDeliveryToStats({
      battingOrderByPlayer: context.battingOrderByPlayer,
      ballsPerOver: context.matchRules.ballsPerOver,
      delivery: insertedDelivery,
      inningsRow: context.inningsRow,
      overRunsBeforeDelivery,
      statsByPlayer: context.statsByPlayer,
    });

    const statsValues = [...touchedPlayerIds]
      .map((playerId) => context.statsByPlayer.get(playerId))
      .filter((row): row is MutableStats => Boolean(row));

    if (statsValues.length > 0) {
      await Promise.all(
        statsValues.map((statsRow) =>
          tx
            .insert(playerInningsStats)
            .values(statsRow)
            .onConflictDoUpdate({
              target: [
                playerInningsStats.inningsId,
                playerInningsStats.playerId,
              ],
              set: {
                matchId: statsRow.matchId,
                teamId: statsRow.teamId,
                battingOrder: statsRow.battingOrder,
                runsScored: statsRow.runsScored,
                ballsFaced: statsRow.ballsFaced,
                fours: statsRow.fours,
                sixes: statsRow.sixes,
                isDismissed: statsRow.isDismissed,
                dismissalType: statsRow.dismissalType,
                dismissedById: statsRow.dismissedById,
                assistedById: statsRow.assistedById,
                ballsBowled: statsRow.ballsBowled,
                maidens: statsRow.maidens,
                runsConceded: statsRow.runsConceded,
                wicketsTaken: statsRow.wicketsTaken,
                wides: statsRow.wides,
                noBalls: statsRow.noBalls,
                dotBalls: statsRow.dotBalls,
                catches: statsRow.catches,
                runOuts: statsRow.runOuts,
                stumpings: statsRow.stumpings,
              },
            })
        )
      );
    }
  });

  if (!insertedDelivery) {
    throw new Error("Delivery insert did not complete");
  }
  const recordedDelivery = insertedDelivery as ScoringDeliveryRecord;

  const mutationWriteMs = performance.now() - mutationWriteStartedAt;
  const pendingClosureReason = resolveAutoCompleteInningsReason({
    ballsBowled: updatedInnings.ballsBowled,
    matchRulesMaxLegalBallsPerInnings:
      context.matchRules.maxLegalBallsPerInnings,
    playersPerSide: context.match.playersPerSide,
    targetRuns: updatedInnings.targetRuns,
    totalScore: updatedInnings.totalScore,
    wickets: updatedInnings.wickets,
  });
  const pendingInningsClosure = toPendingInningsClosure({
    deliveryId: recordedDelivery.id,
    inningsId: input.inningsId,
    reason: pendingClosureReason,
  });

  const responseStartedAt = performance.now();
  let autoCloseMs = 0;
  const result = await (async () => {
    if (pendingInningsClosure) {
      const closeStartedAt = performance.now();
      await updateInningsAction({
        id: input.inningsId,
        status: INNINGS_STATUS_AWAITING_CLOSE_CONFIRMATION,
        isCompleted: false,
      });
      autoCloseMs = performance.now() - closeStartedAt;
      return buildOpenInningsMutationResult({
        context,
        delivery: recordedDelivery,
        pendingInningsClosure,
        updatedInnings,
      });
    }

    return buildOpenInningsMutationResult({
      context,
      delivery: recordedDelivery,
      updatedInnings,
    });
  })();
  const responseAssemblyMs = performance.now() - responseStartedAt;

  if (process.env.NODE_ENV !== "test") {
    console.info("[scoring] recordScoringDelivery", {
      autoCloseMs,
      contextMs,
      deliveryCount: context.deliveryCount,
      mutationWriteMs,
      payloadBytes: JSON.stringify(result).length,
      responseAssemblyMs,
      totalMs: performance.now() - mutationStartedAt,
    });
  }

  return result;
}

export async function updateScoringDelivery(
  input: UpdateScoringDeliveryInput
): Promise<ScoringMutationResult> {
  const mutationStartedAt = performance.now();
  const contextStartedAt = performance.now();
  const [context, existingDelivery] = await Promise.all([
    getScoringDeliveryContext(input.inningsId),
    getScoringMutationDeliveryById(input.deliveryId),
  ]);
  const contextMs = performance.now() - contextStartedAt;

  if (!existingDelivery || existingDelivery.inningsId !== input.inningsId) {
    throw new Error("Delivery not found");
  }

  if (context.inningsRow.isCompleted) {
    throw new Error("Completed innings cannot be edited");
  }

  await assertLineupMembership({
    inningsRow: context.inningsRow,
    lineupRows: context.lineupRows,
    nextStrikerId: input.strikerId,
    nextNonStrikerId: input.nonStrikerId,
    nextBowlerId: input.bowlerId,
  });

  const normalized = validateDeliveryDraft({
    draft: input,
    hasBoundaryOut: Boolean(context.match.hasBoundaryOut),
    hasBye: Boolean(context.match.hasBye),
    hasLBW: Boolean(context.match.hasLBW),
    hasLegBye: Boolean(context.match.hasLegBye),
    hasNoBalls: Boolean(context.match.hasNoBalls),
    hasPenaltyRuns: Boolean(context.match.hasPenaltyRuns),
    hasWides: Boolean(context.match.hasWides),
    strikerId: input.strikerId,
    nonStrikerId: input.nonStrikerId,
    canDismissNonStriker: true,
  });

  const mutationWriteStartedAt = performance.now();
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
  const mutationWriteMs = performance.now() - mutationWriteStartedAt;

  const rewriteStartedAt = performance.now();
  await syncReplayState(input.inningsId, "rewrite");
  const rewriteMs = performance.now() - rewriteStartedAt;

  const responseStartedAt = performance.now();
  const [postRewriteContext, updatedDelivery] = await Promise.all([
    getScoringDeliveryContext(input.inningsId),
    getScoringMutationDeliveryById(input.deliveryId),
  ]);
  const pendingClosureReason = updatedDelivery
    ? resolveAutoCompleteInningsReason({
        ballsBowled: postRewriteContext.inningsRow.ballsBowled,
        matchRulesMaxLegalBallsPerInnings:
          postRewriteContext.matchRules.maxLegalBallsPerInnings,
        playersPerSide: postRewriteContext.match.playersPerSide,
        targetRuns: postRewriteContext.inningsRow.targetRuns,
        totalScore: postRewriteContext.inningsRow.totalScore,
        wickets: postRewriteContext.inningsRow.wickets,
      })
    : null;
  const pendingInningsClosure = updatedDelivery
    ? toPendingInningsClosure({
        deliveryId: updatedDelivery.id,
        inningsId: input.inningsId,
        reason: pendingClosureReason,
      })
    : null;
  await updateInningsAction({
    id: input.inningsId,
    isCompleted: false,
    status: resolveLiveInningsStatus({
      ballsBowled: postRewriteContext.inningsRow.ballsBowled,
      hasPendingClosure: pendingInningsClosure !== null,
    }),
  });
  const result = buildRewriteScoringMutationResult({
    action: "update",
    context: postRewriteContext,
    delivery: updatedDelivery,
    pendingInningsClosure,
  });
  const responseAssemblyMs = performance.now() - responseStartedAt;

  if (process.env.NODE_ENV !== "test") {
    console.info("[scoring] updateScoringDelivery", {
      contextMs,
      mutationWriteMs,
      payloadBytes: JSON.stringify(result).length,
      responseAssemblyMs,
      rewriteMs,
      totalMs: performance.now() - mutationStartedAt,
    });
  }

  return result;
}

export async function deleteScoringDelivery(
  deliveryId: number
): Promise<ScoringMutationResult> {
  const mutationStartedAt = performance.now();
  const contextStartedAt = performance.now();
  const existingDelivery = await getScoringMutationDeliveryById(deliveryId);

  if (!existingDelivery) {
    throw new Error("Delivery not found");
  }

  const context = await getScoringDeliveryContext(existingDelivery.inningsId);
  const contextMs = performance.now() - contextStartedAt;

  if (context.inningsRow.isCompleted) {
    throw new Error("Completed innings cannot be edited");
  }

  const mutationWriteStartedAt = performance.now();
  await db.delete(deliveries).where(eq(deliveries.id, deliveryId));
  const mutationWriteMs = performance.now() - mutationWriteStartedAt;

  const rewriteStartedAt = performance.now();
  await syncReplayState(existingDelivery.inningsId, "rewrite");
  const rewriteMs = performance.now() - rewriteStartedAt;

  const responseStartedAt = performance.now();
  const postRewriteContext = await getScoringDeliveryContext(
    existingDelivery.inningsId
  );
  const latestDelivery = await db.query.deliveries.findFirst({
    where: {
      inningsId: existingDelivery.inningsId,
    },
    orderBy: {
      sequenceNo: "desc",
    },
    columns: {
      id: true,
    },
  });
  const pendingClosureReason = latestDelivery
    ? resolveAutoCompleteInningsReason({
        ballsBowled: postRewriteContext.inningsRow.ballsBowled,
        matchRulesMaxLegalBallsPerInnings:
          postRewriteContext.matchRules.maxLegalBallsPerInnings,
        playersPerSide: postRewriteContext.match.playersPerSide,
        targetRuns: postRewriteContext.inningsRow.targetRuns,
        totalScore: postRewriteContext.inningsRow.totalScore,
        wickets: postRewriteContext.inningsRow.wickets,
      })
    : null;
  const pendingInningsClosure = latestDelivery
    ? toPendingInningsClosure({
        deliveryId: latestDelivery.id,
        inningsId: existingDelivery.inningsId,
        reason: pendingClosureReason,
      })
    : null;
  await updateInningsAction({
    id: existingDelivery.inningsId,
    isCompleted: false,
    status: resolveLiveInningsStatus({
      ballsBowled: postRewriteContext.inningsRow.ballsBowled,
      hasPendingClosure: pendingInningsClosure !== null,
    }),
  });
  const result = buildRewriteScoringMutationResult({
    action: "delete",
    context: postRewriteContext,
    deletedDeliveryId: deliveryId,
    pendingInningsClosure,
  });
  const responseAssemblyMs = performance.now() - responseStartedAt;

  if (process.env.NODE_ENV !== "test") {
    console.info("[scoring] deleteScoringDelivery", {
      contextMs,
      mutationWriteMs,
      payloadBytes: JSON.stringify(result).length,
      responseAssemblyMs,
      rewriteMs,
      totalMs: performance.now() - mutationStartedAt,
    });
  }

  return result;
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
  applyDeliveryToStats,
  buildAppendDeliveryPosition,
  buildEntryContextFromState,
  buildRewriteScoringMutationResult,
  deriveTargetRunsForInnings,
  getEntryContext,
  getMatchCompletionSnapshot,
  getMatchRulesFromSnapshot,
  getMovementRuns,
  getNextBallPosition,
  isLegalDeliveryFromRuns,
  resolveAutoCompleteInningsReason,
  resolveNextInningsSetup,
  shouldAutoCompleteInnings,
  validateDeliveryDraft,
};
