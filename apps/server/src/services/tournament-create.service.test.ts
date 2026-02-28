import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  matchFormats,
  organizations,
  teams,
  tournamentStageGroups,
  tournamentStages,
  tournaments,
  tournamentTeams,
} from "@/db/schema";

const state = {
  insertedOrganization: null as Record<string, unknown> | null,
  insertedMatchFormat: null as Record<string, unknown> | null,
  insertedTeams: [] as Record<string, unknown>[],
  insertedTournament: null as Record<string, unknown> | null,
  insertedTournamentTeams: [] as Record<string, unknown>[],
  stageUpdates: [] as Record<string, unknown>[],
  groupUpdates: [] as Record<string, unknown>[],
  stageRows: [
    { id: 501, sequence: 1 },
    { id: 502, sequence: 2 },
  ] as Array<{ id: number; sequence: number }>,
  groupRows: [
    { id: 601, stageId: 501, sequence: 1 },
    { id: 602, stageId: 501, sequence: 2 },
  ] as Array<{ id: number; stageId: number; sequence: number }>,
};

let createdTeamId = 300;

const getSelectRows = (table: unknown) => {
  if (table === tournamentStages) {
    return state.stageRows;
  }
  if (table === tournamentStageGroups) {
    return state.groupRows;
  }

  return [];
};

const createWhereResult = (rows: unknown[]) => {
  const promise = Promise.resolve(rows);
  return Object.assign(promise, {
    limit: (count: number) => Promise.resolve(rows.slice(0, count)),
  });
};

const txMock = {
  insert: (table: unknown) => ({
    values: (payload: unknown) => {
      let rows: unknown[] = [];

      if (table === organizations) {
        state.insertedOrganization = payload as Record<string, unknown>;
        rows = [{ id: 101, ...(payload as Record<string, unknown>) }];
      }

      if (table === matchFormats) {
        state.insertedMatchFormat = payload as Record<string, unknown>;
        rows = [{ id: 201, ...(payload as Record<string, unknown>) }];
      }

      if (table === teams) {
        createdTeamId += 1;
        const team = {
          id: createdTeamId,
          ...(payload as Record<string, unknown>),
        };
        state.insertedTeams.push(team);
        rows = [team];
      }

      if (table === tournaments) {
        state.insertedTournament = payload as Record<string, unknown>;
        rows = [{ id: 401, ...(payload as Record<string, unknown>) }];
      }

      if (table === tournamentTeams) {
        state.insertedTournamentTeams = payload as Record<string, unknown>[];
        rows = payload as Record<string, unknown>[];
      }

      const promise = Promise.resolve(rows);
      return Object.assign(promise, {
        returning: () => Promise.resolve(rows),
      });
    },
  }),
  select: () => ({
    from: (table: unknown) => ({
      where: () => createWhereResult(getSelectRows(table)),
    }),
  }),
  update: (table: unknown) => ({
    set: (payload: Record<string, unknown>) => ({
      where: () => {
        if (table === tournamentStages) {
          state.stageUpdates.push(payload);
        }
        if (table === tournamentStageGroups) {
          state.groupUpdates.push(payload);
        }

        return Promise.resolve([]);
      },
    }),
  }),
  delete: () => ({
    where: () => Promise.resolve([]),
  }),
  query: {
    tournaments: {
      findFirst: () => Promise.resolve(null),
    },
  },
};

const dbMock = {
  transaction: async <T>(callback: (tx: typeof txMock) => Promise<T>) =>
    callback(txMock),
};

const seedTournamentTemplateMock = mock(() =>
  Promise.resolve({
    tournamentId: 401,
    template: "grouped_league_with_playoffs",
    teamCount: 3,
    stageCount: 2,
    groupCount: 2,
    advancementRuleCount: 4,
  })
);

mock.module("@/db", () => ({
  db: dbMock,
}));

