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

const WARRIORS_TAB_PATTERN = /WAR 0/;

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
  it("renders roster selections and toggles save state messaging", () => {
    const { getByRole, getByText } = renderWithProviders(
      <StatefulLineupPhaseCard />
    );
    const saveButton = getByRole("button", { name: "Confirm lineups" });

    expect(getByText("Select 2 players per team to continue.")).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(getByText("A One"));
    fireEvent.click(getByText("A Two"));
    fireEvent.click(getByRole("tab", { name: WARRIORS_TAB_PATTERN }));
    fireEvent.click(getByText("B One"));
    fireEvent.click(getByText("B Two"));

    expect(getByText("Assign roles")).toBeTruthy();
    expect(getByText("Both squads are set.")).toBeTruthy();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
  });
});
