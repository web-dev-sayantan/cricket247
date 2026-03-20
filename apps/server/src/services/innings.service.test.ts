import { beforeEach, describe, expect, it, mock } from "bun:test";

interface TeamPlayer {
  id: number;
  tournamentId: number;
}

interface BattingTeam {
  id: number;
  teamPlayers: TeamPlayer[];
}

interface InningsDetailRow {
  battingTeam: BattingTeam | null;
  deliveries: { sequenceNo: number }[];
  id: number;
  matchId: number;
}

interface InningsSequenceRow {
  battingTeamId: number;
  bowlingTeamId: number;
  inningsNumber: number;
  isCompleted: boolean | null;
  totalScore: number;
}

interface MatchRow {
  id: number;
  inningsPerSide: number;
  matchFormat: {
    isFollowOnAllowed: boolean | null;
    noOfInnings: number | null;
  } | null;
  team1Id: number | null;
  team2Id: number | null;
}

interface InningsUpdateRow {
  id: number;
  status: string;
}

interface InningsInsertResult {
  lastInsertRowid: bigint | number;
}

interface InningsMockState {
  inningsDetailRow: InningsDetailRow | null;
  inningsSequenceRows: InningsSequenceRow[];
  insertResult: InningsInsertResult;
  matchRow: MatchRow | null;
  matchTournamentId: number | null;
  updateRows: InningsUpdateRow[];
}

const state: InningsMockState = {
  inningsDetailRow: null,
  inningsSequenceRows: [],
  insertResult: { lastInsertRowid: 0 },
  matchRow: {
    id: 5,
    inningsPerSide: 1,
    matchFormat: null,
    team1Id: 2,
    team2Id: 3,
  },
  matchTournamentId: null,
  updateRows: [],
};

const dbMock = {
  query: {
    innings: {
      findFirst: (): Promise<InningsDetailRow | null> => {
        return Promise.resolve(state.inningsDetailRow);
      },
      findMany: (): Promise<InningsSequenceRow[]> => {
        return Promise.resolve(state.inningsSequenceRows);
      },
    },
    matches: {
      findFirst: (): Promise<MatchRow | null> => {
        return Promise.resolve(state.matchRow);
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
    state.inningsDetailRow = null;
    state.inningsSequenceRows = [];
    state.matchRow = {
      id: 5,
      inningsPerSide: 1,
      matchFormat: null,
      team1Id: 2,
      team2Id: 3,
    };
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
    state.inningsDetailRow = {
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

  it("returns inserted row id for a valid second innings", async () => {
    state.insertResult = { lastInsertRowid: 77 };
    state.inningsSequenceRows = [
      {
        battingTeamId: 2,
        bowlingTeamId: 3,
        inningsNumber: 1,
        isCompleted: true,
        totalScore: 144,
      },
    ];

    const { createInningsAction } = await serviceModulePromise;
    const createdId = await createInningsAction({
      matchId: 5,
      battingTeamId: 3,
      bowlingTeamId: 2,
      inningsNumber: 2,
    });

    const normalizedCreatedId =
      typeof createdId === "bigint" ? Number(createdId) : createdId;

    expect(normalizedCreatedId).toBe(77);
  });

  it("rejects back-to-back batting when follow-on is not in play", async () => {
    state.inningsSequenceRows = [
      {
        battingTeamId: 2,
        bowlingTeamId: 3,
        inningsNumber: 1,
        isCompleted: true,
        totalScore: 260,
      },
    ];

    const { createInningsAction } = await serviceModulePromise;

    await expect(
      createInningsAction({
        matchId: 5,
        battingTeamId: 2,
        bowlingTeamId: 3,
        inningsNumber: 2,
      })
    ).rejects.toThrow(
      "Teams cannot bat in consecutive innings unless a follow-on is enforced"
    );
  });

  it("allows a third-innings follow-on when the second side trails by 200 or more", async () => {
    state.insertResult = { lastInsertRowid: 88 };
    state.matchRow = {
      id: 5,
      inningsPerSide: 2,
      matchFormat: {
        isFollowOnAllowed: true,
        noOfInnings: 4,
      },
      team1Id: 2,
      team2Id: 3,
    };
    state.inningsSequenceRows = [
      {
        battingTeamId: 2,
        bowlingTeamId: 3,
        inningsNumber: 1,
        isCompleted: true,
        totalScore: 410,
      },
      {
        battingTeamId: 3,
        bowlingTeamId: 2,
        inningsNumber: 2,
        isCompleted: true,
        totalScore: 190,
      },
    ];

    const { createInningsAction } = await serviceModulePromise;
    const createdId = await createInningsAction({
      matchId: 5,
      battingTeamId: 3,
      bowlingTeamId: 2,
      inningsNumber: 3,
    });

    const normalizedCreatedId =
      typeof createdId === "bigint" ? Number(createdId) : createdId;

    expect(normalizedCreatedId).toBe(88);
  });

  it("rejects a third-innings follow-on when the deficit is below 200", async () => {
    state.matchRow = {
      id: 5,
      inningsPerSide: 2,
      matchFormat: {
        isFollowOnAllowed: true,
        noOfInnings: 4,
      },
      team1Id: 2,
      team2Id: 3,
    };
    state.inningsSequenceRows = [
      {
        battingTeamId: 2,
        bowlingTeamId: 3,
        inningsNumber: 1,
        isCompleted: true,
        totalScore: 360,
      },
      {
        battingTeamId: 3,
        bowlingTeamId: 2,
        inningsNumber: 2,
        isCompleted: true,
        totalScore: 170,
      },
    ];

    const { createInningsAction } = await serviceModulePromise;

    await expect(
      createInningsAction({
        matchId: 5,
        battingTeamId: 3,
        bowlingTeamId: 2,
        inningsNumber: 3,
      })
    ).rejects.toThrow(
      "Teams cannot bat in consecutive innings unless a follow-on is enforced"
    );
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
