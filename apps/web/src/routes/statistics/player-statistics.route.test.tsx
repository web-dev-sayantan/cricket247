import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  fireEvent,
  type RenderResult,
  render,
} from "@testing-library/react";
import type { ReactNode } from "react";

mock.module("@/components/header", () => ({
  default: () => null,
}));

const PLAYER_ROW_NAME_PATTERN = /Aarav Rao/i;

const sessionState = {
  data: {
    user: {
      role: "user",
    },
  } as null | { user: { role: string } },
  isPending: false,
};

mock.module("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => sessionState,
  },
}));

mock.module("@/lib/profile-image-upload", () => ({
  uploadProfileImage: async () => "uploaded-image-key",
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
    success: () => undefined,
  },
}));

interface MockPlayerStatistics {
  formats: Array<{
    batting: null | {
      average: null | number;
      fifties: number;
      fours: number;
      hundreds: number;
      inningsBatted: number;
      notOuts: number;
      runsScored: number;
      sixes: number;
      strikeRate: null | number;
      thirties?: number;
    };
    bowling: null | {
      average: null | number;
      ballsBowled: number;
      ballsPerOver: number;
      economy: null | number;
      fiveWicketHauls: number;
      runsConceded: number;
      strikeRate: null | number;
      tenWicketHauls: number;
      threeWicketHauls: number;
      wicketsTaken: number;
    };
    fielding: null | {
      catches: number;
      runOuts: number;
      stumpings?: number;
    };
    format: string;
    overview: {
      matchesPlayed: number;
      playerOfTheMatchCount: number;
      playerOfTheTournamentCount: number;
      runsScored: number;
      wicketsTaken: number;
    };
  }>;
  player: {
    battingStance: string;
    bowlingStance: null | string;
    id: number;
    image: null | string;
    isWicketKeeper: boolean;
    name: string;
    nationality: null | string;
    role: string;
  };
}

const playerStatisticsById = new Map<number, MockPlayerStatistics | null>();
const playersWithCurrentTeamsState = {
  rows: [] as Array<{
    age: number;
    battingStance: string;
    bowlingStance: null | string;
    currentTeams: Array<{
      teamId: number;
      teamShortName: string;
      tournamentId: number;
      tournamentName: string;
    }>;
    id: number;
    image: null | string;
    name: string;
    nationality: null | string;
    role: string;
  }>,
};

mock.module("@/utils/orpc", () => ({
  client: {},
  orpc: {
    playerStatistics: {
      queryOptions: ({ input }: { input: number }) => ({
        queryFn: async () => playerStatisticsById.get(input) ?? null,
        queryKey: ["playerStatistics", input],
      }),
    },
    playersWithCurrentTeams: {
      queryOptions: () => ({
        queryFn: async () => playersWithCurrentTeamsState.rows,
        queryKey: ["playersWithCurrentTeams"],
      }),
    },
  },
  queryClient: new QueryClient(),
}));

const routeTreeModulePromise = import("@/routeTree.gen");
const orpcModulePromise = import("@/utils/orpc");

async function renderRoute(
  initialEntry: string
): Promise<RenderResult & { router: ReturnType<typeof createRouter> }> {
  const [{ routeTree }, { orpc }] = await Promise.all([
    routeTreeModulePromise,
    orpcModulePromise,
  ]);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
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
    renderResult = render(<RouterProvider router={router} />);
  });

  if (!renderResult) {
    throw new Error("Route render did not initialize");
  }

  return Object.assign(renderResult, { router });
}

