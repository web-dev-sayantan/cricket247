import { describe, expect, it } from "bun:test";
import { resolveSelectedTournamentId } from "./-tournament-selection";
import type { TeamTournament } from "./-types";

const tournaments: TeamTournament[] = [
  { id: 7, name: "Premier League" },
  { id: 11, name: "Champions Cup" },
  { id: 15, name: "City Clash" },
];

describe("resolveSelectedTournamentId", () => {
  it("prefers selected tournament when it is still valid", () => {
    const result = resolveSelectedTournamentId({
      initialTournamentId: "11",
      selectedTournamentId: "15",
      teamTournaments: tournaments,
    });

    expect(result).toBe("15");
  });

  it("uses initial tournament from query when current selection is invalid", () => {
    const result = resolveSelectedTournamentId({
      initialTournamentId: "11",
      selectedTournamentId: "",
      teamTournaments: tournaments,
    });

    expect(result).toBe("11");
  });

  it("falls back to first tournament when query tournament is missing or invalid", () => {
    const result = resolveSelectedTournamentId({
      initialTournamentId: "999",
      selectedTournamentId: "",
      teamTournaments: tournaments,
    });

    expect(result).toBe("7");
  });

  it("returns empty selection when no tournaments are available", () => {
    const result = resolveSelectedTournamentId({
      initialTournamentId: "11",
      selectedTournamentId: "",
      teamTournaments: [],
    });

    expect(result).toBe("");
  });
});
