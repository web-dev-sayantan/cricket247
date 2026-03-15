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

const state: {
  existingInnings: null | { id: number };
  failInningsInsert: boolean;
  isLiveUpdateCount: number;
  lineupRows: MatchLineupRow[];
  match: MatchRow | null;
  tossUpdateCount: number;
} = {
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
  tossUpdateCount: 0,
};

const dbMock = {
  query: {
    matches: {
      findFirst: () => Promise.resolve(state.match),
    },
    innings: {
      findFirst: () => Promise.resolve(state.existingInnings),
    },
    matchLineup: {
      findMany: () => Promise.resolve(state.lineupRows),
    },
  },
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
    state.existingInnings = null;
    state.failInningsInsert = false;
    state.isLiveUpdateCount = 0;
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
});
