import type { Context } from "hono";
import { Hono } from "hono";
import { auth } from "@/lib/auth";
import {
  errorResponse,
  requireAdmin,
  requireAuth,
  successResponse,
} from "@/middleware";
import {
  claimPlayerOtpRequestSchema,
  claimPlayerVerifySchema,
  createOwnPlayerBodySchema,
  createPlayerBodySchema,
  idRouteParamSchema,
  listClaimablePlayersQuerySchema,
  updatePlayerBodySchema,
} from "@/schemas/crud.schemas";
import { playerCrudService } from "@/services/crud.service";
import {
  createOwnPlayerProfileByEmail,
  getOnboardingStatusByEmail,
  listClaimablePlayers,
  markOnboardingSeenByEmail,
  sendClaimOtpByEmail,
  verifyClaimOtpAndLinkByEmail,
} from "@/services/player.service";

const playerRoutes = new Hono();

async function getAuthedUserEmail(c: Context) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  return session?.user.email ?? null;
}

playerRoutes.get("/onboarding/status", requireAuth, async (c) => {
  const userEmail = await getAuthedUserEmail(c);
  if (!userEmail) {
    return errorResponse(c, "Unauthorized", 401);
  }

  try {
    const status = await getOnboardingStatusByEmail(userEmail);
    return successResponse(c, status);
  } catch (error) {
    return errorResponse(
      c,
      error instanceof Error
        ? error.message
        : "Failed to fetch onboarding status",
      400
    );
  }
});

playerRoutes.post("/onboarding/seen", requireAuth, async (c) => {
  const userEmail = await getAuthedUserEmail(c);
  if (!userEmail) {
    return errorResponse(c, "Unauthorized", 401);
  }

  try {
    const marked = await markOnboardingSeenByEmail(userEmail);
    return successResponse(c, marked, "Onboarding marked as seen");
  } catch (error) {
    return errorResponse(
      c,
      error instanceof Error
        ? error.message
        : "Failed to update onboarding status",
      400
    );
  }
});

playerRoutes.post("/onboarding/create-profile", requireAuth, async (c) => {
  const userEmail = await getAuthedUserEmail(c);
  if (!userEmail) {
    return errorResponse(c, "Unauthorized", 401);
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = createOwnPlayerBodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid player profile payload"
    );
  }

  try {
    const player = await createOwnPlayerProfileByEmail(
      userEmail,
      parsedBody.data
    );
    return successResponse(c, player, "Player profile created", 201);
  } catch (error) {
    return errorResponse(
      c,
      error instanceof Error
        ? error.message
        : "Failed to create player profile",
      400
    );
  }
});

playerRoutes.get("/onboarding/claimable", requireAuth, async (c) => {
  const parsedQuery = listClaimablePlayersQuerySchema.safeParse({
    query: c.req.query("query"),
  });

  if (!parsedQuery.success) {
    return errorResponse(
      c,
      parsedQuery.error.issues[0]?.message ?? "Invalid query"
    );
  }

  try {
    const items = await listClaimablePlayers(parsedQuery.data.query);
    return successResponse(c, items);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch claimable players", 500);
  }
});

playerRoutes.post("/onboarding/claim/send-otp", requireAuth, async (c) => {
  const userEmail = await getAuthedUserEmail(c);
  if (!userEmail) {
    return errorResponse(c, "Unauthorized", 401);
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = claimPlayerOtpRequestSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid claim request"
    );
  }

  try {
    const result = await sendClaimOtpByEmail(
      userEmail,
      parsedBody.data.playerId
    );
    return successResponse(c, result, "OTP sent");
  } catch (error) {
    return errorResponse(
      c,
      error instanceof Error ? error.message : "Failed to send OTP",
      400
    );
  }
});

playerRoutes.post("/onboarding/claim/verify", requireAuth, async (c) => {
  const userEmail = await getAuthedUserEmail(c);
  if (!userEmail) {
    return errorResponse(c, "Unauthorized", 401);
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }

  const parsedBody = claimPlayerVerifySchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid OTP verification request"
    );
  }

  try {
    const linkedPlayer = await verifyClaimOtpAndLinkByEmail({
      email: userEmail,
      otp: parsedBody.data.otp,
      playerId: parsedBody.data.playerId,
    });
    return successResponse(c, linkedPlayer, "Player profile claimed");
  } catch (error) {
    return errorResponse(
      c,
      error instanceof Error ? error.message : "Failed to verify claim OTP",
      400
    );
  }
});

playerRoutes.get("/", async (c) => {
  try {
    const players = await playerCrudService.list();
    return successResponse(c, players);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch players", 500);
  }
});

playerRoutes.get("/:id", async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
  if (!parsedId.success) {
    return errorResponse(c, "Invalid player ID");
  }

  try {
    const player = await playerCrudService.getById(parsedId.data);
    if (!player) {
      return errorResponse(c, "Player not found", 404);
    }
    return successResponse(c, player);
  } catch (_error) {
    return errorResponse(c, "Failed to fetch player", 500);
  }
});

playerRoutes.post("/", requireAuth, requireAdmin, async (c) => {
  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }
  const parsedBody = createPlayerBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid player payload"
    );
  }

  try {
    const player = await playerCrudService.create(parsedBody.data);
    if (!player) {
      return errorResponse(c, "Failed to create player", 500);
    }
    return successResponse(c, player, "Player created", 201);
  } catch (_error) {
    return errorResponse(c, "Failed to create player", 500);
  }
});

playerRoutes.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
  if (!parsedId.success) {
    return errorResponse(c, "Invalid player ID");
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload");
  }
  const parsedBody = updatePlayerBodySchema.safeParse(payload);

  if (!parsedBody.success) {
    return errorResponse(
      c,
      parsedBody.error.issues[0]?.message ?? "Invalid player payload"
    );
  }

  if (Object.keys(parsedBody.data).length === 0) {
    return errorResponse(c, "At least one field is required for update");
  }

  try {
    const player = await playerCrudService.update(
      parsedId.data,
      parsedBody.data
    );
    if (!player) {
      return errorResponse(c, "Player not found", 404);
    }
    return successResponse(c, player, "Player updated");
  } catch (_error) {
    return errorResponse(c, "Failed to update player", 500);
  }
});

playerRoutes.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const parsedId = idRouteParamSchema.safeParse(c.req.param("id"));
  if (!parsedId.success) {
    return errorResponse(c, "Invalid player ID");
  }

  try {
    const deleted = await playerCrudService.remove(parsedId.data);
    if (!deleted) {
      return errorResponse(c, "Player not found", 404);
    }
    return successResponse(c, { id: parsedId.data }, "Player deleted");
  } catch (_error) {
    return errorResponse(c, "Failed to delete player", 500);
  }
});

export default playerRoutes;
