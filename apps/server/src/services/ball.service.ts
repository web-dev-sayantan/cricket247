import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { balls } from "@/db/schema";
import type { Ball, NewBall, Player } from "@/db/types";

export async function getBallById(id: number) {
  return await db.query.balls.findFirst({
    where: eq(balls.id, id),
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
    },
  });
}

export async function getBallByMatchAndTeamAndBallNumber(
  inningsId: number,
  ballNumber: number
) {
  return await db.query.balls.findFirst({
    where: and(
      eq(balls.inningsId, inningsId),
      eq(balls.ballNumber, ballNumber)
    ),
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
    },
  });
}

export async function getBallsOfSameOver(
  inningsId: number,
  ballNumber: number
) {
  const firstBallNumber =
    ballNumber % 6 === 0 ? ballNumber - 5 : Math.floor(ballNumber / 6) * 6 + 1;
  const lastBallNumber = Math.ceil(ballNumber / 6) * 6;
  return await db.query.balls.findMany({
    where: and(
      eq(balls.inningsId, inningsId),
      gte(balls.ballNumber, firstBallNumber),
      lte(balls.ballNumber, lastBallNumber)
    ),
    with: {
      striker: true,
      nonStriker: true,
      bowler: true,
    },
  });
}

export async function createNewBallAction({
  inningsId,
  strikerId,
  nonStrikerId,
  bowlerId,
  ballNumber,
  runsScored,
  isWicket,
  wicketType,
  assistPlayerId,
  isWide,
  isNoBall,
  isBye,
  isLegBye,
}: NewBall) {
  const newBall = await db
    .insert(balls)
    .values({
      inningsId,
      strikerId,
      nonStrikerId,
      bowlerId,
      ballNumber,
      runsScored,
      isWicket,
      wicketType,
      assistPlayerId,
      isWide,
      isNoBall,
      isBye,
      isLegBye,
    })
    .returning({ id: balls.id });
  if (newBall.length === 0) {
    return null;
  }
  return newBall[0].id;
}

export async function updateBallAction({
  id,
  ballNumber = 0,
  strikerId,
  nonStrikerId,
  bowlerId,
  runsScored = 0,
  isWicket = false,
  wicketType,
  assistPlayerId,
  dismissedPlayerId,
  isBye = false,
  isLegBye = false,
  isWide = false,
  isNoBall = false,
}: NewBall) {
  if (!id) {
    throw new Error("Ball id is required");
  }
  // Update the current ball
  const updatedBall = await db
    .update(balls)
    .set({
      ballNumber,
      strikerId,
      nonStrikerId,
      bowlerId,
      runsScored,
      isWicket,
      wicketType,
      assistPlayerId,
      dismissedPlayerId,
      isNoBall,
      isWide,
      isBye,
      isLegBye,
    })
    .where(eq(balls.id, id))
    .returning();
  if (updatedBall.length === 0) {
    return null;
  }
  return updatedBall[0].id;
}

export type BallWithPlayers = Ball & {
  striker: Player;
  nonStriker: Player;
  bowler: Player;
};
