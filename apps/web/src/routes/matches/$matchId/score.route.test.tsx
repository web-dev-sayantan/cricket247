import { beforeEach, describe, expect, it, mock } from "bun:test";
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
const recordScoringDelivery = mock(async () => createScoringSetup("scoring"));
const updateScoringDelivery = mock(async () => createScoringSetup("scoring"));
const deleteScoringDelivery = mock(async () => createScoringSetup("scoring"));
const closeCurrentScoringInnings = mock(async () =>
  createScoringSetup("scoring")
);

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
      call: async () => currentScoringSetup,
      queryOptions: ({ input }: { input: { matchId: number } }) => ({
        queryKey: ["getMatchScoringSetup", input.matchId],
        queryFn: async () => currentScoringSetup,
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

function createScoringSetup(phase: "inningsSetup" | "lineup" | "scoring") {
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
      dismissedPlayerId: null,
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
  };
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

  await act(async () => {
    renderResult = render(<routerModule.RouterProvider router={router} />);
    await router.load();
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
  it("does not render the pre-match branch during the scoring phase", async () => {
    currentScoringSetup = createScoringSetup("scoring");

    const { findByText, queryByText } = await renderScoreRoute();

    expect(await findByText("Current innings")).toBeTruthy();
    expect(queryByText("Loading match setup...")).toBeNull();
    expect(queryByText("Choose playing lineups")).toBeNull();
  });

  it("renders the lazy-loaded setup flow through the Suspense fallback for pre-match phases", async () => {
    currentScoringSetup = createScoringSetup("lineup");
    shouldDelayPreMatchSetupFlow = true;

    const { findByText, getByText } = await renderScoreRoute();

    expect(getByText("Loading match setup...")).toBeTruthy();
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
});
