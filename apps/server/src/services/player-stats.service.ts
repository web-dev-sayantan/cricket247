import { db } from "@/db";
import type { Player } from "@/db/types";

export interface PlayerStatisticsSummary {
  battingStance: string;
  bowlingStance: null | string;
  id: number;
  image: null | string;
  isWicketKeeper: boolean;
  name: string;
  nationality: null | string;
  role: string;
}

export interface PlayerStatisticsOverview {
  matchesPlayed: number;
  playerOfTheMatchCount: number;
  playerOfTheTournamentCount: number;
  runsScored: number;
  wicketsTaken: number;
}

export interface PlayerStatisticsBatting {
  average: null | number;
  ballsFaced: number;
  fifties: number;
  fours: number;
  hundreds: number;
  inningsBatted: number;
  notOuts: number;
  runsScored: number;
  sixes: number;
  strikeRate: null | number;
  thirties?: number;
}

export interface PlayerStatisticsBowling {
  average: null | number;
  ballsBowled: number;
  ballsPerOver: number;
  economy: null | number;
  fiveWicketHauls: number;
  runsConceded: number;
  strikeRate: null | number;
  tenWicketHauls: number;
  threeWicketHauls: number;
  wicketsTaken: number;
}

export interface PlayerStatisticsFielding {
  catches: number;
  runOuts: number;
  stumpings?: number;
}

export interface PlayerStatisticsFormat {
  batting: null | PlayerStatisticsBatting;
  bowling: null | PlayerStatisticsBowling;
  fielding: null | PlayerStatisticsFielding;
  format: string;
  overview: PlayerStatisticsOverview;
}

export interface PlayerStatisticsView {
  formats: PlayerStatisticsFormat[];
  player: PlayerStatisticsSummary;
}

interface MutableFormatStats {
  ballsPerOver: number;
  batting: {
    ballsFaced: number;
    dismissals: number;
    fifties: number;
    fours: number;
    hundreds: number;
    inningsBatted: number;
    notOuts: number;
    runsScored: number;
    sixes: number;
    thirties: number;
  };
  battingVisible: boolean;
  bowling: {
    ballsBowled: number;
    fiveWicketHauls: number;
    runsConceded: number;
    threeWicketHauls: number;
    wicketsByMatchId: Map<number, number>;
    wicketsTaken: number;
  };
  bowlingVisible: boolean;
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
  fieldingVisible: boolean;
  format: string;
  matchesPlayed: Set<number>;
  playerOfTheMatchCount: number;
  playerOfTheTournamentIds: Set<number>;
  runsScored: number;
  showThirties: boolean;
  wicketsTaken: number;
}

interface PlayerStatisticsMatch {
  ballsPerOverSnapshot: number;
  format: string;
  id: number;
  isAbandoned: boolean | null;
  isCompleted: boolean | null;
  isTied: boolean | null;
  oversPerSide: number;
  playerOfTheMatchId: null | number;
  result: null | string;
  tournament: null | {
    defaultMatchFormat: null | {
      name: string;
    };
    id: number;
    playerOfTheTournamentId: null | number;
  };
  winnerId: null | number;
}

interface PlayerStatisticsLineupRow {
  match: null | PlayerStatisticsMatch;
}

interface PlayerStatisticsStatsRow {
  ballsBowled: number;
  ballsFaced: number;
  catches: number;
  fours: number;
  isDismissed: boolean;
  matchId: number;
  runOuts: number;
  runsConceded: number;
  runsScored: number;
  sixes: number;
  stumpings: number;
  wicketsTaken: number;
}

interface RelevantMatchState {
  formatStatsByLabel: Map<string, MutableFormatStats>;
  relevantMatchById: Map<number, PlayerStatisticsMatch>;
  relevantMatchIds: Set<number>;
}

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function isMatchFinalized(match: {
  isAbandoned: boolean | null;
  isCompleted: boolean | null;
  isTied: boolean | null;
  result: null | string;
  winnerId: null | number;
}) {
  return (
    Boolean(match.isCompleted) ||
    Boolean(match.isAbandoned) ||
    Boolean(match.isTied) ||
    typeof match.winnerId === "number" ||
    (typeof match.result === "string" && match.result.trim().length > 0)
  );
}

function isActualBattingInnings(statsRow: {
  ballsFaced: number;
  isDismissed: boolean;
  runsScored: number;
}) {
  return (
    statsRow.runsScored > 0 || statsRow.ballsFaced > 0 || statsRow.isDismissed
  );
}

function calculateBattingAverage(runsScored: number, dismissals: number) {
  if (dismissals <= 0) {
    return null;
  }

  return roundToTwo(runsScored / dismissals);
}

