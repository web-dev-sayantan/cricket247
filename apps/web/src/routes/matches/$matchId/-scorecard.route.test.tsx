import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
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

mock.module("sonner", () => ({
  Toaster: () => null,
  toast: {
    error: () => undefined,
  },
}));

interface MockScorecard {
  canCurrentUserScore: boolean;
  innings: Array<{
    batting: Array<{
      assistedBy: { id: number; name: string } | null;
      ballsFaced: number;
      dismissalType: string | null;
      dismissedBy: { id: number; name: string } | null;
      fours: number;
      player: { id: number; name: string };
      runs: number;
      sixes: number;
      status: "did_not_bat" | "not_out" | "out";
      strikeRate: number;
    }>;
    battingTeam: {
      id: number;
      name: string;
      shortName: string;
    };
    bowling: Array<{
      dotBalls: number;
      economy: number;
      overs: string;
      player: { id: number; name: string };
      runsConceded: number;
      wicketsTaken: number;
    }>;
    currentParticipants: {
      bowlerId: number | null;
      nonStrikerId: number | null;
      strikerId: number | null;
    };
    extras: {
      byes: number;
      legByes: number;
      noBalls: number;
      penaltyRuns: number;
      total: number;
      wides: number;
    };
    fallOfWickets: Array<{
      batter: { id: number; name: string } | null;
      over: string;
      score: number;
      wicketNumber: number;
    }>;
    id: number;
    summary: {
      overs: string;
      status: string;
      target: number | null;
      totalScore: number;
      wickets: number;
    };
  }>;
  match: {
    format: string;
    isLive: boolean;
    oversPerSide: number;
    result: string | null;
    team1: { shortName: string } | null;
    team2: { shortName: string } | null;
  };
}

const scorecardDelayState = {
  milliseconds: 0,
};
const scorecardsByMatchId = new Map<number, MockScorecard | null>();
const getMatchScorecard = mock(
  async (input: { includeBallByBall: boolean; matchId: number }) => {
    if (scorecardDelayState.milliseconds > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, scorecardDelayState.milliseconds)
      );
    }

    return scorecardsByMatchId.get(input.matchId) ?? null;
  }
);

let scorecardRouteImportNonce = 0;

function createScorecard(matchId: number, teamShortNames: [string, string]) {
  return {
    canCurrentUserScore: true,
    innings: [
      {
        batting: [
          {
            assistedBy: null,
            ballsFaced: 12,
            dismissalType: null,
            dismissedBy: null,
            fours: 2,
            player: { id: matchId * 10 + 1, name: "Alpha Batter" },
            runs: 18,
            sixes: 1,
            status: "not_out" as const,
            strikeRate: 150,
          },
          {
            assistedBy: null,
            ballsFaced: 5,
            dismissalType: null,
            dismissedBy: null,
            fours: 1,
            player: { id: matchId * 10 + 7, name: "Beta Partner" },
            runs: 6,
            sixes: 0,
            status: "not_out" as const,
            strikeRate: 120,
          },
        ],
        battingTeam: {
          id: matchId * 100 + 1,
          name: `${teamShortNames[0]} XI`,
          shortName: teamShortNames[0],
        },
        bowling: [
          {
            dotBalls: 6,
            economy: 4.5,
            overs: "2.0",
            player: { id: matchId * 10 + 2, name: "Bravo Bowler" },
            runsConceded: 9,
            wicketsTaken: 1,
          },
        ],
        currentParticipants: {
          bowlerId: matchId * 10 + 2,
          nonStrikerId: matchId * 10 + 7,
          strikerId: matchId * 10 + 1,
        },
        extras: {
          byes: 0,
          legByes: 0,
          noBalls: 0,
          penaltyRuns: 0,
          total: 1,
          wides: 1,
        },
        fallOfWickets: [],
        id: matchId * 1000 + 1,
        summary: {
          overs: "2.0",
          status: "in_progress",
          target: null,
          totalScore: 19,
          wickets: 1,
        },
      },
      {
        batting: [
          {
            assistedBy: { id: matchId * 10 + 4, name: "Charlie Catcher" },
            ballsFaced: 7,
            dismissalType: "caught",
            dismissedBy: { id: matchId * 10 + 3, name: "Delta Bowler" },
            fours: 1,
            player: { id: matchId * 10 + 5, name: "Second Batter" },
            runs: 9,
            sixes: 0,
            status: "out" as const,
            strikeRate: 128.57,
          },
        ],
        battingTeam: {
          id: matchId * 100 + 2,
          name: `${teamShortNames[1]} XI`,
          shortName: teamShortNames[1],
        },
        bowling: [
          {
            dotBalls: 5,
            economy: 6,
            overs: "1.0",
            player: { id: matchId * 10 + 6, name: "Echo Bowler" },
            runsConceded: 6,
            wicketsTaken: 1,
          },
        ],
        currentParticipants: {
          bowlerId: null,
          nonStrikerId: null,
          strikerId: null,
        },
        extras: {
          byes: 0,
          legByes: 0,
          noBalls: 0,
          penaltyRuns: 0,
          total: 0,
          wides: 0,
        },
        fallOfWickets: [
          {
            batter: { id: matchId * 10 + 5, name: "Second Batter" },
            over: "1.4",
            score: 9,
            wicketNumber: 1,
          },
        ],
        id: matchId * 1000 + 2,
        summary: {
          overs: "1.0",
          status: "completed",
          target: 20,
          totalScore: 9,
          wickets: 1,
        },
      },
    ],
    match: {
      format: "T20",
      isLive: true,
      oversPerSide: 20,
      result: null,
      team1: { shortName: teamShortNames[0] },
      team2: { shortName: teamShortNames[1] },
    },
  };
}

