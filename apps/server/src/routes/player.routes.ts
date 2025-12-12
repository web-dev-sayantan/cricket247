import { Hono } from "hono";
import { errorResponse, requireAuth } from "@/middleware";

const playerRoutes = new Hono();

// Get all players (public)
playerRoutes.get("/", async (c) => {
  // TODO: Implement get all players
  return errorResponse(c, "Not implemented yet", 501);
});

// Get player by ID (public)
playerRoutes.get("/:id", async (c) => {
  // TODO: Implement get player by ID
  return errorResponse(c, "Not implemented yet", 501);
});

// Create player (authenticated)
playerRoutes.post("/", requireAuth, async (c) => {
  // TODO: Implement create player
  return errorResponse(c, "Not implemented yet", 501);
});

// Update player (authenticated)
playerRoutes.patch("/:id", requireAuth, async (c) => {
  // TODO: Implement update player
  return errorResponse(c, "Not implemented yet", 501);
});

// Delete player (authenticated)
playerRoutes.delete("/:id", requireAuth, async (c) => {
  // TODO: Implement delete player
  return errorResponse(c, "Not implemented yet", 501);
});

export default playerRoutes;