function calculateStrikeRate(runsScored: number, ballsFaced: number) {
  if (ballsFaced <= 0) {
    return null;
  }

  return roundToTwo((runsScored / ballsFaced) * 100);
}

function calculateEconomy(
  runsConceded: number,
  ballsBowled: number,
  ballsPerOver: number
) {
  if (ballsBowled <= 0 || ballsPerOver <= 0) {
    return null;
  }

  return roundToTwo((runsConceded * ballsPerOver) / ballsBowled);
}

function calculateBowlingAverage(runsConceded: number, wicketsTaken: number) {
  if (wicketsTaken <= 0) {
    return null;
  }

  return roundToTwo(runsConceded / wicketsTaken);
}

function calculateBowlingStrikeRate(ballsBowled: number, wicketsTaken: number) {
  if (wicketsTaken <= 0) {
    return null;
  }

  return roundToTwo(ballsBowled / wicketsTaken);
}

function createEmptyFormatStats(params: {
  ballsPerOver: number;
  format: string;
  showThirties: boolean;
}): MutableFormatStats {
  return {
    format: params.format,
    ballsPerOver: params.ballsPerOver,
    showThirties: params.showThirties,
    matchesPlayed: new Set<number>(),
    playerOfTheMatchCount: 0,
    playerOfTheTournamentIds: new Set<number>(),
    runsScored: 0,
    wicketsTaken: 0,
    battingVisible: false,
    batting: {
      inningsBatted: 0,
      runsScored: 0,
      ballsFaced: 0,
      dismissals: 0,
      notOuts: 0,
      thirties: 0,
      fifties: 0,
      hundreds: 0,
      fours: 0,
      sixes: 0,
    },
    bowlingVisible: false,
    bowling: {
      ballsBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0,
      threeWicketHauls: 0,
      fiveWicketHauls: 0,
      wicketsByMatchId: new Map<number, number>(),
    },
    fieldingVisible: false,
    fielding: {
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    },
  };
}

function createPlayerSummary(player: Player): PlayerStatisticsSummary {
  return {
    id: player.id,
    name: player.name,
    image: player.image ?? null,
    role: player.role,
    nationality: player.nationality ?? null,
    battingStance: player.battingStance,
    bowlingStance: player.bowlingStance ?? null,
    isWicketKeeper: player.isWicketKeeper,
  };
}

function resolveFormatLabel(format: string) {
  return format.trim() || "Custom";
}

function resolveBallsPerOver(match: PlayerStatisticsMatch) {
  return match.ballsPerOverSnapshot > 0 ? match.ballsPerOverSnapshot : 6;
}

function getOrCreateFormatStats(
  formatStatsByLabel: Map<string, MutableFormatStats>,
  match: PlayerStatisticsMatch
) {
  const formatLabel = resolveFormatLabel(match.format);
  const formatStats =
    formatStatsByLabel.get(formatLabel) ??
    createEmptyFormatStats({
      format: formatLabel,
      ballsPerOver: resolveBallsPerOver(match),
      showThirties: match.oversPerSide < 50,
    });

  formatStatsByLabel.set(formatLabel, formatStats);
  return formatStats;
}

function registerMatchLineup(params: {
  match: null | PlayerStatisticsMatch;
  playerId: number;
  state: RelevantMatchState;
}) {
  const { match, playerId, state } = params;
  if (!(match && isMatchFinalized(match))) {
    return;
  }

  state.relevantMatchIds.add(match.id);
  state.relevantMatchById.set(match.id, match);

  const formatStats = getOrCreateFormatStats(state.formatStatsByLabel, match);
  const formatLabel = resolveFormatLabel(match.format);

  formatStats.matchesPlayed.add(match.id);

  if (match.playerOfTheMatchId === playerId) {
    formatStats.playerOfTheMatchCount += 1;
  }

  if (
    match.tournament?.playerOfTheTournamentId === playerId &&
    match.tournament.defaultMatchFormat?.name === formatLabel
  ) {
    formatStats.playerOfTheTournamentIds.add(match.tournament.id);
  }
}

function buildRelevantMatchState(
  lineupRows: PlayerStatisticsLineupRow[],
  playerId: number
): RelevantMatchState {
  const state: RelevantMatchState = {
    formatStatsByLabel: new Map<string, MutableFormatStats>(),
    relevantMatchIds: new Set<number>(),
    relevantMatchById: new Map<number, PlayerStatisticsMatch>(),
  };

  for (const lineupRow of lineupRows) {
    registerMatchLineup({
      match: lineupRow.match,
      playerId,
      state,
    });
  }

  return state;
}

