export type ScoringStep = "lineup" | "openingSelection" | "scoring" | "toss";

export function resolveScoringStep(params: {
  hasCurrentInnings: boolean;
  hasToss: boolean;
  lineupComplete: boolean;
}): ScoringStep {
  if (!params.lineupComplete) {
    return "lineup";
  }

  if (params.hasCurrentInnings) {
    return "scoring";
  }

  if (!params.hasToss) {
    return "toss";
  }

  return "openingSelection";
}

export function resolveBattingAndBowlingTeamIds(params: {
  team1Id?: number | null;
  team2Id?: number | null;
  tossDecision?: null | string;
  tossWinnerId?: number | null;
}) {
  if (
    typeof params.team1Id !== "number" ||
    typeof params.team2Id !== "number" ||
    typeof params.tossWinnerId !== "number" ||
    (params.tossDecision !== "bat" && params.tossDecision !== "bowl")
  ) {
    return null;
  }

  if (![params.team1Id, params.team2Id].includes(params.tossWinnerId)) {
    return null;
  }

  const tossLoserId =
    params.tossWinnerId === params.team1Id ? params.team2Id : params.team1Id;

  if (params.tossDecision === "bat") {
    return {
      battingTeamId: params.tossWinnerId,
      bowlingTeamId: tossLoserId,
    };
  }

  return {
    battingTeamId: tossLoserId,
    bowlingTeamId: params.tossWinnerId,
  };
}

export function calculateNextCreaseState(params: {
  ballsPerOver: number;
  currentBallInOver: number;
  isNoBall: boolean;
  isWide: boolean;
  nonStrikerId: number;
  runsScored: number;
  strikerId: number;
}) {
  const legalDelivery = !(params.isNoBall || params.isWide);
  const extraRuns = params.isNoBall || params.isWide ? 1 : 0;
  const totalRuns = params.runsScored + extraRuns;
  const rotateOnRuns = totalRuns % 2 === 1;
  const nextAtCrease = rotateOnRuns
    ? {
        nextStrikerId: params.nonStrikerId,
        nextNonStrikerId: params.strikerId,
      }
    : {
        nextStrikerId: params.strikerId,
        nextNonStrikerId: params.nonStrikerId,
      };

  const isOverComplete =
    legalDelivery && params.currentBallInOver >= params.ballsPerOver;

  if (!isOverComplete) {
    return {
      ...nextAtCrease,
      isOverComplete,
    };
  }

  return {
    nextStrikerId: nextAtCrease.nextNonStrikerId,
    nextNonStrikerId: nextAtCrease.nextStrikerId,
    isOverComplete,
  };
}
