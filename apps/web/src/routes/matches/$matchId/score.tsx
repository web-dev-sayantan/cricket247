import type { AppRouterClient } from "@cricket247/server/contract";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TargetIcon,
} from "lucide-react";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RouterAppContext } from "@/routes/__root";
import type { InningsSetupPhaseCardProps } from "@/routes/matches/$matchId/-components/innings-setup-phase-card";
import type { LineupPhaseCardProps } from "@/routes/matches/$matchId/-components/lineup-phase-card";
import { PreMatchSetupSkeleton } from "@/routes/matches/$matchId/-components/pre-match-setup-skeleton";
import ScoreABall, {
  type DeliveryDraft,
  type MatchFlags,
  resolveBattingPairSelection,
  type ScoringPlayerOption,
} from "@/routes/matches/$matchId/-components/score-a-ball";
import type { TossPhaseCardProps } from "@/routes/matches/$matchId/-components/toss-phase-card";
import type {
  PreMatchPhase,
  RosterPlayer,
  TeamSelection,
} from "@/routes/matches/$matchId/-pre-match-types";
import { buildDeliveryMutationPayload } from "@/routes/matches/$matchId/-score-delivery-payload";
import {
  applyScoringSessionMutationResult,
  buildBackgroundScoreRefreshQueries,
} from "@/routes/matches/$matchId/-score-mutation-utils";
import {
  resolveBattingAndBowlingTeamIds,
  resolveInningsSetupSelection,
} from "@/routes/matches/$matchId/-scoring-flow";

export const Route = createFileRoute("/matches/$matchId/score")({
  component: RouteComponent,
});

const PreMatchSetupFlow = lazy(() =>
  import("@/routes/matches/$matchId/-components/pre-match-setup-flow").then(
    (module) => ({ default: module.PreMatchSetupFlow })
  )
);

type ScorePageClient = Pick<
  AppRouterClient,
  | "closeCurrentScoringInnings"
  | "deleteScoringDelivery"
  | "recordScoringDelivery"
  | "saveMatchLineup"
  | "startScoringInnings"
  | "updateScoringDelivery"
>;

export interface ScorePageProps {
  client: ScorePageClient;
  matchId: string;
  orpc: RouterAppContext["orpc"];
}

interface SessionLineupPlayer {
  battingOrder: null | number;
  id: number;
  name: string;
  teamId: number;
}

interface SessionEntryContext {
  ballInOver: number;
  battingTeamId: null | number;
  bowlerId: null | number;
  bowlingTeamId: null | number;
  dismissedPlayerId: null | number;
  inningsId: null | number;
  inningsNumber: null | number;
  nonStrikerId: null | number;
  overNumber: number;
  strikerId: null | number;
}

interface SessionDelivery {
  assistedBy?: { id: number; name: string } | null;
  assistedById?: number | null;
  ballInOver: number;
  batterRuns: number;
  bowler?: { id: number; name: string } | null;
  bowlerId: number;
  byeRuns: number;
  dismissedPlayer?: { id: number; name: string } | null;
  dismissedPlayerId: number | null;
  id: number;
  inningsId: number;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStriker?: { id: number; name: string } | null;
  nonStrikerId: number;
  overNumber: number;
  penaltyRuns?: number;
  sequenceNo: number;
  striker?: { id: number; name: string } | null;
  strikerId: number;
  totalRuns: number;
  wicketType: null | string;
  wideRuns: number;
}

export type DeliveryChipTone = "default" | "scoring" | "wicket";

interface DeliveryChipDisplay {
  detailText: string;
  label: string;
  showDetailIndicator: boolean;
}

interface DeliveryOverGroup {
  deliveries: SessionDelivery[];
  overNumber: number;
}

interface PendingCloseDialogState {
  deliveryId: number | null;
  inningsId: number;
  mode: "auto" | "manual";
}

type ScoringSessionMutationResult = Awaited<
  ReturnType<ScorePageClient["recordScoringDelivery"]>
>;
type ScoringSetupResult = Awaited<
  ReturnType<ScorePageClient["startScoringInnings"]>
>;

type ScoringPhase = PreMatchPhase | "completed" | "scoring";

const SCORING_STEPS: { key: ScoringPhase; label: string }[] = [
  { key: "lineup", label: "Lineup" },
  { key: "toss", label: "Toss" },
  { key: "inningsSetup", label: "Start Innings" },
  { key: "scoring", label: "Score" },
  { key: "completed", label: "Result" },
];

interface PreMatchSetupViewModel {
  inningsSetup: InningsSetupPhaseCardProps;
  lineup: LineupPhaseCardProps;
  toss: TossPhaseCardProps;
}

