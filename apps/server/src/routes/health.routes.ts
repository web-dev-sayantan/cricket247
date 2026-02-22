import { Hono } from "hono";
import { errorResponse, requireAuth, successResponse } from "@/middleware";
import { getCurrentIsoTimestamp } from "@/utils";

const healthRoutes = new Hono();

// Public health check endpoint
healthRoutes.get("/", (c) =>
  successResponse(c, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: getCurrentIsoTimestamp(),
  })
);

// Protected health check with DB status
healthRoutes.get("/detailed", requireAuth, (c) => {
  try {
    // You can add DB ping here if needed
    return successResponse(c, {
      status: "ok",
      uptime: process.uptime(),
      timestamp: getCurrentIsoTimestamp(),
      database: "connected",
    });
  } catch (_error) {
    return errorResponse(c, "Health check failed", 503);
  }
});

export default healthRoutes;
