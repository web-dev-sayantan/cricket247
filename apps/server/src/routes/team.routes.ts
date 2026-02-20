import { Hono } from 'hono';
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  successResponse,
} from '@/middleware';
import {
  createTeamBodySchema,
  idRouteParamSchema,
  updateTeamBodySchema,
} from '@/schemas/crud.schemas';
import { teamCrudService } from '@/services/crud.service';
import { getTeamsByName } from '@/services/team.service';

const teamRoutes = new Hono();

teamRoutes.get('/', async (c) => {
  try {
    const teams = await teamCrudService.list();
    return successResponse(c, teams);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch teams', 500);
  }
});

teamRoutes.get('/search/name/:name', async (c) => {
  try {
    const name = c.req.param('name');
    const teams = await getTeamsByName(name);
    return successResponse(c, teams);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch teams', 500);
  }
});

teamRoutes.get('/:id', async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid team ID');
  }

  try {
    const team = await teamCrudService.getById(parsedId.data);
    if (!team) {
      return errorResponse(c, 'Team not found', 404);
    }
    return successResponse(c, team);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch team', 500);
  }
});

teamRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = createTeamBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid team payload');
  }

  try {
    const team = await teamCrudService.create(parsedBody.data);
    if (!team) {
      return errorResponse(c, 'Failed to create team', 500);
    }
    return successResponse(c, team, 'Team created', 201);
  } catch (_error) {
    return errorResponse(c, 'Failed to create team', 500);
  }
});

teamRoutes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid team ID');
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = updateTeamBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid team payload');
  }

  if (Object.keys(parsedBody.data).length === 0) {
    return errorResponse(c, 'At least one field is required for update');
  }

  try {
    const team = await teamCrudService.update(parsedId.data, parsedBody.data);
    if (!team) {
      return errorResponse(c, 'Team not found', 404);
    }
    return successResponse(c, team, 'Team updated');
  } catch (_error) {
    return errorResponse(c, 'Failed to update team', 500);
  }
});

teamRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid team ID');
  }

  try {
    const deleted = await teamCrudService.remove(parsedId.data);
    if (!deleted) {
      return errorResponse(c, 'Team not found', 404);
    }
    return successResponse(c, { id: parsedId.data }, 'Team deleted');
  } catch (_error) {
    return errorResponse(c, 'Failed to delete team', 500);
  }
});

export default teamRoutes;
