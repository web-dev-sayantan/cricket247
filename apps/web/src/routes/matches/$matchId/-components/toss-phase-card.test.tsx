import { describe, expect, it, mock } from "bun:test";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { TossPhaseCard } from "./toss-phase-card";

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  selectIndex: number,
  optionText: string
) {
  const triggers = document.querySelectorAll('[data-slot="select-trigger"]');

  await user.click(triggers[selectIndex] ?? document.body);
  await user.click(
    [...document.querySelectorAll('[data-slot="select-item"]')].find(
      (element) => element.textContent === optionText
    ) ?? document.body
  );
}

describe("TossPhaseCard", () => {
  it("updates toss winner and decision controls before continuing", async () => {
    const user = userEvent.setup();
    const onConfirmToss = mock(() => undefined);
    const onTossDecisionChange = mock(() => undefined);
    const onTossWinnerChange = mock(() => undefined);
    const { getByRole } = renderWithProviders(
      <TossPhaseCard
        onConfirmToss={onConfirmToss}
        onTossDecisionChange={onTossDecisionChange}
        onTossWinnerChange={onTossWinnerChange}
        team1Id={1}
        team1Name="Knights"
        team2Id={2}
        team2Name="Warriors"
        tossDecision="bat"
        tossWinnerId={1}
      />
    );

    await selectOption(user, 0, "Warriors");
    await selectOption(user, 1, "Field first");
    await user.click(
      getByRole("button", { name: "Continue to innings setup" })
    );

    expect(onTossWinnerChange).toHaveBeenCalledWith(2);
    expect(onTossDecisionChange).toHaveBeenCalledWith("bowl");
    expect(onConfirmToss).toHaveBeenCalledTimes(1);
  });
});
