import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MatchFormatRulesRow {
  ballsPerOver: number;
  followOnAllowed: boolean;
  formatLabel: string;
  matchFormatId: number | null;
  maxLegalBallsPerInnings: number | null;
  maxOversPerBowler: number | null;
  noOfInnings: number | null;
  noOfOvers: number | null;
}

interface MatchInsertPayload {
  ballsPerOverSnapshot: number;
  followOnAllowedSnapshot: boolean;
  format: string;
  inningsPerSide: number;
  matchFormatId: number | null;
  maxLegalBallsPerInningsSnapshot: number | null;
  maxOverPerBowler: number;
  maxOversPerBowlerSnapshot: number | null;
  oversPerSide: number;
}

interface MatchMockState {
  capturedPayload: MatchInsertPayload | null;
  resolvedFormat: MatchFormatRulesRow | null;
}

const state: MatchMockState = {
  capturedPayload: null,
  resolvedFormat: null,
};

const dbMock = {
  insert: () => ({
    values: (payload: MatchInsertPayload) => {
      state.capturedPayload = payload;
      return {
        rows: [{ id: 501 }],
      };
    },
  }),
};

mock.module("@/db", () => ({ db: dbMock }));
mock.module("@/services/match-format.service", () => ({
  resolveMatchFormatForCreation: () => Promise.resolve(state.resolvedFormat),
}));
mock.module("@/services/scorecard.service", () => ({
  getMatchScorecard: () => Promise.resolve(null),
}));
mock.module("@/utils", () => ({
  getCurrentDate: () => new Date("2026-03-20T10:00:00.000Z"),
}));

const serviceModulePromise = import("./match.service");

describe("match.service createMatchAction", () => {
  beforeEach(() => {
    state.capturedPayload = null;
    state.resolvedFormat = null;
  });

  it("maps a four-innings match format to two innings per side", async () => {
    state.resolvedFormat = {
      ballsPerOver: 6,
      followOnAllowed: true,
      formatLabel: "Test",
      matchFormatId: 9,
      maxLegalBallsPerInnings: null,
      maxOversPerBowler: null,
      noOfInnings: 4,
      noOfOvers: 90,
    };

    const { createMatchAction } = await serviceModulePromise;

    await createMatchAction({
      tournamentId: 1,
      tossWinnerId: 10,
      tossDecision: "bat",
      team1Id: 10,
      team2Id: 20,
      oversPerSide: 20,
      maxOverPerBowler: 4,
    });

    expect(state.capturedPayload?.inningsPerSide).toBe(2);
    expect(state.capturedPayload?.matchFormatId).toBe(9);
    expect(state.capturedPayload?.oversPerSide).toBe(90);
    expect(state.capturedPayload?.followOnAllowedSnapshot).toBe(true);
  });
});
