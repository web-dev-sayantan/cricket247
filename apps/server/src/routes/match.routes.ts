import { Hono } from 'hono';
import { PAGINATION } from '@/config/constants';
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  successResponse,
} from '@/middleware';
import {
  createMatchBodySchema,
  idRouteParamSchema,
  updateMatchBodySchema,
} from '@/schemas/crud.schemas';
import { matchCrudService } from '@/services/crud.service';
import {
  getAllMatches,
  getLiveMatches,
  getMatchById,
} from '@/services/match.service';

const matchRoutes = new Hono();

matchRoutes.get('/live', async (c) => {
  try {
    const matches = await getLiveMatches();
    return successResponse(c, matches);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch live matches', 500);
  }
});

matchRoutes.get('/', async (c) => {
  try {
    const page = Number.parseInt(
      c.req.query('page') || String(PAGINATION.DEFAULT_PAGE),
      10
    );
    const limit = Math.min(
      Number.parseInt(c.req.query('limit') || String(PAGINATION.DEFAULT_LIMIT), 10),
      PAGINATION.MAX_LIMIT
    );

    const matches = await getAllMatches();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMatches = matches.slice(startIndex, endIndex);

    return successResponse(c, {
      matches: paginatedMatches,
      pagination: {
        page,
        limit,
        total: matches.length,
        totalPages: Math.ceil(matches.length / limit),
      },
    });
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch matches', 500);
  }
});

matchRoutes.get('/:id', async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid match ID');
  }

  try {
    const match = await getMatchById(parsedId.data);

    if (!match) {
      return errorResponse(c, 'Match not found', 404);
    }

    return successResponse(c, match);
  } catch (_error) {
    return errorResponse(c, 'Failed to fetch match', 500);
  }
});

matchRoutes.post('/', requireAuth, requireAdmin, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = createMatchBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid match payload');
  }

  try {
    const match = await matchCrudService.create(parsedBody.data);
    if (!match) {
      return errorResponse(c, 'Failed to create match', 500);
    }
    return successResponse(c, match, 'Match created', 201);
  } catch (_error) {
    return errorResponse(c, 'Failed to create match', 500);
  }
});

matchRoutes.patch('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid match ID');
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, 'Invalid JSON payload');
  }
  const parsedBody = updateMatchBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(c, parsedBody.error.issues[0]?.message ?? 'Invalid match payload');
  }

  if (Object.keys(parsedBody.data).length === 0) {
    return errorResponse(c, 'At least one field is required for update');
  }

  try {
    const match = await matchCrudService.update(parsedId.data, parsedBody.data);
    if (!match) {
      return errorResponse(c, 'Match not found', 404);
    }
    return successResponse(c, match, 'Match updated');
  } catch (_error) {
    return errorResponse(c, 'Failed to update match', 500);
  }
});

matchRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return errorResponse(c, 'Invalid match ID');
  }

  try {
    const deleted = await matchCrudService.remove(parsedId.data);
    if (!deleted) {
      return errorResponse(c, 'Match not found', 404);
    }
    return successResponse(c, { id: parsedId.data }, 'Match deleted');
  } catch (_error) {
    return errorResponse(c, 'Failed to delete match', 500);
  }
});

export default matchRoutes;
