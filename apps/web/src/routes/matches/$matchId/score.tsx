import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
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
import { cn } from "@/lib/utils";
import type { InningsSetupPhaseCardProps } from "@/routes/matches/$matchId/-components/innings-setup-phase-card";
import type { LineupPhaseCardProps } from "@/routes/matches/$matchId/-components/lineup-phase-card";
import { PreMatchSetupSkeleton } from "@/routes/matches/$matchId/-components/pre-match-setup-skeleton";
import ScoreABall, {
  type DeliveryDraft,
  type MatchFlags,
  type ScoringPlayerOption,
} from "@/routes/matches/$matchId/-components/score-a-ball";
import type { TossPhaseCardProps } from "@/routes/matches/$matchId/-components/toss-phase-card";
import {
  applyScoringSessionMutationResult,
  buildBackgroundScoreRefreshQueries,
} from "@/routes/matches/$matchId/-score-mutation-utils";
import { resolveBattingAndBowlingTeamIds } from "@/routes/matches/$matchId/-scoring-flow";
import type {
  PreMatchPhase,
  RosterPlayer,
  TeamSelection,
} from "@/routes/matches/$matchId/pre-match-types";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/$matchId/score")({
  component: RouteComponent,
});

const PreMatchSetupFlow = lazy(() =>
  import("@/routes/matches/$matchId/-components/pre-match-setup-flow").then(
    (module) => ({ default: module.PreMatchSetupFlow })
  )
);

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

interface DeliveryOverGroup {
  deliveries: SessionDelivery[];
  overNumber: number;
}

type ScoringSessionMutationResult = Awaited<
  ReturnType<typeof client.recordScoringDelivery>
>;

