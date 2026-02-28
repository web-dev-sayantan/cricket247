import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "@/middleware/error-handler";

interface SessionUser {
  role: string;
}

class CrudServiceError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const authState: {
  session: { user: SessionUser } | null;
} = {
  session: null,
};

const tournamentState: {
  createError: Error | null;
  createResult: Record<string, unknown> | null;
  listResult: Record<string, unknown>[];
  updateResult: Record<string, unknown> | null;
} = {
  createError: null,
  createResult: {
    id: 1,
    name: "Community Cup",
    category: "competitive",
    organizationId: 10,
  },
  listResult: [],
  updateResult: {
    id: 1,
    name: "Community Cup Updated",
  },
};

let organizationRemoveError: Error | null = null;

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(authState.session),
    },
  },
}));

const createNoopCrudService = () => ({
  create: () => Promise.resolve(null),
  getById: () => Promise.resolve(null),
  list: () => Promise.resolve([]),
  remove: () => Promise.resolve(false),
  update: () => Promise.resolve(null),
});

const tournamentCrudService = {
  create: () => {
    if (tournamentState.createError) {
      return Promise.reject(tournamentState.createError);
    }

    return Promise.resolve(tournamentState.createResult);
  },
  getById: () => Promise.resolve(null),
  list: () => Promise.resolve(tournamentState.listResult),
  remove: () => Promise.resolve(false),
  update: () => Promise.resolve(tournamentState.updateResult),
};

const organizationCrudService = {
  ...createNoopCrudService(),
  remove: () => {
    if (organizationRemoveError) {
      return Promise.reject(organizationRemoveError);
    }

    return Promise.resolve(false);
  },
};

mock.module("@/services/crud.service", () => ({
  CrudServiceError,
  ballCrudService: createNoopCrudService(),
  inningsCrudService: createNoopCrudService(),
  matchParticipantSourceCrudService: createNoopCrudService(),
  organizationCrudService,
  playerCareerStatsCrudService: createNoopCrudService(),
  playerMatchPerformanceCrudService: createNoopCrudService(),
  playerTournamentStatsCrudService: createNoopCrudService(),
  teamPlayerCrudService: createNoopCrudService(),
  tournamentCrudService,
  tournamentStageAdvancementCrudService: createNoopCrudService(),
  tournamentStageCrudService: createNoopCrudService(),
  tournamentStageGroupCrudService: createNoopCrudService(),
  tournamentStageTeamEntryCrudService: createNoopCrudService(),
  tournamentTeamCrudService: createNoopCrudService(),
  venueCrudService: createNoopCrudService(),
}));

const managementRoutesModulePromise = import("./management.routes");

const createApp = async () => {
  const { default: managementRoutes } = await managementRoutesModulePromise;
  const app = new Hono();
  app.use("*", errorHandler);
  app.route("/", managementRoutes);
  return app;
};

const validTournamentPayload = {
  category: "competitive",
  defaultMatchFormatId: 1,
  endDate: "2026-03-15T00:00:00.000Z",
  name: "Community Cup",
  organizationId: 10,
  startDate: "2026-03-01T00:00:00.000Z",
};

describe("management.routes (tournaments)", () => {
  beforeEach(() => {
    authState.session = null;
    organizationRemoveError = null;
    tournamentState.createError = null;
    tournamentState.createResult = {
      id: 1,
      name: "Community Cup",
      category: "competitive",
      organizationId: 10,
    };
    tournamentState.listResult = [];
    tournamentState.updateResult = {
      id: 1,
      name: "Community Cup Updated",
    };
  });

  it("allows public tournament listing", async () => {
    const app = await createApp();
    tournamentState.listResult = [{ id: 1, name: "Open League" }];

    const response = await app.request("/tournaments");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([{ id: 1, name: "Open League" }]);
  });

  it("rejects create tournament when unauthenticated", async () => {
    const app = await createApp();

    const response = await app.request("/tournaments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validTournamentPayload),
    });

    expect(response.status).toBe(401);
  });

  it("rejects create tournament for non-admin users", async () => {
    const app = await createApp();
    authState.session = { user: { role: "user" } };

    const response = await app.request("/tournaments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validTournamentPayload),
    });

    expect(response.status).toBe(403);
  });

  it("rejects empty tournament patch payload", async () => {
    const app = await createApp();
    authState.session = { user: { role: "admin" } };

    const response = await app.request("/tournaments/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("At least one field is required for update");
  });

  it("maps organization delete service error to conflict", async () => {
    const app = await createApp();
    authState.session = { user: { role: "admin" } };
    organizationRemoveError = new CrudServiceError(
      "ORGANIZATION_HAS_TOURNAMENTS"
    );

    const response = await app.request("/organizations/1", {
      method: "DELETE",
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toBe(
      "Cannot delete Organization while tournaments are linked to it"
    );
  });
});
