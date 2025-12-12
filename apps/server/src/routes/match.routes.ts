import { Hono } from "hono";
import { PAGINATION } from "@/config/constants";
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  successResponse,
} from "@/middleware";
import {
  getAllMatches,
  getLiveMatches,
  getMatchById,
} from "@/services/match.service";

const matchRoutes = new Hono();

// Get all live matches (public)
matchRoutes.get("/live", async (c) => {
  try {
    const matches = await getLiveMatches();
    return successResponse(c, matches);
  } catch (error) {
    return errorResponse(c, "Failed to fetch live matches", 500);
  }
});

// Get all matches with pagination (public)
matchRoutes.get("/", async (c) => {
  try {
    const page = Number.parseInt(
      c.req.query("page") || String(PAGINATION.DEFAULT_PAGE)
    );
    const limit = Math.min(
      Number.parseInt(c.req.query("limit") || String(PAGINATION.DEFAULT_LIMIT)),
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
  } catch (error) {
    return errorResponse(c, "Failed to fetch matches", 500);
  }
});

// Get match by ID (public)
matchRoutes.get("/:id", async (c) => {
  try {
    const id = Number.parseInt(c.req.param("id"));

    if (Number.isNaN(id)) {
      return errorResponse(c, "Invalid match ID");
    }

    const match = await getMatchById(id);

    if (!match) {
      return errorResponse(c, "Match not found", 404);
    }

    return successResponse(c, match);
  } catch (error) {
    return errorResponse(c, "Failed to fetch match", 500);
  }
});

// Create match (admin only)
matchRoutes.post("/", requireAuth, requireAdmin, async (c) => {
  // TODO: Implement create match logic
  return errorResponse(c, "Not implemented yet", 501);
});

// Update match (admin only)
matchRoutes.patch("/:id", requireAuth, requireAdmin, async (c) => {
  // TODO: Implement update match logic
  return errorResponse(c, "Not implemented yet", 501);
});

// Delete match (admin only)
matchRoutes.delete("/:id", requireAuth, requireAdmin, async (c) => {
  // TODO: Implement delete match logic
  return errorResponse(c, "Not implemented yet", 501);
});

export default matchRoutes;
