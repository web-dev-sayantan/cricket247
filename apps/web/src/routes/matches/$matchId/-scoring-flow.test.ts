import { describe, expect, it } from "bun:test";
import {
  calculateNextCreaseState,
  resolveBattingAndBowlingTeamIds,
  resolveScoringStep,
} from "./-scoring-flow";

describe("scoring flow helpers", () => {
  it("resolves setup steps in expected order", () => {
    expect(
      resolveScoringStep({
        lineupComplete: false,
        hasToss: false,
        hasCurrentInnings: false,
      })
    ).toBe("lineup");

    expect(
      resolveScoringStep({
        lineupComplete: true,
        hasToss: false,
        hasCurrentInnings: false,
      })
    ).toBe("toss");

    expect(
      resolveScoringStep({
        lineupComplete: true,
        hasToss: true,
        hasCurrentInnings: false,
      })
    ).toBe("openingSelection");

    expect(
      resolveScoringStep({
        lineupComplete: true,
        hasToss: true,
        hasCurrentInnings: true,
      })
    ).toBe("scoring");
  });

  it("derives batting and bowling teams from toss data", () => {
    expect(
      resolveBattingAndBowlingTeamIds({
        team1Id: 10,
        team2Id: 20,
        tossWinnerId: 10,
        tossDecision: "bat",
      })
    ).toEqual({
      battingTeamId: 10,
      bowlingTeamId: 20,
    });

    expect(
      resolveBattingAndBowlingTeamIds({
        team1Id: 10,
        team2Id: 20,
        tossWinnerId: 10,
        tossDecision: "bowl",
      })
    ).toEqual({
      battingTeamId: 20,
      bowlingTeamId: 10,
    });
  });

  it("rotates strike correctly on over completion", () => {
    expect(
      calculateNextCreaseState({
        ballsPerOver: 6,
        currentBallInOver: 6,
        strikerId: 1,
        nonStrikerId: 2,
        runsScored: 1,
        isWide: false,
        isNoBall: false,
      })
    ).toEqual({
      isOverComplete: true,
      nextStrikerId: 1,
      nextNonStrikerId: 2,
    });

    expect(
      calculateNextCreaseState({
        ballsPerOver: 6,
        currentBallInOver: 6,
        strikerId: 1,
        nonStrikerId: 2,
        runsScored: 0,
        isWide: false,
        isNoBall: false,
      })
    ).toEqual({
      isOverComplete: true,
      nextStrikerId: 2,
      nextNonStrikerId: 1,
    });
  });
});
