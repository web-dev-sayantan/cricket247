import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AppRouterClient } from "@cricket247/server/contract";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  type RenderResult,
  render,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";

mock.module("@/components/header", () => ({
  default: () => null,
}));

let shouldDelayPreMatchSetupFlow = false;

mock.module(
  "@/routes/matches/$matchId/-components/pre-match-setup-flow",
  async () => {
    const [{ LineupPhaseCard }, { TossPhaseCard }, { InningsSetupPhaseCard }] =
      await Promise.all([
        import("@/routes/matches/$matchId/-components/lineup-phase-card"),
        import("@/routes/matches/$matchId/-components/toss-phase-card"),
        import(
          "@/routes/matches/$matchId/-components/innings-setup-phase-card"
        ),
      ]);

    if (shouldDelayPreMatchSetupFlow) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return {
      PreMatchSetupFlow({
        inningsSetup,
        lineup,
        phase,
        toss,
      }: {
        inningsSetup: Parameters<typeof InningsSetupPhaseCard>[0];
        lineup: Parameters<typeof LineupPhaseCard>[0];
        phase: "inningsSetup" | "lineup" | "toss";
        toss: Parameters<typeof TossPhaseCard>[0];
      }) {
        switch (phase) {
          case "lineup":
            return <LineupPhaseCard {...lineup} />;
          case "toss":
            return <TossPhaseCard {...toss} />;
          case "inningsSetup":
            return <InningsSetupPhaseCard {...inningsSetup} />;
          default:
            return null;
        }
      },
    };
  }
);

mock.module("@/lib/auth-client", () => ({
  authClient: {},
}));

mock.module("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}));

mock.module("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtoolsPanel: () => null,
}));

