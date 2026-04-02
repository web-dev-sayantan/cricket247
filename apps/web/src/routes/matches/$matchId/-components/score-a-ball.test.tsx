import { describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { renderWithProviders } from "@/test/render";
import ScoreABall, {
  type DeliveryDraft,
  dismissalAllowsBatterRuns,
  getAllowedDismissals,
  getVisibleDismissals,
  getVisibleExtras,
  type MatchFlags,
  resolveBattingPairSelection,
  type ScoringPlayerOption,
} from "./score-a-ball";

const battingPlayers: ScoringPlayerOption[] = [
  { id: 1, name: "A One", teamId: 10 },
  { id: 2, name: "A Two", teamId: 10 },
];

const bowlingPlayers: ScoringPlayerOption[] = [
  { id: 3, name: "B One", teamId: 20 },
  { id: 4, name: "B Two", teamId: 20 },
];

const baseDraft: DeliveryDraft = {
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
};

const allMatchFlags: MatchFlags = {
  hasBoundaryOut: true,
  hasBye: true,
  hasLBW: true,
  hasLegBye: true,
  hasNoBalls: true,
  hasPenaltyRuns: true,
  hasWides: true,
};

function renderScoreABall(
  overrides?: Partial<{
    draft: DeliveryDraft;
    isEditing: boolean;
    matchFlags: MatchFlags;
    onChange: ReturnType<typeof mock>;
    onDiscardEdit: ReturnType<typeof mock>;
    onReset: ReturnType<typeof mock>;
    onSubmit: ReturnType<typeof mock>;
  }>
) {
  const onChange = overrides?.onChange ?? mock(() => undefined);
  const onDiscardEdit = overrides?.onDiscardEdit ?? mock(() => undefined);
  const onReset = overrides?.onReset ?? mock(() => undefined);
  const onSubmit = overrides?.onSubmit ?? mock(() => undefined);

  return {
    onChange,
    onDiscardEdit,
    onReset,
    onSubmit,
    ...renderWithProviders(
      <ScoreABall
        battingPlayers={battingPlayers}
        bowlingPlayers={bowlingPlayers}
        draft={overrides?.draft ?? baseDraft}
        fieldingOptions={bowlingPlayers}
        isEditing={overrides?.isEditing ?? false}
        matchFlags={overrides?.matchFlags ?? allMatchFlags}
        onChange={onChange}
        onDiscardEdit={onDiscardEdit}
        onReset={onReset}
        onSubmit={onSubmit}
        requiredSelections={{
          striker: false,
          nonStriker: false,
          bowler: false,
        }}
      />
    ),
  };
}

describe("ScoreABall", () => {
  it("swaps the batting pair when the scorer picks the other active batter", () => {
    expect(
      resolveBattingPairSelection({
        currentNonStrikerId: 2,
        currentStrikerId: 1,
        nextPlayerId: 2,
        role: "striker",
      })
    ).toEqual({
      strikerId: 2,
      nonStrikerId: 1,
    });

    expect(
      resolveBattingPairSelection({
        currentNonStrikerId: 2,
        currentStrikerId: 1,
        nextPlayerId: 1,
        role: "nonStriker",
      })
    ).toEqual({
      strikerId: 2,
      nonStrikerId: 1,
    });
  });

  it("forwards reset and submit actions", () => {
    const { getByRole, onChange, onReset, onSubmit } = renderScoreABall();

    fireEvent.click(getByRole("button", { name: "Reset" }));
    fireEvent.click(getByRole("button", { name: "Record delivery" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows discard edit only while editing and exits edit mode", () => {
    const { getByRole, onDiscardEdit, queryByRole, rerender } =
      renderScoreABall({
        isEditing: true,
      });

    expect(getByRole("button", { name: "Discard edit" })).toBeTruthy();

    fireEvent.click(getByRole("button", { name: "Discard edit" }));

    expect(onDiscardEdit).toHaveBeenCalledTimes(1);

    rerender(
      <ScoreABall
        battingPlayers={battingPlayers}
        bowlingPlayers={bowlingPlayers}
        draft={baseDraft}
        fieldingOptions={bowlingPlayers}
        isEditing={false}
        matchFlags={allMatchFlags}
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

    expect(queryByRole("button", { name: "Discard edit" })).toBeNull();
  });

  it("only exposes extras that are enabled for the match", () => {
    const { getByRole, queryByText } = renderScoreABall({
      matchFlags: {
        ...allMatchFlags,
        hasBye: false,
        hasLegBye: false,
        hasPenaltyRuns: false,
      },
    });

    fireEvent.click(getByRole("button", { name: "Extras" }));

    expect(queryByText("Wide")).toBeTruthy();
    expect(queryByText("No-ball")).toBeTruthy();
    expect(queryByText("Bye runs")).toBeNull();
    expect(queryByText("Leg-bye runs")).toBeNull();
    expect(queryByText("Penalty runs")).toBeNull();
  });

  it("uses fixed-value wide and no-ball toggles and keeps them mutually exclusive", () => {
    const { getByRole, onChange } = renderScoreABall();

    fireEvent.click(getByRole("button", { name: "Extras" }));
    fireEvent.click(
      getByRole("button", {
        name: "Wide Adds 1 run and marks the ball as a wide",
      })
    );
    fireEvent.click(
      getByRole("button", {
        name: "No-ball Adds 1 run and marks the ball as a no-ball",
      })
    );

    expect(onChange.mock.calls[0]?.[0]).toEqual({
      batterRuns: 0,
      legByeRuns: 0,
      noBallRuns: 0,
      wideRuns: 1,
    });
    expect(onChange.mock.calls[1]?.[0]).toEqual({
      noBallRuns: 1,
      wideRuns: 0,
    });
  });

  it("clears incompatible bat runs when bye runs are entered", () => {
    const { getByRole, getByText, onChange } = renderScoreABall({
      draft: {
        ...baseDraft,
        batterRuns: 4,
      },
    });

    fireEvent.click(getByRole("button", { name: "Extras" }));
    const byeInput =
      getByText("Bye runs").parentElement?.querySelector("input");

    if (!byeInput) {
      throw new Error("Bye runs input not found");
    }

    fireEvent.change(byeInput, { target: { value: "2" } });

    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({
      batterRuns: 0,
      byeRuns: 2,
      legByeRuns: 0,
    });
  });

  it("keeps a wide active when bye runs are added", async () => {
    function StatefulScoreABall() {
      const [draft, setDraft] = useState(baseDraft);

      return (
        <ScoreABall
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          draft={draft}
          fieldingOptions={bowlingPlayers}
          isEditing={false}
          matchFlags={allMatchFlags}
          onChange={(patch) =>
            setDraft((previous) => ({ ...previous, ...patch }))
          }
          onReset={() => setDraft(baseDraft)}
          onSubmit={() => undefined}
          requiredSelections={{
            striker: false,
            nonStriker: false,
            bowler: false,
          }}
        />
      );
    }

    const { getByRole, getByText } = renderWithProviders(
      <StatefulScoreABall />
    );

    fireEvent.click(getByRole("button", { name: "Extras" }));
    fireEvent.click(
      getByRole("button", {
        name: "Wide Adds 1 run and marks the ball as a wide",
      })
    );

    const byeInput =
      getByText("Bye runs").parentElement?.querySelector("input");

    if (!byeInput) {
      throw new Error("Bye runs input not found");
    }

    expect((byeInput as HTMLInputElement).disabled).toBe(false);
    expect(
      (getByRole("button", { name: "1" }) as HTMLButtonElement).disabled
    ).toBe(true);

    fireEvent.change(byeInput, { target: { value: "2" } });

    await waitFor(() => {
      expect(
        getByRole("button", {
          name: "Wide Adds 1 run and marks the ball as a wide",
        }).getAttribute("aria-pressed")
      ).toBe("true");
      expect((byeInput as HTMLInputElement).value).toBe("2");
    });
  });

  it("filters dismissal options using match rules helpers", () => {
    expect(
      getVisibleExtras({
        ...allMatchFlags,
        hasBye: false,
        hasLegBye: false,
      })
    ).toEqual(["wideRuns", "noBallRuns", "penaltyRuns"]);

    expect(
      getVisibleDismissals({
        ...allMatchFlags,
        hasBoundaryOut: false,
        hasLBW: false,
      })
    ).not.toContain("lbw");

    expect(
      getAllowedDismissals({
        draft: {
          noBallRuns: 1,
          wideRuns: 0,
        },
        matchFlags: allMatchFlags,
      })
    ).toEqual(["run out"]);

    expect(
      getAllowedDismissals({
        draft: {
          noBallRuns: 0,
          wideRuns: 1,
        },
        matchFlags: allMatchFlags,
      })
    ).toEqual(["run out", "stumped", "hit wicket", "obstructing the field"]);

    expect(dismissalAllowsBatterRuns("bowled")).toBe(false);
    expect(dismissalAllowsBatterRuns("run out")).toBe(true);
  });

  it("shows quick dismissal actions and reveals dependent fields after selection", () => {
    function StatefulScoreABall() {
      const [draft, setDraft] = useState(baseDraft);

      return (
        <ScoreABall
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          draft={draft}
          fieldingOptions={bowlingPlayers}
          isEditing={false}
          matchFlags={{
            ...allMatchFlags,
            hasLBW: false,
          }}
          onChange={(patch) =>
            setDraft((previous) => ({ ...previous, ...patch }))
          }
          onReset={() => setDraft(baseDraft)}
          onSubmit={() => undefined}
          requiredSelections={{
            striker: false,
            nonStriker: false,
            bowler: false,
          }}
        />
      );
    }

    const { getByRole, queryByRole, getByText } = renderWithProviders(
      <StatefulScoreABall />
    );

    expect(getByRole("button", { name: "Bowled" })).toBeTruthy();
    expect(queryByRole("button", { name: "LBW" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Caught" }));

    expect(getByText("Dismissed batter")).toBeTruthy();
    expect(getByText("Fielder (required)")).toBeTruthy();
  });

  it("removes invalid dismissals after the scorer marks the ball as a no-ball", () => {
    function StatefulScoreABall() {
      const [draft, setDraft] = useState(baseDraft);

      return (
        <ScoreABall
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          draft={draft}
          fieldingOptions={bowlingPlayers}
          isEditing={false}
          matchFlags={allMatchFlags}
          onChange={(patch) =>
            setDraft((previous) => ({ ...previous, ...patch }))
          }
          onReset={() => setDraft(baseDraft)}
          onSubmit={() => undefined}
          requiredSelections={{
            striker: false,
            nonStriker: false,
            bowler: false,
          }}
        />
      );
    }

    const { getByRole, queryByRole, queryByText } = renderWithProviders(
      <StatefulScoreABall />
    );

    fireEvent.click(getByRole("button", { name: "Caught" }));
    expect(queryByText("Dismissed batter")).toBeTruthy();

    fireEvent.click(getByRole("button", { name: "Extras" }));
    fireEvent.click(
      getByRole("button", {
        name: "No-ball Adds 1 run and marks the ball as a no-ball",
      })
    );

    expect(queryByRole("button", { name: "Caught" })).toBeNull();
    expect(getByRole("button", { name: "Run out" })).toBeTruthy();
    expect(queryByText("Dismissed batter")).toBeNull();
  });

  it("clears and disables batter runs for dismissals that cannot score them", async () => {
    function StatefulScoreABall() {
      const [draft, setDraft] = useState(baseDraft);

      return (
        <ScoreABall
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          draft={draft}
          fieldingOptions={bowlingPlayers}
          isEditing={false}
          matchFlags={allMatchFlags}
          onChange={(patch) =>
            setDraft((previous) => ({ ...previous, ...patch }))
          }
          onReset={() => setDraft(baseDraft)}
          onSubmit={() => undefined}
          requiredSelections={{
            striker: false,
            nonStriker: false,
            bowler: false,
          }}
        />
      );
    }

    const { getByRole } = renderWithProviders(<StatefulScoreABall />);

    fireEvent.click(getByRole("button", { name: "2" }));
    expect(
      getByRole("button", { name: "2" }).getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(getByRole("button", { name: "Bowled" }));

    await waitFor(() => {
      expect(
        getByRole("button", { name: "0" }).getAttribute("aria-pressed")
      ).toBe("true");
      expect(
        (getByRole("button", { name: "2" }) as HTMLButtonElement).disabled
      ).toBe(true);
    });

    fireEvent.click(getByRole("button", { name: "Run out" }));

    await waitFor(() => {
      expect(
        (getByRole("button", { name: "2" }) as HTMLButtonElement).disabled
      ).toBe(false);
    });
  });
});
