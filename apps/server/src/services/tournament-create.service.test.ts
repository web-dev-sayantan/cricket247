import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  fixtureVersions,
  matches,
  matchFormats,
  organizations,
  teamPlayers,
  teams,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournaments,
  tournamentTeams,
} from "@/db/schema";

const state = {
  fixtureVersionRows: [] as Array<{ id: number }>,
  groupRows: [
    { advancingSlots: 0, id: 601, sequence: 1, stageId: 501 },
    { advancingSlots: 0, id: 602, sequence: 2, stageId: 501 },
  ] as Array<{
    advancingSlots: number;
    id: number;
    sequence: number;
    stageId: number;
  }>,
  insertedMatchFormat: null as null | Record<string, unknown>,
  insertedOrganization: null as null | Record<string, unknown>,
  insertedTeams: [] as Record<string, unknown>[],
  insertedTournament: null as null | Record<string, unknown>,
  insertedTournamentTeams: [] as Record<string, unknown>[],
  matchRows: [] as Array<{ id: number }>,
  matchFormatRows: [{ id: 801, name: "Existing T20" }] as Array<{
    id: number;
    name: string;
  }>,
  organizationRows: [{ id: 701, name: "Existing Org" }] as Array<{
    id: number;
    name: string;
  }>,
  stageAdvancementRows: [] as Array<{
    fromStageGroupId: null | number;
    id: number;
  }>,
  stageRows: [
    {
      format: "single_round_robin",
      id: 501,
      sequence: 1,
      stageType: "league",
    },
  ] as Array<{
    format: string;
    id: number;
    sequence: number;
    stageType: string;
  }>,
  stageUpdates: [] as Record<string, unknown>[],
  teamPlayerRows: [] as Array<{ id: number }>,
  tournamentRows: [
    {
      id: 401,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      type: "league",
    },
  ] as Array<{
    id: number;
    startDate: Date;
    type: string;
  }>,
  tournamentTeamRows: [
    { id: 1, teamId: 21, tournamentId: 401 },
    { id: 2, teamId: 22, tournamentId: 401 },
  ] as Array<{
    id: number;
    teamId: number;
    tournamentId: number;
  }>,
  tournamentUpdates: [] as Record<string, unknown>[],
  groupUpdates: [] as Record<string, unknown>[],
  deletedTournamentTeamsCount: 0,
};

let createdTeamId = 300;

const getSelectRows = (table: unknown) => {
  if (table === organizations) {
    return state.organizationRows;
  }
  if (table === matchFormats) {
    return state.matchFormatRows;
  }
  if (table === tournamentStages) {
    return state.stageRows;
  }
  if (table === tournamentStageGroups) {
    return state.groupRows;
  }
  if (table === tournamentStageAdvancements) {
    return state.stageAdvancementRows;
  }
  if (table === tournaments) {
    return state.tournamentRows;
  }
  if (table === tournamentTeams) {
    return state.tournamentTeamRows;
  }
  if (table === teamPlayers) {
    return state.teamPlayerRows;
  }
  if (table === matches) {
    return state.matchRows;
  }
  if (table === fixtureVersions) {
    return state.fixtureVersionRows;
  }

  return [];
};

const createSelectChain = <T>(rows: T[]) => {
  const chain = Promise.resolve(rows) as Promise<T[]> & {
    limit: (count: number) => Promise<T[]>;
    orderBy: (..._args: unknown[]) => typeof chain;
    where: (..._args: unknown[]) => typeof chain;
  };
  chain.where = () => chain;
  chain.orderBy = () => chain;
  chain.limit = (count) => Promise.resolve(rows.slice(0, count));

  return chain;
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
        const payloadRows = payload as Record<string, unknown>[];
        state.insertedTournamentTeams = payloadRows;
        rows = payloadRows;
      }

      if (table === tournamentStages || table === tournamentStageGroups) {
        rows = [];
      }

      const promise = Promise.resolve(rows);
      return Object.assign(promise, {
        returning: () => Promise.resolve(rows),
      });
    },
  }),
  select: () => ({
    from: (table: unknown) => createSelectChain(getSelectRows(table)),
  }),
  update: (table: unknown) => ({
    set: (payload: Record<string, unknown>) => ({
      where: () => {
        let rows: unknown[] = [];

        if (table === tournamentStages) {
          state.stageUpdates.push(payload);
        }
        if (table === tournamentStageGroups) {
          state.groupUpdates.push(payload);
        }
        if (table === tournaments) {
          state.tournamentUpdates.push(payload);
          rows = [
            {
              id: 401,
              ...payload,
            },
          ];
        }

        const chain = Promise.resolve(rows) as Promise<unknown[]> & {
          returning: () => Promise<unknown[]>;
        };
        chain.returning = () => Promise.resolve(rows);

        return chain;
      },
    }),
  }),
  delete: (table: unknown) => ({
    where: () => {
      if (table === tournamentTeams) {
        state.deletedTournamentTeamsCount += 1;
      }
      return Promise.resolve([]);
    },
  }),
};

