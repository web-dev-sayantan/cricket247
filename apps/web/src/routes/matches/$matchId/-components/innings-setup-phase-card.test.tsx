import { describe, expect, it, mock } from "bun:test";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { InningsSetupPhaseCard } from "./innings-setup-phase-card";

describe("InningsSetupPhaseCard", () => {
  it("renders selectors and lineup summaries while keeping start disabled when setup is incomplete", () => {
    const { getByRole, getByText } = renderWithProviders(
      <InningsSetupPhaseCard
        battingTeamId={1}
        bowlingTeamId={2}
        canEditToss={true}
        inningsSetupAvailable={false}
        inningsTitle="Start innings 1"
        isStarting={false}
        nonStrikerId={null}
        nonStrikerOptions={[{ id: 12, name: "A Two", teamId: 1 }]}
        onBattingTeamChange={() => undefined}
        onBowlingTeamChange={() => undefined}
        onEditToss={() => undefined}
        onNonStrikerChange={() => undefined}
        onOpeningBowlerChange={() => undefined}
        onStartInnings={() => undefined}
        onStrikerChange={() => undefined}
        openingBowlerId={null}
        openingBowlerOptions={[{ id: 21, name: "B One", teamId: 2 }]}
        strikerId={null}
        strikerOptions={[{ id: 11, name: "A One", teamId: 1 }]}
        team1Id={1}
        team1LineupNames={["A One", "A Two"]}
        team1Name="Knights"
        team1ShortName="KNI"
        team2Id={2}
        team2LineupNames={["B One", "B Two"]}
        team2Name="Warriors"
        team2ShortName="WAR"
      />
    );

    expect(getByText("KNI lineup")).toBeTruthy();
    expect(getByText("WAR lineup")).toBeTruthy();
    expect(
      (getByRole("button", { name: "Start innings" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("renders team and opener selectors and allows starting when setup is available", async () => {
    const user = userEvent.setup();
    const onStartInnings = mock(() => undefined);
    const { getByRole, getByText } = renderWithProviders(
      <InningsSetupPhaseCard
        battingTeamId={1}
        bowlingTeamId={2}
        canEditToss={false}
        inningsSetupAvailable={true}
        inningsTitle="Start innings 1"
        isStarting={false}
        nonStrikerId={12}
        nonStrikerOptions={[{ id: 12, name: "A Two", teamId: 1 }]}
        onBattingTeamChange={() => undefined}
        onBowlingTeamChange={() => undefined}
        onEditToss={() => undefined}
        onNonStrikerChange={() => undefined}
        onOpeningBowlerChange={() => undefined}
        onStartInnings={onStartInnings}
        onStrikerChange={() => undefined}
        openingBowlerId={21}
        openingBowlerOptions={[{ id: 21, name: "B One", teamId: 2 }]}
        strikerId={11}
        strikerOptions={[{ id: 11, name: "A One", teamId: 1 }]}
        team1Id={1}
        team1LineupNames={["A One", "A Two"]}
        team1Name="Knights"
        team1ShortName="KNI"
        team2Id={2}
        team2LineupNames={["B One", "B Two"]}
        team2Name="Warriors"
        team2ShortName="WAR"
      />
    );

    expect(getByText("Striker")).toBeTruthy();
    expect(getByText("Non-striker")).toBeTruthy();
    expect(getByText("Opening bowler")).toBeTruthy();
    await user.click(getByRole("button", { name: "Start innings" }));

    expect(onStartInnings).toHaveBeenCalledTimes(1);
  });
});
