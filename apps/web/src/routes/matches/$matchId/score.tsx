import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  PlayIcon,
  TargetIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ScoreABall, {
  type DeliveryDraft,
  type ScoringPlayerOption,
} from "@/routes/matches/$matchId/-components/score-a-ball";
import {
  applyScoringSessionMutationResult,
  buildBackgroundScoreRefreshQueries,
} from "@/routes/matches/$matchId/-score-mutation-utils";
import { resolveBattingAndBowlingTeamIds } from "@/routes/matches/$matchId/-scoring-flow";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/$matchId/score")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const scoringSetup = await context.orpc.getMatchScoringSetup.call({
      matchId: Number(params.matchId),
    });

    return { scoringSetup };
  },
});

interface TeamSelection {
  captainPlayerId?: number;
  playerIds: number[];
  viceCaptainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

interface RosterPlayer {
  isCaptain: boolean;
  isViceCaptain: boolean;
  name: string;
  playerId: number;
  role: string;
  teamId: number;
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

type ScoringSessionMutationResult = Awaited<
  ReturnType<typeof client.recordScoringDelivery>
>;

type ClientScoringTraceStage =
  | "background-refresh-complete"
  | "cache-updated"
  | "mutation-response"
  | "mutation-start"
  | "submit-click";

interface ClientScoringTimingEntry {
  at: string;
  durationMs: number;
  operation: string;
  sampleId: string;
  span: string;
}

type GlobalWithClientTimings = typeof globalThis & {
  __CRICKET247_SCORING_TIMINGS__?: ClientScoringTimingEntry[];
};

function isClientScoringTimingEnabled() {
  return import.meta.env.DEV && typeof performance !== "undefined";
}

function pushClientScoringTiming(entry: ClientScoringTimingEntry) {
  if (!isClientScoringTimingEnabled()) {
    return;
  }

  const timingStore = globalThis as GlobalWithClientTimings;
  timingStore.__CRICKET247_SCORING_TIMINGS__ ??= [];
  timingStore.__CRICKET247_SCORING_TIMINGS__.push(entry);
}

function createClientScoringTrace(operation: string) {
  if (!isClientScoringTimingEnabled()) {
    return null;
  }

  const sampleId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prefix = `cricket247:${operation}:${sampleId}`;
  const marks = new Map<ClientScoringTraceStage, number>();

  const mark = (stage: ClientScoringTraceStage) => {
    performance.mark(`${prefix}:${stage}`);
    marks.set(stage, performance.now());
  };

  const measure = (
    span: string,
    start: ClientScoringTraceStage,
    end: ClientScoringTraceStage
  ) => {
    const startMark = `${prefix}:${start}`;
    const endMark = `${prefix}:${end}`;
    const startTime = marks.get(start);
    const endTime = marks.get(end);

    performance.measure(`${prefix}:${span}`, startMark, endMark);

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      return;
    }

    pushClientScoringTiming({
      at: new Date().toISOString(),
      durationMs: Number((endTime - startTime).toFixed(2)),
      operation,
      sampleId,
      span,
    });
  };

  mark("submit-click");

