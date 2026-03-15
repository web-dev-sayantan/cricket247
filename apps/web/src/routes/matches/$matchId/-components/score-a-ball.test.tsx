import { describe, expect, it, mock } from "bun:test";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";

const scoreABallModulePromise = import("./score-a-ball");

describe("ScoreABall", () => {
  it("forwards reset and submit actions", async () => {
    const { default: ScoreABall } = await scoreABallModulePromise;
    const onChange = mock(() => undefined);
    const onReset = mock(() => undefined);
    const onSubmit = mock(() => undefined);

    const { getByText } = renderWithProviders(
      <ScoreABall
        battingLabel="AAA"
        battingPlayers={[
          { id: 1, name: "A One", teamId: 10 },
          { id: 2, name: "A Two", teamId: 10 },
        ]}
        bowlingLabel="BBB"
        bowlingPlayers={[{ id: 3, name: "B One", teamId: 20 }]}
        currentBallLabel="Over 4.2"
        draft={{
          inningsId: 9,
          strikerId: 1,
          nonStrikerId: 2,
          bowlerId: 3,
          batterRuns: 0,
          wideRuns: 0,
          noBallRuns: 0,
          byeRuns: 0,
          legByeRuns: 0,
          penaltyRuns: 0,
          wicketType: "",
          dismissedPlayerId: null,
          assistedById: null,
        }}
        fieldingOptions={[{ id: 3, name: "B One", teamId: 20 }]}
        isEditing={false}
        matchFlags={{
          hasBoundaryOut: true,
          hasBye: true,
          hasLBW: true,
          hasLegBye: true,
          hasNoBalls: true,
          hasPenaltyRuns: true,
          hasWides: true,
        }}
        onChange={onChange}
        onReset={onReset}
        onSubmit={onSubmit}
        requiredSelections={{
          striker: false,
          nonStriker: false,
          bowler: false,
        }}
      />
    );

    fireEvent.click(getByText("Reset form"));
    fireEvent.click(getByText("Record delivery"));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows selected player names in the trigger instead of raw ids", async () => {
    const { default: ScoreABall } = await scoreABallModulePromise;

    const { getByText } = renderWithProviders(
      <ScoreABall
        battingLabel="AAA"
        battingPlayers={[
          { id: 1, name: "A One", teamId: 10 },
          { id: 2, name: "A Two", teamId: 10 },
        ]}
        bowlingLabel="BBB"
        bowlingPlayers={[{ id: 3, name: "B One", teamId: 20 }]}
        currentBallLabel="Over 4.2"
        draft={{
          inningsId: 9,
          strikerId: 1,
          nonStrikerId: 2,
          bowlerId: 3,
          batterRuns: 0,
          wideRuns: 0,
          noBallRuns: 0,
          byeRuns: 0,
          legByeRuns: 0,
          penaltyRuns: 0,
          wicketType: '',
          dismissedPlayerId: null,
          assistedById: null,
        }}
        fieldingOptions={[{ id: 3, name: "B One", teamId: 20 }]}
        isEditing={false}
        matchFlags={{
          hasBoundaryOut: true,
          hasBye: true,
          hasLBW: true,
          hasLegBye: true,
          hasNoBalls: true,
          hasPenaltyRuns: true,
          hasWides: true,
        }}
        onChange={mock(() => undefined)}
        onReset={mock(() => undefined)}
        onSubmit={mock(() => undefined)}
        requiredSelections={{
          striker: false,
          nonStriker: false,
          bowler: false,
        }}
      />
    );

    expect(getByText('A One')).toBeTruthy();
    expect(getByText('A Two')).toBeTruthy();
    expect(getByText('B One')).toBeTruthy();
  });
});
