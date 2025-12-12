"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import type { NewBall } from "@/db/types";
import {
  createNewBallAction,
  getBallById,
  updateBallAction,
} from "@/services/ball.service";
import {
  createInningsAction,
  updateInningsAction,
} from "@/services/innings.service";
import { getMatchById } from "@/services/match.service";
import {
  createPlayerPerformanceAction,
  getPlayerMatchPerformance,
  updatePlayerPerformanceAction,
} from "@/services/player.service";

export async function saveBallData(
  {
    id,
    strikerId,
    nonStrikerId,
    bowlerId,
    ballNumber,
    runsScored,
    isBye,
    isLegBye,
    isWide,
    isNoBall,
    isWicket,
    wicketType,
    assistPlayerId,
    dismissedPlayerId,
  }: NewBall,
  {
    inningsId,
    wickets,
    balls,
    extras,
    totalScore,
  }: {
    inningsId: number;
    wickets: number;
    balls: number;
    extras: number;
    totalScore: number;
  },
  {
    matchId,
  }: {
    matchId: number;
  }
) {
  "use server";

  if (!id) {
    throw new Error("Ball id is required");
  }
  // fetch the current ball data to compare with the new data
  const currentBall = await getBallById(id);

  // Update the current ball
  await updateBallAction({
    id,
    inningsId,
    ballNumber,
    strikerId,
    nonStrikerId,
    bowlerId,
    runsScored,
    isWicket,
    wicketType,
    assistPlayerId,
    dismissedPlayerId,
    isBye,
    isLegBye,
    isWide,
    isNoBall,
  });

  // Update the innings table
  const isExtra = isWide || isNoBall;
  const inningsData = await updateInningsAction({
    id: inningsId,
    wickets: currentBall?.isWicket
      ? isWicket
        ? wickets
        : wickets - 1
      : isWicket
        ? wickets + 1
        : wickets,
    ballsBowled: isExtra ? balls : balls + 1,
    extras: isExtra ? extras + 1 : extras,
    totalScore: totalScore + (runsScored || 0) + (isExtra ? 1 : 0),
  });

  const updatePerformancePromises: Promise<any>[] = [];

  // update player's individual stats
  const playerPerformance = await getPlayerMatchPerformance(strikerId, matchId);
  if (playerPerformance.length > 0) {
    const batterCurrentScore =
      playerPerformance[0].runsScored + (runsScored || 0);
    const batterBallsFaced =
      playerPerformance[0].ballsFaced + (isExtra ? 0 : 1);
    const isDismissed =
      isWicket && dismissedPlayerId === playerPerformance[0].id;
    updatePerformancePromises.push(
      updatePlayerPerformanceAction({
        ...playerPerformance[0],
        ballsFaced: batterBallsFaced,
        runsScored: batterCurrentScore,
        dotBalls:
          playerPerformance[0].dotBalls +
          (isExtra ? 0 : runsScored === 0 ? 1 : 0),
        fours: playerPerformance[0].fours + (runsScored === 4 ? 1 : 0),
        sixes: playerPerformance[0].sixes + (runsScored === 6 ? 1 : 0),
        isDismissed,
        dismissedBy: isDismissed && wicketType !== "run out" ? bowlerId : null,
      })
    );
  }
  // update non-striker run out
  if (nonStrikerId && isWicket && wicketType === "run out") {
    const playerPerformance = await getPlayerMatchPerformance(
      nonStrikerId,
      matchId
    );
    if (playerPerformance.length > 0) {
      updatePerformancePromises.push(
        updatePlayerPerformanceAction({
          ...playerPerformance[0],
          isDismissed: true,
        })
      );
    }
  }
  // update bowler's individual stats
  const bowlerPerformance = await getPlayerMatchPerformance(bowlerId, matchId);
  if (bowlerPerformance.length > 0) {
    updatePerformancePromises.push(
      updatePlayerPerformanceAction({
        ...bowlerPerformance[0],
        ballsBowled: bowlerPerformance[0].ballsBowled + (isExtra ? 0 : 1),
        runsConceded:
          bowlerPerformance[0].runsConceded +
          (runsScored || 0) +
          (isExtra ? 1 : 0),
        wicketsTaken:
          bowlerPerformance[0].wicketsTaken +
          (isWicket && wicketType !== "run out" ? 1 : 0),
      })
    );
  }
  // update fielder's stats on dismissal
  if (isWicket && assistPlayerId) {
    const fielderPerformance = await getPlayerMatchPerformance(
      assistPlayerId,
      matchId
    );
    if (fielderPerformance.length > 0) {
      updatePerformancePromises.push(
        updatePlayerPerformanceAction({
          ...fielderPerformance[0],
          catches:
            fielderPerformance[0].catches + (wicketType === "caught" ? 1 : 0),
          stumpings:
            fielderPerformance[0].stumpings +
            (wicketType === "stumped" ? 1 : 0),
          runOuts:
            fielderPerformance[0].runOuts + (wicketType === "run out" ? 1 : 0),
        })
      );
    }
  }

  await Promise.all(updatePerformancePromises);

  // let path = `/play/matches/${matchId}/${inningsId}/${id}/new-batter`;
  if (isWicket) {
    // open new batter selection page when wicket falls
    // revalidatePath(path);
    // redirect(path);
  } else if (!isExtra && ballNumber % 6 === 0) {
    // open new bowler selection page when over ends
    // path = `/play/matches/${matchId}/${inningsId}/${id}/new-bowler`;
    // revalidatePath(path);
    // redirect(path);
  } else {
    // Create the next ball
    const newBallId = await createNewBallAction({
      inningsId,
      ballNumber: isExtra ? ballNumber : ballNumber + 1,
      strikerId: runsScored! % 2 === 1 ? nonStrikerId : strikerId,
      nonStrikerId: runsScored! % 2 === 1 ? strikerId : nonStrikerId,
      bowlerId,
    });

    // path = `/play/matches/${matchId}/${inningsData.id}/${newBallId}`;
    // revalidatePath(path);
    // redirect(path);
  }
}

