import { Hono } from "hono";
import { errorResponse, requireAuth, successResponse } from "@/middleware";
import {
  getAllTeams,
  getTeamById,
  getTeamsByName,
} from "@/services/team.service";

const teamRoutes = new Hono();

// Get all teams (public)
teamRoutes.get("/", async (c) => {
  try {
    const teams = await getAllTeams();
    return successResponse(c, teams);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch teams", 500);
  }
});

// Get team by ID (public)
teamRoutes.get("/:id", async (c) => {
  try {
    const teams = await getTeamById(Number(c.req.param("id")));
    return successResponse(c, teams);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch teams", 500);
  }
});

teamRoutes.get("/search/name/:name", async (c) => {
  try {
    const name = c.req.param("name");
    const teams = await getTeamsByName(name);
    return successResponse(c, teams);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch teams", 500);
  }
});

// Create team (authenticated)
teamRoutes.post("/", requireAuth, async (c) => {
  // TODO: Implement create team
  return errorResponse(c, "Not implemented yet", 501);
});

// Update team (authenticated)
teamRoutes.patch("/:id", requireAuth, async (c) => {
  // TODO: Implement update team
  return errorResponse(c, "Not implemented yet", 501);
});

// Delete team (authenticated)
teamRoutes.delete("/:id", requireAuth, async (c) => {
  // TODO: Implement delete team
  return errorResponse(c, "Not implemented yet", 501);
});

export default teamRoutes;