function MatchScoringLoadingSkeleton() {
  const loadingStepKeys = [
    "lineup",
    "toss",
    "innings",
    "score",
    "result",
  ] as const;
  const loadingOverKeys = ["over1", "over2", "over3"] as const;
  const loadingDeliveryChipKeys = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
  const loadingBatRunKeys = [0, 1, 2, 3, 4, 5] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,180,80,0.14),transparent_30%),linear-gradient(180deg,rgba(255,248,233,0.55),transparent_28%),var(--background)] pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <section
          aria-busy="true"
          className="space-y-4 border border-border/50 bg-card/90 p-5 backdrop-blur"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-56 sm:w-72" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-4/5 max-w-xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {loadingStepKeys.map((stepKey) => (
              <Skeleton className="h-8 w-24 sm:w-28" key={stepKey} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)]">
          {/* Left column: innings info + timeline */}
          <div className="space-y-5">
            <div className="border border-border/50 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-8 w-40" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-36" />
                </div>
              </div>
            </div>

            <div className="border border-border/50 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Skeleton className="h-3 w-40" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {loadingOverKeys.map((overKey) => (
                  <div
                    className="border border-border/40 bg-[color-mix(in_oklab,var(--color-card)_95%,var(--color-primary)_5%)] px-4 py-3"
                    key={overKey}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {loadingDeliveryChipKeys.map((chipKey) => (
                          <Skeleton className="size-10" key={chipKey} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: ScoreABall */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-5 border border-border/50 bg-card px-4 py-5 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-48" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-44" />
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="grid grid-cols-6 gap-2 sm:gap-3">
                    {loadingBatRunKeys.map((i) => (
                      <Skeleton className="h-11 w-full" key={i} />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>

                <Skeleton className="angled-cut h-14 w-full" />

                <div className="space-y-4 border border-border/40 bg-muted/15 p-4 sm:p-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full max-w-xs" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="angled-cut h-11 w-36" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function normalizeSelection(
  selection: TeamSelection | undefined
): TeamSelection {
  if (!selection) {
    return { playerIds: [] };
  }

  return {
    playerIds: selection.playerIds,
    captainPlayerId: selection.captainPlayerId,
    viceCaptainPlayerId: selection.viceCaptainPlayerId,
    wicketKeeperPlayerId: selection.wicketKeeperPlayerId,
  };
}

function toPlayerOptions(
  players: SessionLineupPlayer[]
): ScoringPlayerOption[] {
  return players.map((player) => ({
    battingOrder: player.battingOrder,
    id: player.id,
    name: player.name,
    teamId: player.teamId,
  }));
}

export function resolveScoringBattingOptions(params: {
  availableBatters: ScoringPlayerOption[];
  battingLineup: ScoringPlayerOption[];
  currentDeliveries: Pick<
    SessionDelivery,
    "dismissedPlayerId" | "isWicket" | "sequenceNo"
  >[];
  draft: null | Pick<DeliveryDraft, "nonStrikerId" | "strikerId">;
  editingDelivery: null | Pick<
    SessionDelivery,
    "nonStrikerId" | "sequenceNo" | "strikerId"
  >;
}): ScoringPlayerOption[] {
  const eligibleBatterIds = new Set<number>();

  const editingDelivery = params.editingDelivery;

  if (editingDelivery) {
    const dismissedBeforeEdit = new Set(
      params.currentDeliveries
        .filter(
          (delivery) =>
            delivery.sequenceNo < editingDelivery.sequenceNo &&
            delivery.isWicket &&
            typeof delivery.dismissedPlayerId === "number"
        )
        .map((delivery) => delivery.dismissedPlayerId as number)
    );

    for (const player of params.battingLineup) {
      if (!dismissedBeforeEdit.has(player.id)) {
        eligibleBatterIds.add(player.id);
      }
    }

    eligibleBatterIds.add(editingDelivery.strikerId);
    eligibleBatterIds.add(editingDelivery.nonStrikerId);
  } else {
    for (const player of params.availableBatters) {
      eligibleBatterIds.add(player.id);
    }

    if (typeof params.draft?.strikerId === "number") {
      eligibleBatterIds.add(params.draft.strikerId);
    }

    if (typeof params.draft?.nonStrikerId === "number") {
      eligibleBatterIds.add(params.draft.nonStrikerId);
    }
  }

  return params.battingLineup.filter((player) =>
    eligibleBatterIds.has(player.id)
  );
}

function buildDraftFromEntryContext(
  entryContext: SessionEntryContext
): DeliveryDraft | null {
  if (entryContext.inningsId === null) {
    return null;
  }

  return {
    inningsId: entryContext.inningsId,
    strikerId: entryContext.strikerId,
    nonStrikerId: entryContext.nonStrikerId,
    bowlerId: entryContext.bowlerId,
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
}

function buildDraftFromDelivery(delivery: SessionDelivery): DeliveryDraft {
  return {
    inningsId: delivery.inningsId,
    strikerId: delivery.strikerId,
    nonStrikerId: delivery.nonStrikerId,
    bowlerId: delivery.bowlerId,
    batterRuns: delivery.batterRuns,
    wideRuns: delivery.wideRuns,
    noBallRuns: delivery.noBallRuns,
    byeRuns: delivery.byeRuns,
    legByeRuns: delivery.legByeRuns,
    penaltyRuns: delivery.penaltyRuns ?? 0,
    wicketType: (delivery.wicketType as DeliveryDraft["wicketType"]) ?? "",
    dismissedPlayerId: delivery.dismissedPlayerId,
    assistedById: delivery.assistedBy?.id ?? delivery.assistedById ?? null,
  };
}

function formatOvers(balls: number, ballsPerOver: number) {
  return `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;
}

export function groupDeliveriesByOver(deliveries: SessionDelivery[]) {
  const groupedDeliveries = new Map<number, SessionDelivery[]>();

  for (const delivery of deliveries) {
    const deliveriesForOver = groupedDeliveries.get(delivery.overNumber) ?? [];
    deliveriesForOver.push(delivery);
    groupedDeliveries.set(delivery.overNumber, deliveriesForOver);
  }

  return Array.from(groupedDeliveries.entries()).map(
    ([overNumber, deliveriesForOver]) =>
      ({
        overNumber,
        deliveries: deliveriesForOver,
      }) satisfies DeliveryOverGroup
  );
}

export function getDeliveryChipTone(
  delivery: Pick<SessionDelivery, "isWicket" | "totalRuns">
): DeliveryChipTone {
  if (delivery.isWicket) {
    return "wicket";
  }

  if (delivery.totalRuns === 0) {
    return "default";
  }

  return "scoring";
}

const DELIVERY_EXTRA_CONFIG = [
  {
    key: "wideRuns",
    detailLabel: "Wide",
    shortLabel: "Wd",
  },
  {
    key: "noBallRuns",
    detailLabel: "No ball",
    shortLabel: "Nb",
  },
  {
    key: "byeRuns",
    detailLabel: "Byes",
    shortLabel: "By",
  },
  {
    key: "legByeRuns",
    detailLabel: "Leg byes",
    shortLabel: "Lb",
  },
  {
    key: "penaltyRuns",
    detailLabel: "Penalty",
    shortLabel: "Pn",
  },
] as const satisfies readonly {
  detailLabel: string;
  key: "byeRuns" | "legByeRuns" | "noBallRuns" | "penaltyRuns" | "wideRuns";
  shortLabel: string;
}[];

function formatDeliveryRunCount(totalRuns: number) {
  return `${totalRuns} ${totalRuns === 1 ? "run" : "runs"}`;
}

function formatWicketSummary(wicketType: null | string) {
  if (!wicketType) {
    return "Wicket";
  }

  if (wicketType === "lbw") {
    return "LBW";
  }

  return `${wicketType.charAt(0).toUpperCase()}${wicketType.slice(1)}`;
}

function getDeliveryExtras(
  delivery: Pick<
    SessionDelivery,
    "byeRuns" | "legByeRuns" | "noBallRuns" | "penaltyRuns" | "wideRuns"
  >
) {
  return DELIVERY_EXTRA_CONFIG.flatMap((extra) => {
    const runs = delivery[extra.key] ?? 0;

    if (runs <= 0) {
      return [];
    }

    return [{ ...extra, runs }];
  });
}

export function getDeliveryChipDisplay(
  delivery: Pick<
    SessionDelivery,
    | "byeRuns"
    | "isWicket"
    | "legByeRuns"
    | "noBallRuns"
    | "penaltyRuns"
    | "totalRuns"
    | "wideRuns"
    | "wicketType"
  >
): DeliveryChipDisplay {
  const extras = getDeliveryExtras(delivery);
  const hasExtras = extras.length > 0;
  const wicketLabel = delivery.totalRuns > 0 ? `${delivery.totalRuns}W` : "W";
  const primaryExtra = extras[0] ?? null;

  let label = String(delivery.totalRuns);

  if (delivery.isWicket) {
    label = wicketLabel;
  } else if (primaryExtra) {
    label = `${delivery.totalRuns}${primaryExtra.shortLabel}`;
  }

  const detailParts = [formatDeliveryRunCount(delivery.totalRuns)];

  if (delivery.isWicket) {
    detailParts.push(formatWicketSummary(delivery.wicketType));
  }

  for (const extra of extras) {
    detailParts.push(`${extra.detailLabel} ${extra.runs}`);
  }

  return {
    detailText: detailParts.join(" • "),
    label,
    showDetailIndicator: (delivery.isWicket && hasExtras) || extras.length > 1,
  };
}

function getDeliveryChipClasses({
  isSelected,
  tone,
}: {
  isSelected: boolean;
  tone: DeliveryChipTone;
}) {
  let toneClasses =
    "border-border/70 bg-background text-foreground hover:border-primary/40";

  if (tone === "wicket") {
    toneClasses =
      "border-destructive/40 bg-destructive text-destructive-foreground hover:bg-destructive/90";
  } else if (tone === "scoring") {
    toneClasses =
      "border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90";
  }

  let selectedClasses: null | string = null;

  if (isSelected) {
    if (tone === "wicket") {
      selectedClasses = "ring-2 ring-destructive/30 ring-offset-2";
    } else {
      selectedClasses = "ring-2 ring-primary/30 ring-offset-2";
    }
  }

  return cn(
    "relative flex size-10 items-center justify-center rounded-full border text-center font-semibold text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    toneClasses,
    selectedClasses
  );
}

function resolveLineupPlayersByTeam(params: {
  team1Id?: null | number;
  team1Players: SessionLineupPlayer[];
  team2Id?: null | number;
  team2Players: SessionLineupPlayer[];
  teamId?: null | number;
}) {
  if (params.teamId === params.team1Id) {
    return params.team1Players;
  }

  if (params.teamId === params.team2Id) {
    return params.team2Players;
  }

  return [] as SessionLineupPlayer[];
}

function resolveTeamName(params: {
  team1Id?: null | number;
  team1Name: string;
  team2Id?: null | number;
  team2Name: string;
  teamId?: null | number;
}) {
  if (params.teamId === params.team1Id) {
    return params.team1Name;
  }

  if (params.teamId === params.team2Id) {
    return params.team2Name;
  }

  return "TBD";
}

function createPreMatchSetupViewModel(params: {
  battingTeamName: string;
  bowlingTeamName: string;
  followOn?: {
    isApplied: boolean;
    onToggle: (checked: boolean) => void;
  } | null;
  inningsNumber?: number;
  inningsSetupAvailable: boolean;
  isLineupValid: boolean;
  isSavingLineups: boolean;
  isStartingInnings: boolean;
  nonStrikerId: null | number;
  onConfirmToss: () => void;
  onEditToss: () => void;
  onNonStrikerChange: (playerId: null | number) => void;
  onOpeningBowlerChange: (playerId: null | number) => void;
  onSaveLineups: () => void;
  onStartInnings: () => void;
  onStrikerChange: (playerId: null | number) => void;
  onTossDecisionChange: (decision: "bat" | "bowl") => void;
  onTossWinnerChange: (teamId: number) => void;
  openingBowlerId: null | number;
  openingBowlerOptions: ScoringPlayerOption[];
  shouldShowEditToss: boolean;
  strikerId: null | number;
  strikerOptions: ScoringPlayerOption[];
  team1Id: number;
  team1LineupNames: string[];
  team1Name: string;
  team1Roster: RosterPlayer[];
  team1Selection: TeamSelection;
  team1ShortName: string;
  team2Id: number;
  team2LineupNames: string[];
  team2Name: string;
  team2Roster: RosterPlayer[];
  team2Selection: TeamSelection;
  team2ShortName: string;
  tossDecision: "bat" | "bowl";
  tossWinnerId: null | number;
  setTeam1Selection: (selection: TeamSelection) => void;
  setTeam2Selection: (selection: TeamSelection) => void;
  maxPlayers: number;
  nonStrikerOptions: ScoringPlayerOption[];
}): PreMatchSetupViewModel {
  return {
    lineup: {
      isLineupValid: params.isLineupValid,
      isSaving: params.isSavingLineups,
      maxPlayers: params.maxPlayers,
      onSaveLineups: params.onSaveLineups,
      setTeam1Selection: params.setTeam1Selection,
      setTeam2Selection: params.setTeam2Selection,
      team1Roster: params.team1Roster,
      team1Selection: params.team1Selection,
      team1ShortName: params.team1ShortName,
      team2Roster: params.team2Roster,
      team2Selection: params.team2Selection,
      team2ShortName: params.team2ShortName,
    },
    toss: {
      onConfirmToss: params.onConfirmToss,
      onTossDecisionChange: params.onTossDecisionChange,
      onTossWinnerChange: params.onTossWinnerChange,
      team1Id: params.team1Id,
      team1Name: params.team1Name,
      team2Id: params.team2Id,
      team2Name: params.team2Name,
      tossDecision: params.tossDecision,
      tossWinnerId: params.tossWinnerId,
    },
    inningsSetup: {
      battingTeamName: params.battingTeamName,
      bowlingTeamName: params.bowlingTeamName,
      canEditToss: params.shouldShowEditToss,
      followOn: params.followOn ?? null,
      inningsSetupAvailable: params.inningsSetupAvailable,
      inningsTitle: params.inningsNumber
        ? `Start innings ${params.inningsNumber}`
        : "Start innings",
      isStarting: params.isStartingInnings,
      nonStrikerId: params.nonStrikerId,
      nonStrikerOptions: params.nonStrikerOptions,
      onEditToss: params.onEditToss,
      onNonStrikerChange: params.onNonStrikerChange,
      onOpeningBowlerChange: params.onOpeningBowlerChange,
      onStartInnings: params.onStartInnings,
      onStrikerChange: params.onStrikerChange,
      openingBowlerId: params.openingBowlerId,
      openingBowlerOptions: params.openingBowlerOptions,
      strikerId: params.strikerId,
      strikerOptions: params.strikerOptions,
      team1LineupNames: params.team1LineupNames,
      team1ShortName: params.team1ShortName,
      team2LineupNames: params.team2LineupNames,
      team2ShortName: params.team2ShortName,
    },
  };
}

function DeliveryChipButton({
  delivery,
  isSelected,
  onSelectDelivery,
}: {
  delivery: SessionDelivery;
  isSelected: boolean;
  onSelectDelivery: (deliveryId: number) => void;
}) {
  const tone = getDeliveryChipTone(delivery);
  const chipDisplay = getDeliveryChipDisplay(delivery);
  const chipButton = (
    <button
      aria-label={`Edit over ${delivery.overNumber - 1}.${delivery.ballInOver}: ${chipDisplay.detailText}`}
      className={getDeliveryChipClasses({ isSelected, tone })}
      onClick={() => onSelectDelivery(delivery.id)}
      title={
        chipDisplay.showDetailIndicator ? undefined : chipDisplay.detailText
      }
      type="button"
    >
      <span>{chipDisplay.label}</span>
      {chipDisplay.showDetailIndicator ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 size-3 rounded-full border-2 border-card bg-amber-300 shadow-sm"
        />
      ) : null}
    </button>
  );

  if (chipDisplay.showDetailIndicator) {
    return (
      <Tooltip>
        <TooltipTrigger render={chipButton} />
        <TooltipContent side="top">{chipDisplay.detailText}</TooltipContent>
      </Tooltip>
    );
  }

  return chipButton;
}

export function DeliveryTimelineCard({
  actions,
  deliveries,
  isDesktop,
  isExpanded,
  onToggleExpanded,
  onSelectDelivery,
  selectedDeliveryId,
}: {
  actions?: ReactNode;
  deliveries: SessionDelivery[];
  isDesktop: boolean;
  isExpanded: boolean;
  onSelectDelivery: (deliveryId: number) => void;
  onToggleExpanded: () => void;
  selectedDeliveryId: number | null;
}) {
  const groupedDeliveries = groupDeliveriesByOver(deliveries);
  let timelineContent: ReactNode;

  if (!isExpanded) {
    timelineContent = (
      <div className="mt-4 border border-border/40 border-dashed bg-muted/10 px-4 py-3 text-muted-foreground text-sm">
        {isDesktop
          ? "Timeline hidden. Expand it when you need to review or edit a delivery."
          : "Timeline collapsed so the live scoring card stays in reach."}
      </div>
    );
  } else if (deliveries.length === 0) {
    timelineContent = (
      <p className="mt-4 text-muted-foreground text-sm">
        No deliveries recorded yet. Score the first delivery to start the
        innings timeline.
      </p>
    );
  } else {
    timelineContent = (
      <div className="mt-4 space-y-3">
        {groupedDeliveries.map((overGroup) => {
          const bowlerName = overGroup.deliveries.find((d) => d.bowler)?.bowler
            ?.name;
          const overRuns = overGroup.deliveries.reduce(
            (sum, d) => sum + d.totalRuns,
            0
          );
          return (
            <div
              className="border border-border/40 bg-[color-mix(in_oklab,var(--color-card)_95%,var(--color-primary)_5%)] px-4 py-3"
              key={overGroup.overNumber}
            >
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">
                    Over {overGroup.overNumber}
                  </p>
                  {bowlerName && (
                    <span className="inline-flex items-center bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs ring-1 ring-border/50 ring-inset">
                      {bowlerName}
                    </span>
                  )}
                </div>
                <span className="text-sm tabular-nums">{overRuns} runs</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {overGroup.deliveries.map((delivery) => (
                  <DeliveryChipButton
                    delivery={delivery}
                    isSelected={selectedDeliveryId === delivery.id}
                    key={delivery.id}
                    onSelectDelivery={onSelectDelivery}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="border border-border/50 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
            Over by Over Timeline
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <Button
            aria-expanded={isExpanded}
            onClick={onToggleExpanded}
            size="sm"
            type="button"
            variant="outline"
          >
            {isExpanded ? (
              <ChevronUpIcon className="mr-2 size-4" />
            ) : (
              <ChevronDownIcon className="mr-2 size-4" />
            )}
            {isExpanded ? "Hide timeline" : "Show timeline"}
          </Button>
        </div>
      </div>
      {timelineContent}
    </section>
  );
}

function RouteComponent() {
  const { matchId } = Route.useParams();
  const { client, orpc } = Route.useRouteContext();

  return <ScorePage client={client} matchId={matchId} orpc={orpc} />;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The scoring route coordinates multiple setup and scoring phases in one screen.
export function ScorePage({ client, matchId, orpc }: ScorePageProps) {
  const numericMatchId = Number(matchId);
  const queryClient = useQueryClient();

  const scoringQueryOptions = orpc.getMatchScoringSetup.queryOptions({
    input: { matchId: numericMatchId },
  });

  const { data: scoringSetup, isLoading } = useQuery(scoringQueryOptions);

  const match = scoringSetup?.match ?? null;
  const canCurrentUserScore = scoringSetup?.canCurrentUserScore ?? false;
  const playersPerSide = scoringSetup?.playersPerSide ?? 0;
  const team1Roster = scoringSetup?.team1Roster ?? [];
  const team2Roster = scoringSetup?.team2Roster ?? [];
  const tournamentId = match?.tournamentId;

  const [team1Selection, setTeam1Selection] = useState<TeamSelection>(
    normalizeSelection(scoringSetup?.savedLineup?.team1)
  );
  const [team2Selection, setTeam2Selection] = useState<TeamSelection>(
    normalizeSelection(scoringSetup?.savedLineup?.team2)
  );
  const [tossWinnerId, setTossWinnerId] = useState<number | null>(
    match?.tossWinnerId ?? match?.team1Id ?? null
  );
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">(
    match?.tossDecision === "bowl" ? "bowl" : "bat"
  );
  const [isTossConfirmed, setIsTossConfirmed] = useState(
    Boolean(
      typeof match?.tossWinnerId === "number" &&
        (match?.tossDecision === "bat" || match?.tossDecision === "bowl")
    )
  );
  const [followOnApplied, setFollowOnApplied] = useState(false);
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [openingBowlerId, setOpeningBowlerId] = useState<number | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(
    null
  );
  const [pendingCloseDialog, setPendingCloseDialog] =
    useState<null | PendingCloseDialogState>(null);
  const [draft, setDraft] = useState<DeliveryDraft | null>(null);
  const [isDesktopTimeline, setIsDesktopTimeline] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const invalidateScoringQueries = async () => {
    const tasks = [
      queryClient.invalidateQueries(scoringQueryOptions),
      queryClient.invalidateQueries(
        orpc.getMatchById.queryOptions({ input: numericMatchId })
      ),
      queryClient.invalidateQueries(orpc.liveMatches.queryOptions()),
      queryClient.invalidateQueries(
        orpc.getMatchScorecard.queryOptions({
          input: {
            matchId: numericMatchId,
            includeBallByBall: false,
          },
        })
      ),
    ];

    if (typeof tournamentId === "number") {
      tasks.push(
        queryClient.invalidateQueries(
          orpc.tournamentFixtures.queryOptions({
            input: {
              tournamentId,
            },
          })
        )
      );
    }

    await Promise.all(tasks);
  };

  const backgroundRefreshQueries = useMemo(
    () =>
      buildBackgroundScoreRefreshQueries({
        matchId: numericMatchId,
        orpc,
        tournamentId,
      }),
    [numericMatchId, orpc, tournamentId]
  );

  const queueBackgroundRefresh = (refreshTasks: Promise<unknown>[]) => {
    if (refreshTasks.length === 0) {
      return;
    }

    Promise.allSettled(refreshTasks);
  };

  const handleScoringSessionMutationSuccess = (
    session: ScoringSessionMutationResult,
    options?: {
      clearSelectedDelivery?: boolean;
      selectedDeliveryId?: number | null;
    }
  ) => {
    const refreshTasks = applyScoringSessionMutationResult({
      backgroundQueries: backgroundRefreshQueries,
      queryClient,
      scoringQuery: scoringQueryOptions,
      session,
    });

    if (typeof options?.selectedDeliveryId !== "undefined") {
      setSelectedDeliveryId(options.selectedDeliveryId);
    } else if (options?.clearSelectedDelivery) {
      setSelectedDeliveryId(null);
    }

    queueBackgroundRefresh(refreshTasks);
  };

  const handleScoringSetupSuccess = (
    session: ScoringSetupResult,
    options?: {
      clearSelectedDelivery?: boolean;
    }
  ) => {
    queryClient.setQueryData(scoringQueryOptions.queryKey, session);

    if (options?.clearSelectedDelivery) {
      setSelectedDeliveryId(null);
    }

    queueBackgroundRefresh(
      backgroundRefreshQueries.map((query) =>
        queryClient.invalidateQueries({
          queryKey: query.queryKey,
        })
      )
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncTimelineViewport = () => {
      setIsDesktopTimeline(mediaQuery.matches);
      setIsTimelineExpanded(mediaQuery.matches);
    };

    syncTimelineViewport();
    mediaQuery.addEventListener("change", syncTimelineViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncTimelineViewport);
    };
  }, []);

  useEffect(() => {
    setTeam1Selection(normalizeSelection(scoringSetup?.savedLineup?.team1));
    setTeam2Selection(normalizeSelection(scoringSetup?.savedLineup?.team2));
  }, [scoringSetup?.savedLineup]);

  useEffect(() => {
    if (
      scoringSetup?.currentInnings &&
      !scoringSetup.currentInnings.isCompleted
    ) {
      return;
    }

    setTossWinnerId(match?.tossWinnerId ?? match?.team1Id ?? null);
    setTossDecision(match?.tossDecision === "bowl" ? "bowl" : "bat");
    setIsTossConfirmed(
      Boolean(
        typeof match?.tossWinnerId === "number" &&
          (match?.tossDecision === "bat" || match?.tossDecision === "bowl")
      )
    );
  }, [
    match?.team1Id,
    match?.tossDecision,
    match?.tossWinnerId,
    scoringSetup?.currentInnings,
  ]);

  const saveLineupMutation = useMutation({
    mutationFn: async () =>
      client.saveMatchLineup({
        matchId: numericMatchId,
        team1: team1Selection,
        team2: team2Selection,
      }),
    onSuccess: async () => {
      toast.success("Playing lineup saved");
      await invalidateScoringQueries();
    },
    onError: (error) => {
      toast.error(
        error.message || "Couldn't save the playing lineup. Please try again."
      );
    },
  });

  const startInningsMutation = useMutation({
    mutationFn: async (payload: {
      battingTeamId: number;
      bowlingTeamId: number;
      inningsNumber?: number;
      openingBowlerId: number;
      nonStrikerId: number;
      strikerId: number;
      tossDecision?: "bat" | "bowl";
      tossWinnerId?: number;
    }) =>
      client.startScoringInnings({
        matchId: numericMatchId,
        ...payload,
      }),
    onSuccess: (session) => {
      toast.success("Innings started");
      handleScoringSetupSuccess(session);
    },
    onError: (error) => {
      toast.error(
        error.message ||
          "Couldn't start the innings. Check the selected players and try again."
      );
    },
  });

  const recordDeliveryMutation = useMutation({
    mutationFn: async (payload: DeliveryDraft) =>
      client.recordScoringDelivery(buildDeliveryMutationPayload(payload)),
    onSuccess: (session) => {
      toast.success("Delivery recorded");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: session.pendingInningsClosure === null,
        selectedDeliveryId: session.pendingInningsClosure?.deliveryId,
      });

      if (session.pendingInningsClosure) {
        setPendingCloseDialog({
          deliveryId: session.pendingInningsClosure.deliveryId,
          inningsId: session.pendingInningsClosure.inningsId,
          mode: "auto",
        });
      }
    },
    onError: (error) => {
      toast.error(
        error.message || "Couldn't record this delivery. Please try again."
      );
    },
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async (payload: DeliveryDraft & { deliveryId: number }) =>
      client.updateScoringDelivery({
        deliveryId: payload.deliveryId,
        ...buildDeliveryMutationPayload(payload),
      }),
    onSuccess: (session) => {
      toast.success("Delivery updated");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: session.pendingInningsClosure === null,
        selectedDeliveryId: session.pendingInningsClosure?.deliveryId,
      });

      if (session.pendingInningsClosure) {
        setPendingCloseDialog({
          deliveryId: session.pendingInningsClosure.deliveryId,
          inningsId: session.pendingInningsClosure.inningsId,
          mode: "auto",
        });
      }
    },
    onError: (error) => {
      toast.error(
        error.message || "Couldn't update this delivery. Please try again."
      );
    },
  });

  const deleteDeliveryMutation = useMutation({
    mutationFn: async (deliveryId: number) =>
      client.deleteScoringDelivery({ deliveryId }),
    onSuccess: (session) => {
      toast.success("Delivery deleted");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: session.pendingInningsClosure === null,
        selectedDeliveryId: session.pendingInningsClosure?.deliveryId ?? null,
      });

      if (session.pendingInningsClosure) {
        setPendingCloseDialog({
          deliveryId: session.pendingInningsClosure.deliveryId,
          inningsId: session.pendingInningsClosure.inningsId,
          mode: "auto",
        });
      }
    },
    onError: (error) => {
      toast.error(
        error.message || "Couldn't delete this delivery. Please try again."
      );
    },
  });

  const closeInningsMutation = useMutation({
    mutationFn: async (inningsId: number) =>
      client.closeCurrentScoringInnings({ inningsId }),
    onSuccess: (session) => {
      toast.success("Innings ended");
      setPendingCloseDialog(null);
      handleScoringSetupSuccess(session, {
        clearSelectedDelivery: true,
      });
    },
    onError: (error) => {
      toast.error(
        error.message || "Couldn't end the innings. Please try again."
      );
    },
  });

  const handleCloseInnings = (inningsId: number) => {
    setPendingCloseDialog({
      deliveryId: selectedDeliveryId,
      inningsId,
      mode: "manual",
    });
  };

  const handleConfirmCloseInnings = () => {
    if (!pendingCloseDialog) {
      return;
    }

    closeInningsMutation.mutate(pendingCloseDialog.inningsId);
  };

  const handleDeclineCloseInnings = () => {
    if (pendingCloseDialog?.mode === "auto") {
      setSelectedDeliveryId(pendingCloseDialog.deliveryId);
    }

    setPendingCloseDialog(null);
  };

  const team1RosterById = useMemo(
    () => new Map(team1Roster.map((player) => [player.playerId, player.name])),
    [team1Roster]
  );
  const team2RosterById = useMemo(
    () => new Map(team2Roster.map((player) => [player.playerId, player.name])),
    [team2Roster]
  );

  const team1LineupNames = team1Selection.playerIds.map(
    (playerId) => team1RosterById.get(playerId) ?? "Unknown"
  );
  const team2LineupNames = team2Selection.playerIds.map(
    (playerId) => team2RosterById.get(playerId) ?? "Unknown"
  );

  const teamLineupPlayers = scoringSetup?.teamLineupPlayers ?? {
    team1: [],
    team2: [],
  };

  const tossDerivedTeams = resolveBattingAndBowlingTeamIds({
    team1Id: match?.team1Id,
    team2Id: match?.team2Id,
    tossWinnerId,
    tossDecision,
  });
  const inningsSetupSelection = resolveInningsSetupSelection({
    followOnApplied,
    nextInningsDefaults: scoringSetup?.nextInningsDefaults,
    tossDerivedTeams,
  });

  useEffect(() => {
    setFollowOnApplied(
      Boolean(scoringSetup?.nextInningsDefaults?.followOn?.isApplied)
    );
  }, [scoringSetup?.nextInningsDefaults?.followOn?.isApplied]);

  const battingTeamId = inningsSetupSelection.battingTeamId;
  const bowlingTeamId = inningsSetupSelection.bowlingTeamId;
  const setupBattingPlayers = resolveLineupPlayersByTeam({
    teamId: battingTeamId,
    team1Id: match?.team1Id,
    team1Players: teamLineupPlayers.team1,
    team2Id: match?.team2Id,
    team2Players: teamLineupPlayers.team2,
  });
  const setupBowlingPlayers = resolveLineupPlayersByTeam({
    teamId: bowlingTeamId,
    team1Id: match?.team1Id,
    team1Players: teamLineupPlayers.team1,
    team2Id: match?.team2Id,
    team2Players: teamLineupPlayers.team2,
  });

  useEffect(() => {
    if (setupBattingPlayers.length < 2) {
      setStrikerId(null);
      setNonStrikerId(null);
      return;
    }

    const battingIds = new Set(setupBattingPlayers.map((player) => player.id));
    const defaultStrikerId = setupBattingPlayers[0]?.id ?? null;
    const defaultNonStrikerId = setupBattingPlayers[1]?.id ?? null;

    setStrikerId((previous) =>
      previous && battingIds.has(previous) ? previous : defaultStrikerId
    );
    setNonStrikerId((previous) => {
      const resolvedPrevious =
        previous && battingIds.has(previous) ? previous : defaultNonStrikerId;
      if (resolvedPrevious === strikerId) {
        return (
          setupBattingPlayers.find((player) => player.id !== strikerId)?.id ??
          null
        );
      }
      return resolvedPrevious;
    });
  }, [setupBattingPlayers, strikerId]);

  useEffect(() => {
    if (setupBowlingPlayers.length === 0) {
      setOpeningBowlerId(null);
      return;
    }

    const bowlingIds = new Set(setupBowlingPlayers.map((player) => player.id));
    const defaultBowlerId = setupBowlingPlayers[0]?.id ?? null;
    setOpeningBowlerId((previous) =>
      previous && bowlingIds.has(previous) ? previous : defaultBowlerId
    );
  }, [setupBowlingPlayers]);

  const currentInnings = scoringSetup?.currentInnings ?? null;
  const pendingInningsClosure = scoringSetup?.pendingInningsClosure ?? null;
  const hasPendingInningsClosure = pendingInningsClosure !== null;
  const currentDeliveries = (currentInnings?.deliveries ??
    []) as SessionDelivery[];
  const matchFlags: MatchFlags = {
    hasBoundaryOut: Boolean(match?.hasBoundaryOut),
    hasBye: Boolean(match?.hasBye),
    hasLBW: Boolean(match?.hasLBW),
    hasLegBye: Boolean(match?.hasLegBye),
    hasNoBalls: Boolean(match?.hasNoBalls),
    hasPenaltyRuns: Boolean(match?.hasPenaltyRuns),
    hasWides: Boolean(match?.hasWides),
  };
  const editingDelivery =
    currentDeliveries.find((delivery) => delivery.id === selectedDeliveryId) ??
    null;

  useEffect(() => {
    if (!pendingInningsClosure) {
      return;
    }

    const pendingDeliveryExists = currentDeliveries.some(
      (delivery) => delivery.id === pendingInningsClosure.deliveryId
    );
    if (!pendingDeliveryExists) {
      return;
    }

    setSelectedDeliveryId(pendingInningsClosure.deliveryId);
  }, [currentDeliveries, pendingInningsClosure]);

  useEffect(() => {
    if (!(scoringSetup && currentInnings)) {
      setDraft(null);
      return;
    }

    if (editingDelivery) {
      setDraft(buildDraftFromDelivery(editingDelivery));
      return;
    }

    setDraft(
      buildDraftFromEntryContext(
        scoringSetup.entryContext as SessionEntryContext
      )
    );
  }, [currentInnings, editingDelivery, scoringSetup]);

  const activeBattingTeamId =
    currentInnings?.battingTeamId ??
    battingTeamId ??
    scoringSetup?.entryContext?.battingTeamId ??
    null;
  const activeBowlingTeamId =
    currentInnings?.bowlingTeamId ??
    bowlingTeamId ??
    scoringSetup?.entryContext?.bowlingTeamId ??
    null;
  const fallbackDraft = scoringSetup?.entryContext
    ? buildDraftFromEntryContext(
        scoringSetup.entryContext as SessionEntryContext
      )
    : null;
  const activeDraft = draft ?? fallbackDraft;
  const battingLineup = toPlayerOptions(
    resolveLineupPlayersByTeam({
      teamId: activeBattingTeamId,
      team1Id: match?.team1Id,
      team1Players: teamLineupPlayers.team1,
      team2Id: match?.team2Id,
      team2Players: teamLineupPlayers.team2,
    })
  );

  const battingPlayers = useMemo(
    () =>
      resolveScoringBattingOptions({
        availableBatters: toPlayerOptions(scoringSetup?.availableBatters ?? []),
        battingLineup,
        currentDeliveries,
        draft: activeDraft,
        editingDelivery,
      }),
    [
      activeDraft,
      battingLineup,
      currentDeliveries,
      editingDelivery,
      scoringSetup,
    ]
  );
  const bowlingPlayers = toPlayerOptions(
    resolveLineupPlayersByTeam({
      teamId: activeBowlingTeamId,
      team1Id: match?.team1Id,
      team1Players: teamLineupPlayers.team1,
      team2Id: match?.team2Id,
      team2Players: teamLineupPlayers.team2,
    })
  );

  const isLineupValid =
    team1Selection.playerIds.length === playersPerSide &&
    team2Selection.playerIds.length === playersPerSide;

  const inningsSetupAvailable =
    isTossConfirmed &&
    battingTeamId !== null &&
    bowlingTeamId !== null &&
    strikerId !== null &&
    nonStrikerId !== null &&
    openingBowlerId !== null &&
    strikerId !== nonStrikerId &&
    battingTeamId !== bowlingTeamId;

  const team1Name = match?.team1?.name ?? "Team 1";
  const team2Name = match?.team2?.name ?? "Team 2";
  const team1ShortName = match?.team1?.shortName ?? "T1";
  const team2ShortName = match?.team2?.shortName ?? "T2";

  const scoringPhase: ScoringPhase =
    scoringSetup?.phase === "toss" && isTossConfirmed
      ? "inningsSetup"
      : (scoringSetup?.phase ?? "lineup");

  const selectedInningsSummary =
    currentInnings ?? scoringSetup?.innings?.at(-1) ?? null;
  let matchStatusLabel = "Awaiting setup";
  if (match?.isCompleted) {
    matchStatusLabel = match.result ?? "Completed";
  } else if (currentInnings) {
    matchStatusLabel = `Innings ${currentInnings.inningsNumber} in progress`;
  }
  const handleRecordDeliveryView = () => {
    if (pendingInningsClosure) {
      setSelectedDeliveryId(pendingInningsClosure.deliveryId);
      return;
    }

    setSelectedDeliveryId(null);

    if (!isDesktopTimeline) {
      setIsTimelineExpanded(false);
    }
  };

  const handleSelectDelivery = (deliveryId: number) => {
    setSelectedDeliveryId(deliveryId);

    if (!isDesktopTimeline) {
      setIsTimelineExpanded(false);
    }
  };

  const submitDraft = async () => {
    if (!draft) {
      toast.error(
        "Can't record a delivery right now. Start or resume an innings."
      );
      return;
    }

    if (pendingInningsClosure && !editingDelivery) {
      toast.error(
        "Review the last ball or end the innings before recording another delivery."
      );
      setSelectedDeliveryId(pendingInningsClosure.deliveryId);
      return;
    }

    if (!(draft.strikerId && draft.nonStrikerId && draft.bowlerId)) {
      toast.error("Select striker, non-striker, and bowler to continue.");
      return;
    }

    if (draft.strikerId === draft.nonStrikerId) {
      toast.error("Striker and non-striker must be different");
      return;
    }

    if (editingDelivery) {
      await updateDeliveryMutation.mutateAsync({
        ...draft,
        deliveryId: editingDelivery.id,
      });
      return;
    }

    await recordDeliveryMutation.mutateAsync(draft);
  };

  const resetDraft = () => {
    if (editingDelivery) {
      setDraft(buildDraftFromDelivery(editingDelivery));
      return;
    }

    if (scoringSetup?.entryContext) {
      setDraft(
        buildDraftFromEntryContext(
          scoringSetup.entryContext as SessionEntryContext
        )
      );
    }
  };

  const isPreMatchPhase =
    scoringPhase === "lineup" ||
    scoringPhase === "toss" ||
    scoringPhase === "inningsSetup";

  const preMatchSetupViewModel = useMemo(
    () =>
      createPreMatchSetupViewModel({
        battingTeamName: resolveTeamName({
          team1Id: match?.team1Id,
          team1Name,
          team2Id: match?.team2Id,
          team2Name,
          teamId: battingTeamId,
        }),
        bowlingTeamName: resolveTeamName({
          team1Id: match?.team1Id,
          team1Name,
          team2Id: match?.team2Id,
          team2Name,
          teamId: bowlingTeamId,
        }),
        followOn: inningsSetupSelection.followOnAvailable
          ? {
              isApplied: followOnApplied,
              onToggle: setFollowOnApplied,
            }
          : null,
        inningsNumber: inningsSetupSelection.inningsNumber ?? undefined,
        inningsSetupAvailable,
        isLineupValid,
        isSavingLineups: saveLineupMutation.isPending,
        isStartingInnings: startInningsMutation.isPending,
        maxPlayers: playersPerSide,
        nonStrikerId,
        nonStrikerOptions: toPlayerOptions(
          setupBattingPlayers.filter((player) => player.id !== strikerId)
        ),
        onConfirmToss: () => {
          if (typeof tossWinnerId !== "number") {
            toast.error("Select the toss winner.");
            return;
          }

          setIsTossConfirmed(true);
        },
        onEditToss: () => setIsTossConfirmed(false),
        onNonStrikerChange: (playerId) => {
          const nextPair = resolveBattingPairSelection({
            currentNonStrikerId: nonStrikerId,
            currentStrikerId: strikerId,
            nextPlayerId: playerId,
            role: "nonStriker",
          });

          setStrikerId(nextPair.strikerId);
          setNonStrikerId(nextPair.nonStrikerId);
        },
        onOpeningBowlerChange: setOpeningBowlerId,
        onSaveLineups: () => {
          saveLineupMutation.mutate();
        },
        onStartInnings: () => {
          if (
            !(
              battingTeamId &&
              bowlingTeamId &&
              strikerId &&
              nonStrikerId &&
              openingBowlerId
            )
          ) {
            toast.error("Complete all innings setup fields.");
            return;
          }

          startInningsMutation.mutate({
            battingTeamId,
            bowlingTeamId,
            inningsNumber: inningsSetupSelection.inningsNumber ?? undefined,
            strikerId,
            nonStrikerId,
            openingBowlerId,
            tossWinnerId:
              typeof tossWinnerId === "number" ? tossWinnerId : undefined,
            tossDecision,
          });
        },
        onStrikerChange: (playerId) => {
          const nextPair = resolveBattingPairSelection({
            currentNonStrikerId: nonStrikerId,
            currentStrikerId: strikerId,
            nextPlayerId: playerId,
            role: "striker",
          });

          setStrikerId(nextPair.strikerId);
          setNonStrikerId(nextPair.nonStrikerId);
        },
        onTossDecisionChange: (decision) => {
          setTossDecision(decision);
          setIsTossConfirmed(false);
        },
        onTossWinnerChange: (teamId) => {
          setTossWinnerId(teamId);
          setIsTossConfirmed(false);
        },
        openingBowlerId,
        openingBowlerOptions: toPlayerOptions(setupBowlingPlayers),
        shouldShowEditToss: scoringSetup?.phase === "toss",
        strikerId,
        strikerOptions: toPlayerOptions(setupBattingPlayers),
        team1Id: match?.team1Id ?? 0,
        team1LineupNames,
        team1Name,
        team1Roster,
        team1Selection,
        team1ShortName,
        team2Id: match?.team2Id ?? 0,
        team2LineupNames,
        team2Name,
        team2Roster,
        team2Selection,
        team2ShortName,
        tossDecision,
        tossWinnerId,
        setTeam1Selection,
        setTeam2Selection,
      }),
    [
      battingTeamId,
      bowlingTeamId,
      followOnApplied,
      inningsSetupAvailable,
      inningsSetupSelection.followOnAvailable,
      inningsSetupSelection.inningsNumber,
      isLineupValid,
      match?.team1Id,
      match?.team2Id,
      nonStrikerId,
      openingBowlerId,
      playersPerSide,
      saveLineupMutation.mutate,
      saveLineupMutation.isPending,
      scoringSetup?.phase,
      setupBattingPlayers,
      setupBowlingPlayers,
      startInningsMutation.mutate,
      startInningsMutation.isPending,
      strikerId,
      team1LineupNames,
      team1Name,
      team1Roster,
      team1Selection,
      team1ShortName,
      team2LineupNames,
      team2Name,
      team2Roster,
      team2Selection,
      team2ShortName,
      tossDecision,
      tossWinnerId,
    ]
  );

  if (isLoading) {
    return <MatchScoringLoadingSkeleton />;
  }

  if (!(scoringSetup && match)) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
        <section className="w-full space-y-4 border border-border/50 bg-card p-6 text-center">
          <h1 className="font-serif text-2xl tracking-tight">
            Match not found
          </h1>
          <p className="text-muted-foreground">
            This match could not be loaded. It may have been removed or you may
            not have access.
          </p>
          <div className="flex justify-center">
            <Link
              className={buttonVariants({ variant: "default" })}
              to="/matches"
            >
              <ArrowLeftIcon />
              Back to Matches
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!canCurrentUserScore) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
        <section className="w-full space-y-4 border border-border/50 bg-card p-6 text-center">
          <h1 className="font-serif text-2xl tracking-tight">
            You can&apos;t score this match
          </h1>
          <p className="text-muted-foreground">
            Only organizers and players in this match can score. Ask an
            organizer to add you if needed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              className={buttonVariants({ variant: "outline" })}
              params={{ matchId }}
              to="/matches/$matchId/scorecard"
            >
              View Scorecard
            </Link>
            <Link
              className={buttonVariants({ variant: "default" })}
              to="/matches"
            >
              <ArrowLeftIcon />
              Back to Matches
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,180,80,0.14),transparent_30%),linear-gradient(180deg,rgba(255,248,233,0.55),transparent_28%),var(--background)] pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <header className="space-y-4 border-border/60 border-b pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.28em]">
                Live Match Scoring
              </p>
              <h1 className="flex items-baseline gap-2 text-3xl sm:text-4xl">
                <span className="font-serif">{team1ShortName}</span>
                <span className="text-muted-foreground text-xl">vs</span>
                <span className="font-serif">{team2ShortName}</span>
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                params={{ matchId }}
                to="/matches/$matchId/scorecard"
              >
                View Scorecard
              </Link>
              <Link
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                to="/matches"
              >
                <ArrowLeftIcon />
                Back
              </Link>
            </div>
          </div>

          <ProgressStepper currentPhase={scoringPhase} />
        </header>

        {scoringPhase === "scoring" ? null : (
          <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <ScoreboardCard label="Status" value={matchStatusLabel} />
              <ScoreboardCard
                label="Score"
                value={
                  selectedInningsSummary ? (
                    <ScoreWithWickets
                      score={selectedInningsSummary.totalScore}
                      wickets={selectedInningsSummary.wickets}
                    />
                  ) : (
                    "0/0"
                  )
                }
              />
              <ScoreboardCard
                label="Overs"
                value={
                  selectedInningsSummary
                    ? formatOvers(
                        selectedInningsSummary.ballsBowled ?? 0,
                        scoringSetup.matchRules?.ballsPerOver ?? 6
                      )
                    : "0.0"
                }
              />
            </div>

            <aside className="space-y-2 text-sm">
              <MatchFrameRow label="Format" value={match.format} />
              <MatchFrameRow
                label="Rules"
                value={`${match.oversPerSide} overs • ${match.inningsPerSide} inn.`}
              />
              <MatchFrameRow
                label="Toss"
                value={
                  typeof match.tossWinnerId === "number"
                    ? `${
                        match.tossWinnerId === match.team1Id
                          ? team1ShortName
                          : team2ShortName
                      } chose ${match.tossDecision ?? "to play"}`
                    : "Pending"
                }
              />
            </aside>
          </section>
        )}

        {isPreMatchPhase ? (
          <Suspense fallback={<PreMatchSetupSkeleton />}>
            <PreMatchSetupFlow
              inningsSetup={preMatchSetupViewModel.inningsSetup}
              lineup={preMatchSetupViewModel.lineup}
              phase={scoringPhase}
              toss={preMatchSetupViewModel.toss}
            />
          </Suspense>
        ) : null}

        {scoringPhase === "scoring" && currentInnings ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)]">
            <div className="space-y-5">
              <section className="border border-border/50 bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
                      Current innings
                    </p>
                    <h2 className="font-serif text-3xl tracking-tight">
                      {currentInnings.battingTeam?.shortName ?? "BAT"}{" "}
                      <ScoreWithWickets
                        score={currentInnings.totalScore}
                        wickets={currentInnings.wickets}
                      />
                    </h2>
                  </div>
                  {typeof currentInnings.targetRuns === "number" ? (
                    <span className="border border-primary/30 bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%)] px-3 py-1 text-sm tabular-nums">
                      Target {currentInnings.targetRuns}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-baseline gap-6">
                  <ScoreboardCard
                    label="Overs"
                    value={formatOvers(
                      currentInnings.ballsBowled,
                      scoringSetup.matchRules.ballsPerOver
                    )}
                  />
                  <ScoreboardCard
                    label="Batting side"
                    value={currentInnings.battingTeam?.name ?? team1Name}
                  />
                </div>
              </section>

              <DeliveryTimelineCard
                actions={
                  <>
                    <Button
                      disabled={hasPendingInningsClosure}
                      onClick={handleRecordDeliveryView}
                      size="sm"
                      type="button"
                      variant={
                        selectedDeliveryId === null ? "default" : "outline"
                      }
                    >
                      Record delivery
                    </Button>
                    <Button
                      disabled={closeInningsMutation.isPending}
                      onClick={() => handleCloseInnings(currentInnings.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      End innings
                    </Button>
                  </>
                }
                deliveries={currentDeliveries}
                isDesktop={isDesktopTimeline}
                isExpanded={isTimelineExpanded}
                onSelectDelivery={handleSelectDelivery}
                onToggleExpanded={() =>
                  setIsTimelineExpanded((previous) => !previous)
                }
                selectedDeliveryId={selectedDeliveryId}
              />

              {hasPendingInningsClosure ? (
                <p className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 text-sm">
                  Review the last ball or confirm the innings end before
                  recording another delivery.
                </p>
              ) : null}

              <section className="border border-border/50 bg-muted/5 p-4">
                <div className="flex items-center gap-2">
                  <TargetIcon className="size-4 text-muted-foreground" />
                  <h2 className="font-serif text-lg tracking-tight">
                    Innings summary
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {scoringSetup.innings.map((innings) => (
                    <div
                      className="border border-border/40 bg-muted/10 px-3 py-3"
                      key={innings.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm">
                          Innings {innings.inningsNumber}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {innings.battingTeam?.shortName ?? "BAT"}{" "}
                          <ScoreWithWickets
                            score={innings.totalScore}
                            wickets={innings.wickets}
                          />
                        </p>
                      </div>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {innings.isCompleted ? "Completed" : "Live"} •{" "}
                        {formatOvers(
                          innings.ballsBowled,
                          scoringSetup.matchRules.ballsPerOver
                        )}{" "}
                        overs
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {(draft ?? fallbackDraft) ? (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <ScoreABall
                  battingPlayers={battingPlayers}
                  bowlingPlayers={bowlingPlayers}
                  draft={activeDraft as DeliveryDraft}
                  fieldingOptions={bowlingPlayers}
                  isEditing={editingDelivery !== null}
                  isSubmitting={
                    recordDeliveryMutation.isPending ||
                    updateDeliveryMutation.isPending ||
                    deleteDeliveryMutation.isPending
                  }
                  matchFlags={matchFlags}
                  onChange={(patch) =>
                    setDraft((previous) =>
                      previous ? { ...previous, ...patch } : previous
                    )
                  }
                  onDelete={
                    editingDelivery
                      ? () => deleteDeliveryMutation.mutate(editingDelivery.id)
                      : undefined
                  }
                  onDiscardEdit={
                    editingDelivery ? handleRecordDeliveryView : undefined
                  }
                  onReset={resetDraft}
                  onSubmit={submitDraft}
                  requiredSelections={{
                    striker: Boolean(scoringSetup.requiredSelections.striker),
                    nonStriker: Boolean(
                      scoringSetup.requiredSelections.nonStriker
                    ),
                    bowler: Boolean(scoringSetup.requiredSelections.bowler),
                  }}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {scoringPhase === "completed" ? (
          <section className="space-y-4 border border-border/50 bg-card p-5">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl tracking-tight">
                {match.result ?? "Match complete"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Scoring is complete for now. Open the scorecard to review all
                innings. If a change is needed, ask an organizer.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {scoringSetup.innings.map((innings) => (
                <div
                  className="border border-border/40 bg-muted/10 px-3 py-3"
                  key={innings.id}
                >
                  <p className="font-medium text-sm">
                    Innings {innings.inningsNumber}
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {innings.battingTeam?.shortName ?? "BAT"}{" "}
                    <ScoreWithWickets
                      score={innings.totalScore}
                      wickets={innings.wickets}
                    />{" "}
                    in{" "}
                    {formatOvers(
                      innings.ballsBowled,
                      scoringSetup.matchRules.ballsPerOver
                    )}{" "}
                    overs
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <Dialog
          onOpenChange={(open) => {
            if (!(open || closeInningsMutation.isPending)) {
              handleDeclineCloseInnings();
            }
          }}
          open={pendingCloseDialog !== null}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>End this innings?</DialogTitle>
              <DialogDescription>
                {pendingCloseDialog?.mode === "auto"
                  ? "This delivery has reached an innings-ending condition. Choose Yes to end the innings now, or No to return to the last ball for review."
                  : "This will end the current innings before the next one starts. You can still review the scorecard after this step."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={closeInningsMutation.isPending}
                onClick={handleDeclineCloseInnings}
                type="button"
                variant="outline"
              >
                {pendingCloseDialog?.mode === "auto"
                  ? "No, review last ball"
                  : "Cancel"}
              </Button>
              <Button
                disabled={closeInningsMutation.isPending}
                onClick={handleConfirmCloseInnings}
                type="button"
              >
                {closeInningsMutation.isPending
                  ? "Ending..."
                  : "Yes, end innings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function ScoreWithWickets({
  score,
  wickets,
}: {
  score: number;
  wickets: number;
}) {
  return (
    <span>
      <span>{score}</span>
      <span className="text-muted-foreground">/</span>
      <span className={wickets > 0 ? "text-destructive" : undefined}>
        {wickets}
      </span>
    </span>
  );
}

function ScoreboardCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-xl leading-tight">{value}</p>
    </div>
  );
}

function MatchFrameRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}

function ProgressStepper({ currentPhase }: { currentPhase: ScoringPhase }) {
  const currentIndex = SCORING_STEPS.findIndex((s) => s.key === currentPhase);
  const NOTCH = 10;
  const CUT = 8;

  return (
    <nav aria-label="Scoring progress">
      <ol className="flex">
        {SCORING_STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const isFirst = i === 0;
          const isLast = i === SCORING_STEPS.length - 1;

          let clipPath: string;
          if (isFirst) {
            clipPath = `polygon(${CUT}px 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, 0 ${CUT}px)`;
          } else if (isLast) {
            clipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${CUT}px), calc(100% - ${CUT}px) 100%, 0 100%, ${NOTCH}px 50%)`;
          } else {
            clipPath = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
          }

          return (
            <li
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "inline-flex items-center justify-center py-2 font-medium text-xs transition-colors duration-300",
                isCompleted || isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground"
              )}
              key={step.key}
              style={{
                clipPath,
                marginLeft: i > 0 ? `-${NOTCH}px` : undefined,
                paddingLeft: isFirst
                  ? `calc(0.625rem + ${CUT}px)`
                  : `calc(0.625rem + ${NOTCH}px)`,
                paddingRight: isLast
                  ? `calc(0.625rem + ${CUT}px)`
                  : `calc(0.625rem + ${NOTCH}px)`,
              }}
            >
              {isCompleted ? (
                <CheckIcon className="mr-1 size-3 opacity-70" />
              ) : null}
              {step.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
