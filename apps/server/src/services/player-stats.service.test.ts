import { beforeEach, describe, expect, it, mock } from "bun:test";

const state = {
  lineupRows: [] as Array<{
    match: {
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
    };
  }>,
  playerRow: null as {
    battingStance: string;
    bowlingStance: null | string;
    id: number;
    image: null | string;
    isWicketKeeper: boolean;
    name: string;
    nationality: null | string;
    role: string;
  } | null,
  statsRows: [] as Array<{
    ballsBowled: number;
    ballsFaced: number;
    catches: number;
    fours: number;
    inningsId: number;
    isDismissed: boolean;
    matchId: number;
    runOuts: number;
    runsConceded: number;
    runsScored: number;
    sixes: number;
    stumpings: number;
    wicketsTaken: number;
  }>,
};

const dbMock = {
  query: {
    matchLineup: {
      findMany: mock(async () => state.lineupRows),
    },
    playerInningsStats: {
      findMany: mock(async () => state.statsRows),
    },
    players: {
      findFirst: mock(async () => state.playerRow),
    },
  },
};

mock.module("@/db", () => ({
  db: dbMock,
}));

const serviceModulePromise = import("./player-stats.service");

function createCompletedMatch(input: {
  defaultFormatName: string;
  format: string;
  id: number;
  oversPerSide: number;
  playerOfTheMatchId?: null | number;
  playerOfTheTournamentId?: null | number;
  tournamentId: number;
}) {
  return {
    id: input.id,
    format: input.format,
    oversPerSide: input.oversPerSide,
    ballsPerOverSnapshot: 6,
    playerOfTheMatchId: input.playerOfTheMatchId ?? null,
    isCompleted: true,
    isAbandoned: false,
    isTied: false,
    result: null,
    winnerId: 1,
    tournament: {
      id: input.tournamentId,
      playerOfTheTournamentId: input.playerOfTheTournamentId ?? null,
      defaultMatchFormat: {
        name: input.defaultFormatName,
      },
    },
  };
}

function createFinalizedDrawnMatch(input: {
  defaultFormatName: string;
  format: string;
  id: number;
  oversPerSide: number;
  tournamentId: number;
}) {
  return {
    id: input.id,
    format: input.format,
    oversPerSide: input.oversPerSide,
    ballsPerOverSnapshot: 6,
    playerOfTheMatchId: null,
    isCompleted: false,
    isAbandoned: false,
    isTied: false,
    result: "Drawn",
    winnerId: null,
    tournament: {
      id: input.tournamentId,
      playerOfTheTournamentId: null,
      defaultMatchFormat: {
        name: input.defaultFormatName,
      },
    },
  };
}

function createStatsRow(input: {
  ballsBowled?: number;
  ballsFaced?: number;
  catches?: number;
  fours?: number;
  inningsId: number;
  isDismissed?: boolean;
  matchId: number;
  runOuts?: number;
  runsConceded?: number;
  runsScored?: number;
  sixes?: number;
  stumpings?: number;
  wicketsTaken?: number;
}) {
  return {
    inningsId: input.inningsId,
    matchId: input.matchId,
    runsScored: input.runsScored ?? 0,
    ballsFaced: input.ballsFaced ?? 0,
    fours: input.fours ?? 0,
    sixes: input.sixes ?? 0,
    isDismissed: input.isDismissed ?? false,
    ballsBowled: input.ballsBowled ?? 0,
    runsConceded: input.runsConceded ?? 0,
    wicketsTaken: input.wicketsTaken ?? 0,
    catches: input.catches ?? 0,
    runOuts: input.runOuts ?? 0,
    stumpings: input.stumpings ?? 0,
  };
}

beforeEach(() => {
  state.playerRow = {
    id: 7,
    name: "Aarav Rao",
    image: null,
    role: "All-rounder",
    nationality: "India",
    battingStance: "Right handed",
    bowlingStance: "Right-arm off break",
    isWicketKeeper: true,
  };
  state.lineupRows = [];
  state.statsRows = [];
  mock.clearAllMocks();
});