mock.module("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));

mock.module("@tanstack/react-form-devtools", () => ({
  FormDevtoolsPanel: () => null,
}));

const toastSuccess = mock(() => undefined);
const toastError = mock(() => undefined);

mock.module("sonner", () => ({
  Toaster: () => null,
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

const saveMatchLineup = mock(async () => undefined);
const startScoringInnings = mock(async () => createScoringSetup("scoring"));
const recordScoringDelivery = mock(async () =>
  createScoringMutationResult("record")
);
const updateScoringDelivery = mock(async () =>
  createScoringMutationResult("update")
);
const deleteScoringDelivery = mock(async () =>
  createScoringMutationResult("delete")
);
const closeCurrentScoringInnings = mock(async () =>
  createScoringSetup("scoring")
);
const getMatchScoringSetup = mock(async () => currentScoringSetup);

let currentScoringSetup = createScoringSetup("lineup");

mock.module("@/utils/orpc", () => ({
  client: {
    closeCurrentScoringInnings,
    deleteScoringDelivery,
    recordScoringDelivery,
    saveMatchLineup,
    startScoringInnings,
    updateScoringDelivery,
  },
  orpc: {
    getMatchById: {
      queryOptions: ({ input }: { input: number }) => ({
        queryKey: ["getMatchById", input],
      }),
    },
    getMatchScorecard: {
      queryOptions: ({
        input,
      }: {
        input: { includeBallByBall: boolean; matchId: number };
      }) => ({
        queryKey: ["getMatchScorecard", input.matchId, input.includeBallByBall],
      }),
    },
    getMatchScoringSetup: {
      queryOptions: ({ input }: { input: { matchId: number } }) => ({
        queryKey: ["getMatchScoringSetup", input.matchId],
        queryFn: getMatchScoringSetup,
      }),
    },
    liveMatches: {
      queryOptions: () => ({
        queryKey: ["liveMatches"],
      }),
    },
    tournamentFixtures: {
      queryOptions: ({ input }: { input: { tournamentId: number } }) => ({
        queryKey: ["tournamentFixtures", input.tournamentId],
      }),
    },
  },
  queryClient: new QueryClient(),
}));

const routeTreeModulePromise = import("@/routeTree.gen");
const routerModulePromise = import("@tanstack/react-router");
const orpcModulePromise = import("@/utils/orpc");

type RouteScoringMutationResult = Awaited<
  ReturnType<AppRouterClient["recordScoringDelivery"]>
>;
type RouteScoringSetup = Exclude<
  Awaited<ReturnType<AppRouterClient["getMatchScoringSetup"]>>,
  null
>;

function createScoringSetup(
  phase: "inningsSetup" | "lineup" | "scoring"
): RouteScoringSetup {
  const team1Roster = [
    {
      isCaptain: false,
      isViceCaptain: false,
      name: "A One",
      playerId: 11,
      role: "Batter",
      teamId: 1,
    },
    {
      isCaptain: false,
      isViceCaptain: false,
      name: "A Two",
      playerId: 12,
      role: "All-rounder",
      teamId: 1,
    },
  ];
  const team2Roster = [
    {
      isCaptain: false,
      isViceCaptain: false,
      name: "B One",
      playerId: 21,
      role: "Bowler",
      teamId: 2,
    },
    {
      isCaptain: false,
      isViceCaptain: false,
      name: "B Two",
      playerId: 22,
      role: "Batter",
      teamId: 2,
    },
  ];

  return {
    availableBatters: [],
    availableBowlers: [],
    canCurrentUserScore: true,
    currentInnings:
      phase === "scoring"
        ? {
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
          }
        : null,
    entryContext: {
      ballInOver: 1,
      battingTeamId: phase === "scoring" ? 1 : null,
      bowlerId: phase === "scoring" ? 21 : null,
      bowlingTeamId: phase === "scoring" ? 2 : null,
      dismissedPlayerId: null as null | number,
      inningsId: phase === "scoring" ? 501 : null,
      inningsNumber: phase === "scoring" ? 1 : null,
      nonStrikerId: phase === "scoring" ? 12 : null,
      overNumber: 1,
      strikerId: phase === "scoring" ? 11 : null,
    },
    innings:
      phase === "scoring"
        ? [
            {
              ballsBowled: 0,
              battingTeam: {
                shortName: "KNI",
              },
              id: 501,
              inningsNumber: 1,
              isCompleted: false,
              totalScore: 0,
              wickets: 0,
            },
          ]
        : [],
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
      tossDecision: phase === "inningsSetup" ? "bat" : null,
      tossWinnerId: phase === "inningsSetup" ? 1 : null,
      tournamentId: null,
    },
    matchRules: {
      ballsPerOver: 6,
    },
    nextInningsDefaults:
      phase === "scoring"
        ? null
        : {
            battingTeamId: 1,
            bowlingTeamId: 2,
          inningsNumber: 1,
        },
    pendingInningsClosure: null,
    phase,
    playersPerSide: 2,
    requiredSelections: {
      battingTeam: false,
      bowler: false,
      bowlingTeam: false,
      nonStriker: false,
      striker: false,
    },
    savedLineup: {
      team1: {
        playerIds: [11, 12],
      },
      team2: {
        playerIds: [21, 22],
      },
    },
    team1Roster,
    team2Roster,
    teamLineupPlayers: {
      team1: team1Roster.map((player, index) => ({
        battingOrder: index + 1,
        id: player.playerId,
        name: player.name,
        teamId: player.teamId,
      })),
      team2: team2Roster.map((player, index) => ({
        battingOrder: index + 1,
        id: player.playerId,
        name: player.name,
        teamId: player.teamId,
      })),
    },
  } as unknown as RouteScoringSetup;
}

function createScoringMutationResult(
  action: "delete" | "record" | "update"
): RouteScoringMutationResult {
  return {
    action,
    affectedInnings: {
      ballsBowled: action === "delete" ? 0 : 1,
      battingTeamId: 1,
      bowlingTeamId: 2,
      id: 501,
      inningsNumber: 1,
      isCompleted: false,
      targetRuns: null,
      totalScore: action === "delete" ? 0 : 1,
      wickets: 0,
    },
    availableBatters: [],
    availableBowlers: [{ battingOrder: 1, id: 21, name: "B One", teamId: 2 }],
    currentInnings: {
      ballsBowled: action === "delete" ? 0 : 1,
      battingTeamId: 1,
      bowlingTeamId: 2,
      id: 501,
      inningsNumber: 1,
      isCompleted: false,
      targetRuns: null,
      totalScore: action === "delete" ? 0 : 1,
      wickets: 0,
    },
    deletedDeliveryId: action === "delete" ? 9001 : null,
    delivery:
      action === "delete"
        ? null
        : {
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
      ballInOver: action === "delete" ? 1 : 2,
      battingTeamId: 1,
      bowlerId: 21,
      bowlingTeamId: 2,
      dismissedPlayerId: null as null | number,
      inningsId: 501,
      inningsNumber: 1,
      nonStrikerId: action === "delete" ? 12 : 11,
      overNumber: 1,
      strikerId: action === "delete" ? 11 : 12,
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
    pendingInningsClosure: null,
    phase: "scoring" as const,
    requiredSelections: {
      battingTeam: false,
      bowler: false,
      bowlingTeam: false,
      nonStriker: false,
      striker: false,
    },
  } as unknown as RouteScoringMutationResult;
}

function createPendingScoringMutationResult(): RouteScoringMutationResult {
  const base = createScoringMutationResult("record");

  return {
    ...base,
    pendingInningsClosure: {
      deliveryId: 9001,
      inningsId: 501,
      reason: "max_balls" as const,
    },
  };
}

function createPendingClosureScoringSetup(): RouteScoringSetup {
  const base = createScoringSetup("scoring");

  return {
    ...base,
    currentInnings: base.currentInnings
      ? {
          ...base.currentInnings,
          ballsBowled: 120,
          deliveries: [
            {
              assistedById: null,
              ballInOver: 6,
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
              overNumber: 20,
              penaltyRuns: 0,
              sequenceNo: 120,
              strikerId: 11,
              totalRuns: 1,
              wicketType: null,
              wideRuns: 0,
            },
          ],
          totalScore: 1,
        }
      : null,
    innings: [
      {
        ballsBowled: 120,
        battingTeam: {
          shortName: "KNI",
        },
        id: 501,
        inningsNumber: 1,
        isCompleted: false,
        totalScore: 1,
        wickets: 0,
      },
    ],
    pendingInningsClosure: {
      deliveryId: 9001,
      inningsId: 501,
      reason: "max_balls" as const,
    },
  } as unknown as RouteScoringSetup;
}

async function renderScoreRoute(): Promise<RenderResult & { router: unknown }> {
  const [{ routeTree }, routerModule, { orpc }] = await Promise.all([
    routeTreeModulePromise,
    routerModulePromise,
    orpcModulePromise,
  ]);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = routerModule.createRouter({
    routeTree,
    history: routerModule.createMemoryHistory({
      initialEntries: ["/matches/42/score"],
    }),
    context: { orpc, queryClient },
    Wrap({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
  let renderResult: null | RenderResult = null;

  act(() => {
    renderResult = render(<routerModule.RouterProvider router={router} />);
  });

  if (!renderResult) {
    throw new Error("Route render did not initialize");
  }

  const resolvedRenderResult = renderResult;

  return Object.assign(resolvedRenderResult, { router });
}

beforeEach(() => {
  currentScoringSetup = createScoringSetup("lineup");
  shouldDelayPreMatchSetupFlow = false;
  mock.clearAllMocks();
});

describe("score route pre-match extraction", () => {
  it("fetches the scoring setup exactly once on initial load", async () => {
    const { findByText } = await renderScoreRoute();

    expect(await findByText("Choose playing lineups")).toBeTruthy();
    expect(getMatchScoringSetup).toHaveBeenCalledTimes(1);
  });

  it("does not render the pre-match branch during the scoring phase", async () => {
    currentScoringSetup = createScoringSetup("scoring");

    const { findByText, queryByText } = await renderScoreRoute();

    expect(await findByText("Current innings")).toBeTruthy();
    expect(queryByText("Loading match setup...")).toBeNull();
    expect(queryByText("Choose playing lineups")).toBeNull();
  });

  it("renders the lazy-loaded setup flow for pre-match phases", async () => {
    currentScoringSetup = createScoringSetup("lineup");
    shouldDelayPreMatchSetupFlow = true;

    const { findByText } = await renderScoreRoute();

    expect(await findByText("Choose playing lineups")).toBeTruthy();
  });

  it("preserves lineup save and innings start mutation payloads from the extracted components", async () => {
    currentScoringSetup = createScoringSetup("lineup");

    const lineupRender = await renderScoreRoute();
    fireEvent.click(
      await lineupRender.findByRole("button", { name: "Save playing lineups" })
    );

    await waitFor(() =>
      expect(saveMatchLineup).toHaveBeenCalledWith({
        matchId: 42,
        team1: {
          playerIds: [11, 12],
        },
        team2: {
          playerIds: [21, 22],
        },
      })
    );
    lineupRender.unmount();

    currentScoringSetup = createScoringSetup("inningsSetup");
    const inningsRender = await renderScoreRoute();
    const startButton = await inningsRender.findByRole("button", {
      name: "Start innings",
    });

    await waitFor(() =>
      expect((startButton as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(startButton);

    await waitFor(() =>
      expect(startScoringInnings).toHaveBeenCalledWith({
        battingTeamId: 1,
        bowlingTeamId: 2,
        inningsNumber: 1,
        matchId: 42,
        nonStrikerId: 12,
        openingBowlerId: 21,
        strikerId: 11,
        tossDecision: "bat",
        tossWinnerId: 1,
      })
    );
  });

  it("does not forward a dismissed player from the previous ball into the next delivery", async () => {
    const scoringSetup = createScoringSetup("scoring");

    currentScoringSetup = {
      ...scoringSetup,
      entryContext: {
        ...scoringSetup.entryContext,
        dismissedPlayerId: 63 as number | null,
      },
    } as unknown as RouteScoringSetup;

    const { findAllByRole } = await renderScoreRoute();
    const recordButtons = await findAllByRole("button", {
      name: "Record delivery",
    });
    const scoringButton = recordButtons.at(-1);

    if (!scoringButton) {
      throw new Error("Scoring submit button not found");
    }

    fireEvent.click(scoringButton);

    await waitFor(() =>
      expect(recordScoringDelivery).toHaveBeenCalledWith({
        inningsId: 501,
        strikerId: 11,
        nonStrikerId: 12,
        bowlerId: 21,
        batterRuns: 0,
        wideRuns: 0,
        noBallRuns: 0,
        byeRuns: 0,
        legByeRuns: 0,
        penaltyRuns: 0,
        wicketType: undefined,
      })
    );
  });

  it("opens the shared confirmation dialog when a recorded delivery requires innings-end confirmation", async () => {
    currentScoringSetup = createScoringSetup("scoring");
    recordScoringDelivery.mockImplementationOnce(async () =>
      createPendingScoringMutationResult()
    );

    const { findAllByRole, findByText, findByRole } = await renderScoreRoute();
    const recordButtons = await findAllByRole("button", {
      name: "Record delivery",
    });
    const scoringButton = recordButtons.at(-1);

    if (!scoringButton) {
      throw new Error("Scoring submit button not found");
    }

    fireEvent.click(scoringButton);

    expect(await findByText("End this innings?")).toBeTruthy();
    expect(
      await findByRole("button", { name: "No, review last ball" })
    ).toBeTruthy();
    expect(
      await findByRole("button", { name: "Yes, end innings" })
    ).toBeTruthy();
  });

  it("returns to the last ball in edit mode when the scorer declines the auto-end prompt", async () => {
    currentScoringSetup = createScoringSetup("scoring");
    recordScoringDelivery.mockImplementationOnce(async () =>
      createPendingScoringMutationResult()
    );

    const { findAllByRole, findByRole, queryByText } = await renderScoreRoute();
    const recordButtons = await findAllByRole("button", {
      name: "Record delivery",
    });
    const scoringButton = recordButtons.at(-1);

    if (!scoringButton) {
      throw new Error("Scoring submit button not found");
    }

    fireEvent.click(scoringButton);
    fireEvent.click(await findByRole("button", { name: "No, review last ball" }));

    expect(await findByRole("button", { name: "Update delivery" })).toBeTruthy();
    expect(queryByText("End this innings?")).toBeNull();
  });

  it("confirms the innings end from the auto-end dialog", async () => {
    currentScoringSetup = createScoringSetup("scoring");
    recordScoringDelivery.mockImplementationOnce(async () =>
      createPendingScoringMutationResult()
    );

    const { findAllByRole, findByRole } = await renderScoreRoute();
    const recordButtons = await findAllByRole("button", {
      name: "Record delivery",
    });
    const scoringButton = recordButtons.at(-1);

    if (!scoringButton) {
      throw new Error("Scoring submit button not found");
    }

    fireEvent.click(scoringButton);
    fireEvent.click(await findByRole("button", { name: "Yes, end innings" }));

    await waitFor(() =>
      expect(closeCurrentScoringInnings).toHaveBeenCalledWith({
        inningsId: 501,
      })
    );
  });

  it("reuses the same dialog for manual innings end", async () => {
    currentScoringSetup = createScoringSetup("scoring");

    const { findByRole, findByText } = await renderScoreRoute();

    fireEvent.click(await findByRole("button", { name: "End innings" }));

    expect(await findByText("End this innings?")).toBeTruthy();
    fireEvent.click(await findByRole("button", { name: "Yes, end innings" }));

    await waitFor(() =>
      expect(closeCurrentScoringInnings).toHaveBeenCalledWith({
        inningsId: 501,
      })
    );
  });

  it("restores pending-closure review state on load", async () => {
    currentScoringSetup = createPendingClosureScoringSetup();

    const { findByRole } = await renderScoreRoute();

    expect(await findByRole("button", { name: "Update delivery" })).toBeTruthy();
    expect(
      (await findByRole("button", { name: "Record delivery" }))
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