  return {
    markBackgroundRefreshComplete() {
      mark("background-refresh-complete");
      measure(
        "cache_to_background_refresh_complete",
        "cache-updated",
        "background-refresh-complete"
      );
      measure(
        "submit_to_background_refresh_complete",
        "submit-click",
        "background-refresh-complete"
      );
    },
    markCacheUpdated() {
      mark("cache-updated");
      measure("response_to_cache_update", "mutation-response", "cache-updated");
      measure("submit_to_cache_update", "submit-click", "cache-updated");
    },
    markMutationResponse() {
      mark("mutation-response");
      measure(
        "mutation_start_to_response",
        "mutation-start",
        "mutation-response"
      );
      measure("submit_to_response", "submit-click", "mutation-response");
    },
    markMutationStart() {
      mark("mutation-start");
      measure("submit_to_mutation_start", "submit-click", "mutation-start");
    },
  };
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
    dismissedPlayerId: entryContext.dismissedPlayerId,
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The scoring route coordinates multiple setup and scoring phases in one screen.
function RouteComponent() {
  const { matchId } = Route.useParams();
  const numericMatchId = Number(matchId);
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData().scoringSetup;

  const scoringQueryOptions = orpc.getMatchScoringSetup.queryOptions({
    input: { matchId: numericMatchId },
  });

  const { data: scoringSetup, isLoading } = useQuery({
    ...scoringQueryOptions,
    initialData,
  });

  const match = scoringSetup?.match ?? null;
  const canCurrentUserScore = scoringSetup?.canCurrentUserScore ?? false;
  const playersPerSide = scoringSetup?.playersPerSide ?? 0;
  const team1Roster = scoringSetup?.team1Roster ?? [];
  const team2Roster = scoringSetup?.team2Roster ?? [];
  const tournamentId = match?.tournamentId;
  const activeSubmitTraceRef = useRef<ReturnType<
    typeof createClientScoringTrace
  > | null>(null);

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

  const queueBackgroundRefresh = (
    refreshTasks: Promise<unknown>[],
    trace?: ReturnType<typeof createClientScoringTrace> | null
  ) => {
    if (refreshTasks.length === 0) {
      trace?.markBackgroundRefreshComplete();
      return;
    }

    Promise.allSettled(refreshTasks).then(() => {
      trace?.markBackgroundRefreshComplete();
    });
  };

  const handleScoringSessionMutationSuccess = (
    session: ScoringSessionMutationResult,
    options?: {
      clearSelectedDelivery?: boolean;
      trace?: ReturnType<typeof createClientScoringTrace> | null;
    }
  ) => {
    options?.trace?.markMutationResponse();
    const refreshTasks = applyScoringSessionMutationResult({
      backgroundQueries: backgroundRefreshQueries,
      queryClient,
      scoringQuery: scoringQueryOptions,
      session,
    });

    if (options?.clearSelectedDelivery) {
      setSelectedDeliveryId(null);
    }

    options?.trace?.markCacheUpdated();
    queueBackgroundRefresh(refreshTasks, options?.trace);
  };

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
      toast.error(error.message || "Failed to save lineup");
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
      toast.error(error.message || "Failed to start innings");
    },
  });

  const recordDeliveryMutation = useMutation({
    mutationFn: async (payload: DeliveryDraft) =>
      client.recordScoringDelivery({
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
        wicketType: payload.wicketType || undefined,
        dismissedPlayerId: payload.dismissedPlayerId,
        assistedById: payload.assistedById,
      }),
    onSuccess: (session) => {
      const trace = activeSubmitTraceRef.current;
      toast.success("Delivery recorded");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: true,
        trace,
      });
      activeSubmitTraceRef.current = null;
    },
    onError: (error) => {
      activeSubmitTraceRef.current = null;
      toast.error(error.message || "Failed to record delivery");
    },
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async (payload: DeliveryDraft & { deliveryId: number }) =>
      client.updateScoringDelivery({
        deliveryId: payload.deliveryId,
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
        wicketType: payload.wicketType || undefined,
        dismissedPlayerId: payload.dismissedPlayerId,
        assistedById: payload.assistedById,
      }),
    onSuccess: (session) => {
      const trace = activeSubmitTraceRef.current;
      toast.success("Delivery updated");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: true,
        trace,
      });
      activeSubmitTraceRef.current = null;
    },
    onError: (error) => {
      activeSubmitTraceRef.current = null;
      toast.error(error.message || "Failed to update delivery");
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
      toast.error(error.message || "Failed to delete delivery");
    },
  });

  const closeInningsMutation = useMutation({
    mutationFn: async (inningsId: number) =>
      client.closeCurrentScoringInnings({ inningsId }),
    onSuccess: (session) => {
      toast.success("Innings closed");
      handleScoringSessionMutationSuccess(session, {
        clearSelectedDelivery: true,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to close innings");
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

  const battingPlayers = toPlayerOptions(
    resolveLineupPlayersByTeam({
      teamId: activeBattingTeamId,
      team1Id: match?.team1Id,
      team1Players: teamLineupPlayers.team1,
      team2Id: match?.team2Id,
      team2Players: teamLineupPlayers.team2,
    })
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

  const scoringPhase =
    scoringSetup?.phase === "toss" && isTossConfirmed
      ? "inningsSetup"
      : (scoringSetup?.phase ?? "lineup");

  const selectedInningsSummary =
    currentInnings ?? scoringSetup?.innings.at(-1) ?? null;
  let matchStatusLabel = "Setup pending";
  if (match?.isCompleted) {
    matchStatusLabel = match.result ?? "Completed";
  } else if (currentInnings) {
    matchStatusLabel = `Innings ${currentInnings.inningsNumber} live`;
  }
  const fallbackDraft = buildDraftFromEntryContext(
    scoringSetup?.entryContext as SessionEntryContext
  );

  const submitDraft = async () => {
    if (!draft) {
      toast.error("No delivery draft available");
      return;
    }

    if (!(draft.strikerId && draft.nonStrikerId && draft.bowlerId)) {
      toast.error("Select striker, non-striker, and bowler");
      return;
    }

    if (draft.strikerId === draft.nonStrikerId) {
      toast.error("Striker and non-striker must be different");
      return;
    }

    activeSubmitTraceRef.current = createClientScoringTrace(
      editingDelivery ? "update-delivery" : "record-delivery"
    );
    activeSubmitTraceRef.current?.markMutationStart();

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

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-3xl items-center px-4 py-8">
        <p className="w-full text-center text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!(scoringSetup && match)) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
        <section className="w-full space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-semibold text-2xl">Match not found</h1>
          <p className="text-muted-foreground">
            The requested match could not be loaded.
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
          <h1 className="font-semibold text-2xl">Scoring Access Denied</h1>
          <p className="text-muted-foreground">
            Only admins or players in this fixture roster can score this match.
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
                Live Scoring Console
              </p>
              <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
                {team1ShortName} vs {team2ShortName}
              </h1>
              <p className="max-w-3xl text-muted-foreground text-sm sm:text-base">
                The scorer now runs on a server-owned timeline. Every delivery,
                innings transition, and score recalculation comes from the same
                session state.
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

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <ScoreboardCard label="Match Status" value={matchStatusLabel} />
              <ScoreboardCard
                label="Current Score"
                value={
                  selectedInningsSummary
                    ? `${selectedInningsSummary.totalScore}/${selectedInningsSummary.wickets}`
                    : "0/0"
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
            <h2 className="font-medium text-lg">Match Frame</h2>
            <div className="mt-4 space-y-3 text-sm">
              <MatchFrameRow label="Format" value={match.format} />
              <MatchFrameRow
                label="Overs / innings"
                value={`${match.oversPerSide} overs • ${match.inningsPerSide} innings`}
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

        {scoringPhase === "lineup" ? (
          <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-medium text-xl">Select playing lineups</h2>
              <p className="text-muted-foreground text-sm">
                Lock the match-day players for both teams before toss and
                scoring begin.
              </p>
            </div>

            <p aria-live="polite" className="text-muted-foreground text-sm">
              {team1ShortName}: {team1Selection.playerIds.length}/
              {playersPerSide}
              {" • "}
              {team2ShortName}: {team2Selection.playerIds.length}/
              {playersPerSide}
            </p>

            <div className="grid gap-4 xl:grid-cols-2">
              <LineupSelectorCard
                maxPlayers={playersPerSide}
                roster={team1Roster}
                selection={team1Selection}
                setSelection={setTeam1Selection}
                teamLabel={team1ShortName}
              />
              <LineupSelectorCard
                maxPlayers={playersPerSide}
                roster={team2Roster}
                selection={team2Selection}
                setSelection={setTeam2Selection}
                teamLabel={team2ShortName}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-12 rounded-2xl"
                disabled={!isLineupValid || saveLineupMutation.isPending}
                onClick={() => saveLineupMutation.mutate()}
                type="button"
              >
                <CheckIcon className="mr-2 size-4" />
                {saveLineupMutation.isPending ? "Saving..." : "Save lineups"}
              </Button>
              <p
                aria-live="polite"
                className={cn("text-sm", {
                  "text-emerald-600": isLineupValid,
                  "text-muted-foreground": !isLineupValid,
                })}
              >
                {isLineupValid
                  ? "Both lineups are ready."
                  : "Each side must have a full playing lineup."}
              </p>
            </div>
          </section>
        ) : null}

        {scoringPhase === "toss" ? (
          <section className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-medium text-xl">Confirm toss</h2>
              <p className="text-muted-foreground text-sm">
                Toss remains a deliberate setup step. It sets the first innings
                defaults, but you can still override the batting order if the
                format requires it later.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Toss winner</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setTossWinnerId(Number.parseInt(value, 10));
                    setIsTossConfirmed(false);
                  }}
                  value={tossWinnerId ? String(tossWinnerId) : ""}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select toss winner" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { id: match.team1Id, label: team1Name },
                      { id: match.team2Id, label: team2Name },
                    ]
                      .filter((team) => typeof team.id === "number")
                      .map((team) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          {team.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Decision</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setTossDecision(value === "bowl" ? "bowl" : "bat");
                    setIsTossConfirmed(false);
                  }}
                  value={tossDecision}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select toss decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bat">Bat first</SelectItem>
                    <SelectItem value="bowl">Field first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="h-12 rounded-2xl"
              onClick={() => {
                if (typeof tossWinnerId !== "number") {
                  toast.error("Select toss winner");
                  return;
                }
                setIsTossConfirmed(true);
              }}
              type="button"
            >
              Continue to innings setup
            </Button>
          </section>
        ) : null}

        {scoringPhase === "inningsSetup" ? (
          <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-medium text-xl">
                {scoringSetup.nextInningsDefaults?.inningsNumber
                  ? `Start innings ${scoringSetup.nextInningsDefaults.inningsNumber}`
                  : "Start innings"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose batting and bowling sides, then lock in the opening pair
                and first over bowler.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Batting team</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    const nextBattingId = Number.parseInt(value, 10);
                    const nextBowlingId =
                      nextBattingId === match.team1Id
                        ? match.team2Id
                        : match.team1Id;
                    setBattingTeamId(nextBattingId);
                    setBowlingTeamId(nextBowlingId ?? null);
                  }}
                  value={battingTeamId ? String(battingTeamId) : ""}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select batting side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(match.team1Id)}>
                      {team1Name}
                    </SelectItem>
                    <SelectItem value={String(match.team2Id)}>
                      {team2Name}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Bowling team</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setBowlingTeamId(Number.parseInt(value, 10));
                  }}
                  value={bowlingTeamId ? String(bowlingTeamId) : ""}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select bowling side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(match.team1Id)}>
                      {team1Name}
                    </SelectItem>
                    <SelectItem value={String(match.team2Id)}>
                      {team2Name}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <PlayerPicker
                label="Striker"
                onValueChange={(value) =>
                  setStrikerId(value ? Number.parseInt(value, 10) : null)
                }
                players={toPlayerOptions(setupBattingPlayers)}
                value={strikerId ? String(strikerId) : ""}
              />
              <PlayerPicker
                label="Non-striker"
                onValueChange={(value) =>
                  setNonStrikerId(value ? Number.parseInt(value, 10) : null)
                }
                players={toPlayerOptions(
                  setupBattingPlayers.filter(
                    (player) => player.id !== strikerId
                  )
                )}
                value={nonStrikerId ? String(nonStrikerId) : ""}
              />
              <PlayerPicker
                label="Opening bowler"
                onValueChange={(value) =>
                  setOpeningBowlerId(value ? Number.parseInt(value, 10) : null)
                }
                players={toPlayerOptions(setupBowlingPlayers)}
                value={openingBowlerId ? String(openingBowlerId) : ""}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <LineupSummary
                players={team1LineupNames}
                teamLabel={team1ShortName}
              />
              <LineupSummary
                players={team2LineupNames}
                teamLabel={team2ShortName}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-12 rounded-2xl"
                disabled={
                  !inningsSetupAvailable || startInningsMutation.isPending
                }
                onClick={() => {
                  if (
                    !(
                      battingTeamId &&
                      bowlingTeamId &&
                      strikerId &&
                      nonStrikerId &&
                      openingBowlerId
                    )
                  ) {
                    toast.error("Complete innings setup");
                    return;
                  }

                  startInningsMutation.mutate({
                    battingTeamId,
                    bowlingTeamId,
                    inningsNumber:
                      scoringSetup.nextInningsDefaults?.inningsNumber,
                    strikerId,
                    nonStrikerId,
                    openingBowlerId,
                    tossWinnerId:
                      typeof tossWinnerId === "number"
                        ? tossWinnerId
                        : undefined,
                    tossDecision,
                  });
                }}
                type="button"
              >
                <PlayIcon className="mr-2 size-4" />
                {startInningsMutation.isPending
                  ? "Starting..."
                  : "Start innings"}
              </Button>
              {scoringSetup.phase === "toss" ? (
                <Button
                  className="h-12 rounded-2xl"
                  onClick={() => setIsTossConfirmed(false)}
                  type="button"
                  variant="outline"
                >
                  Edit toss
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {scoringPhase === "scoring" && currentInnings ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
            <div className="space-y-5">
              <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                      Current innings
                    </p>
                    <h2 className="font-semibold text-2xl">
                      {currentInnings.battingTeam?.shortName ?? "BAT"}{" "}
                      {currentInnings.totalScore}/{currentInnings.wickets}
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

              <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
                      Timeline
                    </p>
                    <h2 className="font-medium text-xl">Current innings log</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="rounded-2xl"
                      onClick={() => setSelectedDeliveryId(null)}
                      size="sm"
                      type="button"
                      variant={
                        selectedDeliveryId === null ? "default" : "outline"
                      }
                    >
                      New delivery
                    </Button>
                    <Button
                      className="rounded-2xl"
                      disabled={closeInningsMutation.isPending}
                      onClick={() => handleCloseInnings(currentInnings.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Close innings
                    </Button>
                  </div>
                </div>

                {currentDeliveries.length === 0 ? (
                  <p className="mt-4 text-muted-foreground text-sm">
                    No deliveries recorded yet. The first ball will establish
                    the innings timeline.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {currentDeliveries.map((delivery) => (
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-[1.2rem] border px-3 py-3 text-left transition-colors",
                          selectedDeliveryId === delivery.id
                            ? "border-primary bg-primary/8"
                            : "border-border/60 bg-muted/15 hover:border-primary/35"
                        )}
                        key={delivery.id}
                        onClick={() => setSelectedDeliveryId(delivery.id)}
                        type="button"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            Over {delivery.overNumber - 1}.{delivery.ballInOver}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {renderDeliveryLabel(delivery)}
                          </p>
                        </div>
                        <PencilIcon className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <TargetIcon className="size-4 text-muted-foreground" />
                  <h2 className="font-medium text-lg">Innings ledger</h2>
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
                          {innings.totalScore}/{innings.wickets}
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
                  battingLabel={
                    currentInnings.battingTeam?.shortName ?? team1ShortName
                  }
                  battingPlayers={battingPlayers}
                  bowlingLabel={
                    currentInnings.bowlingTeam?.shortName ?? team2ShortName
                  }
                  bowlingPlayers={bowlingPlayers}
                  currentBallLabel={currentBallLabel}
                  draft={(draft ?? fallbackDraft) as DeliveryDraft}
                  fieldingOptions={bowlingPlayers}
                  isEditing={editingDelivery !== null}
                  isSubmitting={
                    recordDeliveryMutation.isPending ||
                    updateDeliveryMutation.isPending ||
                    deleteDeliveryMutation.isPending
                  }
                  matchFlags={{
                    hasBoundaryOut: Boolean(match.hasBoundaryOut),
                    hasBye: Boolean(match.hasBye),
                    hasLBW: Boolean(match.hasLBW),
                    hasLegBye: Boolean(match.hasLegBye),
                    hasNoBalls: Boolean(match.hasNoBalls),
                    hasPenaltyRuns: Boolean(match.hasPenaltyRuns),
                    hasWides: Boolean(match.hasWides),
                  }}
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
                The scoring session has no active innings. Review the timeline
                in the scorecard or start a manual correction on an open innings
                if needed.
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
                    {innings.totalScore}/{innings.wickets} in{" "}
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
              <DialogTitle>Close this innings?</DialogTitle>
              <DialogDescription>
                This will end the current innings and lock in the scoring state
                before the next innings begins.
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
                {closeInningsMutation.isPending
                  ? "Closing..."
                  : "Close innings"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function ScoreboardCard({ label, value }: { label: string; value: string }) {
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

function LineupSummary({
  teamLabel,
  players,
}: {
  teamLabel: string;
  players: string[];
}) {
  return (
    <section className="space-y-2 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4">
      <h3 className="font-medium text-sm sm:text-base">{teamLabel} lineup</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {players.join(", ")}
      </p>
    </section>
  );
}

function PlayerPicker({
  label,
  onValueChange,
  players,
  value,
}: {
  label: string;
  onValueChange: (value: string | null) => void;
  players: ScoringPlayerOption[];
  value: string;
}) {
  const selectedPlayerName =
    players.find((player) => String(player.id) === value)?.name ?? "";

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="h-12 rounded-2xl">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {selectedPlayerName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {players.map((player) => (
            <SelectItem
              key={player.id}
              label={player.name}
              value={String(player.id)}
            >
              {player.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LineupSelectorCard({
  roster,
  selection,
  setSelection,
  maxPlayers,
  teamLabel,
}: {
  maxPlayers: number;
  roster: RosterPlayer[];
  selection: TeamSelection;
  setSelection: (selection: TeamSelection) => void;
  teamLabel: string;
}) {
  const selectedPlayerSet = useMemo(
    () => new Set(selection.playerIds),
    [selection.playerIds]
  );

  const idPrefix = useMemo(
    () =>
      `${teamLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${
        roster[0]?.teamId ?? "team"
      }`,
    [teamLabel, roster]
  );

  const removePlayerDependentFlags = (
    nextPlayerIds: number[],
    previousSelection: TeamSelection
  ) => ({
    playerIds: nextPlayerIds,
    captainPlayerId: nextPlayerIds.includes(
      previousSelection.captainPlayerId ?? -1
    )
      ? previousSelection.captainPlayerId
      : undefined,
    viceCaptainPlayerId: nextPlayerIds.includes(
      previousSelection.viceCaptainPlayerId ?? -1
    )
      ? previousSelection.viceCaptainPlayerId
      : undefined,
    wicketKeeperPlayerId: nextPlayerIds.includes(
      previousSelection.wicketKeeperPlayerId ?? -1
    )
      ? previousSelection.wicketKeeperPlayerId
      : undefined,
  });

  const togglePlayer = (playerId: number) => {
    const isSelected = selectedPlayerSet.has(playerId);

    if (isSelected) {
      const nextPlayerIds = selection.playerIds.filter((id) => id !== playerId);
      setSelection(removePlayerDependentFlags(nextPlayerIds, selection));
      return;
    }

    if (selection.playerIds.length >= maxPlayers) {
      return;
    }

    setSelection({
      ...selection,
      playerIds: [...selection.playerIds, playerId],
    });
  };

  const selectedPlayers = roster.filter((player) =>
    selection.playerIds.includes(player.playerId)
  );

  const setOptionalRole = (
    key: "captainPlayerId" | "viceCaptainPlayerId" | "wicketKeeperPlayerId",
    rawValue: string
  ) => {
    setSelection({
      ...selection,
      [key]: rawValue.length > 0 ? Number.parseInt(rawValue, 10) : undefined,
    });
  };

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm sm:text-base">{teamLabel} lineup</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Selected: {selection.playerIds.length}/{maxPlayers}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Select players for {teamLabel}</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roster.map((player) => {
            const isChecked = selectedPlayerSet.has(player.playerId);
            const isDisabled =
              !isChecked && selection.playerIds.length >= maxPlayers;
            const inputId = `${idPrefix}-player-${String(player.playerId)}`;

            return (
              <li key={player.playerId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[1.1rem] border bg-background p-2.5 text-sm transition-colors",
                    {
                      "border-primary/60 bg-primary/5": isChecked,
                      "cursor-not-allowed opacity-60": isDisabled,
                    }
                  )}
                  htmlFor={inputId}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    id={inputId}
                    onCheckedChange={() => togglePlayer(player.playerId)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {player.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {player.role}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">Optional roles</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <RolePicker
            id={`${idPrefix}-captain`}
            label="Captain"
            onChange={(value) => setOptionalRole("captainPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.captainPlayerId ? String(selection.captainPlayerId) : ""
            }
          />
          <RolePicker
            id={`${idPrefix}-vice-captain`}
            label="Vice captain"
            onChange={(value) => setOptionalRole("viceCaptainPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.viceCaptainPlayerId
                ? String(selection.viceCaptainPlayerId)
                : ""
            }
          />
          <RolePicker
            id={`${idPrefix}-wicket-keeper`}
            label="Wicket keeper"
            onChange={(value) => setOptionalRole("wicketKeeperPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.wicketKeeperPlayerId
                ? String(selection.wicketKeeperPlayerId)
                : ""
            }
          />
        </div>
      </fieldset>
    </section>
  );
}

function RolePicker({
  id,
  label,
  onChange,
  players,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  players: RosterPlayer[];
  value: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs" htmlFor={id}>
        {label}
      </label>
      <select
        className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
        disabled={players.length === 0}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {players.map((player) => (
          <option key={player.playerId} value={String(player.playerId)}>
            {player.name}
          </option>
        ))}
      </select>
    </div>
  );
}
