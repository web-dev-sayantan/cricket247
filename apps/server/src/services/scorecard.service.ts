import { db } from "@/db";
import { getMatchFormatRulesByMatchId } from "@/services/match-format.service";
import { formatOvers } from "@/utils/cricket.utils";

export interface ScorecardQuery {
  includeBallByBall?: boolean;
  inningsNumber?: number;
}

interface ScorecardPlayerRef {
  id: number;
  name: string;
}

interface ScorecardBattingRow {
  assistedBy: ScorecardPlayerRef | null;
  ballsFaced: number;
  dismissalType: string | null;
  dismissedBy: ScorecardPlayerRef | null;
  fours: number;
  player: ScorecardPlayerRef;
  runs: number;
  sixes: number;
  status: "did_not_bat" | "not_out" | "out";
  strikeRate: number;
}

interface ScorecardBowlingRow {
  ballsBowled: number;
  dotBalls: number;
  economy: number;
  maidens: number;
  noBalls: number;
  overs: string;
  player: ScorecardPlayerRef;
  runsConceded: number;
  wicketsTaken: number;
  wides: number;
}

interface ScorecardFallOfWicket {
  batter: ScorecardPlayerRef | null;
  over: string;
  score: number;
  wicketNumber: number;
  wicketType: string | null;
}

interface ScorecardDelivery {
  assistedBy: ScorecardPlayerRef | null;
  ballInOver: number;
  batterRuns: number;
  bowler: ScorecardPlayerRef;
  byeRuns: number;
  dismissedBy: ScorecardPlayerRef | null;
  dismissedPlayer: ScorecardPlayerRef | null;
  id: number;
  isLegalDelivery: boolean;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStriker: ScorecardPlayerRef;
  overNumber: number;
  penaltyRuns: number;
  sequenceNo: number;
  striker: ScorecardPlayerRef;
  totalRuns: number;
  wicketType: string | null;
  wideRuns: number;
}

interface InningsScorecard {
  batting: ScorecardBattingRow[];
  battingTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  bowling: ScorecardBowlingRow[];
  bowlingTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  currentInningsOrdinal: number;
  deliveries?: ScorecardDelivery[];
  extras: {
    byes: number;
    legByes: number;
    noBalls: number;
    others: number;
    penaltyRuns: number;
    total: number;
    wides: number;
  };
  fallOfWickets: ScorecardFallOfWicket[];
  id: number;
  inningsNumber: number;
  lastUpdatedAt: Date;
  summary: {
    ballsBowled: number;
    isCompleted: boolean;
    overs: string;
    status: string;
    target: number | null;
    totalScore: number;
    wickets: number;
  };
}

export interface MatchScorecard {
  innings: InningsScorecard[];
  match: {
    format: string;
    id: number;
    inningsPerSide: number;
    isAbandoned: boolean;
    isCompleted: boolean;
    isLive: boolean;
    isTied: boolean;
    margin: string | null;
    oversPerSide: number;
    result: string | null;
    team1: {
      id: number;
      name: string;
      shortName: string;
    };
    team2: {
      id: number;
      name: string;
      shortName: string;
    };
    tossDecision: string;
    tossWinner: {
      id: number;
      name: string;
      shortName: string;
    };
    winner: {
      id: number;
      name: string;
      shortName: string;
    } | null;
  };
}

function calculateStrikeRate(runs: number, ballsFaced: number): number {
  if (ballsFaced === 0) {
    return 0;
  }
  return Number(((runs / ballsFaced) * 100).toFixed(2));
}

function calculateEconomy(
  runsConceded: number,
  ballsBowled: number,
  ballsPerOver: number
): number {
  if (ballsBowled === 0) {
    return 0;
  }
  return Number(((runsConceded * ballsPerOver) / ballsBowled).toFixed(2));
}

