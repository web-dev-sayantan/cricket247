import { describe, expect, it, mock } from "bun:test";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import {
  DeliveryTimelineCard,
  getDeliveryChipTone,
  groupDeliveriesByOver,
} from "./score";

type SessionDeliveryLike = Parameters<typeof groupDeliveriesByOver>[0][number];

const sampleDeliveries: SessionDeliveryLike[] = [
  {
    id: 1,
    inningsId: 10,
    sequenceNo: 1,
    overNumber: 1,
    ballInOver: 1,
    strikerId: 1,
    nonStrikerId: 2,
    bowlerId: 3,
    batterRuns: 0,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    totalRuns: 0,
    isWicket: false,
    wicketType: null,
    dismissedPlayerId: null,
  },
  {
    id: 2,
    inningsId: 10,
    sequenceNo: 2,
    overNumber: 1,
    ballInOver: 2,
    strikerId: 1,
    nonStrikerId: 2,
    bowlerId: 3,
    batterRuns: 4,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    totalRuns: 4,
    isWicket: false,
    wicketType: null,
    dismissedPlayerId: null,
  },
  {
    id: 3,
    inningsId: 10,
    sequenceNo: 3,
    overNumber: 2,
    ballInOver: 1,
    strikerId: 1,
    nonStrikerId: 2,
    bowlerId: 3,
    batterRuns: 0,
    wideRuns: 0,
    noBallRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    totalRuns: 0,
    isWicket: true,
    wicketType: "caught",
    dismissedPlayerId: 1,
  },
];

describe("score route helpers", () => {
  it("groups deliveries by over in order", () => {
    const grouped = groupDeliveriesByOver(sampleDeliveries);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.overNumber).toBe(1);
    expect(grouped[0]?.deliveries.map((delivery) => delivery.id)).toEqual([
      1, 2,
    ]);
    expect(grouped[1]?.deliveries.map((delivery) => delivery.id)).toEqual([3]);
  });

  it("assigns the correct chip tone for dot balls, scoring shots, and wickets", () => {
    expect(getDeliveryChipTone(sampleDeliveries[0])).toBe("default");
    expect(getDeliveryChipTone(sampleDeliveries[1])).toBe("scoring");
    expect(getDeliveryChipTone(sampleDeliveries[2])).toBe("wicket");
  });

  it("lets scorers open a delivery from a compact over chip and toggle the timeline", () => {
    const onSelectDelivery = mock(() => undefined);
    const onToggleExpanded = mock(() => undefined);

    const { getByRole, getByText } = renderWithProviders(
      <DeliveryTimelineCard
        deliveries={sampleDeliveries}
        isDesktop={false}
        isExpanded={true}
        onSelectDelivery={onSelectDelivery}
        onToggleExpanded={onToggleExpanded}
        selectedDeliveryId={null}
      />
    );

    expect(getByText("Over 0")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Edit over 0.1: 0" }));
    fireEvent.click(getByRole("button", { name: "Hide timeline" }));

    expect(onSelectDelivery).toHaveBeenCalledWith(1);
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });
});
