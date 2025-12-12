import { Hono } from "hono";
import { errorResponse, requireAuth } from "@/middleware";

const teamRoutes = new Hono();

// Get all teams (public)
teamRoutes.get("/", async (c) => {
  // TODO: Implement get all teams
  return errorResponse(c, "Not implemented yet", 501);
});

// Get team by ID (public)
teamRoutes.get("/:id", async (c) => {
  // TODO: Implement get team by ID
  return errorResponse(c, "Not implemented yet", 501);
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
