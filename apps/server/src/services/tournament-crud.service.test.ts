import { beforeEach, describe, expect, it, mock } from "bun:test";

interface CreateTournamentInput {
  category?: string;
  defaultMatchFormatId: number;
  endDate: Date;
  name: string;
  organizationId?: number;
  startDate: Date;
}

type InsertTournamentValues = CreateTournamentInput & {
  organizationId: number;
};

interface MockState {
  insertedValues: InsertTournamentValues | null;
  systemOrganization: { id: number } | null;
}

const state: MockState = {
  insertedValues: null,
  systemOrganization: null,
};

const dbMock = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: (): Promise<Array<{ id: number }>> => {
          if (!state.systemOrganization) {
            return Promise.resolve([]);
          }

          return Promise.resolve([state.systemOrganization]);
        },
      }),
    }),
  }),
  insert: () => ({
    values: (values: InsertTournamentValues) => {
      state.insertedValues = values;
      return {
        returning: (): Promise<InsertTournamentValues[]> => {
          return Promise.resolve([values]);
        },
      };
    },
  }),
};

mock.module("@/db", () => ({ db: dbMock }));

const serviceModulePromise = import("./crud.service");

const getInsertedValues = () => state.insertedValues;

const createTournamentPayload = (
  overrides: Partial<CreateTournamentInput> = {}
): CreateTournamentInput => ({
  name: "Community Cup",
  startDate: new Date("2026-02-01T00:00:00.000Z"),
  endDate: new Date("2026-02-28T00:00:00.000Z"),
  defaultMatchFormatId: 1,
  ...overrides,
});

describe("tournamentCrudService.create", () => {
  beforeEach(() => {
    state.insertedValues = null;
    state.systemOrganization = null;
  });

  it("throws TOURNAMENT_ORGANIZATION_REQUIRED for competitive tournaments without organizationId", async () => {
    const { CrudServiceError, tournamentCrudService } =
      await serviceModulePromise;

    await expect(
      tournamentCrudService.create(
        createTournamentPayload({
          category: "competitive",
        })
      )
    ).rejects.toBeInstanceOf(CrudServiceError);

    await expect(
      tournamentCrudService.create(
        createTournamentPayload({
          category: "competitive",
        })
      )
    ).rejects.toMatchObject({
      code: "TOURNAMENT_ORGANIZATION_REQUIRED",
    });

    expect(state.insertedValues).toBeNull();
  });

  it("uses system organization fallback for practice/recreational/one_off categories", async () => {
    const { tournamentCrudService } = await serviceModulePromise;

    state.systemOrganization = { id: 99 };

    for (const category of ["practice", "recreational", "one_off"] as const) {
      state.insertedValues = null;

      await tournamentCrudService.create(
        createTournamentPayload({
          name: `${category}-tournament`,
          category,
        })
      );

      const insertedValues = getInsertedValues();
      expect(insertedValues).not.toBeNull();
      expect(insertedValues?.organizationId).toBe(99);
      expect(insertedValues?.category).toBe(category);
    }
  });

  it("throws SYSTEM_ORGANIZATION_NOT_FOUND when fallback categories are used but system organization is missing", async () => {
    const { CrudServiceError, tournamentCrudService } =
      await serviceModulePromise;

    await expect(
      tournamentCrudService.create(
        createTournamentPayload({
          category: "practice",
        })
      )
    ).rejects.toBeInstanceOf(CrudServiceError);

    await expect(
      tournamentCrudService.create(
        createTournamentPayload({
          category: "practice",
        })
      )
    ).rejects.toMatchObject({
      code: "SYSTEM_ORGANIZATION_NOT_FOUND",
    });

    expect(state.insertedValues).toBeNull();
  });
});
