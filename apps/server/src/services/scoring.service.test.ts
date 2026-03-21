import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MatchRow {
  id: number;
  playersPerSide: number;
  team1Id: number;
  team2Id: number;
}

interface MatchLineupRow {
  battingOrder: number | null;
  player: { id: number; name: string } | null;
  playerId: number;
  teamId: number;
}

interface DeliveryRow {
  assistedById: number | null;
  ballInOver: number;
  batterRuns: number;
  bowlerId: number;
  byeRuns: number;
  dismissedById: number | null;
  dismissedPlayerId: number | null;
  id: number;
  inningsId: number;
  isLegalDelivery: boolean;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStrikerId: number;
  overNumber: number;
  penaltyRuns: number;
  sequenceNo: number;
  strikerId: number;
  totalRuns: number;
  wicketType: string | null;
  wideRuns: number;
}

interface PlayerInningsStatsRow {
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

interface ScoringContextBaseRow {
  ballsBowled: number;
  ballsPerOverSnapshot: number | null;
  battingTeamId: number;
  bowlingTeamId: number;
  byes: number;
  format: string;
  hasBoundaryOut: boolean | null;
  hasBye: boolean;
  hasLBW: boolean | null;
  hasLegBye: boolean | null;
  hasNoBalls: boolean;
  hasPenaltyRuns: boolean | null;
  hasWides: boolean;
  inningsCompleted: boolean | null;
  inningsId: number;
  inningsNumber: number;
  legByes: number;
  matchCompleted: boolean | null;
  matchId: number;
  matchInningsPerSide: number;
  matchLive: boolean | null;
  matchMargin: string | null;
  matchPlayersPerSide: number;
  matchResult: string | null;
  matchTied: boolean | null;
  maxLegalBallsPerInningsSnapshot: number | null;
  maxOverPerBowler: number;
  maxOversPerBowlerSnapshot: number | null;
  noBalls: number;
  openingBowlerId: number | null;
  openingNonStrikerId: number | null;
  openingStrikerId: number | null;
  others: number;
  oversPerSide: number;
  penaltyRuns: number;
  status: string;
  targetRuns: number | null;
  team1Id: number;
  team2Id: number;
  tossDecision: string | null;
  tossWinnerId: number | null;
  totalScore: number;
  wickets: number;
  wides: number;
  winnerId: number | null;
}

function createDefaultScoringContextBaseRow(): ScoringContextBaseRow {
  return {
    ballsBowled: 1,
    ballsPerOverSnapshot: 6,
    battingTeamId: 10,
    bowlingTeamId: 20,
    byes: 0,
    format: "limited_overs",
    hasBoundaryOut: true,
    hasBye: true,
    hasLBW: true,
    hasLegBye: true,
    hasNoBalls: true,
    hasPenaltyRuns: true,
    hasWides: true,
    inningsCompleted: false,
    inningsId: 1,
    inningsNumber: 1,
    legByes: 0,
    matchCompleted: false,
    matchId: 1,
    matchInningsPerSide: 1,
    matchLive: true,
    matchMargin: null,
    matchPlayersPerSide: 2,
    matchResult: null,
    matchTied: false,
    maxLegalBallsPerInningsSnapshot: 12,
    maxOverPerBowler: 1,
    maxOversPerBowlerSnapshot: 1,
    noBalls: 0,
    openingBowlerId: 201,
    openingNonStrikerId: 102,
    openingStrikerId: 101,
    others: 0,
    oversPerSide: 2,
    penaltyRuns: 0,
    status: "in_progress",
    targetRuns: null,
    team1Id: 10,
    team2Id: 20,
    tossDecision: "bat",
    tossWinnerId: 10,
    totalScore: 1,
    wides: 0,
    wickets: 0,
    winnerId: null,
  };
}

function createDefaultDeliveryRow(): DeliveryRow {
  return {
    assistedById: null,
    ballInOver: 1,
    batterRuns: 1,
    bowlerId: 201,
    byeRuns: 0,
    dismissedById: null,
    dismissedPlayerId: null,
    id: 900,
    inningsId: 1,
    isLegalDelivery: true,
    isWicket: false,
    legByeRuns: 0,
    noBallRuns: 0,
    nonStrikerId: 102,
    overNumber: 1,
    penaltyRuns: 0,
    sequenceNo: 1,
    strikerId: 101,
    totalRuns: 1,
    wicketType: null,
    wideRuns: 0,
  };
}

function createPlayerInningsStatsRow(
  overrides: Partial<PlayerInningsStatsRow> = {}
): PlayerInningsStatsRow {
  return {
    assistedById: null,
    ballsBowled: 0,
    ballsFaced: 0,
    battingOrder: 1,
    catches: 0,
    dismissalType: null,
    dismissedById: null,
    dotBalls: 0,
    fours: 0,
    inningsId: 1,
    isDismissed: false,
    maidens: 0,
    matchId: 1,
    noBalls: 0,
    playerId: 201,
    runOuts: 0,
    runsConceded: 0,
    runsScored: 0,
    sixes: 0,
    stumpings: 0,
    teamId: 20,
    wicketsTaken: 0,
    wides: 0,
    ...overrides,
  };
}

const state: {
  deliveries: DeliveryRow[];
  existingInnings: null | { id: number };
  failInningsInsert: boolean;
  isLiveUpdateCount: number;
  lineupRows: MatchLineupRow[];
  match: MatchRow | null;
  playerInningsStatsRows: PlayerInningsStatsRow[];
  scoringContextBaseRow: null | ScoringContextBaseRow;
  tossUpdateCount: number;
} = {
  deliveries: [createDefaultDeliveryRow()],
  match: {
    id: 1,
    playersPerSide: 2,
    team1Id: 10,
    team2Id: 20,
  },
  existingInnings: null,
  lineupRows: [
    {
      teamId: 10,
      playerId: 101,
      battingOrder: 1,
      player: { id: 101, name: "A1" },
    },
    {
      teamId: 10,
      playerId: 102,
      battingOrder: 2,
      player: { id: 102, name: "A2" },
    },
    {
      teamId: 20,
      playerId: 201,
      battingOrder: 1,
      player: { id: 201, name: "B1" },
    },
    {
      teamId: 20,
      playerId: 202,
      battingOrder: 2,
      player: { id: 202, name: "B2" },
    },
  ],
  failInningsInsert: false,
  isLiveUpdateCount: 0,
  playerInningsStatsRows: [],
  scoringContextBaseRow: createDefaultScoringContextBaseRow(),
  tossUpdateCount: 0,
};

const dbMock = {
  delete: (_target: unknown) => ({
    where: (_clause: unknown) => Promise.resolve(),
  }),
  query: {
    matches: {
      findFirst: () => Promise.resolve(state.match),
    },
    innings: {
      findFirst: () => Promise.resolve(state.existingInnings),
    },
    deliveries: {
      findFirst: (args: {
        where: { id?: number; inningsId?: number };
        orderBy?: { sequenceNo: "asc" | "desc" };
      }) => {
        if (typeof args.where.id === "number") {
          return Promise.resolve(
            state.deliveries.find(
              (delivery) => delivery.id === args.where.id
            ) ?? null
          );
        }

        const filtered = state.deliveries
          .filter((delivery) => delivery.inningsId === args.where.inningsId)
          .sort((left, right) => right.sequenceNo - left.sequenceNo);

        return Promise.resolve(filtered[0] ?? null);
      },
      findMany: (args?: {
        where?: { inningsId?: number; overNumber?: number };
        orderBy?: { sequenceNo: "asc" | "desc" };
      }) => {
        const filtered = state.deliveries
          .filter((delivery) =>
            typeof args?.where?.inningsId === "number"
              ? delivery.inningsId === args.where.inningsId
              : true
          )
          .filter((delivery) =>
            typeof args?.where?.overNumber === "number"
              ? delivery.overNumber === args.where.overNumber
              : true
          )
          .sort((left, right) =>
            args?.orderBy?.sequenceNo === "desc"
              ? right.sequenceNo - left.sequenceNo
              : left.sequenceNo - right.sequenceNo
          );

        return Promise.resolve(filtered);
      },
    },
    matchLineup: {
      findMany: () => Promise.resolve(state.lineupRows),
    },
    playerInningsStats: {
      findMany: () => Promise.resolve(state.playerInningsStatsRows),
    },
  },
  select: (_fields: unknown) => ({
    from: (_table: unknown) => ({
      innerJoin: (_joinedTable: unknown, _on: unknown) => ({
        where: (_clause: unknown) => ({
          limit: (_count: number) =>
            Promise.resolve(
              state.scoringContextBaseRow ? [state.scoringContextBaseRow] : []
            ),
        }),
      }),
    }),
  }),
  transaction: (
    callback: (tx: {
      insert: (_target: unknown) => {
        values: (_values: unknown) => {
          returning: (_fields: unknown) => Promise<Array<{ id: number }>>;
        };
      };
      update: (_target: unknown) => {
        set: (values: {
          isLive?: boolean;
          tossDecision?: string;
          tossWinnerId?: number;
        }) => {
          where: (_clause: unknown) => Promise<void>;
        };
      };
    }) => Promise<unknown>
  ) => {
    let insertCount = 0;

    const tx = {
      update: (_target: unknown) => ({
        set: (values: {
          isLive?: boolean;
          tossDecision?: string;
          tossWinnerId?: number;
        }) => ({
          where: (_clause: unknown) => {
            if (typeof values.tossWinnerId === "number") {
              state.tossUpdateCount += 1;
            }
            if (values.isLive === true) {
              state.isLiveUpdateCount += 1;
            }

            return Promise.resolve();
          },
        }),
      }),
      insert: (_target: unknown) => ({
        values: (_values: unknown) => ({
          onConflictDoUpdate: (_config: unknown) => Promise.resolve(),
          returning: (_fields: unknown) => {
            insertCount += 1;
            if (insertCount === 1) {
              if (state.failInningsInsert) {
                return Promise.resolve([]);
              }

              return Promise.resolve([{ id: 501 }]);
            }

            return Promise.resolve([{ id: 601 }]);
          },
        }),
      }),
    };

    return callback(tx);
  },
  update: (_target: unknown) => ({
    set: (_values: unknown) => ({
      where: (_clause: unknown) => Promise.resolve(),
    }),
  }),
};

mock.module("@/db", () => ({
  db: dbMock,
}));

const scoringServiceModule = import("./scoring.service");

describe("scoring.service initializeMatchScoring", () => {
  beforeEach(() => {
    state.match = {
      id: 1,
      playersPerSide: 2,
      team1Id: 10,
      team2Id: 20,
    };
    state.deliveries = [createDefaultDeliveryRow()];
    state.existingInnings = null;
    state.failInningsInsert = false;
    state.isLiveUpdateCount = 0;
    state.playerInningsStatsRows = [];
    state.scoringContextBaseRow = createDefaultScoringContextBaseRow();
    state.tossUpdateCount = 0;
  });

  it("marks match live only after innings and opening delivery are created", async () => {
    const { initializeMatchScoring } = await scoringServiceModule;

    const result = await initializeMatchScoring({
      matchId: 1,
      tossWinnerId: 10,
      tossDecision: "bat",
      strikerId: 101,
      nonStrikerId: 102,
      openingBowlerId: 201,
    });

    expect(result.inningsId).toBe(501);
    expect(result.deliveryId).toBe(601);
    expect(state.tossUpdateCount).toBe(1);
    expect(state.isLiveUpdateCount).toBe(1);
  });

  it("does not mark match live when innings initialization fails", async () => {
    state.failInningsInsert = true;
    const { initializeMatchScoring } = await scoringServiceModule;

    await expect(
      initializeMatchScoring({
        matchId: 1,
        tossWinnerId: 10,
        tossDecision: "bat",
        strikerId: 101,
        nonStrikerId: 102,
        openingBowlerId: 201,
      })
    ).rejects.toThrow("Failed to create innings");

    expect(state.tossUpdateCount).toBe(1);
    expect(state.isLiveUpdateCount).toBe(0);
  });
});

describe("scoring.service replay helpers", () => {
  beforeEach(() => {
    state.deliveries = [createDefaultDeliveryRow()];
    state.failInningsInsert = false;
    state.lineupRows = [
      {
        teamId: 10,
        playerId: 101,
        battingOrder: 1,
        player: { id: 101, name: "A1" },
      },
      {
        teamId: 10,
        playerId: 102,
        battingOrder: 2,
        player: { id: 102, name: "A2" },
      },
      {
        teamId: 20,
        playerId: 201,
        battingOrder: 1,
        player: { id: 201, name: "B1" },
      },
      {
        teamId: 20,
        playerId: 202,
        battingOrder: 2,
        player: { id: 202, name: "B2" },
      },
    ];
    state.playerInningsStatsRows = [];
    state.scoringContextBaseRow = createDefaultScoringContextBaseRow();
  });

  it("derives append delivery write metadata from the current entry context", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.buildAppendDeliveryPosition({
        currentEntry: {
          ballInOver: 3,
          overNumber: 4,
        },
        deliveryCount: 14,
      })
    ).toEqual({
      ballInOver: 3,
      overNumber: 4,
      sequenceNo: 15,
    });
  });

