import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MatchRow {
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
  team1: { id: number; name: string; shortName: string } | null;
  team2: { id: number; name: string; shortName: string } | null;
  tossDecision: string | null;
  tossWinner: { id: number; name: string; shortName: string } | null;
  winner: { id: number; name: string; shortName: string } | null;
}

interface InningsRow {
  ballsBowled: number;
  battingTeam: { id: number; name: string; shortName: string } | null;
  battingTeamId: number;
  bowlingTeam: { id: number; name: string; shortName: string } | null;
  bowlingTeamId: number;
  byes: number;
  id: number;
  inningsNumber: number;
  isCompleted: boolean;
  legByes: number;
  noBalls: number;
  openingBowlerId: number | null;
  openingNonStrikerId: number | null;
  openingStrikerId: number | null;
  others: number;
  penaltyRuns: number;
  status: string;
  targetRuns: number | null;
  totalScore: number;
  updatedAt: Date;
  wickets: number;
  wides: number;
}

interface MatchLineupRow {
  battingOrder: number | null;
  player: { id: number; name: string } | null;
  playerId: number;
  teamId: number;
}

interface PlayerInningsStatsRow {
  assistedBy: { id: number; name: string } | null;
  ballsBowled: number;
  ballsFaced: number;
  dismissalType: string | null;
  dismissedBy: { id: number; name: string } | null;
  dotBalls: number;
  fours: number;
  isDismissed: boolean;
  maidens: number;
  noBalls: number;
  player: { id: number; name: string } | null;
  playerId: number;
  runsConceded: number;
  runsScored: number;
  sixes: number;
  teamId: number;
  wicketsTaken: number;
  wides: number;
}

interface SummaryDeliveryRow {
  ballInOver: number;
  dismissedPlayer: { id: number; name: string } | null;
  id: number;
  isWicket: boolean;
  overNumber: number;
  sequenceNo: number;
  totalRuns: number;
  wicketType: string | null;
}

interface DetailedDeliveryRow extends SummaryDeliveryRow {
  assistedBy: { id: number; name: string } | null;
  batterRuns: number;
  bowler: { id: number; name: string } | null;
  bowlerId: number;
  byeRuns: number;
  dismissedBy: { id: number; name: string } | null;
  isLegalDelivery: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStriker: { id: number; name: string } | null;
  nonStrikerId: number;
  penaltyRuns: number;
  striker: { id: number; name: string } | null;
  strikerId: number;
  wideRuns: number;
}

interface ScorecardServiceTestState {
  deliveriesCalls: Array<{
    inningsId: number;
    with: Record<string, boolean>;
  }>;
  detailedDeliveriesByInningsId: Record<number, DetailedDeliveryRow[]>;
  innings: InningsRow[];
  latestDeliveryParticipantsByInningsId: Record<
    number,
    { bowlerId: number; nonStrikerId: number; strikerId: number } | null
  >;
  latestDeliveryParticipantsCalls: number[];
  lineups: MatchLineupRow[];
  match: MatchRow | null;
  statsByInningsId: Record<number, PlayerInningsStatsRow[]>;
  summaryDeliveriesByInningsId: Record<number, SummaryDeliveryRow[]>;
}

const state: ScorecardServiceTestState = {
  deliveriesCalls: [],
  detailedDeliveriesByInningsId: {},
  innings: [],
  lineups: [],
  latestDeliveryParticipantsByInningsId: {},
  latestDeliveryParticipantsCalls: [],
  match: null,
  statsByInningsId: {},
  summaryDeliveriesByInningsId: {},
};

const dbMock = {
  query: {
    deliveries: {
      findFirst: ({ where }: { where: { inningsId: number } }) => {
        state.latestDeliveryParticipantsCalls.push(where.inningsId);

        return Promise.resolve(
          state.latestDeliveryParticipantsByInningsId[where.inningsId] ?? null
        );
      },
      findMany: ({
        where,
        with: withValue,
      }: {
        orderBy: { sequenceNo: "asc" };
        where: { inningsId: number };
        with: Record<string, boolean>;
      }) => {
        state.deliveriesCalls.push({
          inningsId: where.inningsId,
          with: withValue,
        });

        if ("striker" in withValue) {
          return Promise.resolve(
            state.detailedDeliveriesByInningsId[where.inningsId] ?? []
          );
        }

        return Promise.resolve(
          state.summaryDeliveriesByInningsId[where.inningsId] ?? []
        );
      },
    },
    innings: {
      findMany: () => Promise.resolve(state.innings),
    },
    matchLineup: {
      findMany: () => Promise.resolve(state.lineups),
    },
    matches: {
      findFirst: () => Promise.resolve(state.match),
    },
    playerInningsStats: {
      findMany: ({ where }: { where: { inningsId: number } }) =>
        Promise.resolve(state.statsByInningsId[where.inningsId] ?? []),
    },
  },
};