const dbMock = {
  transaction: async <T>(callback: (tx: typeof txMock) => Promise<T>) =>
    callback(txMock),
};

const seedTournamentTemplateMock = mock((_input: unknown, _options?: unknown) =>
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

describe("tournament create/update from scratch service", () => {
  beforeEach(() => {
    state.insertedOrganization = null;
    state.insertedMatchFormat = null;
    state.insertedTeams = [];
    state.insertedTournament = null;
    state.insertedTournamentTeams = [];
    state.stageUpdates = [];
    state.groupUpdates = [];
    state.tournamentUpdates = [];
    state.deletedTournamentTeamsCount = 0;
    state.matchRows = [];
    state.fixtureVersionRows = [];
    state.teamPlayerRows = [];
    state.organizationRows = [{ id: 701, name: "Existing Org" }];
    state.matchFormatRows = [{ id: 801, name: "Existing T20" }];
    state.tournamentRows = [
      {
        id: 401,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        type: "league",
      },
    ];
    state.tournamentTeamRows = [
      { id: 1, teamId: 21, tournamentId: 401 },
      { id: 2, teamId: 22, tournamentId: 401 },
    ];
    state.stageRows = [
      {
        format: "single_round_robin",
        id: 501,
        sequence: 1,
        stageType: "league",
      },
    ];
    state.groupRows = [];
    state.stageAdvancementRows = [];
    createdTeamId = 300;
    seedTournamentTemplateMock.mockClear();
  });

  it("creates tournament, teams, and applies stage/group edits", async () => {
    state.stageRows = [
      {
        format: "single_round_robin",
        id: 501,
        sequence: 1,
        stageType: "league",
      },
      {
        format: "single_elimination",
        id: 502,
        sequence: 2,
        stageType: "knockout",
      },
    ];
    state.groupRows = [
      { advancingSlots: 2, id: 601, sequence: 1, stageId: 501 },
      { advancingSlots: 2, id: 602, sequence: 2, stageId: 501 },
    ];

    const { createTournamentFromScratch } = await serviceModulePromise;

    const result = await createTournamentFromScratch({
      name: "City Championship",
      season: "2026",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 100,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T00:00:00.000Z"),
      timeZone: "Asia/Kolkata",
      championTeamId: null,
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
    expect(state.insertedTournament).toMatchObject({
      timeZone: "Asia/Kolkata",
      championTeamId: null,
    });
    expect(state.insertedTeams[0]).toMatchObject({
      shortName: "IT",
    });
    expect(state.insertedTournamentTeams).toHaveLength(3);
    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(1);
    expect(state.stageUpdates).toHaveLength(1);
    expect(state.groupUpdates).toHaveLength(1);
  });

  it("passes single-group grouped template configuration through to seeding", async () => {
    const { createTournamentFromScratch } = await serviceModulePromise;

    await createTournamentFromScratch({
      name: "Single Group Tournament",
      season: "2026",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 100,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T00:00:00.000Z"),
      timeZone: "Asia/Kolkata",
      championTeamId: null,
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
        createTeams: [],
      },
      structure: {
        template: "grouped_league_with_playoffs",
        groupCount: 1,
        advancingPerGroup: 2,
        stageEdits: [],
        groupEdits: [],
      },
    });

    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(1);
    expect(seedTournamentTemplateMock.mock.calls[0]?.[0]).toMatchObject({
      template: "grouped_league_with_playoffs",
      groupCount: 1,
      advancingPerGroup: 2,
    });
  });

  it("updates basics and advanced fields without reseeding when structure and teams are unchanged", async () => {
    const { updateTournamentFromScratch } = await serviceModulePromise;

    const result = await updateTournamentFromScratch({
      tournamentId: 401,
      name: "City Championship Updated",
      season: "2027",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 99,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-05-15T00:00:00.000Z"),
      timeZone: "Asia/Kolkata",
      championTeamId: 21,
      organization: {
        existingId: 701,
      },
      defaultMatchFormat: {
        existingId: 801,
      },
      teams: {
        existingTeamIds: [21, 22],
        createTeams: [],
      },
      structure: {
        template: "straight_league",
        stageEdits: [
          {
            sequence: 1,
            name: "League Stage Updated",
            code: "LEAGUE",
          },
        ],
        groupEdits: [],
      },
    });

    expect(result.structureChanged).toBe(false);
    expect(result.teamMembershipChanged).toBe(false);
    expect(result.templateSummary).toBeNull();
    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(0);
    expect(state.stageUpdates).toHaveLength(1);
    expect(state.tournamentUpdates[0]).toMatchObject({
      name: "City Championship Updated",
      timeZone: "Asia/Kolkata",
      championTeamId: 21,
    });
  });

  it("supports inline create of organization/match format/team during edit", async () => {
    const { updateTournamentFromScratch } = await serviceModulePromise;

    const result = await updateTournamentFromScratch({
      tournamentId: 401,
      name: "City Championship Updated",
      season: "2027",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 100,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-05-15T00:00:00.000Z"),
      timeZone: "UTC",
      championTeamId: null,
      organization: {
        create: {
          name: "New Org",
          slug: "new-org",
        },
      },
      defaultMatchFormat: {
        create: {
          name: "T10",
        },
      },
      teams: {
        existingTeamIds: [21, 22],
        createTeams: [
          {
            name: "Late Entry",
            shortName: "le",
            country: "India",
          },
        ],
      },
      structure: {
        template: "straight_league",
        stageEdits: [
          {
            sequence: 1,
            name: "League Stage",
            code: "LEAGUE",
          },
        ],
        groupEdits: [],
      },
    });

    expect(result.teamMembershipChanged).toBe(true);
    expect(state.insertedOrganization).toMatchObject({
      name: "New Org",
      slug: "new-org",
    });
    expect(state.insertedMatchFormat).toMatchObject({
      name: "T10",
    });
    expect(state.insertedTeams[0]).toMatchObject({
      shortName: "LE",
    });
    expect(state.deletedTournamentTeamsCount).toBe(1);
    expect(state.insertedTournamentTeams).toHaveLength(3);
    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(1);
  });

  it("blocks structural changes when fixtures or matches exist", async () => {
    state.matchRows = [{ id: 999 }];

    const { updateTournamentFromScratch } = await serviceModulePromise;

    await expect(
      updateTournamentFromScratch({
        tournamentId: 401,
        name: "Locked Tournament",
        season: "2027",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-05-15T00:00:00.000Z"),
        timeZone: "UTC",
        championTeamId: null,
        organization: {
          existingId: 701,
        },
        defaultMatchFormat: {
          existingId: 801,
        },
        teams: {
          existingTeamIds: [21, 22],
          createTeams: [],
        },
        structure: {
          template: "straight_knockout",
          stageEdits: [
            {
              sequence: 1,
              name: "Knockout",
              code: "KO",
            },
          ],
          groupEdits: [],
        },
      })
    ).rejects.toMatchObject({
      code: "STRUCTURE_LOCKED",
    });
  });

  it("blocks team membership edits after tournament start date", async () => {
    state.tournamentRows = [
      {
        id: 401,
        startDate: new Date("2020-04-01T00:00:00.000Z"),
        type: "league",
      },
    ];

    const { updateTournamentFromScratch } = await serviceModulePromise;

    await expect(
      updateTournamentFromScratch({
        tournamentId: 401,
        name: "Started Tournament",
        season: "2027",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2020-04-01T00:00:00.000Z"),
        endDate: new Date("2027-05-15T00:00:00.000Z"),
        timeZone: "UTC",
        championTeamId: null,
        organization: {
          existingId: 701,
        },
        defaultMatchFormat: {
          existingId: 801,
        },
        teams: {
          existingTeamIds: [21],
          createTeams: [
            {
              name: "Replacement Team",
              shortName: "rt",
            },
          ],
        },
        structure: {
          template: "straight_league",
          stageEdits: [
            {
              sequence: 1,
              name: "League Stage",
              code: "LEAGUE",
            },
          ],
          groupEdits: [],
        },
      })
    ).rejects.toMatchObject({
      code: "TEAM_MEMBERSHIP_LOCKED_AFTER_START",
    });
  });

  it("blocks team removal when player assignments exist for the removed team", async () => {
    state.teamPlayerRows = [{ id: 1 }];

    const { updateTournamentFromScratch } = await serviceModulePromise;

    await expect(
      updateTournamentFromScratch({
        tournamentId: 401,
        name: "With Assignments",
        season: "2027",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2027-05-15T00:00:00.000Z"),
        timeZone: "UTC",
        championTeamId: null,
        organization: {
          existingId: 701,
        },
        defaultMatchFormat: {
          existingId: 801,
        },
        teams: {
          existingTeamIds: [21],
          createTeams: [
            {
              name: "Replacement Team",
              shortName: "rt",
            },
          ],
        },
        structure: {
          template: "straight_league",
          stageEdits: [
            {
              sequence: 1,
              name: "League Stage",
              code: "LEAGUE",
            },
          ],
          groupEdits: [],
        },
      })
    ).rejects.toMatchObject({
      code: "TEAM_REMOVAL_BLOCKED_BY_ASSIGNMENTS",
    });
  });

  it("blocks team removal when existing matches reference removed team", async () => {
    state.matchRows = [{ id: 1 }];

    const { updateTournamentFromScratch } = await serviceModulePromise;

    await expect(
      updateTournamentFromScratch({
        tournamentId: 401,
        name: "With Match References",
        season: "2027",
        category: "competitive",
        genderAllowed: "open",
        ageLimit: 100,
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2027-05-15T00:00:00.000Z"),
        timeZone: "UTC",
        championTeamId: null,
        organization: {
          existingId: 701,
        },
        defaultMatchFormat: {
          existingId: 801,
        },
        teams: {
          existingTeamIds: [21],
          createTeams: [
            {
              name: "Replacement Team",
              shortName: "rt",
            },
          ],
        },
        structure: {
          template: "straight_league",
          stageEdits: [
            {
              sequence: 1,
              name: "League Stage",
              code: "LEAGUE",
            },
          ],
          groupEdits: [],
        },
      })
    ).rejects.toMatchObject({
      code: "TEAM_REMOVAL_BLOCKED_BY_MATCH_REFERENCES",
    });
  });

  it("reseeds when template configuration changes during edit", async () => {
    const { updateTournamentFromScratch } = await serviceModulePromise;

    const result = await updateTournamentFromScratch({
      tournamentId: 401,
      name: "Format Shifted",
      season: "2027",
      category: "competitive",
      genderAllowed: "open",
      ageLimit: 100,
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-05-15T00:00:00.000Z"),
      timeZone: "UTC",
      championTeamId: null,
      organization: {
        existingId: 701,
      },
      defaultMatchFormat: {
        existingId: 801,
      },
      teams: {
        existingTeamIds: [21, 22],
        createTeams: [],
      },
      structure: {
        template: "straight_knockout",
        stageEdits: [
          {
            sequence: 1,
            name: "Knockout Stage",
            code: "KNOCKOUT",
          },
        ],
        groupEdits: [],
      },
    });

    expect(result.structureChanged).toBe(true);
    expect(result.templateSummary).not.toBeNull();
    expect(seedTournamentTemplateMock).toHaveBeenCalledTimes(1);
  });
});
