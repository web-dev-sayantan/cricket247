import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MatchFormatRow {
  ballsPerOver: number | null;
  id: number;
  maxLegalBallsPerInnings: number | null;
  maxOversPerBowler: number | null;
  name: string;
  noOfOvers: number | null;
}

interface MockState {
  formatRow: MatchFormatRow | null;
  stageMatchFormatId: number | null;
  tournamentDefaultMatchFormatId: number | null;
}

const state: MockState = {
  stageMatchFormatId: null,
  tournamentDefaultMatchFormatId: null,
  formatRow: null,
};

const dbMock = {
  query: {
    tournamentStages: {
      findFirst: (): Promise<{ matchFormatId: number | null } | null> => {
        if (state.stageMatchFormatId === null) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ matchFormatId: state.stageMatchFormatId });
      },
    },
    tournaments: {
      findFirst: (): Promise<{
        defaultMatchFormatId: number | null;
      } | null> => {
        if (state.tournamentDefaultMatchFormatId === null) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          defaultMatchFormatId: state.tournamentDefaultMatchFormatId,
        });
      },
    },
    matchFormats: {
      findFirst: (): Promise<MatchFormatRow | null> => {
        return Promise.resolve(state.formatRow);
      },
    },
  },
};

mock.module("@/db", () => ({ db: dbMock }));

const serviceModulePromise = import("./match-format.service");

describe("match-format.service", () => {
  beforeEach(() => {
    state.stageMatchFormatId = null;
    state.tournamentDefaultMatchFormatId = null;
    state.formatRow = null;
  });

  it("uses explicit match format and derives max balls from overs", async () => {
    state.formatRow = {
      id: 7,
      name: "T20",
      ballsPerOver: null,
      noOfOvers: 20,
      maxOversPerBowler: 4,
      maxLegalBallsPerInnings: null,
    };

    const { resolveMatchFormatForCreation } = await serviceModulePromise;
    const result = await resolveMatchFormatForCreation({
      tournamentId: 100,
      matchFormatId: 7,
    });

    expect(result).toEqual({
      matchFormatId: 7,
      formatLabel: "T20",
      ballsPerOver: 6,
      noOfOvers: 20,
      maxOversPerBowler: 4,
      maxLegalBallsPerInnings: 120,
    });
  });

  it("falls back to tournament default format when stage has no format", async () => {
    state.stageMatchFormatId = null;
    state.tournamentDefaultMatchFormatId = 5;
    state.formatRow = {
      id: 5,
      name: "ODI",
      ballsPerOver: 6,
      noOfOvers: 50,
      maxOversPerBowler: 10,
      maxLegalBallsPerInnings: 300,
    };

    const { resolveMatchFormatForCreation } = await serviceModulePromise;
    const result = await resolveMatchFormatForCreation({
      tournamentId: 42,
      stageId: 4,
    });

    expect(result?.matchFormatId).toBe(5);
    expect(result?.formatLabel).toBe("ODI");
    expect(result?.maxLegalBallsPerInnings).toBe(300);
  });

  it("returns null when format cannot be resolved", async () => {
    const { resolveMatchFormatForCreation } = await serviceModulePromise;
    const result = await resolveMatchFormatForCreation({
      tournamentId: 11,
      stageId: 2,
    });

    expect(result).toBeNull();
  });
});
