import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  deliveries,
  innings,
  matches,
  matchLineup,
  playerInningsStats,
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