function createStatisticsFixture(playerId: number): MockPlayerStatistics {
  return {
    player: {
      id: playerId,
      name: "Aarav Rao",
      image: null,
      role: "All-rounder",
      nationality: "India",
      battingStance: "Right handed",
      bowlingStance: "Right-arm off break",
      isWicketKeeper: true,
    },
    formats: [
      {
        format: "T20",
        overview: {
          matchesPlayed: 3,
          runsScored: 120,
          wicketsTaken: 4,
          playerOfTheMatchCount: 1,
          playerOfTheTournamentCount: 1,
        },
        batting: {
          inningsBatted: 3,
          runsScored: 120,
          average: 60,
          strikeRate: 150,
          thirties: 2,
          fifties: 1,
          hundreds: 0,
          fours: 11,
          sixes: 7,
          notOuts: 1,
        },
        bowling: null,
        fielding: null,
      },
      {
        format: "ODI",
        overview: {
          matchesPlayed: 1,
          runsScored: 0,
          wicketsTaken: 0,
          playerOfTheMatchCount: 0,
          playerOfTheTournamentCount: 0,
        },
        batting: null,
        bowling: null,
        fielding: null,
      },
    ],
  };
}

beforeEach(() => {
  sessionState.data = {
    user: {
      role: "user",
    },
  };
  sessionState.isPending = false;
  playerStatisticsById.clear();
  playersWithCurrentTeamsState.rows = [
    {
      id: 7,
      name: "Aarav Rao",
      image: null,
      role: "All-rounder",
      age: 27,
      nationality: "India",
      battingStance: "Right handed",
      bowlingStance: "Right-arm off break",
      currentTeams: [
        {
          tournamentId: 101,
          tournamentName: "Summer Cup",
          teamId: 22,
          teamShortName: "KNI",
        },
      ],
    },
  ];
  playerStatisticsById.set(7, createStatisticsFixture(7));
  playerStatisticsById.set(8, {
    player: {
      id: 8,
      name: "Meera Shah",
      image: null,
      role: "Batter",
      nationality: "India",
      battingStance: "Left handed",
      bowlingStance: null,
      isWicketKeeper: false,
    },
    formats: [],
  });
  mock.clearAllMocks();
});

describe("player statistics route", () => {
  it("renders exact format tabs, hides empty sections, and shows overview-only empty states", async () => {
    const { findAllByRole, findByRole, findByText, queryByText } =
      await renderRoute("/statistics/7");

    expect(
      await findByRole("heading", { name: "Player Statistics" })
    ).toBeTruthy();
    const tabs = await findAllByRole("tab");
    expect(tabs.map((tab: HTMLElement) => tab.textContent)).toEqual([
      "T20",
      "ODI",
    ]);
    expect(queryByText("All Formats")).toBeNull();
    expect(await findByText("Batting")).toBeTruthy();
    expect(queryByText("Bowling")).toBeNull();
    expect(queryByText("Fielding")).toBeNull();

    fireEvent.click(await findByRole("tab", { name: "ODI" }));

    expect(
      await findByText(
        "No batting, bowling, or fielding entries were recorded for this format in completed matches."
      )
    ).toBeTruthy();
  });

  it("renders an empty state when the player has no completed-match formats", async () => {
    const { findByText } = await renderRoute("/statistics/8");

    expect(await findByText("No completed-match stats yet")).toBeTruthy();
  });
});

describe("players route statistics entrypoint", () => {
  it("shows the statistics button for non-admin users without edit or delete actions", async () => {
    const { findByRole, queryByRole } = await renderRoute("/players");

    fireEvent.click(
      await findByRole("button", { name: PLAYER_ROW_NAME_PATTERN })
    );

    expect(
      await findByRole("button", { name: "View statistics for Aarav Rao" })
    ).toBeTruthy();
    expect(queryByRole("button", { name: "Edit" })).toBeNull();
    expect(queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("keeps admin actions and navigates to the dedicated statistics page", async () => {
    sessionState.data = {
      user: {
        role: "admin",
      },
    };

    const { findByRole, findByText, router } = await renderRoute("/players");

    fireEvent.click(
      await findByRole("button", { name: PLAYER_ROW_NAME_PATTERN })
    );
    expect(await findByRole("button", { name: "Edit" })).toBeTruthy();
    expect(await findByRole("button", { name: "Delete" })).toBeTruthy();

    fireEvent.click(
      await findByRole("button", { name: "View statistics for Aarav Rao" })
    );

    expect(
      await findByText("Format-by-format performance across completed matches.")
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/statistics/7");
  });
});
