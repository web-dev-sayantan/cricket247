import { describe, expect, it } from "bun:test";
import { fireEvent } from "@testing-library/react";
import { useState } from "react";
import { renderWithProviders } from "@/test/render";
import {
  LineupPhaseCard,
  type LineupPhaseCardProps,
} from "./lineup-phase-card";

const team1Roster: LineupPhaseCardProps["team1Roster"] = [
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

const team2Roster: LineupPhaseCardProps["team2Roster"] = [
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
    role: "Keeper",
    teamId: 2,
  },
];

function StatefulLineupPhaseCard() {
  const [team1Selection, setTeam1Selection] = useState({
    playerIds: [] as number[],
  });
  const [team2Selection, setTeam2Selection] = useState({
    playerIds: [] as number[],
  });
  const isLineupValid =
    team1Selection.playerIds.length === 2 &&
    team2Selection.playerIds.length === 2;

  return (
    <LineupPhaseCard
      isLineupValid={isLineupValid}
      isSaving={false}
      maxPlayers={2}
      onSaveLineups={() => undefined}
      setTeam1Selection={setTeam1Selection}
      setTeam2Selection={setTeam2Selection}
      team1Roster={team1Roster}
      team1Selection={team1Selection}
      team1ShortName="KNI"
      team2Roster={team2Roster}
      team2Selection={team2Selection}
      team2ShortName="WAR"
    />
  );
}

describe("LineupPhaseCard", () => {
  it("renders roster selections, optional roles, and toggles save state messaging", () => {
    const { getAllByLabelText, getByRole, getByText } = renderWithProviders(
      <StatefulLineupPhaseCard />
    );
    const saveButton = getByRole("button", { name: "Save playing lineups" });

    expect(
      getByText("Select a full playing lineup for both teams.")
    ).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(getByText("A One"));
    fireEvent.click(getByText("A Two"));
    fireEvent.click(getByText("B One"));
    fireEvent.click(getByText("B Two"));

    const captainSelect = getAllByLabelText("Captain")[0] as HTMLSelectElement;
    fireEvent.change(captainSelect, { target: { value: "11" } });

    expect(captainSelect.value).toBe("11");
    expect(getByText("Both teams have full playing lineups.")).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
  });
});