type ScoringPhase = PreMatchPhase | "completed" | "scoring";

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
  const loadingScoreCardKeys = ["status", "score", "overs"] as const;
  const loadingDetailKeys = ["format", "rules", "toss"] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,180,80,0.14),transparent_30%),linear-gradient(180deg,rgba(255,248,233,0.55),transparent_28%),var(--background)] pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <section
          aria-busy="true"
          className="space-y-4 rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-10 w-56 rounded-2xl sm:w-72" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
              <Skeleton className="h-4 w-4/5 max-w-xl rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {loadingStepKeys.map((stepKey) => (
              <Skeleton
                className="h-8 w-24 rounded-full sm:w-28"
                key={stepKey}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              {loadingScoreCardKeys.map((cardKey) => (
                <div
                  className="space-y-3 rounded-[1.5rem] border p-4"
                  key={cardKey}
                >
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <Skeleton className="h-6 w-32 rounded-2xl" />
            <div className="mt-4 space-y-3">
              {loadingDetailKeys.map((detailKey) => (
                <Skeleton className="h-5 w-full rounded-full" key={detailKey} />
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-8 w-52 rounded-2xl" />
            <Skeleton className="h-4 w-full max-w-md rounded-full" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-[1.5rem]" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-[1.5rem]" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Skeleton className="h-11 w-40 rounded-full" />
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

function buildDeliveryMutationPayload(payload: DeliveryDraft) {
  const wicketType = payload.wicketType || undefined;

  return {
    inningsId: payload.inningsId,
    strikerId: payload.strikerId as number,
    nonStrikerId: payload.nonStrikerId as number,
    bowlerId: payload.bowlerId as number,
    batterRuns: payload.batterRuns,
    wideRuns: payload.wideRuns,
    noBallRuns: payload.noBallRuns,
    byeRuns: payload.byeRuns,
    legByeRuns: payload.legByeRuns,
    penaltyRuns: payload.penaltyRuns,
    wicketType,
    ...(wicketType
      ? {
          dismissedPlayerId: payload.dismissedPlayerId,
          assistedById: payload.assistedById,
        }
      : {}),
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

function getDeliveryChipLabel(delivery: SessionDelivery) {
  if (delivery.isWicket) {
    return "W";
  }

  return String(delivery.totalRuns);
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
    "flex size-11 items-center justify-center rounded-full border text-center font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    toneClasses,
    selectedClasses
  );
}

function renderDeliveryLabel(delivery: SessionDelivery) {
  const parts: string[] = [];

  if (delivery.isWicket) {
    parts.push("W");
  } else {
    parts.push(String(delivery.totalRuns));
  }

  if (delivery.wideRuns > 0) {
    parts.push(`Wd ${delivery.wideRuns}`);
  }
  if (delivery.noBallRuns > 0) {
    parts.push(`Nb ${delivery.noBallRuns}`);
  }
  if (delivery.byeRuns > 0) {
    parts.push(`B ${delivery.byeRuns}`);
  }
  if (delivery.legByeRuns > 0) {
    parts.push(`Lb ${delivery.legByeRuns}`);
  }

  return parts.join(" • ");
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

function createPreMatchSetupViewModel(params: {
  battingTeamId: null | number;
  inningsNumber?: number;
  inningsSetupAvailable: boolean;
  isLineupValid: boolean;
  isSavingLineups: boolean;
  isStartingInnings: boolean;
  nonStrikerId: null | number;
  onBattingTeamChange: (teamId: number) => void;
  onBowlingTeamChange: (teamId: number) => void;
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
  bowlingTeamId: null | number;
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
      battingTeamId: params.battingTeamId,
      bowlingTeamId: params.bowlingTeamId,
      canEditToss: params.shouldShowEditToss,
      inningsSetupAvailable: params.inningsSetupAvailable,
      inningsTitle: params.inningsNumber
        ? `Start innings ${params.inningsNumber}`
        : "Start innings",
      isStarting: params.isStartingInnings,
      nonStrikerId: params.nonStrikerId,
      nonStrikerOptions: params.nonStrikerOptions,
      onBattingTeamChange: params.onBattingTeamChange,
      onBowlingTeamChange: params.onBowlingTeamChange,
      onEditToss: params.onEditToss,
      onNonStrikerChange: params.onNonStrikerChange,
      onOpeningBowlerChange: params.onOpeningBowlerChange,
      onStartInnings: params.onStartInnings,
      onStrikerChange: params.onStrikerChange,
      openingBowlerId: params.openingBowlerId,
      openingBowlerOptions: params.openingBowlerOptions,
      strikerId: params.strikerId,
      strikerOptions: params.strikerOptions,
      team1Id: params.team1Id,
      team1LineupNames: params.team1LineupNames,
      team1Name: params.team1Name,
      team1ShortName: params.team1ShortName,
      team2Id: params.team2Id,
      team2LineupNames: params.team2LineupNames,
      team2Name: params.team2Name,
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

  return (
    <button
      aria-label={`Edit over ${delivery.overNumber - 1}.${delivery.ballInOver}: ${renderDeliveryLabel(delivery)}`}
      className={getDeliveryChipClasses({ isSelected, tone })}
      onClick={() => onSelectDelivery(delivery.id)}
      title={renderDeliveryLabel(delivery)}
      type="button"
    >
      {getDeliveryChipLabel(delivery)}
    </button>
  );
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
  const summaryLabel =
    deliveries.length === 0
      ? "No deliveries recorded yet."
      : `${deliveries.length} deliveries across ${groupedDeliveries.length} overs.`;
  let timelineContent: ReactNode;

  if (!isExpanded) {
    timelineContent = (
      <div className="mt-4 rounded-[1.35rem] border border-border/60 border-dashed bg-muted/10 px-4 py-3 text-muted-foreground text-sm">
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
        {groupedDeliveries.map((overGroup) => (
          <div
            className="rounded-[1.4rem] border border-border/60 bg-muted/10 px-4 py-3"
            key={overGroup.overNumber}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-sm">
                  Over {overGroup.overNumber}
                </p>
                <p className="text-muted-foreground text-xs">
                  {overGroup.deliveries.length} ball
                  {overGroup.deliveries.length === 1 ? "" : "s"}
                </p>
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
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
            Timeline
          </p>
          <h2 className="font-medium text-xl">Deliveries this innings</h2>
          <p className="text-muted-foreground text-sm">{summaryLabel}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <Button
            aria-expanded={isExpanded}
            className="rounded-2xl"
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The scoring route coordinates multiple setup and scoring phases in one screen.
function RouteComponent() {
  const { matchId } = Route.useParams();
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
  const [battingTeamId, setBattingTeamId] = useState<number | null>(null);
  const [bowlingTeamId, setBowlingTeamId] = useState<number | null>(null);
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [openingBowlerId, setOpeningBowlerId] = useState<number | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(
    null
  );
  const [pendingCloseInningsId, setPendingCloseInningsId] = useState<
    number | null
  >(null);
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
        tournamentId,
      }),
    [numericMatchId, tournamentId]
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
    }
  ) => {
    const refreshTasks = applyScoringSessionMutationResult({
      backgroundQueries: backgroundRefreshQueries,
      queryClient,
      scoringQuery: scoringQueryOptions,
      session,
    });

    if (options?.clearSelectedDelivery) {
      setSelectedDeliveryId(null);
    }

    queueBackgroundRefresh(refreshTasks);
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
    if (scoringSetup?.currentInnings) {
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
      handleScoringSessionMutationSuccess(session);
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
        clearSelectedDelivery: true,
      });
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
        clearSelectedDelivery: true,
      });
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
        clearSelectedDelivery: true,
      });
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
      handleScoringSessionMutationSuccess(session, {
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
    setPendingCloseInningsId(inningsId);
  };

  const handleConfirmCloseInnings = () => {
    if (pendingCloseInningsId === null) {
      return;
    }

    closeInningsMutation.mutate(pendingCloseInningsId);
    setPendingCloseInningsId(null);
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

  useEffect(() => {
    if (!(scoringSetup && match)) {
      return;
    }

    const defaultBattingTeamId =
      scoringSetup.currentInnings?.battingTeamId ??
      scoringSetup.nextInningsDefaults?.battingTeamId ??
      tossDerivedTeams?.battingTeamId ??
      match.team1Id ??
      null;
    const defaultBowlingTeamId =
      scoringSetup.currentInnings?.bowlingTeamId ??
      scoringSetup.nextInningsDefaults?.bowlingTeamId ??
      tossDerivedTeams?.bowlingTeamId ??
      match.team2Id ??
      null;

    setBattingTeamId((previous) =>
      previous && [match.team1Id, match.team2Id].includes(previous)
        ? previous
        : defaultBattingTeamId
    );
    setBowlingTeamId((previous) =>
      previous && [match.team1Id, match.team2Id].includes(previous)
        ? previous
        : defaultBowlingTeamId
    );
  }, [
    match,
    scoringSetup,
    tossDerivedTeams?.battingTeamId,
    tossDerivedTeams?.bowlingTeamId,
  ]);

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
    scoringSetup?.entryContext.battingTeamId ??
    null;
  const activeBowlingTeamId =
    currentInnings?.bowlingTeamId ??
    bowlingTeamId ??
    scoringSetup?.entryContext.bowlingTeamId ??
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

  const currentBallLabel = scoringSetup?.entryContext
    ? `Over ${scoringSetup.entryContext.overNumber - 1}.${scoringSetup.entryContext.ballInOver}`
    : "No active innings";

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
    currentInnings ?? scoringSetup?.innings.at(-1) ?? null;
  let matchStatusLabel = "Awaiting setup";
  if (match?.isCompleted) {
    matchStatusLabel = match.result ?? "Completed";
  } else if (currentInnings) {
    matchStatusLabel = `Innings ${currentInnings.inningsNumber} in progress`;
  }
  const handleRecordDeliveryView = () => {
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
        battingTeamId,
        bowlingTeamId,
        inningsNumber: scoringSetup?.nextInningsDefaults?.inningsNumber,
        inningsSetupAvailable,
        isLineupValid,
        isSavingLineups: saveLineupMutation.isPending,
        isStartingInnings: startInningsMutation.isPending,
        maxPlayers: playersPerSide,
        nonStrikerId,
        nonStrikerOptions: toPlayerOptions(
          setupBattingPlayers.filter((player) => player.id !== strikerId)
        ),
        onBattingTeamChange: (teamId) => {
          const nextBowlingId =
            teamId === match?.team1Id ? match?.team2Id : match?.team1Id;

          setBattingTeamId(teamId);
          setBowlingTeamId(nextBowlingId ?? null);
        },
        onBowlingTeamChange: (teamId) => setBowlingTeamId(teamId),
        onConfirmToss: () => {
          if (typeof tossWinnerId !== "number") {
            toast.error("Select the toss winner.");
            return;
          }

          setIsTossConfirmed(true);
        },
        onEditToss: () => setIsTossConfirmed(false),
        onNonStrikerChange: setNonStrikerId,
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
            inningsNumber: scoringSetup?.nextInningsDefaults?.inningsNumber,
            strikerId,
            nonStrikerId,
            openingBowlerId,
            tossWinnerId:
              typeof tossWinnerId === "number" ? tossWinnerId : undefined,
            tossDecision,
          });
        },
        onStrikerChange: setStrikerId,
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
      inningsSetupAvailable,
      isLineupValid,
      match?.team1Id,
      match?.team2Id,
      nonStrikerId,
      openingBowlerId,
      playersPerSide,
      saveLineupMutation.mutate,
      saveLineupMutation.isPending,
      scoringSetup?.nextInningsDefaults?.inningsNumber,
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
        <section className="w-full space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-semibold text-2xl">Match not found</h1>
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
        <section className="w-full space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-semibold text-2xl">
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
        <header className="space-y-4 rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.28em]">
                Live Match Scoring
              </p>
              <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
                {team1ShortName} vs {team2ShortName}
              </h1>
              <p className="max-w-3xl text-muted-foreground text-sm sm:text-base">
                Score every delivery here. Updates are shared live so both teams
                stay in sync.
              </p>
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

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <StepPill active={scoringPhase === "lineup"} label="1. Lineup" />
            <StepPill active={scoringPhase === "toss"} label="2. Toss" />
            <StepPill
              active={scoringPhase === "inningsSetup"}
              label="3. Start Innings"
            />
            <StepPill active={scoringPhase === "scoring"} label="4. Score" />
            <StepPill active={scoringPhase === "completed"} label="5. Result" />
          </div>
        </header>

        {scoringPhase === "scoring" ? null : (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <ScoreboardCard label="Match Status" value={matchStatusLabel} />
                <ScoreboardCard
                  label="Current Score"
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
            </div>

            <aside className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="font-medium text-lg">Match details</h2>
              <div className="mt-4 space-y-3 text-sm">
                <MatchFrameRow label="Format" value={match.format} />
                <MatchFrameRow
                  label="Match rules"
                  value={`${match.oversPerSide} overs per innings • ${match.inningsPerSide} innings`}
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
              </div>
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
              <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                      Current innings
                    </p>
                    <h2 className="font-semibold text-2xl">
                      {currentInnings.battingTeam?.shortName ?? "BAT"}{" "}
                      <ScoreWithWickets
                        score={currentInnings.totalScore}
                        wickets={currentInnings.wickets}
                      />
                    </h2>
                  </div>
                  {typeof currentInnings.targetRuns === "number" ? (
                    <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-700 text-sm">
                      Target {currentInnings.targetRuns}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ScoreboardCard
                    label="Overs"
                    value={formatOvers(
                      currentInnings.ballsBowled,
                      scoringSetup.matchRules.ballsPerOver
                    )}
                  />
                  <ScoreboardCard
                    label="Next ball"
                    value={`${scoringSetup.entryContext.overNumber - 1}.${scoringSetup.entryContext.ballInOver}`}
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
                      className="rounded-2xl"
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
                      className="rounded-2xl"
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

              <section className="rounded-[2rem] border border-border/60 bg-muted/5 p-4 shadow-none">
                <div className="flex items-center gap-2">
                  <TargetIcon className="size-4 text-muted-foreground" />
                  <h2 className="font-medium text-lg">Innings summary</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {scoringSetup.innings.map((innings) => (
                    <div
                      className="rounded-[1.2rem] border border-border/60 bg-muted/10 px-3 py-3"
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
                  currentBallLabel={currentBallLabel}
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
          <section className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-medium text-2xl">
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
                  className="rounded-[1.2rem] border border-border/60 bg-muted/10 px-3 py-3"
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
              setPendingCloseInningsId(null);
            }
          }}
          open={pendingCloseInningsId !== null}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>End this innings?</DialogTitle>
              <DialogDescription>
                This will end the current innings before the next one starts.
                You can still review the scorecard after this step.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={closeInningsMutation.isPending}
                onClick={() => setPendingCloseInningsId(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={closeInningsMutation.isPending}
                onClick={handleConfirmCloseInnings}
                type="button"
              >
                {closeInningsMutation.isPending ? "Ending..." : "End innings"}
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
    <div className="rounded-[1.35rem] border border-border/60 bg-muted/10 px-4 py-3">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-1 font-medium text-lg leading-tight">{value}</p>
    </div>
  );
}

function MatchFrameRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 font-medium",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