const getMatchFormatRulesByMatchId = mock(async () => ({ ballsPerOver: 6 }));

mock.module("@/db", () => ({ db: dbMock }));
mock.module("@/services/match-format.service", () => ({
  getMatchFormatRulesByMatchId,
}));

let serviceImportCounter = 0;

function loadServiceModule() {
  serviceImportCounter += 1;
  return import(`./scorecard.service?test=${serviceImportCounter}`);
}

function createBaseState() {
  const match: MatchRow = {
    format: "T20",
    id: 42,
    inningsPerSide: 1,
    isAbandoned: false,
    isCompleted: false,
    isLive: true,
    isTied: false,
    margin: null,
    oversPerSide: 20,
    result: null,
    team1: { id: 1, name: "Knights", shortName: "KNI" },
    team2: { id: 2, name: "Warriors", shortName: "WAR" },
    tossDecision: null,
    tossWinner: null,
    winner: null,
  };
  const innings: InningsRow[] = [
    {
      ballsBowled: 1,
      battingTeam: { id: 1, name: "Knights", shortName: "KNI" },
      battingTeamId: 1,
      bowlingTeam: { id: 2, name: "Warriors", shortName: "WAR" },
      bowlingTeamId: 2,
      byes: 0,
      id: 101,
      inningsNumber: 1,
      isCompleted: false,
      legByes: 0,
      noBalls: 0,
      openingBowlerId: 21,
      openingNonStrikerId: 12,
      openingStrikerId: 11,
      others: 0,
      penaltyRuns: 0,
      status: "in_progress",
      targetRuns: null,
      totalScore: 1,
      updatedAt: new Date("2026-03-18T10:00:00.000Z"),
      wides: 0,
      wickets: 1,
    },
  ];
  const lineups: MatchLineupRow[] = [
    {
      battingOrder: 2,
      player: { id: 12, name: "A Two" },
      playerId: 12,
      teamId: 1,
    },
    {
      battingOrder: 1,
      player: { id: 11, name: "A One" },
      playerId: 11,
      teamId: 1,
    },
  ];
  const statsByInningsId: Record<number, PlayerInningsStatsRow[]> = {
    101: [
      {
        assistedBy: null,
        ballsBowled: 0,
        ballsFaced: 1,
        dismissedBy: { id: 21, name: "B One" },
        dismissalType: "bowled",
        dotBalls: 0,
        fours: 0,
        isDismissed: true,
        maidens: 0,
        noBalls: 0,
        player: { id: 11, name: "A One" },
        playerId: 11,
        runsConceded: 0,
        runsScored: 1,
        sixes: 0,
        teamId: 1,
        wides: 0,
        wicketsTaken: 0,
      },
      {
        assistedBy: null,
        ballsBowled: 1,
        ballsFaced: 0,
        dismissedBy: null,
        dismissalType: null,
        dotBalls: 0,
        fours: 0,
        isDismissed: false,
        maidens: 0,
        noBalls: 0,
        player: { id: 21, name: "B One" },
        playerId: 21,
        runsConceded: 1,
        runsScored: 0,
        sixes: 0,
        teamId: 2,
        wides: 0,
        wicketsTaken: 1,
      },
    ],
  };
  const summaryDeliveriesByInningsId: Record<number, SummaryDeliveryRow[]> = {
    101: [
      {
        ballInOver: 1,
        dismissedPlayer: { id: 11, name: "A One" },
        id: 501,
        isWicket: true,
        overNumber: 1,
        sequenceNo: 1,
        totalRuns: 1,
        wicketType: "bowled",
      },
    ],
  };
  const detailedDeliveriesByInningsId: Record<number, DetailedDeliveryRow[]> = {
    101: [
      {
        assistedBy: null,
        ballInOver: 1,
        batterRuns: 1,
        bowler: { id: 21, name: "B One" },
        bowlerId: 21,
        byeRuns: 0,
        dismissedBy: { id: 21, name: "B One" },
        dismissedPlayer: { id: 11, name: "A One" },
        id: 501,
        isLegalDelivery: true,
        isWicket: true,
        legByeRuns: 0,
        noBallRuns: 0,
        nonStriker: { id: 12, name: "A Two" },
        nonStrikerId: 12,
        overNumber: 1,
        penaltyRuns: 0,
        sequenceNo: 1,
        striker: { id: 11, name: "A One" },
        strikerId: 11,
        totalRuns: 1,
        wicketType: "bowled",
        wideRuns: 0,
      },
    ],
  };
  const latestDeliveryParticipantsByInningsId = {
    101: {
      bowlerId: 21,
      nonStrikerId: 12,
      strikerId: 11,
    },
  };

  return {
    detailedDeliveriesByInningsId,
    innings,
    lineups,
    latestDeliveryParticipantsByInningsId,
    match,
    statsByInningsId,
    summaryDeliveriesByInningsId,
  };
}

