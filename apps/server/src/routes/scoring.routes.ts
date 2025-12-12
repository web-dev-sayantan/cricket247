import { Hono } from "hono";
import { errorResponse, requireScorer } from "@/middleware";

const scoringRoutes = new Hono();

// Record ball (scorer or admin only)
scoringRoutes.post("/ball", requireScorer, async (c) => {
  // TODO: Implement record ball
  return errorResponse(c, "Not implemented yet", 501);
});

// Update ball (scorer or admin only)
scoringRoutes.patch("/ball/:id", requireScorer, async (c) => {
  // TODO: Implement update ball
  return errorResponse(c, "Not implemented yet", 501);
});

// Start innings (scorer or admin only)
scoringRoutes.post("/innings/start", requireScorer, async (c) => {
  // TODO: Implement start innings
  return errorResponse(c, "Not implemented yet", 501);
});

// End innings (scorer or admin only)
scoringRoutes.post("/innings/:id/end", requireScorer, async (c) => {
  // TODO: Implement end innings
  return errorResponse(c, "Not implemented yet", 501);
});

export default scoringRoutes;
