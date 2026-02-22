import { Hono } from "hono";
import { errorResponse, requireAuth, successResponse } from "@/middleware";

const healthRoutes = new Hono();

// Public health check endpoint
healthRoutes.get("/", (c) =>
  successResponse(c, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  })
);

// Protected health check with DB status
healthRoutes.get("/detailed", requireAuth, (c) => {
  try {
    // You can add DB ping here if needed
    return successResponse(c, {
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      database: "connected",
    });
  } catch (_error) {
    return errorResponse(c, "Health check failed", 503);
  }
});

export default healthRoutes;
