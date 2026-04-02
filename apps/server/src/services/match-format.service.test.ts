import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MatchFormatRow {
  ballsPerOver: number | null;
  id: number;
  isFollowOnAllowed: boolean | null;
  maxLegalBallsPerInnings: number | null;
  maxOversPerBowler: number | null;
  name: string;
  noOfInnings: number | null;
  noOfOvers: number | null;
}

interface MatchRow {
  ballsPerOverSnapshot: number | null;
  followOnAllowedSnapshot: boolean | null;
  format: string;
  id: number;
  inningsPerSide: number;
  matchFormatId: number | null;
  maxLegalBallsPerInningsSnapshot: number | null;
  maxOverPerBowler: number;
  maxOversPerBowlerSnapshot: number | null;
  oversPerSide: number;
  stageId: number | null;
  tournamentId: number;
}

interface MockState {
  formatRow: MatchFormatRow | null;
  matchRow: MatchRow | null;
  stageMatchFormatId: number | null;
  tournamentDefaultMatchFormatId: number | null;
}

const state: MockState = {
  stageMatchFormatId: null,
  tournamentDefaultMatchFormatId: null,
  formatRow: null,
  matchRow: null,
};

const dbMock = {
  query: {
    matches: {
      findFirst: (): Promise<MatchRow | null> => {
        return Promise.resolve(state.matchRow);
      },
    },
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
  select: () => ({
    from: () => ({
      where: () => ({
        limit: (): Promise<
          {
            defaultMatchFormatId: number | null;
            matchFormatId: number | null;
          }[]
        > => {
          return Promise.resolve([
            {
              defaultMatchFormatId: state.tournamentDefaultMatchFormatId,
              matchFormatId: state.stageMatchFormatId,
            },
          ]);
        },
      }),
    }),
  }),
};

mock.module("@/db", () => ({ db: dbMock }));

const serviceModulePromise = import("./match-format.service");

describe("match-format.service", () => {
  beforeEach(() => {
    state.stageMatchFormatId = null;
    state.tournamentDefaultMatchFormatId = null;
    state.formatRow = null;
    state.matchRow = null;
  });

  it("uses explicit match format and derives max balls from overs", async () => {
    state.formatRow = {
      id: 7,
      name: "T20",
      ballsPerOver: null,
      isFollowOnAllowed: false,
      noOfOvers: 20,
      noOfInnings: 2,
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
      followOnAllowed: false,
      noOfInnings: 2,
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
      isFollowOnAllowed: false,
      noOfOvers: 50,
      noOfInnings: 2,
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
    expect(result?.followOnAllowed).toBe(false);
    expect(result?.noOfInnings).toBe(2);
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

  it("prefers immutable match snapshots over live match format values", async () => {
    state.matchRow = {
      ballsPerOverSnapshot: 6,
      followOnAllowedSnapshot: false,
      format: "Test",
      id: 12,
      inningsPerSide: 2,
      matchFormatId: 7,
      maxLegalBallsPerInningsSnapshot: 540,
      maxOverPerBowler: 25,
      maxOversPerBowlerSnapshot: 25,
      oversPerSide: 90,
      stageId: null,
      tournamentId: 99,
    };
    state.formatRow = {
      id: 7,
      name: "Test",
      ballsPerOver: 6,
      isFollowOnAllowed: true,
      maxLegalBallsPerInnings: 300,
      maxOversPerBowler: 10,
      noOfInnings: 2,
      noOfOvers: 50,
    };

    const { getMatchFormatRulesByMatchId } = await serviceModulePromise;
    const result = await getMatchFormatRulesByMatchId(12);

    expect(result.followOnAllowed).toBe(false);
    expect(result.noOfInnings).toBe(4);
    expect(result.maxLegalBallsPerInnings).toBe(540);
  });
});
