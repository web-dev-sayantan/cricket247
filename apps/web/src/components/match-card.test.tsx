import { describe, expect, it } from "bun:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { renderWithProviders } from "@/test/render";

interface MatchCardTestMatch {
  canCurrentUserScore?: boolean | null;
  id: number;
  innings: Array<{
    ballsBowled: number;
    id: number;
    totalScore: number;
    wickets: number;
  }>;
  isLive?: boolean | null;
  matchDate: Date;
  team1: { name: string; shortName: string };
  team2: { name: string; shortName: string };
}

const matchCardModulePromise = import("./match-card");

async function renderMatchCard(match: MatchCardTestMatch) {
  const { MatchCard } = await matchCardModulePromise;
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const matchCardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <MatchCard match={match} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([matchCardRoute]),
    history: createMemoryHistory({
      initialEntries: ["/"],
    }),
  });

  await router.load();

  return renderWithProviders(<RouterProvider router={router} />);
}

const buildMatch = (overrides?: {
  canCurrentUserScore?: boolean | null;
  isLive?: boolean | null;
}) => ({
  id: 99,
  team1: { name: "Knights", shortName: "KNI" },
  team2: { name: "Warriors", shortName: "WAR" },
  matchDate: new Date("2026-03-01T00:00:00.000Z"),
  isLive: true,
  canCurrentUserScore: true,
  innings: [
    {
      id: 11,
      totalScore: 121,
      wickets: 4,
      ballsBowled: 84,
    },
  ],
  ...overrides,
});

describe("MatchCard scoring CTA visibility", () => {
  it("shows Resume Scoring when live and authorized", async () => {
    const { getByText } = await renderMatchCard(buildMatch());

    expect(getByText("Resume Scoring")).toBeTruthy();
  });

  it("hides Resume Scoring when live but unauthorized", async () => {
    const { queryByText } = await renderMatchCard(
      buildMatch({
        canCurrentUserScore: false,
      })
    );

    expect(queryByText("Resume Scoring")).toBeNull();
  });

  it("hides Resume Scoring when not live", async () => {
    const { queryByText } = await renderMatchCard(
      buildMatch({
        isLive: false,
      })
    );

    expect(queryByText("Resume Scoring")).toBeNull();
  });

  it("always shows Scorecard", async () => {
    const { getByText } = await renderMatchCard(
      buildMatch({
        canCurrentUserScore: false,
      })
    );

    expect(getByText("Scorecard")).toBeTruthy();
  });
});
