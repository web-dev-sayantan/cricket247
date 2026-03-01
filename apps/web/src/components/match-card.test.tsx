import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";
import { renderWithProviders } from "@/test/render";

mock.module("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

const matchCardModulePromise = import("./match-card");

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
    const { MatchCard } = await matchCardModulePromise;
    const { getByText } = renderWithProviders(
      <MatchCard match={buildMatch()} />
    );

    expect(getByText("Resume Scoring")).toBeTruthy();
  });

  it("hides Resume Scoring when live but unauthorized", async () => {
    const { MatchCard } = await matchCardModulePromise;
    const { queryByText } = renderWithProviders(
      <MatchCard
        match={buildMatch({
          canCurrentUserScore: false,
        })}
      />
    );

    expect(queryByText("Resume Scoring")).toBeNull();
  });

  it("hides Resume Scoring when not live", async () => {
    const { MatchCard } = await matchCardModulePromise;
    const { queryByText } = renderWithProviders(
      <MatchCard
        match={buildMatch({
          isLive: false,
        })}
      />
    );

    expect(queryByText("Resume Scoring")).toBeNull();
  });

  it("always shows Scorecard", async () => {
    const { MatchCard } = await matchCardModulePromise;
    const { getByText } = renderWithProviders(
      <MatchCard
        match={buildMatch({
          canCurrentUserScore: false,
        })}
      />
    );

    expect(getByText("Scorecard")).toBeTruthy();
  });
});
