import { Hono } from "hono";
import type { z } from "zod";
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  requireScorer,
  successResponse,
} from "@/middleware";
import {
  createBallBodySchema,
  createInningsBodySchema,
  createPlayerCareerStatsBodySchema,
  createPlayerMatchPerformanceBodySchema,
  createPlayerTournamentStatsBodySchema,
  createTeamPlayerBodySchema,
  createTournamentBodySchema,
  createTournamentTeamBodySchema,
  createVenueBodySchema,
  idRouteParamSchema,
  updateBallBodySchema,
  updateInningsBodySchema,
  updatePlayerCareerStatsBodySchema,
  updatePlayerMatchPerformanceBodySchema,
  updatePlayerTournamentStatsBodySchema,
  updateTeamPlayerBodySchema,
  updateTournamentBodySchema,
  updateTournamentTeamBodySchema,
  updateVenueBodySchema,
} from "@/schemas/crud.schemas";
import {
  ballCrudService,
  inningsCrudService,
  playerCareerStatsCrudService,
  playerMatchPerformanceCrudService,
  playerTournamentStatsCrudService,
  teamPlayerCrudService,
  tournamentCrudService,
  tournamentTeamCrudService,
  venueCrudService,
} from "@/services/crud.service";

interface CrudService<TRecord, TCreate extends object, TUpdate extends object> {
  create: (payload: TCreate) => Promise<TRecord | null>;
  getById: (id: number) => Promise<TRecord | null>;
  list: () => Promise<TRecord[]>;
  remove: (id: number) => Promise<boolean>;
  update: (id: number, payload: TUpdate) => Promise<TRecord | null>;
}

interface CrudRouteConfig<
  TRecord,
  TCreate extends object,
  TUpdate extends object,
> {
  createSchema: z.ZodType<TCreate>;
  entityLabel: string;
  path: `/${string}`;
  service: CrudService<TRecord, TCreate, TUpdate>;
  updateSchema: z.ZodType<TUpdate>;
  writeAccess: "admin" | "scorer";
}

const managementRoutes = new Hono();

const registerCrudRoutes = <
  TRecord,
  TCreate extends object,
  TUpdate extends object,
>(
  router: Hono,
  config: CrudRouteConfig<TRecord, TCreate, TUpdate>
) => {
  const basePath = config.path as `/${string}`;
  const itemPath = `${basePath}/:id` as `/${string}`;
  const writeRoleMiddleware =
    config.writeAccess === "scorer" ? requireScorer : requireAdmin;

  router.get(basePath, async (c) => {
    try {
      const rows = await config.service.list();
      return successResponse(c, rows);
    } catch (_error) {
      return errorResponse(c, `Failed to fetch ${config.entityLabel}`, 500);
    }
  });

  router.get(itemPath, async (c) => {
    const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
    if (!parsedId.success) {
      return errorResponse(c, `Invalid ${config.entityLabel} ID`);
    }

    try {
      const row = await config.service.getById(parsedId.data);
      if (!row) {
        return errorResponse(c, `${config.entityLabel} not found`, 404);
      }
      return successResponse(c, row);
    } catch (_error) {
      return errorResponse(c, `Failed to fetch ${config.entityLabel}`, 500);
    }
  });

  router.post(basePath, requireAuth, writeRoleMiddleware, async (c) => {
    let payload: object;
    try {
      payload = await c.req.json();
    } catch (_error) {
      return errorResponse(c, "Invalid JSON payload");
    }
    const parsedBody = config.createSchema.safeParse(payload);

    if (!parsedBody.success) {
      return errorResponse(
        c,
        parsedBody.error.issues[0]?.message ??
          `Invalid ${config.entityLabel} payload`
      );
    }

    try {
      const created = await config.service.create(parsedBody.data);
      if (!created) {
        return errorResponse(c, `Failed to create ${config.entityLabel}`, 500);
      }
      return successResponse(c, created, `${config.entityLabel} created`, 201);
    } catch (_error) {
      return errorResponse(c, `Failed to create ${config.entityLabel}`, 500);
    }
  });

  router.patch(itemPath, requireAuth, writeRoleMiddleware, async (c) => {
    const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
    if (!parsedId.success) {
      return errorResponse(c, `Invalid ${config.entityLabel} ID`);
    }

    let payload: object;
    try {
      payload = await c.req.json();
    } catch (_error) {
      return errorResponse(c, "Invalid JSON payload");
    }
    const parsedBody = config.updateSchema.safeParse(payload);

    if (!parsedBody.success) {
      return errorResponse(
        c,
        parsedBody.error.issues[0]?.message ??
          `Invalid ${config.entityLabel} payload`
      );
    }

    if (Object.keys(parsedBody.data).length === 0) {
      return errorResponse(c, "At least one field is required for update");
    }

    try {
      const updated = await config.service.update(
        parsedId.data,
        parsedBody.data
      );
      if (!updated) {
        return errorResponse(c, `${config.entityLabel} not found`, 404);
      }
      return successResponse(c, updated, `${config.entityLabel} updated`);
    } catch (_error) {
      return errorResponse(c, `Failed to update ${config.entityLabel}`, 500);
    }
  });

  router.delete(itemPath, requireAuth, writeRoleMiddleware, async (c) => {
    const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
    if (!parsedId.success) {
      return errorResponse(c, `Invalid ${config.entityLabel} ID`);
    }

    try {
      const deleted = await config.service.remove(parsedId.data);
      if (!deleted) {
        return errorResponse(c, `${config.entityLabel} not found`, 404);
      }
      return successResponse(
        c,
        { id: parsedId.data },
        `${config.entityLabel} deleted`
      );
    } catch (_error) {
      return errorResponse(c, `Failed to delete ${config.entityLabel}`, 500);
    }
  });
};

