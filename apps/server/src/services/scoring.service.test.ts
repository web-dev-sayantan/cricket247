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