  it("locks the second innings to the opposite teams from innings one", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.resolveNextInningsSetup({
        followOnApplied: false,
        inningsPerSide: 2,
        inningsRows: [
          {
            battingTeamId: 10,
            bowlingTeamId: 20,
            inningsNumber: 1,
            isCompleted: true,
            totalScore: 286,
          },
        ],
        team1Id: 10,
        team2Id: 20,
        tossDecision: "bat",
        tossWinnerId: 10,
      })
    ).toEqual({
      battingTeamId: 20,
      bowlingTeamId: 10,
      followOn: null,
      inningsNumber: 2,
    });
  });

  it("offers a follow-on choice for innings three when innings one leads by 200 or more", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.resolveNextInningsSetup({
        followOnApplied: false,
        inningsPerSide: 2,
        inningsRows: [
          {
            battingTeamId: 10,
            bowlingTeamId: 20,
            inningsNumber: 1,
            isCompleted: true,
            totalScore: 355,
          },
          {
            battingTeamId: 20,
            bowlingTeamId: 10,
            inningsNumber: 2,
            isCompleted: true,
            totalScore: 149,
          },
        ],
        team1Id: 10,
        team2Id: 20,
        tossDecision: "bat",
        tossWinnerId: 10,
      })
    ).toEqual({
      battingTeamId: 10,
      bowlingTeamId: 20,
      followOn: {
        battingTeamId: 20,
        bowlingTeamId: 10,
        isApplied: false,
      },
      inningsNumber: 3,
    });
  });

  it("treats extra wide runs beyond the automatic penalty as movement runs", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.getMovementRuns({
        batterRuns: 0,
        byeRuns: 0,
        legByeRuns: 0,
        noBallRuns: 0,
        wideRuns: 3,
      })
    ).toBe(2);
  });

  it("rejects invalid wide plus bat runs combinations", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(() =>
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          batterRuns: 2,
          wideRuns: 1,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toThrow("Wide runs must be recorded in the wide field only");
  });

  it("allows bye runs to be recorded alongside a wide", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          batterRuns: 0,
          byeRuns: 2,
          wideRuns: 1,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toMatchObject({
      batterRuns: 0,
      byeRuns: 2,
      isLegalDelivery: false,
      totalRuns: 3,
      wideRuns: 1,
    });
  });

  it("allows only run out dismissals on no-balls", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(() =>
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          noBallRuns: 1,
          dismissedPlayerId: 101,
          wicketType: "caught",
          assistedById: 202,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toThrow("Only run out can be recorded as a dismissal on a no-ball");

    expect(
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          noBallRuns: 1,
          dismissedPlayerId: 101,
          wicketType: "run out",
          assistedById: 202,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toMatchObject({
      isLegalDelivery: false,
      isWicket: true,
      wicketType: "run out",
      noBallRuns: 1,
    });
  });

  it("allows only real-world wide-ball dismissals", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(() =>
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          wideRuns: 1,
          dismissedPlayerId: 101,
          wicketType: "caught",
          assistedById: 202,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toThrow(
      "Only run out, stumped, hit wicket, and obstructing the field can be recorded on a wide"
    );

    for (const wicketType of [
      "run out",
      "stumped",
      "hit wicket",
      "obstructing the field",
    ] as const) {
      expect(
        scoringSessionInternals.validateDeliveryDraft({
          draft: {
            inningsId: 1,
            strikerId: 101,
            nonStrikerId: 102,
            bowlerId: 201,
            wideRuns: 1,
            dismissedPlayerId: 101,
            wicketType,
            assistedById:
              wicketType === "run out" || wicketType === "stumped" ? 202 : null,
          },
          hasBoundaryOut: true,
          hasBye: true,
          hasLBW: true,
          hasLegBye: true,
          hasNoBalls: true,
          hasPenaltyRuns: true,
          hasWides: true,
          strikerId: 101,
          nonStrikerId: 102,
          canDismissNonStriker: true,
        })
      ).toMatchObject({
        isLegalDelivery: false,
        isWicket: true,
        wicketType,
        wideRuns: 1,
      });
    }
  });

  it("disallows batter runs on dismissals except run out and obstructing the field", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(() =>
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          batterRuns: 2,
          dismissedPlayerId: 101,
          wicketType: "bowled",
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toThrow(
      "Batter runs must be zero unless the dismissal is run out or obstructing the field"
    );

    expect(
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          batterRuns: 2,
          dismissedPlayerId: 101,
          wicketType: "run out",
          assistedById: 202,
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toMatchObject({
      batterRuns: 2,
      wicketType: "run out",
      totalRuns: 2,
    });

    expect(
      scoringSessionInternals.validateDeliveryDraft({
        draft: {
          inningsId: 1,
          strikerId: 101,
          nonStrikerId: 102,
          bowlerId: 201,
          batterRuns: 2,
          dismissedPlayerId: 101,
          wicketType: "obstructing the field",
        },
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        strikerId: 101,
        nonStrikerId: 102,
        canDismissNonStriker: true,
      })
    ).toMatchObject({
      batterRuns: 2,
      wicketType: "obstructing the field",
      totalRuns: 2,
    });
  });

  it("derives the final innings chase target from aggregate scores", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.deriveTargetRunsForInnings({
        inningsPerSide: 2,
        inningsRows: [
          {
            battingTeamId: 10,
            isCompleted: true,
            totalScore: 280,
          },
          {
            battingTeamId: 20,
            isCompleted: true,
            totalScore: 240,
          },
          {
            battingTeamId: 10,
            isCompleted: true,
            totalScore: 150,
          },
        ],
        battingTeamId: 20,
        bowlingTeamId: 10,
      })
    ).toBe(191);
  });

  it("marks the match tied when all scheduled innings finish level", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.getMatchCompletionSnapshot({
        inningsPerSide: 1,
        inningsRows: [
          {
            id: 1,
            inningsNumber: 1,
            battingTeamId: 10,
            bowlingTeamId: 20,
            totalScore: 125,
            wickets: 8,
            isCompleted: true,
          },
          {
            id: 2,
            inningsNumber: 2,
            battingTeamId: 20,
            bowlingTeamId: 10,
            totalScore: 125,
            wickets: 6,
            isCompleted: true,
          },
        ],
        match: {
          id: 1,
          team1Id: 10,
          team2Id: 20,
        },
      })
    ).toEqual({
      isCompleted: true,
      isTied: true,
      margin: "Scores level",
      result: "Match tied",
      winnerId: null,
    });
  });

  it("rotates strike and requests a new bowler after an over-ending single", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.getEntryContext({
        battingPlayers: [
          { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
          { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
          { battingOrder: 3, id: 103, name: "A3", teamId: 10 },
        ],
        bowlingPlayers: [
          { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
          { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
        ],
        inningsRow: {
          battingTeamId: 10,
          bowlingTeamId: 20,
          id: 1,
          inningsNumber: 1,
          openingBowlerId: 201,
          openingNonStrikerId: 102,
          openingStrikerId: 101,
          targetRuns: null,
        },
        matchRules: {
          ballsPerOver: 6,
          maxOversPerBowler: 4,
        },
        playersPerSide: 3,
        timeline: [
          {
            ballInOver: 6,
            batterRuns: 1,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 1,
            wideRuns: 0,
          },
        ],
      })
    ).toMatchObject({
      entryContext: {
        ballInOver: 1,
        bowlerId: null,
        nonStrikerId: 102,
        overNumber: 2,
        strikerId: 101,
      },
      requiredSelections: {
        bowler: true,
      },
    });
  });

  it("marks a dismissed striker for replacement on the next entry context", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.getEntryContext({
        battingPlayers: [
          { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
          { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
          { battingOrder: 3, id: 103, name: "A3", teamId: 10 },
        ],
        bowlingPlayers: [
          { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
          { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
        ],
        inningsRow: {
          battingTeamId: 10,
          bowlingTeamId: 20,
          id: 1,
          inningsNumber: 1,
          openingBowlerId: 201,
          openingNonStrikerId: 102,
          openingStrikerId: 101,
          targetRuns: null,
        },
        matchRules: {
          ballsPerOver: 6,
          maxOversPerBowler: 4,
        },
        playersPerSide: 3,
        timeline: [
          {
            ballInOver: 2,
            batterRuns: 0,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: 101,
            isLegalDelivery: true,
            isWicket: true,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 3,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
        ],
      })
    ).toMatchObject({
      entryContext: {
        dismissedPlayerId: 101,
        nonStrikerId: 102,
        strikerId: null,
      },
      requiredSelections: {
        striker: true,
      },
    });
  });

  it("auto-completes an innings when the batting side is all out or reaches the target", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.shouldAutoCompleteInnings({
        ballsBowled: 48,
        matchRulesMaxLegalBallsPerInnings: 120,
        playersPerSide: 11,
        targetRuns: null,
        totalScore: 180,
        wickets: 10,
      })
    ).toBe(true);

    expect(
      scoringSessionInternals.shouldAutoCompleteInnings({
        ballsBowled: 36,
        matchRulesMaxLegalBallsPerInnings: 120,
        playersPerSide: 11,
        targetRuns: 151,
        totalScore: 151,
        wickets: 3,
      })
    ).toBe(true);
  });

  it("returns the specific auto-complete reason for innings-end scenarios", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.resolveAutoCompleteInningsReason({
        ballsBowled: 48,
        matchRulesMaxLegalBallsPerInnings: 120,
        playersPerSide: 11,
        targetRuns: null,
        totalScore: 180,
        wickets: 10,
      })
    ).toBe("all_out");

    expect(
      scoringSessionInternals.resolveAutoCompleteInningsReason({
        ballsBowled: 120,
        matchRulesMaxLegalBallsPerInnings: 120,
        playersPerSide: 11,
        targetRuns: null,
        totalScore: 180,
        wickets: 4,
      })
    ).toBe("max_balls");

    expect(
      scoringSessionInternals.resolveAutoCompleteInningsReason({
        ballsBowled: 36,
        matchRulesMaxLegalBallsPerInnings: 120,
        playersPerSide: 11,
        targetRuns: 151,
        totalScore: 151,
        wickets: 3,
      })
    ).toBe("target_reached");
  });

  it("builds compact rewrite mutation results for updated deliveries", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;
    const context = {
      availableBatters: [{ battingOrder: 3, id: 103, name: "A3", teamId: 10 }],
      availableBowlers: [{ battingOrder: 2, id: 202, name: "B2", teamId: 20 }],
      battingOrderByPlayer: new Map<number, number | null>([
        [101, 1],
        [102, 2],
        [103, 3],
      ]),
      battingPlayers: [
        { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
        { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
        { battingOrder: 3, id: 103, name: "A3", teamId: 10 },
      ],
      bowlerBallCounts: new Map<number, number>([[201, 1]]),
      bowlingPlayers: [
        { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
        { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
      ],
      deliveryCount: 1,
      dismissedSet: new Set<number>(),
      entryContext: {
        ballInOver: 2,
        battingTeamId: 10,
        bowlerId: 201,
        bowlingTeamId: 20,
        dismissedPlayerId: null,
        inningsId: 1,
        inningsNumber: 1,
        nonStrikerId: 101,
        overNumber: 1,
        strikerId: 102,
      },
      inningsRow: {
        ballsBowled: 1,
        battingTeamId: 10,
        bowlingTeamId: 20,
        byes: 0,
        id: 1,
        inningsNumber: 1,
        isCompleted: false,
        legByes: 0,
        matchId: 99,
        noBalls: 0,
        openingBowlerId: 201,
        openingNonStrikerId: 102,
        openingStrikerId: 101,
        others: 0,
        penaltyRuns: 0,
        status: "in_progress",
        targetRuns: null,
        totalScore: 3,
        wides: 0,
        wickets: 0,
      },
      lastDelivery: null,
      lineupRows: state.lineupRows,
      match: {
        ballsPerOverSnapshot: 6,
        format: "limited_overs",
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        id: 99,
        inningsPerSide: 1,
        isCompleted: false,
        isLive: true,
        isTied: false,
        margin: null,
        maxLegalBallsPerInningsSnapshot: 12,
        maxOverPerBowler: 1,
        maxOversPerBowlerSnapshot: 1,
        oversPerSide: 2,
        playersPerSide: 2,
        result: null,
        team1Id: 10,
        team2Id: 20,
        tossDecision: "bat",
        tossWinnerId: 10,
        winnerId: null,
      },
      matchRules: {
        ballsPerOver: 6,
        maxLegalBallsPerInnings: 12,
        maxOversPerBowler: 1,
      },
      requiredSelections: {
        battingTeam: false,
        bowlingTeam: false,
        bowler: false,
        nonStriker: false,
        striker: false,
      },
      statsByPlayer: new Map(),
    } as Parameters<
      typeof scoringSessionInternals.buildRewriteScoringMutationResult
    >[0]["context"];

    const result = scoringSessionInternals.buildRewriteScoringMutationResult({
      action: "update",
      context,
      delivery: {
        assistedById: null,
        ballInOver: 1,
        batterRuns: 3,
        bowlerId: 201,
        byeRuns: 0,
        dismissedById: null,
        dismissedPlayerId: null,
        id: 900,
        inningsId: 1,
        isLegalDelivery: true,
        isWicket: false,
        legByeRuns: 0,
        noBallRuns: 0,
        nonStrikerId: 102,
        overNumber: 1,
        penaltyRuns: 0,
        sequenceNo: 1,
        strikerId: 101,
        totalRuns: 3,
        wicketType: null,
        wideRuns: 0,
      },
    });

    expect(result).toMatchObject({
      action: "update",
      affectedInnings: {
        ballsBowled: 1,
        id: 1,
        totalScore: 3,
        wickets: 0,
      },
      currentInnings: {
        id: 1,
        totalScore: 3,
      },
      delivery: {
        batterRuns: 3,
        id: 900,
        totalRuns: 3,
      },
      entryContext: {
        ballInOver: 2,
        overNumber: 1,
        strikerId: 102,
      },
      nextInningsDefaults: null,
      phase: "scoring",
      requiredSelections: {
        bowler: false,
        striker: false,
      },
    });
  });

  it("builds compact rewrite mutation results for deleted deliveries", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;
    const context = {
      availableBatters: [
        { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
        { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
      ],
      availableBowlers: [
        { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
        { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
      ],
      battingOrderByPlayer: new Map<number, number | null>([
        [101, 1],
        [102, 2],
      ]),
      battingPlayers: [
        { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
        { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
      ],
      bowlerBallCounts: new Map<number, number>(),
      bowlingPlayers: [
        { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
        { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
      ],
      deliveryCount: 0,
      dismissedSet: new Set<number>(),
      entryContext: {
        ballInOver: 1,
        battingTeamId: 10,
        bowlerId: 201,
        bowlingTeamId: 20,
        dismissedPlayerId: null,
        inningsId: 1,
        inningsNumber: 1,
        nonStrikerId: 102,
        overNumber: 1,
        strikerId: 101,
      },
      inningsRow: {
        ballsBowled: 0,
        battingTeamId: 10,
        bowlingTeamId: 20,
        byes: 0,
        id: 1,
        inningsNumber: 1,
        isCompleted: false,
        legByes: 0,
        matchId: 99,
        noBalls: 0,
        openingBowlerId: 201,
        openingNonStrikerId: 102,
        openingStrikerId: 101,
        others: 0,
        penaltyRuns: 0,
        status: "not_started",
        targetRuns: null,
        totalScore: 0,
        wides: 0,
        wickets: 0,
      },
      lastDelivery: null,
      lineupRows: state.lineupRows,
      match: {
        ballsPerOverSnapshot: 6,
        format: "limited_overs",
        hasBoundaryOut: true,
        hasBye: true,
        hasLBW: true,
        hasLegBye: true,
        hasNoBalls: true,
        hasPenaltyRuns: true,
        hasWides: true,
        id: 99,
        inningsPerSide: 1,
        isCompleted: false,
        isLive: true,
        isTied: false,
        margin: null,
        maxLegalBallsPerInningsSnapshot: 12,
        maxOverPerBowler: 1,
        maxOversPerBowlerSnapshot: 1,
        oversPerSide: 2,
        playersPerSide: 2,
        result: null,
        team1Id: 10,
        team2Id: 20,
        tossDecision: "bat",
        tossWinnerId: 10,
        winnerId: null,
      },
      matchRules: {
        ballsPerOver: 6,
        maxLegalBallsPerInnings: 12,
        maxOversPerBowler: 1,
      },
      requiredSelections: {
        battingTeam: false,
        bowlingTeam: false,
        bowler: false,
        nonStriker: false,
        striker: false,
      },
      statsByPlayer: new Map(),
    } as Parameters<
      typeof scoringSessionInternals.buildRewriteScoringMutationResult
    >[0]["context"];

    const result = scoringSessionInternals.buildRewriteScoringMutationResult({
      action: "delete",
      context,
      deletedDeliveryId: 900,
    });

    expect(result).toMatchObject({
      action: "delete",
      currentInnings: {
        ballsBowled: 0,
        id: 1,
        totalScore: 0,
      },
      deletedDeliveryId: 900,
      delivery: null,
      entryContext: {
        ballInOver: 1,
        bowlerId: 201,
        nonStrikerId: 102,
        overNumber: 1,
        strikerId: 101,
      },
    });
  });

  it("rejects update and delete when the innings is already completed", async () => {
    const { deleteScoringDelivery, updateScoringDelivery } =
      await scoringServiceModule;

    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      inningsCompleted: true,
    };

    await expect(
      updateScoringDelivery({
        bowlerId: 201,
        deliveryId: 900,
        inningsId: 1,
        nonStrikerId: 102,
        strikerId: 101,
      })
    ).rejects.toThrow("Completed innings cannot be edited");

    await expect(deleteScoringDelivery(900)).rejects.toThrow(
      "Completed innings cannot be edited"
    );
  });

  it("rejects recording a new delivery while innings-end confirmation is pending", async () => {
    const { recordScoringDelivery } = await scoringServiceModule;

    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      status: "awaiting_close_confirmation",
    };

    await expect(
      recordScoringDelivery({
        bowlerId: 201,
        inningsId: 1,
        nonStrikerId: 102,
        strikerId: 101,
      })
    ).rejects.toThrow(
      "Review the last ball or confirm the innings end before recording another delivery"
    );
  });

  it("rejects selecting a bowler who participated in the previous over", async () => {
    const { recordScoringDelivery } = await scoringServiceModule;

    state.deliveries = [
      {
        ...createDefaultDeliveryRow(),
        ballInOver: 6,
        overNumber: 1,
        sequenceNo: 6,
      },
    ];
    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      ballsBowled: 6,
      totalScore: 1,
    };

    await expect(
      recordScoringDelivery({
        bowlerId: 201,
        inningsId: 1,
        nonStrikerId: 102,
        strikerId: 101,
      })
    ).rejects.toThrow(
      "A bowler who bowled in the previous over cannot bowl the next over"
    );
  });

  it("keeps every bowler from a split over unavailable for the next over", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.getEntryContext({
        battingPlayers: [
          { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
          { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
          { battingOrder: 3, id: 103, name: "A3", teamId: 10 },
        ],
        bowlingPlayers: [
          { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
          { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
          { battingOrder: 3, id: 203, name: "B3", teamId: 20 },
        ],
        inningsRow: {
          battingTeamId: 10,
          bowlingTeamId: 20,
          id: 1,
          inningsNumber: 1,
          openingBowlerId: 201,
          openingNonStrikerId: 102,
          openingStrikerId: 101,
          targetRuns: null,
        },
        matchRules: {
          ballsPerOver: 6,
          maxOversPerBowler: 4,
        },
        playersPerSide: 3,
        timeline: [
          {
            ballInOver: 1,
            batterRuns: 0,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
          {
            ballInOver: 2,
            batterRuns: 0,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
          {
            ballInOver: 3,
            batterRuns: 0,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
          {
            ballInOver: 4,
            batterRuns: 0,
            bowlerId: 202,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
          {
            ballInOver: 5,
            batterRuns: 0,
            bowlerId: 202,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 0,
            wideRuns: 0,
          },
          {
            ballInOver: 6,
            batterRuns: 1,
            bowlerId: 202,
            byeRuns: 0,
            dismissedPlayerId: null,
            isLegalDelivery: true,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 1,
            wideRuns: 0,
          },
        ],
      })
    ).toMatchObject({
      availableBowlers: [{ id: 203 }],
      entryContext: {
        ballInOver: 1,
        bowlerId: null,
        overNumber: 2,
      },
      requiredSelections: {
        bowler: true,
      },
    });
  });

  it("allows a replacement bowler to complete the same over", async () => {
    const { recordScoringDelivery } = await scoringServiceModule;

    state.deliveries = [
      {
        ...createDefaultDeliveryRow(),
        ballInOver: 3,
        overNumber: 1,
        sequenceNo: 3,
      },
    ];
    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      ballsBowled: 3,
      totalScore: 1,
    };

    const result = await recordScoringDelivery({
      bowlerId: 202,
      inningsId: 1,
      nonStrikerId: 102,
      strikerId: 101,
    });

    expect(result.delivery).toMatchObject({
      ballInOver: 4,
      bowlerId: 202,
      overNumber: 1,
    });
    expect(result.entryContext).toMatchObject({
      ballInOver: 5,
      bowlerId: 202,
      overNumber: 1,
    });
  });

  it("rejects starting a new over when the bowler only has 3.1 overs remaining", async () => {
    const { recordScoringDelivery } = await scoringServiceModule;

    state.deliveries = [
      {
        ...createDefaultDeliveryRow(),
        ballInOver: 6,
        overNumber: 1,
        sequenceNo: 6,
      },
    ];
    state.lineupRows = [
      ...state.lineupRows,
      {
        teamId: 20,
        playerId: 203,
        battingOrder: 3,
        player: { id: 203, name: "B3" },
      },
    ];
    state.playerInningsStatsRows = [
      createPlayerInningsStatsRow({
        ballsBowled: 19,
        battingOrder: 2,
        playerId: 202,
      }),
      createPlayerInningsStatsRow({
        ballsBowled: 0,
        battingOrder: 3,
        playerId: 203,
      }),
    ];
    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      ballsBowled: 6,
      matchPlayersPerSide: 3,
      totalScore: 1,
    };

    await expect(
      recordScoringDelivery({
        bowlerId: 202,
        inningsId: 1,
        nonStrikerId: 102,
        strikerId: 101,
      })
    ).rejects.toThrow(
      "Bowler does not have enough quota left to complete this over"
    );
  });

  it("uses the match-format ball limit before advancing to the next over", async () => {
    const { recordScoringDelivery } = await scoringServiceModule;

    state.deliveries = [
      {
        ...createDefaultDeliveryRow(),
        ballInOver: 7,
        overNumber: 1,
        sequenceNo: 7,
      },
    ];
    state.scoringContextBaseRow = {
      ...createDefaultScoringContextBaseRow(),
      ballsBowled: 7,
      ballsPerOverSnapshot: 8,
      maxLegalBallsPerInningsSnapshot: 16,
      totalScore: 1,
    };

    const result = await recordScoringDelivery({
      bowlerId: 201,
      inningsId: 1,
      nonStrikerId: 102,
      strikerId: 101,
    });

    expect(result.delivery).toMatchObject({
      ballInOver: 8,
      overNumber: 1,
    });
    expect(result.entryContext).toMatchObject({
      ballInOver: 1,
      bowlerId: null,
      overNumber: 2,
    });
    expect(result.requiredSelections).toMatchObject({
      bowler: true,
    });
  });

  it("applies incremental delivery stats updates for wickets, assists, and maiden overs", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;
    const statsByPlayer = new Map<
      number,
      {
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
    >();

    scoringSessionInternals.applyDeliveryToStats({
      battingOrderByPlayer: new Map([
        [101, 1],
        [102, 2],
      ]),
      ballsPerOver: 6,
      delivery: {
        assistedById: 202,
        ballInOver: 6,
        batterRuns: 0,
        bowlerId: 201,
        byeRuns: 0,
        dismissedById: 201,
        dismissedPlayerId: 101,
        id: 91,
        inningsId: 1,
        isLegalDelivery: true,
        isWicket: true,
        legByeRuns: 0,
        noBallRuns: 0,
        nonStrikerId: 102,
        overNumber: 1,
        penaltyRuns: 0,
        sequenceNo: 6,
        strikerId: 101,
        totalRuns: 0,
        wicketType: "caught",
        wideRuns: 0,
      },
      inningsRow: {
        battingTeamId: 10,
        bowlingTeamId: 20,
        id: 1,
        matchId: 55,
      },
      overRunsBeforeDelivery: 0,
      statsByPlayer,
    });

    expect(statsByPlayer.get(101)).toMatchObject({
      ballsFaced: 1,
      dismissalType: "caught",
      isDismissed: true,
      runsScored: 0,
    });
    expect(statsByPlayer.get(201)).toMatchObject({
      ballsBowled: 1,
      dotBalls: 1,
      maidens: 1,
      wicketsTaken: 1,
    });
    expect(statsByPlayer.get(202)).toMatchObject({
      catches: 1,
    });
  });

  it("derives entry context from scorer state with timeline-aware bowler restrictions", async () => {
    const { scoringSessionInternals } = await scoringServiceModule;

    expect(
      scoringSessionInternals.buildEntryContextFromState({
        battingPlayers: [
          { battingOrder: 1, id: 101, name: "A1", teamId: 10 },
          { battingOrder: 2, id: 102, name: "A2", teamId: 10 },
          { battingOrder: 3, id: 103, name: "A3", teamId: 10 },
        ],
        bowlerBallCounts: new Map<number, number>([
          [201, 6],
          [202, 0],
        ]),
        bowlingPlayers: [
          { battingOrder: 1, id: 201, name: "B1", teamId: 20 },
          { battingOrder: 2, id: 202, name: "B2", teamId: 20 },
        ],
        dismissedSet: new Set<number>([101]),
        inningsRow: {
          battingTeamId: 10,
          bowlingTeamId: 20,
          id: 1,
          inningsNumber: 1,
          openingBowlerId: 201,
          openingNonStrikerId: 102,
          openingStrikerId: 101,
          targetRuns: null,
        },
        timeline: [
          {
            ballInOver: 6,
            batterRuns: 1,
            bowlerId: 201,
            byeRuns: 0,
            dismissedPlayerId: 101,
            isLegalDelivery: true,
            isWicket: true,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 102,
            overNumber: 1,
            strikerId: 101,
            totalRuns: 1,
            wideRuns: 0,
          },
        ],
        lastDelivery: {
          ballInOver: 6,
          batterRuns: 1,
          bowlerId: 201,
          byeRuns: 0,
          dismissedPlayerId: 101,
          isLegalDelivery: true,
          isWicket: true,
          legByeRuns: 0,
          noBallRuns: 0,
          nonStrikerId: 102,
          overNumber: 1,
          strikerId: 101,
          totalRuns: 1,
          wideRuns: 0,
        },
        matchRules: {
          ballsPerOver: 6,
          maxOversPerBowler: 1,
        },
      })
    ).toMatchObject({
      availableBatters: [{ id: 103 }],
      availableBowlers: [{ id: 202 }],
      entryContext: {
        ballInOver: 1,
        bowlerId: null,
        dismissedPlayerId: 101,
        nonStrikerId: 102,
        overNumber: 2,
        strikerId: null,
      },
      requiredSelections: {
        bowler: true,
        striker: true,
      },
    });
  });
});
