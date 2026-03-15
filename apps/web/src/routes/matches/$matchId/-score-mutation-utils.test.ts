import { describe, expect, it } from "bun:test";
import type { QueryClient } from "@tanstack/react-query";
import {
  applyScoringSessionMutationResult,
  buildBackgroundScoreRefreshQueries,
} from "./-score-mutation-utils";

describe("score mutation utils", () => {
  it("writes the returned scoring session to cache before invalidating related queries", () => {
    const callOrder: string[] = [];
    const setQueryData = ((queryKey: readonly unknown[]) => {
      callOrder.push("setQueryData");
      return queryKey;
    }) as Pick<QueryClient, "setQueryData">["setQueryData"];
    const invalidateQueries = ((filters) => {
      callOrder.push(`invalidate:${String(filters?.queryKey?.[0])}`);
      return Promise.resolve();
    }) as Pick<QueryClient, "invalidateQueries">["invalidateQueries"];

    const session = {
      canCurrentUserScore: true,
      currentInnings: null,
      entryContext: {
        ballInOver: 1,
        battingTeamId: null,
        bowlerId: null,
        bowlingTeamId: null,
        dismissedPlayerId: null,
        inningsId: null,
        inningsNumber: null,
        nonStrikerId: null,
        overNumber: 1,
        strikerId: null,
      },
      innings: [],
      lineupComplete: false,
      match: {},
      matchRules: {},
      nextInningsDefaults: null,
      phase: "scoring",
      playersPerSide: 11,
      requiredSelections: {
        battingTeam: false,
        bowler: false,
        bowlingTeam: false,
        nonStriker: false,
        striker: false,
      },
      savedLineup: {},
      team1Roster: [],
      team2Roster: [],
      teamLineupPlayers: {
        team1: [],
        team2: [],
      },
      availableBatters: [],
      availableBowlers: [],
    } as unknown as Parameters<
      typeof applyScoringSessionMutationResult
    >[0]["session"];

    const invalidationTasks = applyScoringSessionMutationResult({
      backgroundQueries: [
        { queryKey: ["matchById"] },
        { queryKey: ["liveMatches"] },
      ],
      queryClient: {
        invalidateQueries,
        setQueryData,
      },
      scoringQuery: { queryKey: ["scoringSetup"] },
      session,
    });

    expect(callOrder).toEqual([
      "setQueryData",
      "invalidate:matchById",
      "invalidate:liveMatches",
    ]);
    expect(invalidationTasks).toHaveLength(2);
  });

  it("adds tournament fixtures to the background refresh set only when a tournament id exists", () => {
    expect(
      buildBackgroundScoreRefreshQueries({
        matchId: 12,
      })
    ).toHaveLength(3);

    expect(
      buildBackgroundScoreRefreshQueries({
        matchId: 12,
        tournamentId: 7,
      })
    ).toHaveLength(4);
  });
});