mock.module("./tournament-template.service", () => ({
  seedTournamentTemplate: seedTournamentTemplateMock,
  SeedTournamentTemplateError: class SeedTournamentTemplateError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

const serviceModulePromise = import("./tournament-create.service");

describe("createTournamentFromScratch", () => {
  beforeEach(() => {
    state.insertedOrganization = null;
    state.insertedMatchFormat = null;
    state.insertedTeams = [];
    state.insertedTournament = null;
    state.insertedTournamentTeams = [];
    state.stageUpdates = [];
    state.groupUpdates = [];
    createdTeamId = 300;
    seedTournamentTemplateMock.mockClear();
  });

  it("rejects invalid date range", async () => {
    const { TournamentCreateServiceError, createTournamentFromScratch } =
      await serviceModulePromise;

    await expect(
      createTournamentFromScratch({
        name: "Winter Cup",
        season: "2026",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2026-03-10T00:00:00.000Z"),
        endDate: new Date("2026-03-01T00:00:00.000Z"),
        organization: {
          create: {
            name: "City Org",
            slug: "city-org",
          },
        },
        defaultMatchFormat: {
          create: {
            name: "T20",
          },
        },
        teams: {
          existingTeamIds: [10, 11],
          createTeams: [],
        },
        structure: {
          template: "straight_league",
          stageEdits: [],
          groupEdits: [],
        },
      })
    ).rejects.toBeInstanceOf(TournamentCreateServiceError);
  });

  it("rejects duplicate existing team ids", async () => {
    const { TournamentCreateServiceError, createTournamentFromScratch } =
      await serviceModulePromise;

    await expect(
      createTournamentFromScratch({
        name: "Spring Cup",
        season: "2026",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2026-03-01T00:00:00.000Z"),
        endDate: new Date("2026-03-05T00:00:00.000Z"),
        organization: {
          create: {
            name: "City Org",
            slug: "city-org",
          },
        },
        defaultMatchFormat: {
          create: {
            name: "T20",
          },
        },
        teams: {
          existingTeamIds: [10, 10],
          createTeams: [],
        },
        structure: {
          template: "straight_league",
          stageEdits: [],
          groupEdits: [],
        },
      })
    ).rejects.toBeInstanceOf(TournamentCreateServiceError);
  });

  it("creates tournament, teams, and applies stage/group edits", async () => {
    const { createTournamentFromScratch } = await serviceModulePromise;

    const result = await createTournamentFromScratch({
      name: "City Championship",
      season: "2026",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 100,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T00:00:00.000Z"),
      organization: {
        create: {
          name: "Metro Association",
          slug: "metro-association",
        },
      },
      defaultMatchFormat: {
        create: {
          name: "T20",
          noOfOvers: 20,
        },
      },
      teams: {
        existingTeamIds: [21, 22],
        createTeams: [
          {
            name: "Inline Team",
            shortName: "it",
            country: "India",
          },
        ],
      },
      structure: {
        template: "grouped_league_with_playoffs",
        groupCount: 2,
        advancingPerGroup: 2,
        stageEdits: [
          {
            sequence: 1,
            name: "Group Phase",
            code: "GROUP_PHASE",
          },
        ],
        groupEdits: [
          {
            stageSequence: 1,
            sequence: 2,
            name: "Group Blue",
            code: "BLUE",
            advancingSlots: 3,
          },
        ],
      },
    });

    expect(result.tournament.id).toBe(401);
    expect(state.insertedOrganization).toMatchObject({
      name: "Metro Association",
      slug: "metro-association",
    });
    expect(state.insertedMatchFormat).toMatchObject({
      name: "T20",
    });
    expect(state.insertedTeams[0]).toMatchObject({
      shortName: "IT",
    });
    expect(state.insertedTournamentTeams).toHaveLength(3);
    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(1);
    expect(state.stageUpdates).toHaveLength(1);
    expect(state.groupUpdates).toHaveLength(1);
    expect(state.groupUpdates[0]).toMatchObject({
      name: "Group Blue",
      code: "BLUE",
      advancingSlots: 3,
    });
  });
});
