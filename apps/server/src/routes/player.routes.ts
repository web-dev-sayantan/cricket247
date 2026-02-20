import { Hono } from 'hono';
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  successResponse,
} from '@/middleware';
import {
  createPlayerBodySchema,
  idRouteParamSchema,
  updatePlayerBodySchema,
} from '@/schemas/crud.schemas';
import { playerCrudService } from '@/services/crud.service';

const playerRoutes = new Hono();

playerRoutes.get('/', async (c) => {
  try {
    const players = await playerCrudService.list();
    return successResponse(c, players);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch players', 500);
  }
});

playerRoutes.get('/:id', async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid player ID');
  }

  try {
    const player = await playerCrudService.getById(parsedId.data);
    if (!player) {
      return errorResponse(c, 'Player not found', 404);
    }
    return successResponse(c, player);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch player', 500);
  }
});

playerRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = createPlayerBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid player payload');
  }

  try {
    const player = await playerCrudService.create(parsedBody.data);
    if (!player) {
      return errorResponse(c, 'Failed to create player', 500);
    }
    return successResponse(c, player, 'Player created', 201);
  } catch (_error) {
    return errorResponse(c, 'Failed to create player', 500);
  }
});

playerRoutes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid player ID');
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = updatePlayerBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid player payload');
  }

  if (Object.keys(parsedBody.data).length === 0) {
    return errorResponse(c, 'At least one field is required for update');
  }

  try {
    const player = await playerCrudService.update(parsedId.data, parsedBody.data);
    if (!player) {
      return errorResponse(c, 'Player not found', 404);
    }
    return successResponse(c, player, 'Player updated');
  } catch (_error) {
    return errorResponse(c, 'Failed to update player', 500);
  }
});

playerRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid player ID');
  }

  try {
    const deleted = await playerCrudService.remove(parsedId.data);
    if (!deleted) {
      return errorResponse(c, 'Player not found', 404);
    }
    return successResponse(c, { id: parsedId.data }, 'Player deleted');
  } catch (_error) {
    return errorResponse(c, 'Failed to delete player', 500);
  }
});

export default playerRoutes;