describe("getPlayerStatisticsById", () => {
  it("aggregates completed-match statistics by exact format and applies milestone rules", async () => {
    state.lineupRows = [
      {
        match: createCompletedMatch({
          id: 101,
          format: "ODI",
          oversPerSide: 50,
          playerOfTheMatchId: 7,
          playerOfTheTournamentId: 7,
          tournamentId: 501,
          defaultFormatName: "ODI",
        }),
      },
      {
        match: createCompletedMatch({
          id: 102,
          format: "T20",
          oversPerSide: 20,
          playerOfTheTournamentId: 7,
          tournamentId: 502,
          defaultFormatName: "T20",
        }),
      },
      {
        match: createCompletedMatch({
          id: 105,
          format: "T20",
          oversPerSide: 20,
          playerOfTheTournamentId: 7,
          tournamentId: 502,
          defaultFormatName: "T20",
        }),
      },
      {
        match: createCompletedMatch({
          id: 106,
          format: "T20",
          oversPerSide: 20,
          playerOfTheTournamentId: 7,
          tournamentId: 504,
          defaultFormatName: "ODI",
        }),
      },
      {
        match: createFinalizedDrawnMatch({
          id: 104,
          format: "Test",
          oversPerSide: 90,
          tournamentId: 503,
          defaultFormatName: "Test",
        }),
      },
      {
        match: {
          id: 999,
          format: "Custom",
          oversPerSide: 20,
          ballsPerOverSnapshot: 6,
          playerOfTheMatchId: null,
          isCompleted: false,
          isAbandoned: false,
          isTied: false,
          result: null,
          winnerId: null,
          tournament: null,
        },
      },
    ];
    state.statsRows = [
      createStatsRow({
        inningsId: 1001,
        matchId: 101,
        runsScored: 75,
        ballsFaced: 90,
        fours: 8,
        sixes: 1,
        isDismissed: true,
        catches: 1,
        stumpings: 1,
      }),
      createStatsRow({
        inningsId: 1002,
        matchId: 102,
        runsScored: 35,
        ballsFaced: 20,
        fours: 3,
        sixes: 2,
        isDismissed: false,
        ballsBowled: 24,
        runsConceded: 18,
        wicketsTaken: 4,
        runOuts: 1,
      }),
      createStatsRow({
        inningsId: 1003,
        matchId: 104,
        runsScored: 10,
        ballsFaced: 25,
        isDismissed: true,
        ballsBowled: 180,
        runsConceded: 55,
        wicketsTaken: 5,
      }),
      createStatsRow({
        inningsId: 1004,
        matchId: 104,
        ballsBowled: 150,
        runsConceded: 45,
        wicketsTaken: 5,
      }),
      createStatsRow({
        inningsId: 1999,
        matchId: 999,
        runsScored: 200,
        ballsFaced: 100,
        wicketsTaken: 9,
      }),
    ];

    const { getPlayerStatisticsById } = await serviceModulePromise;
    const result = await getPlayerStatisticsById(7);

    expect(result).not.toBeNull();
    expect(result?.formats.map((format) => format.format)).toEqual([
      "T20",
      "ODI",
      "Test",
    ]);

    const t20 = result?.formats[0];
    expect(t20?.overview).toEqual({
      matchesPlayed: 3,
      runsScored: 35,
      wicketsTaken: 4,
      playerOfTheMatchCount: 0,
      playerOfTheTournamentCount: 1,
    });
    expect(t20?.batting).toMatchObject({
      inningsBatted: 1,
      runsScored: 35,
      average: null,
      strikeRate: 175,
      thirties: 1,
      fifties: 0,
      hundreds: 0,
      fours: 3,
      sixes: 2,
      notOuts: 1,
    });
    expect(t20?.bowling).toMatchObject({
      wicketsTaken: 4,
      runsConceded: 18,
      economy: 4.5,
      average: 4.5,
      strikeRate: 6,
      threeWicketHauls: 1,
      fiveWicketHauls: 0,
      tenWicketHauls: 0,
    });
    expect(t20?.fielding).toEqual({
      catches: 0,
      runOuts: 1,
      stumpings: 0,
    });

    const odi = result?.formats[1];
    expect(odi?.overview).toEqual({
      matchesPlayed: 1,
      runsScored: 75,
      wicketsTaken: 0,
      playerOfTheMatchCount: 1,
      playerOfTheTournamentCount: 1,
    });
    expect(odi?.batting).toMatchObject({
      inningsBatted: 1,
      runsScored: 75,
      average: 75,
      strikeRate: 83.33,
      fifties: 1,
      hundreds: 0,
      fours: 8,
      sixes: 1,
      notOuts: 0,
    });
    expect(odi?.batting?.thirties).toBeUndefined();
    expect(odi?.fielding).toEqual({
      catches: 1,
      runOuts: 0,
      stumpings: 1,
    });

    const test = result?.formats[2];
    expect(test?.overview).toEqual({
      matchesPlayed: 1,
      runsScored: 10,
      wicketsTaken: 10,
      playerOfTheMatchCount: 0,
      playerOfTheTournamentCount: 0,
    });
    expect(test?.batting).toMatchObject({
      inningsBatted: 1,
      runsScored: 10,
      average: 10,
      strikeRate: 40,
      fifties: 0,
      hundreds: 0,
      notOuts: 0,
    });
    expect(test?.bowling).toMatchObject({
      wicketsTaken: 10,
      runsConceded: 100,
      economy: 1.82,
      average: 10,
      strikeRate: 33,
      threeWicketHauls: 0,
      fiveWicketHauls: 2,
      tenWicketHauls: 1,
    });
    expect(test?.fielding).toBeNull();
  });

  it("hides stumpings for non-keepers and omits zero-only fielding sections", async () => {
    state.playerRow = {
      id: 9,
      name: "Rohan Das",
      image: null,
      role: "Bowler",
      nationality: "India",
      battingStance: "Right handed",
      bowlingStance: "Right-arm pace",
      isWicketKeeper: false,
    };
    state.lineupRows = [
      {
        match: createCompletedMatch({
          id: 201,
          format: "T20",
          oversPerSide: 20,
          tournamentId: 601,
          defaultFormatName: "T20",
        }),
      },
    ];
    state.statsRows = [
      createStatsRow({
        inningsId: 2001,
        matchId: 201,
        stumpings: 2,
      }),
    ];

    const { getPlayerStatisticsById } = await serviceModulePromise;
    const result = await getPlayerStatisticsById(9);

    expect(result?.formats[0]?.fielding).toBeNull();
  });

  it("returns an empty formats payload when a player has no completed-match data", async () => {
    const { getPlayerStatisticsById } = await serviceModulePromise;
    const result = await getPlayerStatisticsById(7);

    expect(result).toEqual({
      player: {
        id: 7,
        name: "Aarav Rao",
        image: null,
        role: "All-rounder",
        nationality: "India",
        battingStance: "Right handed",
        bowlingStance: "Right-arm off break",
        isWicketKeeper: true,
      },
      formats: [],
    });
  });
});