function updateBattingStats(
  formatStats: MutableFormatStats,
  statsRow: PlayerStatisticsStatsRow
) {
  if (!isActualBattingInnings(statsRow)) {
    return;
  }

  formatStats.battingVisible = true;
  formatStats.batting.inningsBatted += 1;
  formatStats.batting.runsScored += statsRow.runsScored;
  formatStats.batting.ballsFaced += statsRow.ballsFaced;
  formatStats.batting.fours += statsRow.fours;
  formatStats.batting.sixes += statsRow.sixes;

  if (statsRow.isDismissed) {
    formatStats.batting.dismissals += 1;
  } else {
    formatStats.batting.notOuts += 1;
  }

  if (statsRow.runsScored >= 100) {
    formatStats.batting.hundreds += 1;
    return;
  }

  if (statsRow.runsScored >= 50) {
    formatStats.batting.fifties += 1;
    return;
  }

  if (formatStats.showThirties && statsRow.runsScored >= 30) {
    formatStats.batting.thirties += 1;
  }
}

function updateBowlingStats(
  formatStats: MutableFormatStats,
  statsRow: PlayerStatisticsStatsRow
) {
  if (
    statsRow.ballsBowled > 0 ||
    statsRow.runsConceded > 0 ||
    statsRow.wicketsTaken > 0
  ) {
    formatStats.bowlingVisible = true;
  }

  formatStats.bowling.ballsBowled += statsRow.ballsBowled;
  formatStats.bowling.runsConceded += statsRow.runsConceded;
  formatStats.bowling.wicketsTaken += statsRow.wicketsTaken;

  if (statsRow.wicketsTaken >= 3 && statsRow.wicketsTaken <= 4) {
    formatStats.bowling.threeWicketHauls += 1;
  }

  if (statsRow.wicketsTaken >= 5 && statsRow.wicketsTaken <= 9) {
    formatStats.bowling.fiveWicketHauls += 1;
  }

  if (statsRow.wicketsTaken > 0) {
    const currentMatchWickets =
      formatStats.bowling.wicketsByMatchId.get(statsRow.matchId) ?? 0;
    formatStats.bowling.wicketsByMatchId.set(
      statsRow.matchId,
      currentMatchWickets + statsRow.wicketsTaken
    );
  }
}

function updateFieldingStats(params: {
  formatStats: MutableFormatStats;
  isWicketKeeper: boolean;
  statsRow: PlayerStatisticsStatsRow;
}) {
  const { formatStats, isWicketKeeper, statsRow } = params;
  if (
    statsRow.catches > 0 ||
    statsRow.runOuts > 0 ||
    (isWicketKeeper && statsRow.stumpings > 0)
  ) {
    formatStats.fieldingVisible = true;
  }

  formatStats.fielding.catches += statsRow.catches;
  formatStats.fielding.runOuts += statsRow.runOuts;
  if (isWicketKeeper) {
    formatStats.fielding.stumpings += statsRow.stumpings;
  }
}

function applyStatsRowToFormat(params: {
  formatStats: MutableFormatStats;
  isWicketKeeper: boolean;
  statsRow: PlayerStatisticsStatsRow;
}) {
  const { formatStats, isWicketKeeper, statsRow } = params;
  formatStats.runsScored += statsRow.runsScored;
  formatStats.wicketsTaken += statsRow.wicketsTaken;

  updateBattingStats(formatStats, statsRow);
  updateBowlingStats(formatStats, statsRow);
  updateFieldingStats({
    formatStats,
    isWicketKeeper,
    statsRow,
  });
}

function applyStatsRows(params: {
  isWicketKeeper: boolean;
  relevantMatchById: Map<number, PlayerStatisticsMatch>;
  relevantMatchIds: Set<number>;
  statsRows: PlayerStatisticsStatsRow[];
  formatStatsByLabel: Map<string, MutableFormatStats>;
}) {
  const {
    isWicketKeeper,
    relevantMatchById,
    relevantMatchIds,
    statsRows,
    formatStatsByLabel,
  } = params;

  for (const statsRow of statsRows) {
    if (!relevantMatchIds.has(statsRow.matchId)) {
      continue;
    }

    const match = relevantMatchById.get(statsRow.matchId);
    if (!match) {
      continue;
    }

    const formatStats = formatStatsByLabel.get(
      resolveFormatLabel(match.format)
    );
    if (!formatStats) {
      continue;
    }

    applyStatsRowToFormat({
      formatStats,
      isWicketKeeper,
      statsRow,
    });
  }
}

