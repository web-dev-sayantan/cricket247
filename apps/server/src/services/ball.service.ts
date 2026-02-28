import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveries } from "@/db/schema";
import type { Delivery, NewDelivery, Player } from "@/db/types";
import { getMatchFormatRulesByInningsId } from "@/services/match-format.service";

export async function getBallById(id: number) {
  return await db.query.deliveries.findFirst({
    where: {
      id,
    },
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
      dismissedPlayer: true,
      dismissedBy: true,
      assistedBy: true,
    },
  });
}

export async function getBallByMatchAndTeamAndBallNumber(
  inningsId: number,
  sequenceNo: number
) {
  return await db.query.deliveries.findFirst({
    where: {
      inningsId,
      sequenceNo,
    },
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
      dismissedPlayer: true,
      dismissedBy: true,
      assistedBy: true,
    },
  });
}

export async function getBallsOfSameOver(
  inningsId: number,
  ballNumber: number
) {
  const normalizedBallNumber = Math.max(1, ballNumber);
  const rules = await getMatchFormatRulesByInningsId(inningsId);
  const overNumber =
    Math.floor((normalizedBallNumber - 1) / rules.ballsPerOver) + 1;

  return await db.query.deliveries.findMany({
    where: {
      inningsId,
      overNumber,
    },
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
      dismissedPlayer: true,
      dismissedBy: true,
      assistedBy: true,
    },
    orderBy: {
      sequenceNo: "asc",
    },
  });
}

export async function getDeliveriesByInningsId(inningsId: number) {
  return await db.query.deliveries.findMany({
    where: {
      inningsId,
    },
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
      dismissedPlayer: true,
      dismissedBy: true,
      assistedBy: true,
    },
    orderBy: {
      sequenceNo: "asc",
    },
  });
}

export async function createNewBallAction(payload: NewDelivery) {
  const [newDelivery] = await db
    .insert(deliveries)
    .values(payload)
    .returning({ id: deliveries.id });

  return newDelivery?.id ?? null;
}

export async function updateBallAction(payload: NewDelivery) {
  if (!payload.id) {
    throw new Error("Delivery id is required");
  }

  const [updated] = await db
    .update(deliveries)
    .set(payload)
    .where(eq(deliveries.id, payload.id))
    .returning({ id: deliveries.id });

  return updated?.id ?? null;
}

export async function getLatestDeliveryInInnings(inningsId: number) {
  const rows = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.inningsId, inningsId))
    .orderBy(asc(deliveries.sequenceNo));

  return rows.at(-1) ?? null;
}

export async function getDeliveryBySequence(
  inningsId: number,
  sequenceNo: number
) {
  const [row] = await db
    .select()
    .from(deliveries)
    .where(
      and(
        eq(deliveries.inningsId, inningsId),
        eq(deliveries.sequenceNo, sequenceNo)
      )
    )
    .limit(1);
  return row ?? null;
}

export type DeliveryWithPlayers = Delivery & {
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  dismissedPlayer?: Player | null;
  dismissedBy?: Player | null;
  assistedBy?: Player | null;
};

// Backward compatible export name.
export type BallWithPlayers = DeliveryWithPlayers;
