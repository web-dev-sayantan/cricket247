import { describe, expect, it, mock } from "bun:test";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import {
  DeliveryTimelineCard,
  getDeliveryChipDisplay,
  getDeliveryChipTone,
  groupDeliveriesByOver,
  resolveScoringBattingOptions,
} from "./score";

type SessionDeliveryLike = Parameters<typeof groupDeliveriesByOver>[0][number];
type ScoringPlayerOptionLike = Parameters<
  typeof resolveScoringBattingOptions
>[0]["battingLineup"][number];

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

const battingLineup: ScoringPlayerOptionLike[] = [
  { id: 1, name: "A One", teamId: 10, battingOrder: 1 },
  { id: 2, name: "A Two", teamId: 10, battingOrder: 2 },
  { id: 3, name: "A Three", teamId: 10, battingOrder: 3 },
  { id: 4, name: "A Four", teamId: 10, battingOrder: 4 },
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

  it("formats compact chip labels for regular balls, wickets, and extras", () => {
    expect(getDeliveryChipDisplay(sampleDeliveries[1])).toEqual({
      detailText: "4 runs",
      label: "4",
      showDetailIndicator: false,
    });

    expect(
      getDeliveryChipDisplay({
        ...sampleDeliveries[2],
        totalRuns: 1,
        wicketType: "run out",
      })
    ).toEqual({
      detailText: "1 run • Run out",
      label: "1W",
      showDetailIndicator: false,
    });

    expect(
      getDeliveryChipDisplay({
        ...sampleDeliveries[1],
        wideRuns: 2,
        totalRuns: 2,
      })
    ).toEqual({
      detailText: "2 runs • Wide 2",
      label: "2Wd",
      showDetailIndicator: false,
    });

    expect(
      getDeliveryChipDisplay({
        ...sampleDeliveries[1],
        byeRuns: 4,
        totalRuns: 4,
      })
    ).toEqual({
      detailText: "4 runs • Byes 4",
      label: "4By",
      showDetailIndicator: false,
    });

    expect(
      getDeliveryChipDisplay({
        ...sampleDeliveries[1],
        penaltyRuns: 5,
        totalRuns: 5,
      })
    ).toEqual({
      detailText: "5 runs • Penalty 5",
      label: "5Pn",
      showDetailIndicator: false,
    });
  });

  it("keeps wicket badges on extra deliveries and marks them as expandable", () => {
    expect(
      getDeliveryChipDisplay({
        ...sampleDeliveries[2],
        totalRuns: 1,
        wideRuns: 1,
        wicketType: "run out",
      })
    ).toEqual({
      detailText: "1 run • Run out • Wide 1",
      label: "1W",
      showDetailIndicator: true,
    });
  });

  it("filters live batting options to available batters plus the current pair", () => {
    const options = resolveScoringBattingOptions({
      availableBatters: [battingLineup[3] as ScoringPlayerOptionLike],
      battingLineup,
      currentDeliveries: sampleDeliveries,
      draft: {
        strikerId: 2,
        nonStrikerId: 3,
      },
      editingDelivery: null,
    });

    expect(options.map((player) => player.id)).toEqual([2, 3, 4]);
  });

  it("keeps both active batters available when the innings is down to the last pair", () => {
    const options = resolveScoringBattingOptions({
      availableBatters: [],
      battingLineup,
      currentDeliveries: sampleDeliveries,
      draft: {
        strikerId: 2,
        nonStrikerId: 1,
      },
      editingDelivery: null,
    });

    expect(options.map((player) => player.id)).toEqual([1, 2]);
  });

  it("uses only dismissals before the edited ball when resolving batting options", () => {
    const inningsTimeline: SessionDeliveryLike[] = [
      {
        ...sampleDeliveries[0],
        id: 10,
        sequenceNo: 1,
        isWicket: true,
        wicketType: "bowled",
        dismissedPlayerId: 1,
      },
      {
        ...sampleDeliveries[1],
        id: 11,
        sequenceNo: 2,
        strikerId: 2,
        nonStrikerId: 3,
        isWicket: false,
        wicketType: null,
        dismissedPlayerId: null,
      },
      {
        ...sampleDeliveries[2],
        id: 12,
        sequenceNo: 3,
        strikerId: 2,
        nonStrikerId: 3,
        dismissedPlayerId: 3,
      },
    ];
    const options = resolveScoringBattingOptions({
      availableBatters: [],
      battingLineup,
      currentDeliveries: inningsTimeline,
      draft: {
        strikerId: 2,
        nonStrikerId: 3,
      },
      editingDelivery: inningsTimeline[1] ?? null,
    });

    expect(options.map((player) => player.id)).toEqual([2, 3, 4]);
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

    expect(getByText("Over 1")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Edit over 0.1: 0 runs" }));
    fireEvent.click(getByRole("button", { name: "Hide timeline" }));

    expect(onSelectDelivery).toHaveBeenCalledWith(1);
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it("shows a tooltip for wicket chips that also include extras", async () => {
    const wicketOnWide: SessionDeliveryLike = {
      ...sampleDeliveries[2],
      id: 30,
      totalRuns: 1,
      wideRuns: 1,
      wicketType: "run out",
    };

    const { findByText, getByRole } = renderWithProviders(
      <DeliveryTimelineCard
        deliveries={[wicketOnWide]}
        isDesktop={false}
        isExpanded={true}
        onSelectDelivery={mock(() => undefined)}
        onToggleExpanded={mock(() => undefined)}
        selectedDeliveryId={null}
      />
    );

    fireEvent.mouseEnter(
      getByRole("button", { name: "Edit over 1.1: 1 run • Run out • Wide 1" })
    );

    expect(await findByText("1 run • Run out • Wide 1")).toBeTruthy();
  });
});