describe("scorecard.service", () => {
  beforeEach(() => {
    state.deliveriesCalls = [];
    state.detailedDeliveriesByInningsId = {};
    state.innings = [];
    state.lineups = [];
    state.latestDeliveryParticipantsByInningsId = {};
    state.latestDeliveryParticipantsCalls = [];
    state.match = null;
    state.statsByInningsId = {};
    state.summaryDeliveriesByInningsId = {};
    getMatchFormatRulesByMatchId.mockClear();
  });

  it("uses the lean delivery query when ball-by-ball data is excluded", async () => {
    Object.assign(state, createBaseState());

    const { getMatchScorecard } = await loadServiceModule();
    const result = await getMatchScorecard(42, {
      includeBallByBall: false,
    });

    expect(state.deliveriesCalls).toEqual([
      {
        inningsId: 101,
        with: {
          dismissedPlayer: true,
        },
      },
    ]);
    expect(state.latestDeliveryParticipantsCalls).toEqual([101]);
    expect(result?.innings[0]?.deliveries).toBeUndefined();
    expect(result?.innings[0]?.currentParticipants).toEqual({
      bowlerId: 21,
      nonStrikerId: 12,
      strikerId: 11,
    });
    expect(result?.innings[0]?.fallOfWickets).toEqual([
      {
        batter: { id: 11, name: "A One" },
        over: "1.1",
        score: 1,
        wicketNumber: 1,
        wicketType: "bowled",
      },
    ]);
  });

  it("loads the detailed delivery relations only when ball-by-ball data is requested", async () => {
    Object.assign(state, createBaseState());

    const { getMatchScorecard } = await loadServiceModule();
    const result = await getMatchScorecard(42, {
      includeBallByBall: true,
    });

    expect(state.deliveriesCalls).toEqual([
      {
        inningsId: 101,
        with: {
          assistedBy: true,
          bowler: true,
          dismissedBy: true,
          dismissedPlayer: true,
          nonStriker: true,
          striker: true,
        },
      },
    ]);
    expect(state.latestDeliveryParticipantsCalls).toEqual([101]);
    expect(result?.innings[0]?.deliveries?.[0]).toMatchObject({
      bowler: { id: 21, name: "B One" },
      striker: { id: 11, name: "A One" },
      totalRuns: 1,
    });
  });

  it("falls back to the opening players when a live innings has no deliveries yet", async () => {
    Object.assign(state, createBaseState());
    state.summaryDeliveriesByInningsId[101] = [];
    state.latestDeliveryParticipantsByInningsId[101] = null;

    const { getMatchScorecard } = await loadServiceModule();
    const result = await getMatchScorecard(42, {
      includeBallByBall: false,
    });

    expect(result?.innings[0]?.currentParticipants).toEqual({
      bowlerId: 21,
      nonStrikerId: 12,
      strikerId: 11,
    });
  });

  it("omits current participant highlights for completed innings", async () => {
    Object.assign(state, createBaseState());
    state.innings[0] = {
      ...state.innings[0],
      isCompleted: true,
      status: "completed",
    };

    const { getMatchScorecard } = await loadServiceModule();
    const result = await getMatchScorecard(42, {
      includeBallByBall: false,
    });

    expect(state.latestDeliveryParticipantsCalls).toEqual([]);
    expect(result?.innings[0]?.currentParticipants).toEqual({
      bowlerId: null,
      nonStrikerId: null,
      strikerId: null,
    });
  });
});
