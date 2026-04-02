import { describe, expect, it, mock } from "bun:test";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { InningsSetupPhaseCard } from "./innings-setup-phase-card";

describe("InningsSetupPhaseCard", () => {
  it("renders locked team summaries and lineup summaries while keeping start disabled when setup is incomplete", () => {
    const { getAllByText, getByRole, getByText, queryByRole } =
      renderWithProviders(
        <InningsSetupPhaseCard
          battingTeamName="Knights"
          bowlingTeamName="Warriors"
          canEditToss={true}
          followOn={null}
          inningsSetupAvailable={false}
          inningsTitle="Start innings 1"
          isStarting={false}
          nonStrikerId={null}
          nonStrikerOptions={[{ id: 12, name: "A Two", teamId: 1 }]}
          onEditToss={() => undefined}
          onNonStrikerChange={() => undefined}
          onOpeningBowlerChange={() => undefined}
          onStartInnings={() => undefined}
          onStrikerChange={() => undefined}
          openingBowlerId={null}
          openingBowlerOptions={[{ id: 21, name: "B One", teamId: 2 }]}
          strikerId={null}
          strikerOptions={[{ id: 11, name: "A One", teamId: 1 }]}
          team1LineupNames={["A One", "A Two"]}
          team1ShortName="KNI"
          team2LineupNames={["B One", "B Two"]}
          team2ShortName="WAR"
        />
      );

    expect(getByText("Knights")).toBeTruthy();
    expect(getByText("Warriors")).toBeTruthy();
    const lineupButtons = getAllByText("Lineup");
    expect(lineupButtons).toHaveLength(2);
    expect(queryByRole("switch", { name: "Apply follow-on" })).toBeNull();
    expect(
      (getByRole("button", { name: "Start innings" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("renders the follow-on switch when available and allows starting when setup is ready", async () => {
    const user = userEvent.setup();
    const onStartInnings = mock(() => undefined);
    const onFollowOnToggle = mock(() => undefined);
    const { getByRole, getByText } = renderWithProviders(
      <InningsSetupPhaseCard
        battingTeamName="Knights"
        bowlingTeamName="Warriors"
        canEditToss={false}
        followOn={{
          isApplied: false,
          onToggle: onFollowOnToggle,
        }}
        inningsSetupAvailable={true}
        inningsTitle="Start innings 3"
        isStarting={false}
        nonStrikerId={12}
        nonStrikerOptions={[{ id: 12, name: "A Two", teamId: 1 }]}
        onEditToss={() => undefined}
        onNonStrikerChange={() => undefined}
        onOpeningBowlerChange={() => undefined}
        onStartInnings={onStartInnings}
        onStrikerChange={() => undefined}
        openingBowlerId={21}
        openingBowlerOptions={[{ id: 21, name: "B One", teamId: 2 }]}
        strikerId={11}
        strikerOptions={[{ id: 11, name: "A One", teamId: 1 }]}
        team1LineupNames={["A One", "A Two"]}
        team1ShortName="KNI"
        team2LineupNames={["B One", "B Two"]}
        team2ShortName="WAR"
      />
    );

    expect(getByRole("switch", { name: "Apply follow-on" })).toBeTruthy();
    expect(getByText("Striker")).toBeTruthy();
    expect(getByText("Non-striker")).toBeTruthy();
    expect(getByText("Opening bowler")).toBeTruthy();
    await user.click(getByRole("switch", { name: "Apply follow-on" }));
    expect(onFollowOnToggle).toHaveBeenCalledTimes(1);
    await user.click(getByRole("button", { name: "Start innings" }));

    expect(onStartInnings).toHaveBeenCalledTimes(1);
  });
});