export async function onSelectCurrentBattersAndBowler({
  matchId,
  bowlingTeamId,
  ballNumber,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  bowlingTeamId: number;
  ballNumber: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  "use server";
  // Find the match
  const match = await getMatchById(matchId);
  if (!match) {
    throw new Error("Match not found");
  }

  // Create a new scorecard for the match
  const inningsId = await createInningsAction({
    matchId: +matchId,
    battingTeamId: match.team1Id,
    bowlingTeamId,
    wickets: 0,
    ballsBowled: 0,
    extras: 0,
    totalScore: 0,
  });
  if (!inningsId) {
    throw new Error("Scorecard not created");
  }

  // Create a new ball
  const ballId = await createNewBallAction({
    inningsId: inningsId as unknown as number,
    ballNumber,
    strikerId,
    nonStrikerId,
    bowlerId,
  });

  // create player's performance table entries
  await Promise.all([
    createPlayerPerformanceAction({
      playerId: strikerId,
      matchId,
      teamId: match.team1Id,
    }),
    createPlayerPerformanceAction({
      playerId: nonStrikerId,
      matchId,
      teamId: match.team1Id,
    }),
    createPlayerPerformanceAction({
      playerId: bowlerId,
      matchId,
      teamId: match.team2Id,
    }),
    setMatchLiveStatus({ matchId, isLive: true }),
  ]);
  // revalidatePath(`/play/matches/${matchId}`);
  // redirect(`/play/matches/${matchId}/${inningsId}/${ballId}`);
}

export async function setMatchLiveStatus({
  matchId,
  isLive,
}: {
  matchId: number;
  isLive: boolean;
}) {
  "use server";
  return await db
    .update(matches)
    .set({ isLive })
    .where(eq(matches.id, matchId));
}

export async function onSelectNewBatter({
  matchId,
  teamId,
  inningsId,
  isExtra,
  ballNumber,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  teamId: number;
  inningsId: number;
  ballNumber: number;
  isExtra: boolean;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  "use server";

  // Create a new ball
  const ballId = await createNewBallAction({
    inningsId,
    ballNumber: isExtra ? ballNumber : ballNumber + 1,
    strikerId,
    nonStrikerId,
    bowlerId,
  });
  try {
    await createPlayerPerformanceAction({
      playerId: strikerId,
      matchId,
      teamId,
    });
    await createPlayerPerformanceAction({
      playerId: nonStrikerId,
      matchId,
      teamId,
    });
  } catch (error) {
    // DO NOTHING
  }
  if (isExtra || ballNumber % 6 !== 0) {
    // revalidatePath(`/play/matches/${matchId}/${inningsId}/${ballId}`);
    // redirect(`/play/matches/${matchId}/${inningsId}/${ballId}`);
  } else {
    // redirect(`/play/matches/${matchId}/${inningsId}/${ballId}/new-bowler`);
  }
}

export async function onSelectNewBowler({
  matchId,
  teamId,
  inningsId,
  ballNumber,
  runScored,
  strikerId,
  nonStrikerId,
  bowlerId,
}: {
  matchId: number;
  teamId: number;
  inningsId: number;
  ballNumber: number;
  runScored: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  "use server";

  // Create a new ball
  const ballId = await createNewBallAction({
    inningsId,
    ballNumber: ballNumber + 1,
    strikerId: runScored % 2 === 1 ? strikerId : nonStrikerId,
    nonStrikerId: runScored % 2 === 1 ? nonStrikerId : strikerId,
    bowlerId,
  });

  // create player's performance table entries
  try {
    const bowlerPerformance = await getPlayerMatchPerformance(
      bowlerId,
      matchId
    );
    if (!bowlerPerformance) {
      createPlayerPerformanceAction({
        playerId: bowlerId,
        matchId,
        teamId,
      });
    }
  } catch (error) {
    // DO NOTHING
  }
  // revalidatePath(`/play/matches/${matchId}/${inningsId}/${ballId}`);
  // redirect(`/play/matches/${matchId}/${inningsId}/${ballId}`);
}
