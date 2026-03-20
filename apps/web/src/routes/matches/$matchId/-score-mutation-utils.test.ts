import { describe, expect, it } from "bun:test";
import type { AppRouterClient } from "@cricket247/server/contract";
import { patchScoringSetupWithMutationResult } from "@/routes/matches/$matchId/-score-mutation-utils";

type ScoringSetupResult = Awaited<
  ReturnType<AppRouterClient["getMatchScoringSetup"]>
>;
type ResolvedScoringSetupResult = Exclude<ScoringSetupResult, null>;

function createScoringSetup(): ResolvedScoringSetupResult {
  return {
    availableBatters: [],
    availableBowlers: [],
    canCurrentUserScore: true,
    currentInnings: {
      ballsBowled: 0,
      battingTeam: {
        name: "Knights",
        shortName: "KNI",
      },
      battingTeamId: 1,
      bowlingTeamId: 2,
      deliveries: [],
      id: 501,
      inningsNumber: 1,
      isCompleted: false,
      targetRuns: null,
      totalScore: 0,
      wickets: 0,
    },
    entryContext: {
      ballInOver: 1,
      battingTeamId: 1,
      bowlerId: 21,
      bowlingTeamId: 2,
      dismissedPlayerId: null,
      inningsId: 501,
      inningsNumber: 1,
      nonStrikerId: 12,
      overNumber: 1,
      strikerId: 11,
    },
    innings: [
      {
        ballsBowled: 0,
        battingTeam: {
          shortName: "KNI",
        },
        battingTeamId: 1,
        bowlingTeamId: 2,
        id: 501,
        inningsNumber: 1,
        isCompleted: false,
        targetRuns: null,
        totalScore: 0,
        wickets: 0,
      },
    ],
    lineupComplete: true,
    match: {
      format: "T20",
      hasBoundaryOut: true,
      hasBye: true,
      hasLBW: true,
      hasLegBye: true,
      hasNoBalls: true,
      hasPenaltyRuns: true,
      hasWides: true,
      id: 42,
      inningsPerSide: 1,
      isCompleted: false,
      isLive: true,
      isTied: false,
      margin: null,
      oversPerSide: 20,
      result: null,
      team1: {
        name: "Knights",
        shortName: "KNI",
      },
      team1Id: 1,
      team2: {
        name: "Warriors",
        shortName: "WAR",
      },
      team2Id: 2,
      tossDecision: "bat",
      tossWinnerId: 1,
      tournamentId: 7,
      winnerId: null,
    },
    matchRules: {
      ballsPerOver: 6,
    },
    nextInningsDefaults: null,
    phase: "scoring" as const,
    playersPerSide: 2,
    requiredSelections: {
      battingTeam: false,
      bowler: false,
      bowlingTeam: false,
      nonStriker: false,
      striker: false,
    },
    savedLineup: {
      team1: { playerIds: [11, 12] },
      team2: { playerIds: [21, 22] },
    },
    team1Roster: [],
    team2Roster: [],
    teamLineupPlayers: {
      team1: [
        { battingOrder: 1, id: 11, name: "A One", teamId: 1 },
        { battingOrder: 2, id: 12, name: "A Two", teamId: 1 },
      ],
      team2: [
        { battingOrder: 1, id: 21, name: "B One", teamId: 2 },
        { battingOrder: 2, id: 22, name: "B Two", teamId: 2 },
      ],
    },
  } as unknown as ResolvedScoringSetupResult;
}