registerCrudRoutes(managementRoutes, {
  path: "/tournaments",
  entityLabel: "Tournament",
  createSchema: createTournamentBodySchema,
  updateSchema: updateTournamentBodySchema,
  service: tournamentCrudService,
  writeAccess: "admin",
});

registerCrudRoutes(managementRoutes, {
  path: "/venues",
  entityLabel: "Venue",
  createSchema: createVenueBodySchema,
  updateSchema: updateVenueBodySchema,
  service: venueCrudService,
  writeAccess: "admin",
});

registerCrudRoutes(managementRoutes, {
  path: "/team-players",
  entityLabel: "Team player",
  createSchema: createTeamPlayerBodySchema,
  updateSchema: updateTeamPlayerBodySchema,
  service: teamPlayerCrudService,
  writeAccess: "admin",
});

registerCrudRoutes(managementRoutes, {
  path: "/tournament-teams",
  entityLabel: "Tournament team",
  createSchema: createTournamentTeamBodySchema,
  updateSchema: updateTournamentTeamBodySchema,
  service: tournamentTeamCrudService,
  writeAccess: "admin",
});

registerCrudRoutes(managementRoutes, {
  path: "/innings",
  entityLabel: "Innings",
  createSchema: createInningsBodySchema,
  updateSchema: updateInningsBodySchema,
  service: inningsCrudService,
  writeAccess: "scorer",
});

registerCrudRoutes(managementRoutes, {
  path: "/balls",
  entityLabel: "Ball",
  createSchema: createBallBodySchema,
  updateSchema: updateBallBodySchema,
  service: ballCrudService,
  writeAccess: "scorer",
});

registerCrudRoutes(managementRoutes, {
  path: "/player-match-performances",
  entityLabel: "Player match performance",
  createSchema: createPlayerMatchPerformanceBodySchema,
  updateSchema: updatePlayerMatchPerformanceBodySchema,
  service: playerMatchPerformanceCrudService,
  writeAccess: "scorer",
});

registerCrudRoutes(managementRoutes, {
  path: "/player-tournament-stats",
  entityLabel: "Player tournament stats",
  createSchema: createPlayerTournamentStatsBodySchema,
  updateSchema: updatePlayerTournamentStatsBodySchema,
  service: playerTournamentStatsCrudService,
  writeAccess: "admin",
});

registerCrudRoutes(managementRoutes, {
  path: "/player-career-stats",
  entityLabel: "Player career stats",
  createSchema: createPlayerCareerStatsBodySchema,
  updateSchema: updatePlayerCareerStatsBodySchema,
  service: playerCareerStatsCrudService,
  writeAccess: "admin",
});

export default managementRoutes;