function resolveBatterStatus({
  hasStats,
  ballsFaced,
  runsScored,
  isDismissed,
}: {
  hasStats: boolean;
  ballsFaced: number;
  runsScored: number;
  isDismissed: boolean;
}): "out" | "not_out" | "did_not_bat" {
  if (!hasStats) {
    return "did_not_bat";
  }

  if (isDismissed) {
    return "out";
  }

  if (ballsFaced > 0 || runsScored > 0) {
    return "not_out";
  }

  return "did_not_bat";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Scorecard assembly intentionally consolidates API shaping.
export async function getMatchScorecard(
  matchId: number,
  query: ScorecardQuery = {}
): Promise<MatchScorecard | null> {
  const includeBallByBall = query.includeBallByBall ?? false;

  const match = await db.query.matches.findFirst({
    where: {
      id: matchId,
    },
    with: {
      team1: true,
      team2: true,
      tossWinner: true,
      winner: true,
    },
  });

  if (!match) {
    return null;
  }

  const formatRules = await getMatchFormatRulesByMatchId(match.id);
  const ballsPerOver = formatRules.ballsPerOver;

  const allInnings = await db.query.innings.findMany({
    where: {
      matchId,
    },
    with: {
      battingTeam: true,
      bowlingTeam: true,
    },
    orderBy: {
      inningsNumber: "asc",
    },
  });

  const inningsToRender =
    typeof query.inningsNumber === "number"
      ? allInnings.filter(
          (entry) => entry.inningsNumber === query.inningsNumber
        )
      : allInnings;

  const lineupRows = await db.query.matchLineup.findMany({
    where: {
      matchId,
    },
    with: {
      player: true,
    },
  });

  const inningsPayload: InningsScorecard[] = [];

  for (const [inningsIndex, inningsRow] of inningsToRender.entries()) {
    const statsRows = await db.query.playerInningsStats.findMany({
      where: {
        inningsId: inningsRow.id,
      },
      with: {
        player: true,
        dismissedBy: true,
        assistedBy: true,
      },
    });

    const deliveries = await db.query.deliveries.findMany({
      where: {
        inningsId: inningsRow.id,
      },
      with: {
        striker: true,
        nonStriker: true,
        bowler: true,
        dismissedPlayer: true,
        dismissedBy: true,
        assistedBy: true,
      },
      orderBy: {
        sequenceNo: "asc",
      },
    });

    const statsByPlayerId = new Map(
      statsRows.map((row) => [row.playerId, row])
    );

    const battingLineup = lineupRows
      .filter((row) => row.teamId === inningsRow.battingTeamId && row.player)
      .sort((a, b) => {
        const aOrder = a.battingOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.battingOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder === bOrder) {
          const aName = a.player?.name ?? "";
          const bName = b.player?.name ?? "";
          return aName.localeCompare(bName);
        }
        return aOrder - bOrder;
      });

    const batting = battingLineup.map((lineupPlayer) => {
      const playerStats = statsByPlayerId.get(lineupPlayer.playerId);

      const runsScored = playerStats?.runsScored ?? 0;
      const ballsFaced = playerStats?.ballsFaced ?? 0;
      const isDismissed = playerStats?.isDismissed ?? false;

      return {
        player: {
          id: lineupPlayer.player?.id ?? lineupPlayer.playerId,
          name: lineupPlayer.player?.name ?? "Unknown",
        },
        runs: runsScored,
        ballsFaced,
        fours: playerStats?.fours ?? 0,
        sixes: playerStats?.sixes ?? 0,
        strikeRate: calculateStrikeRate(runsScored, ballsFaced),
        status: resolveBatterStatus({
          hasStats: Boolean(playerStats),
          ballsFaced,
          runsScored,
          isDismissed,
        }),
        dismissalType: playerStats?.dismissalType ?? null,
        dismissedBy: playerStats?.dismissedBy
          ? {
              id: playerStats.dismissedBy.id,
              name: playerStats.dismissedBy.name,
            }
          : null,
        assistedBy: playerStats?.assistedBy
          ? {
              id: playerStats.assistedBy.id,
              name: playerStats.assistedBy.name,
            }
          : null,
      };
    });

    const bowling = statsRows
      .filter(
        (row) =>
          row.player &&
          row.teamId === inningsRow.bowlingTeamId &&
          (row.ballsBowled > 0 ||
            row.runsConceded > 0 ||
            row.wicketsTaken > 0 ||
            row.wides > 0 ||
            row.noBalls > 0)
      )
      .sort((a, b) => b.ballsBowled - a.ballsBowled)
      .map((row) => ({
        player: {
          id: row.player?.id ?? row.playerId,
          name: row.player?.name ?? "Unknown",
        },
        ballsBowled: row.ballsBowled,
        overs: formatOvers(row.ballsBowled, ballsPerOver),
        maidens: row.maidens,
        runsConceded: row.runsConceded,
        wicketsTaken: row.wicketsTaken,
        wides: row.wides,
        noBalls: row.noBalls,
        dotBalls: row.dotBalls,
        economy: calculateEconomy(
          row.runsConceded,
          row.ballsBowled,
          ballsPerOver
        ),
      }));

    const fallOfWickets: ScorecardFallOfWicket[] = [];
    let runningScore = 0;
    let wicketCount = 0;

    for (const delivery of deliveries) {
      runningScore += delivery.totalRuns;
      if (!delivery.isWicket) {
        continue;
      }

      wicketCount += 1;
      fallOfWickets.push({
        wicketNumber: wicketCount,
        score: runningScore,
        over: `${delivery.overNumber}.${delivery.ballInOver}`,
        batter: delivery.dismissedPlayer
          ? {
              id: delivery.dismissedPlayer.id,
              name: delivery.dismissedPlayer.name,
            }
          : null,
        wicketType: delivery.wicketType,
      });
    }

    const inningsPositionInMatch = allInnings.findIndex(
      (entry) => entry.id === inningsRow.id
    );
    const previousInnings =
      inningsPositionInMatch > 0
        ? allInnings[inningsPositionInMatch - 1]
        : null;

    const derivedTarget =
      inningsRow.targetRuns ??
      (previousInnings ? previousInnings.totalScore + 1 : null);

    const battingTeam = inningsRow.battingTeam ?? match.team1;
    const bowlingTeam = inningsRow.bowlingTeam ?? match.team2;

    inningsPayload.push({
      id: inningsRow.id,
      inningsNumber: inningsRow.inningsNumber,
      battingTeam: {
        id: battingTeam.id,
        name: battingTeam.name,
        shortName: battingTeam.shortName,
      },
      bowlingTeam: {
        id: bowlingTeam.id,
        name: bowlingTeam.name,
        shortName: bowlingTeam.shortName,
      },
      summary: {
        totalScore: inningsRow.totalScore,
        wickets: inningsRow.wickets,
        ballsBowled: inningsRow.ballsBowled,
        overs: formatOvers(inningsRow.ballsBowled, ballsPerOver),
        target: derivedTarget,
        status: inningsRow.status,
        isCompleted: Boolean(inningsRow.isCompleted),
      },
      extras: {
        wides: inningsRow.wides,
        noBalls: inningsRow.noBalls,
        byes: inningsRow.byes,
        legByes: inningsRow.legByes,
        penaltyRuns: inningsRow.penaltyRuns,
        others: inningsRow.others,
        total:
          inningsRow.wides +
          inningsRow.noBalls +
          inningsRow.byes +
          inningsRow.legByes +
          inningsRow.penaltyRuns +
          inningsRow.others,
      },
      batting,
      bowling,
      fallOfWickets,
      deliveries: includeBallByBall
        ? deliveries.map((delivery) => ({
            id: delivery.id,
            sequenceNo: delivery.sequenceNo,
            overNumber: delivery.overNumber,
            ballInOver: delivery.ballInOver,
            striker: {
              id: delivery.striker?.id ?? delivery.strikerId,
              name: delivery.striker?.name ?? "Unknown",
            },
            nonStriker: {
              id: delivery.nonStriker?.id ?? delivery.nonStrikerId,
              name: delivery.nonStriker?.name ?? "Unknown",
            },
            bowler: {
              id: delivery.bowler?.id ?? delivery.bowlerId,
              name: delivery.bowler?.name ?? "Unknown",
            },
            batterRuns: delivery.batterRuns,
            wideRuns: delivery.wideRuns,
            noBallRuns: delivery.noBallRuns,
            byeRuns: delivery.byeRuns,
            legByeRuns: delivery.legByeRuns,
            penaltyRuns: delivery.penaltyRuns,
            totalRuns: delivery.totalRuns,
            isLegalDelivery: Boolean(delivery.isLegalDelivery),
            isWicket: Boolean(delivery.isWicket),
            wicketType: delivery.wicketType,
            dismissedPlayer: delivery.dismissedPlayer
              ? {
                  id: delivery.dismissedPlayer.id,
                  name: delivery.dismissedPlayer.name,
                }
              : null,
            dismissedBy: delivery.dismissedBy
              ? {
                  id: delivery.dismissedBy.id,
                  name: delivery.dismissedBy.name,
                }
              : null,
            assistedBy: delivery.assistedBy
              ? {
                  id: delivery.assistedBy.id,
                  name: delivery.assistedBy.name,
                }
              : null,
          }))
        : undefined,
      lastUpdatedAt: inningsRow.updatedAt,
      currentInningsOrdinal: inningsIndex + 1,
    });
  }

  return {
    match: {
      id: match.id,
      format: match.format,
      oversPerSide: match.oversPerSide,
      inningsPerSide: match.inningsPerSide,
      isLive: Boolean(match.isLive),
      isCompleted: Boolean(match.isCompleted),
      isAbandoned: Boolean(match.isAbandoned),
      isTied: Boolean(match.isTied),
      result: match.result,
      margin: match.margin,
      team1: {
        id: match.team1.id,
        name: match.team1.name,
        shortName: match.team1.shortName,
      },
      team2: {
        id: match.team2.id,
        name: match.team2.name,
        shortName: match.team2.shortName,
      },
      tossWinner: {
        id: match.tossWinner.id,
        name: match.tossWinner.name,
        shortName: match.tossWinner.shortName,
      },
      tossDecision: match.tossDecision,
      winner: match.winner
        ? {
            id: match.winner.id,
            name: match.winner.name,
            shortName: match.winner.shortName,
          }
        : null,
    },
    innings: inningsPayload,
  };
}
