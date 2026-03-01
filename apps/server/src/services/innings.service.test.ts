import { beforeEach, describe, expect, it, mock } from "bun:test";

interface TeamPlayer {
  id: number;
  tournamentId: number;
}

interface BattingTeam {
  id: number;
  teamPlayers: TeamPlayer[];
}

interface InningsRow {
  battingTeam: BattingTeam | null;
  deliveries: { sequenceNo: number }[];
  id: number;
  matchId: number;
}

interface InningsUpdateRow {
  id: number;
  status: string;
}

interface InningsInsertResult {
  lastInsertRowid: bigint | number;
}

interface InningsMockState {
  inningsRow: InningsRow | null;
  insertResult: InningsInsertResult;
  matchTournamentId: number | null;
  updateRows: InningsUpdateRow[];
}

const state: InningsMockState = {
  inningsRow: null,
  matchTournamentId: null,
  insertResult: { lastInsertRowid: 0 },
  updateRows: [],
};

const dbMock = {
  query: {
    innings: {
      findFirst: (): Promise<InningsRow | null> => {
        return Promise.resolve(state.inningsRow);
      },
      findMany: (): Promise<InningsRow[]> => {
        if (!state.inningsRow) {
          return Promise.resolve([]);
        }
        return Promise.resolve([state.inningsRow]);
      },
    },
  },
  select: () => ({
    from: () => ({
      where: () => ({
        limit: (): Promise<{ tournamentId: number }[]> => {
          if (state.matchTournamentId === null) {
            return Promise.resolve([]);
          }
          return Promise.resolve([{ tournamentId: state.matchTournamentId }]);
        },
      }),
    }),
  }),
  insert: () => ({
    values: (): Promise<InningsInsertResult> => {
      return Promise.resolve(state.insertResult);
    },
  }),
  update: () => ({
    set: () => ({
      where: () => ({
        returning: (): Promise<InningsUpdateRow[]> => {
          return Promise.resolve(state.updateRows);
        },
      }),
    }),
  }),
};

mock.module("@/db", () => ({ db: dbMock }));

const serviceModulePromise = import("./innings.service");

describe("innings.service", () => {
  beforeEach(() => {
    state.inningsRow = null;
    state.matchTournamentId = null;
    state.insertResult = { lastInsertRowid: 0 };
    state.updateRows = [];
  });

  it("returns null when innings is missing", async () => {
    const { getInningsById } = await serviceModulePromise;
    const result = await getInningsById(100);

    expect(result).toBeNull();
  });

  it("filters batting team players by tournament id", async () => {
    state.matchTournamentId = 2026;
    state.inningsRow = {
      id: 21,
      matchId: 99,
      battingTeam: {
        id: 1,
        teamPlayers: [
          { id: 11, tournamentId: 2026 },
          { id: 12, tournamentId: 2025 },
        ],
      },
      deliveries: [],
    };

    const { getInningsById } = await serviceModulePromise;
    const result = await getInningsById(21);

    const battingTeamPlayers = result?.battingTeam?.teamPlayers.map(
      (teamPlayer) => ({
        id: teamPlayer.id,
        tournamentId: teamPlayer.tournamentId,
      })
    );

    expect(battingTeamPlayers).toEqual([{ id: 11, tournamentId: 2026 }]);
  });

  it("returns inserted row id for create action", async () => {
    state.insertResult = { lastInsertRowid: 77 };

    const { createInningsAction } = await serviceModulePromise;
    const createdId = await createInningsAction({
      matchId: 5,
      battingTeamId: 2,
      bowlingTeamId: 3,
    });

    const normalizedCreatedId =
      typeof createdId === "bigint" ? Number(createdId) : createdId;

    expect(normalizedCreatedId).toBe(77);
  });

  it("returns first updated row for update action", async () => {
    state.updateRows = [{ id: 4, status: "in_progress" }];

    const { updateInningsAction } = await serviceModulePromise;
    const updated = await updateInningsAction({
      id: 4,
      status: "in_progress",
    });

    expect(updated?.id).toBe(4);
    expect(updated?.status).toBe("in_progress");
  });
});