async function renderScorecardRoute(
  initialEntry = "/matches/42/scorecard"
): Promise<RenderResult & { router: ReturnType<typeof createRouter> }> {
  scorecardRouteImportNonce += 1;

  const [{ ScorecardPage }, { ScorecardLoadingSkeleton }] = await Promise.all([
    import(`./scorecard?scorecardRouteTest=${scorecardRouteImportNonce}`),
    import("@/routes/matches/$matchId/-components/scorecard-loading-skeleton"),
  ]);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const testOrpc = {
    getMatchScorecard: {
      queryOptions: ({
        input,
      }: {
        input: { includeBallByBall: boolean; matchId: number };
      }) => ({
        queryFn: () => getMatchScorecard(input),
        queryKey: ["getMatchScorecard", input.matchId, input.includeBallByBall],
      }),
    },
    liveMatches: {
      queryOptions: () => ({
        queryFn: async () => [],
        queryKey: ["liveMatches"],
      }),
    },
  };
  const rootRoute = createRootRoute();
  const matchesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "matches",
  });
  const matchRoute = createRoute({
    getParentRoute: () => matchesRoute,
    path: "$matchId",
  });
  const scoreRoute = createRoute({
    component: () => null,
    getParentRoute: () => matchRoute,
    path: "score",
  });
  const scorecardRoute = createRoute({
    component: () => {
      const { scorecard } = scorecardRoute.useLoaderData();
      const { matchId } = scorecardRoute.useParams();

      return <ScorecardPage matchId={matchId} scorecard={scorecard} />;
    },
    getParentRoute: () => matchRoute,
    loader: async ({ params }) => {
      const matchId = Number(params.matchId);
      const scorecard = await queryClient.ensureQueryData({
        ...testOrpc.getMatchScorecard.queryOptions({
          input: {
            includeBallByBall: false,
            matchId,
          },
        }),
        staleTime: 10_000,
      });

      return { scorecard };
    },
    path: "scorecard",
    pendingComponent: ScorecardLoadingSkeleton,
  });
  const routeTree = rootRoute.addChildren([
    matchesRoute.addChildren([
      matchRoute.addChildren([scoreRoute, scorecardRoute]),
    ]),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    context: {},
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
    renderResult = render(<RouterProvider router={router} />);
    await router.load();
  });

  if (!renderResult) {
    throw new Error("Route render did not initialize");
  }

  return Object.assign(renderResult, { router });
}