describe("patchScoringSetupWithMutationResult", () => {
  it("appends a recorded delivery and updates the active innings state", () => {
    const previous = createScoringSetup();

    const next = patchScoringSetupWithMutationResult({
      mutation: {
        action: "record",
        affectedInnings: {
          ballsBowled: 1,
          battingTeamId: 1,
          bowlingTeamId: 2,
          id: 501,
          inningsNumber: 1,
          isCompleted: false,
          targetRuns: null,
          totalScore: 1,
          wickets: 0,
        },
        availableBatters: [
          { battingOrder: 3, id: 13, name: "A Three", teamId: 1 },
        ],
        availableBowlers: [
          { battingOrder: 1, id: 21, name: "B One", teamId: 2 },
        ],
        currentInnings: {
          ballsBowled: 1,
          battingTeamId: 1,
          bowlingTeamId: 2,
          id: 501,
          inningsNumber: 1,
          isCompleted: false,
          targetRuns: null,
          totalScore: 1,
          wickets: 0,
        },
        deletedDeliveryId: null,
        delivery: {
          assistedById: null,
          ballInOver: 1,
          batterRuns: 1,
          bowlerId: 21,
          byeRuns: 0,
          dismissedById: null,
          dismissedPlayerId: null,
          id: 9001,
          inningsId: 501,
          isLegalDelivery: true,
          isWicket: false,
          legByeRuns: 0,
          noBallRuns: 0,
          nonStrikerId: 12,
          overNumber: 1,
          penaltyRuns: 0,
          sequenceNo: 1,
          strikerId: 11,
          totalRuns: 1,
          wicketType: null,
          wideRuns: 0,
        },
        entryContext: {
          ballInOver: 2,
          battingTeamId: 1,
          bowlerId: 21,
          bowlingTeamId: 2,
          dismissedPlayerId: null,
          inningsId: 501,
          inningsNumber: 1,
          nonStrikerId: 11,
          overNumber: 1,
          strikerId: 12,
        },
        match: {
          isCompleted: false,
          isLive: true,
          isTied: false,
          margin: null,
          result: null,
          winnerId: null,
        },
        nextInningsDefaults: null,
        phase: "scoring",
        requiredSelections: {
          battingTeam: false,
          bowler: false,
          bowlingTeam: false,
          nonStriker: false,
          striker: false,
        },
      },
      previous,
    });

    expect(next?.currentInnings?.deliveries).toHaveLength(1);
    expect(next?.currentInnings?.totalScore).toBe(1);
    expect(next?.entryContext.strikerId).toBe(12);
    expect(next?.innings[0]?.totalScore).toBe(1);
  });

  it("removes a deleted delivery without dropping the rest of the scoring setup", () => {
    const baseSetup = createScoringSetup();
    const currentInnings = baseSetup.currentInnings;
    if (!currentInnings) {
      throw new Error("Expected an active innings in the test fixture");
    }
    const previous = {
      ...baseSetup,
      currentInnings: {
        ...currentInnings,
        deliveries: [
          {
            assistedById: null,
            ballInOver: 1,
            batterRuns: 0,
            bowlerId: 21,
            byeRuns: 0,
            dismissedPlayerId: null,
            id: 9001,
            inningsId: 501,
            isWicket: false,
            legByeRuns: 0,
            noBallRuns: 0,
            nonStrikerId: 12,
            overNumber: 1,
            penaltyRuns: 0,
            sequenceNo: 1,
            strikerId: 11,
            totalRuns: 0,
            wicketType: null,
            wideRuns: 0,
          },
        ],
      },
    } as unknown as ResolvedScoringSetupResult;

    const next = patchScoringSetupWithMutationResult({
      mutation: {
        action: "delete",
        affectedInnings: {
          ballsBowled: 0,
          battingTeamId: 1,
          bowlingTeamId: 2,
          id: 501,
          inningsNumber: 1,
          isCompleted: false,
          targetRuns: null,
          totalScore: 0,
          wickets: 0,
        },
        availableBatters: [],
        availableBowlers: [],
        currentInnings: {
          ballsBowled: 0,
          battingTeamId: 1,
          bowlingTeamId: 2,
          id: 501,
          inningsNumber: 1,
          isCompleted: false,
          targetRuns: null,
          totalScore: 0,
          wickets: 0,
        },
        deletedDeliveryId: 9001,
        delivery: null,
        entryContext: previous.entryContext,
        match: {
          isCompleted: false,
          isLive: true,
          isTied: false,
          margin: null,
          result: null,
          winnerId: null,
        },
        nextInningsDefaults: null,
        phase: "scoring",
        requiredSelections: previous.requiredSelections,
      },
      previous,
    });

    expect(next?.currentInnings?.deliveries).toHaveLength(0);
    expect(next?.match.team1?.shortName).toBe("KNI");
  });
});
