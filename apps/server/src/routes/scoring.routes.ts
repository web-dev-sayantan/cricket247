import { Hono } from "hono";
import { errorResponse, requireScorer, successResponse } from "@/middleware";
import {
  createBallBodySchema,
  createInningsBodySchema,
  idRouteParamSchema,
  updateBallBodySchema,
} from "@/schemas/crud.schemas";
import { getBallsOfSameOver } from "@/services/ball.service";
import { ballCrudService, inningsCrudService } from "@/services/crud.service";

const scoringRoutes = new Hono();

scoringRoutes.post("/ball", requireScorer, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = createBallBodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid ball payload"
    );
  }

  try {
    const ball = await ballCrudService.create(parsedBody.data);
    if (!ball) {
      return errorResponse(c, "Failed to record ball", 500);
    }
    return successResponse(c, ball, "Ball recorded", 201);
  } catch (_error) {
    return errorResponse(c, "Failed to record ball", 500);
  }
});

scoringRoutes.patch("/ball/:id", requireScorer, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
  if (!parsedId.success) {
    return errorResponse(c, "Invalid ball ID");
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = updateBallBodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid ball payload"
    );
  }

  if (Object.keys(parsedBody.data).length === 0) {
    return errorResponse(c, "At least one field is required for update");
  }

  try {
    const ball = await ballCrudService.update(parsedId.data, parsedBody.data);
    if (!ball) {
      return errorResponse(c, "Ball not found", 404);
    }
    return successResponse(c, ball, "Ball updated");
  } catch (_error) {
    return errorResponse(c, "Failed to update ball", 500);
  }
});

scoringRoutes.post("/innings/start", requireScorer, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = createInningsBodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid innings payload"
    );
  }

  try {
    const innings = await inningsCrudService.create(parsedBody.data);
    if (!innings) {
      return errorResponse(c, "Failed to start innings", 500);
    }
    return successResponse(c, innings, "Innings started", 201);
  } catch (_error) {
    return errorResponse(c, "Failed to start innings", 500);
  }
});

scoringRoutes.post("/innings/:id/end", requireScorer, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
  if (!parsedId.success) {
    return errorResponse(c, "Invalid innings ID");
  }

  try {
    const innings = await inningsCrudService.update(parsedId.data, {
      isCompleted: true,
    });
    if (!innings) {
      return errorResponse(c, "Innings not found", 404);
    }
    return successResponse(c, innings, "Innings ended");
  } catch (_error) {
    return errorResponse(c, "Failed to end innings", 500);
  }
});

// Get all balls of the same over for an innings
scoringRoutes.get(
  "/ball/allBallsOfSameOver/:inningsId/:ballNumber",
  requireScorer,
  async (c) => {
    try {
      const inningsId = Number.parseInt(c.req.param("inningsId"), 10);
      const ballNumber = Number.parseInt(c.req.param("ballNumber"), 10);

      if (Number.isNaN(inningsId) || Number.isNaN(ballNumber)) {
        return errorResponse(c, "Invalid innings ID or ball number");
      }
      const balls = await getBallsOfSameOver(inningsId, ballNumber);
      return successResponse(c, balls);
    } catch (_error) {
      return errorResponse(c, "Failed to get balls of same over");
    }
  }
);

export default scoringRoutes;