beforeEach(() => {
  scorecardDelayState.milliseconds = 0;
  scorecardsByMatchId.clear();
  scorecardsByMatchId.set(42, createScorecard(42, ["KNI", "WAR"]));
  scorecardsByMatchId.set(43, createScorecard(43, ["NEX", "COM"]));
  scorecardsByMatchId.set(404, null);
  mock.clearAllMocks();
});

describe("scorecard route", () => {
  it("renders the dedicated pending skeleton while the loader is unresolved", async () => {
    scorecardDelayState.milliseconds = 1500;

    const { container, findByRole, router } =
      await renderScorecardRoute("/matches");

    const navigation = router.navigate({
      params: { matchId: "42" },
      to: "/matches/$matchId/scorecard",
    });

    await waitFor(
      () =>
        expect(container.querySelector("main[aria-busy='true']")).toBeTruthy(),
      {
        timeout: 2000,
      }
    );
    await navigation;
    expect(await findByRole("heading", { name: "KNI vs WAR" })).toBeTruthy();
  });

  it("renders tab semantics and uses a single interactive back-to-scoring control", async () => {
    const { findAllByRole, findByRole, queryByRole } =
      await renderScorecardRoute();

    expect(
      await findByRole("tab", { name: "KNI Innings", selected: true })
    ).toBeTruthy();
    fireEvent.click(await findByRole("tab", { name: "WAR Innings" }));
    expect(
      await findByRole("tab", { name: "WAR Innings", selected: true })
    ).toBeTruthy();
    expect(
      (await findByRole("tabpanel")).getAttribute("aria-labelledby")
    ).toContain("innings-tab");
    expect(
      await findAllByRole("link", { name: "Back to scoring" })
    ).toHaveLength(1);
    expect(queryByRole("button", { name: "Back to scoring" })).toBeNull();
  });

  it("resets the selected innings when navigation loads a different match", async () => {
    const { findByRole, router } = await renderScorecardRoute();

    fireEvent.click(await findByRole("tab", { name: "WAR Innings" }));
    expect(
      await findByRole("tab", { name: "WAR Innings", selected: true })
    ).toBeTruthy();

    await act(async () => {
      await router.navigate({
        params: { matchId: "43" },
        to: "/matches/$matchId/scorecard",
      });
    });

    expect(await findByRole("heading", { name: "NEX vs COM" })).toBeTruthy();
    expect(
      await findByRole("tab", { name: "NEX Innings", selected: true })
    ).toBeTruthy();
  });

  it("highlights live batters and the current bowler only on the active innings", async () => {
    const { container, findByRole } = await renderScorecardRoute();

    await findByRole("heading", { name: "KNI vs WAR" });

    const liveRows = Array.from(container.querySelectorAll("[data-live-role]"));
    expect(liveRows).toHaveLength(3);
    expect(
      container.querySelector('[data-live-role="striker"]')?.textContent
    ).toContain("Alpha B.");
    expect(
      container.querySelector('[data-live-role="non-striker"]')?.textContent
    ).toContain("Beta P.");
    expect(
      container.querySelector('[data-live-role="bowler"]')?.textContent
    ).toContain("Bravo B.");
    expect(
      container.querySelector('[data-live-role="striker"]')?.className
    ).toContain("bg-primary/5");

    fireEvent.click(await findByRole("tab", { name: "WAR Innings" }));

    expect(container.querySelectorAll("[data-live-role]")).toHaveLength(0);
  });

  it("renders an accessible recovery link when the match does not exist", async () => {
    const { findByRole, findByText } = await renderScorecardRoute(
      "/matches/404/scorecard"
    );

    expect(await findByText("Match not found")).toBeTruthy();
    expect(await findByRole("link", { name: "Back to Matches" })).toBeTruthy();
  });
});