function createBattingOutput(formatStats: MutableFormatStats) {
  if (!(formatStats.battingVisible || formatStats.batting.inningsBatted > 0)) {
    return null;
  }

  return {
    inningsBatted: formatStats.batting.inningsBatted,
    runsScored: formatStats.batting.runsScored,
    average: calculateBattingAverage(
      formatStats.batting.runsScored,
      formatStats.batting.dismissals
    ),
    strikeRate: calculateStrikeRate(
      formatStats.batting.runsScored,
      formatStats.batting.ballsFaced
    ),
    fifties: formatStats.batting.fifties,
    hundreds: formatStats.batting.hundreds,
    fours: formatStats.batting.fours,
    sixes: formatStats.batting.sixes,
    notOuts: formatStats.batting.notOuts,
    ballsFaced: formatStats.batting.ballsFaced,
    ...(formatStats.showThirties
      ? {
          thirties: formatStats.batting.thirties,
        }
      : {}),
  };
}

function createBowlingOutput(formatStats: MutableFormatStats) {
  if (!(formatStats.bowlingVisible || formatStats.bowling.ballsBowled > 0)) {
    return null;
  }

  const tenWicketHauls = Array.from(
    formatStats.bowling.wicketsByMatchId.values()
  ).filter((wickets) => wickets >= 10).length;

  return {
    ballsBowled: formatStats.bowling.ballsBowled,
    ballsPerOver: formatStats.ballsPerOver,
    wicketsTaken: formatStats.bowling.wicketsTaken,
    runsConceded: formatStats.bowling.runsConceded,
    economy: calculateEconomy(
      formatStats.bowling.runsConceded,
      formatStats.bowling.ballsBowled,
      formatStats.ballsPerOver
    ),
    average: calculateBowlingAverage(
      formatStats.bowling.runsConceded,
      formatStats.bowling.wicketsTaken
    ),
    strikeRate: calculateBowlingStrikeRate(
      formatStats.bowling.ballsBowled,
      formatStats.bowling.wicketsTaken
    ),
    threeWicketHauls: formatStats.bowling.threeWicketHauls,
    fiveWicketHauls: formatStats.bowling.fiveWicketHauls,
    tenWicketHauls,
  };
}

function createFieldingOutput(
  formatStats: MutableFormatStats,
  isWicketKeeper: boolean
) {
  if (
    !(
      formatStats.fieldingVisible ||
      formatStats.fielding.catches > 0 ||
      formatStats.fielding.runOuts > 0 ||
      (isWicketKeeper && formatStats.fielding.stumpings > 0)
    )
  ) {
    return null;
  }

  return {
    catches: formatStats.fielding.catches,
    runOuts: formatStats.fielding.runOuts,
    ...(isWicketKeeper
      ? {
          stumpings: formatStats.fielding.stumpings,
        }
      : {}),
  };
}

function buildFormats(
  formatStatsByLabel: Map<string, MutableFormatStats>,
  isWicketKeeper: boolean
) {
  return Array.from(formatStatsByLabel.values())
    .sort((first, second) => {
      const matchesDiff = second.matchesPlayed.size - first.matchesPlayed.size;
      if (matchesDiff !== 0) {
        return matchesDiff;
      }

      return first.format.localeCompare(second.format);
    })
    .map((formatStats) => ({
      format: formatStats.format,
      overview: {
        matchesPlayed: formatStats.matchesPlayed.size,
        runsScored: formatStats.runsScored,
        wicketsTaken: formatStats.wicketsTaken,
        playerOfTheMatchCount: formatStats.playerOfTheMatchCount,
        playerOfTheTournamentCount: formatStats.playerOfTheTournamentIds.size,
      },
      batting: createBattingOutput(formatStats),
      bowling: createBowlingOutput(formatStats),
      fielding: createFieldingOutput(formatStats, isWicketKeeper),
    }));
}

export async function getPlayerStatisticsById(
  playerId: number
): Promise<PlayerStatisticsView | null> {
  const [player, lineupRows, statsRows] = await Promise.all([
    db.query.players.findFirst({
      where: {
        id: playerId,
      },
    }),
    db.query.matchLineup.findMany({
      where: {
        playerId,
      },
      with: {
        match: {
          with: {
            tournament: {
              with: {
                defaultMatchFormat: true,
              },
            },
          },
        },
      },
    }),
    db.query.playerInningsStats.findMany({
      where: {
        playerId,
      },
    }),
  ]);

  if (!player) {
    return null;
  }

  const relevantMatches = buildRelevantMatchState(
    lineupRows as PlayerStatisticsLineupRow[],
    playerId
  );

  applyStatsRows({
    statsRows: statsRows as PlayerStatisticsStatsRow[],
    relevantMatchIds: relevantMatches.relevantMatchIds,
    relevantMatchById: relevantMatches.relevantMatchById,
    formatStatsByLabel: relevantMatches.formatStatsByLabel,
    isWicketKeeper: player.isWicketKeeper,
  });

  return {
    player: createPlayerSummary(player),
    formats: buildFormats(
      relevantMatches.formatStatsByLabel,
      player.isWicketKeeper
    ),
  };
}
