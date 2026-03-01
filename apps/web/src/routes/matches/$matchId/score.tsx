import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, SwordsIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ScoreABall, {
  type ScoreBallUpdateInput,
  type ScoringDelivery,
  type ScoringPlayerOption,
} from "@/routes/matches/$matchId/-components/score-a-ball";
import {
  calculateNextCreaseState,
  resolveBattingAndBowlingTeamIds,
  resolveScoringStep,
} from "@/routes/matches/$matchId/-scoring-flow";
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

interface PendingTransition {
  dismissedPlayerId: number | null;
  inningsId: number;
  nextBowlerId: number;
  nextNonStrikerId: number;
  nextStrikerId: number;
  replaceSlot: "nonStriker" | "striker" | null;
  requiresBatter: boolean;
  requiresBowler: boolean;
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

function toScoringDelivery(delivery: {
  assistedById: number | null;
  ballInOver: number;
  batterRuns: number;
  bowler: { id: number; name: string } | null;
  bowlerId: number;
  byeRuns: number;
  dismissedPlayerId: number | null;
  id: number;
  inningsId: number;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStriker: { id: number; name: string } | null;
  nonStrikerId: number;
  overNumber: number;
  sequenceNo: number;
  striker: { id: number; name: string } | null;
  strikerId: number;
  totalRuns: number;
  wicketType: null | string;
  wideRuns: number;
}): ScoringDelivery {
  return {
    id: delivery.id,
    inningsId: delivery.inningsId,
    sequenceNo: delivery.sequenceNo,
    overNumber: delivery.overNumber,
    ballInOver: delivery.ballInOver,
    strikerId: delivery.strikerId,
    nonStrikerId: delivery.nonStrikerId,
    bowlerId: delivery.bowlerId,
    striker: delivery.striker ?? {
      id: delivery.strikerId,
      name: "Unknown",
    },
    nonStriker: delivery.nonStriker ?? {
      id: delivery.nonStrikerId,
      name: "Unknown",
    },
    bowler: delivery.bowler ?? {
      id: delivery.bowlerId,
      name: "Unknown",
    },
    batterRuns: delivery.batterRuns,
    wideRuns: delivery.wideRuns,
    noBallRuns: delivery.noBallRuns,
    byeRuns: delivery.byeRuns,
    legByeRuns: delivery.legByeRuns,
    totalRuns: delivery.totalRuns,
    isWicket: delivery.isWicket,
    wicketType: delivery.wicketType,
    dismissedPlayerId: delivery.dismissedPlayerId,
    assistedById: delivery.assistedById,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Route-level scoring flow state is intentionally centralized.
function RouteComponent() {
  const { matchId } = Route.useParams();
  const numericMatchId = Number(matchId);
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData().scoringSetup;

  const { data: scoringSetup, isLoading } = useQuery({
    ...orpc.getMatchScoringSetup.queryOptions({
      input: { matchId: numericMatchId },
    }),
    initialData,
  });

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
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [openingBowlerId, setOpeningBowlerId] = useState<number | null>(null);
  const [pendingTransition, setPendingTransition] =
    useState<PendingTransition | null>(null);
  const [replacementBatterId, setReplacementBatterId] = useState<number | null>(
    null
  );
  const [replacementBowlerId, setReplacementBowlerId] = useState<number | null>(
    null
  );

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

  const invalidateScoringQueries = async () => {
    const tasks = [
      queryClient.invalidateQueries(
        orpc.getMatchScoringSetup.queryOptions({
          input: { matchId: numericMatchId },
        })
      ),
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

  const initializeScoringMutation = useMutation({
    mutationFn: () => {
      if (
        typeof tossWinnerId !== "number" ||
        !strikerId ||
        !nonStrikerId ||
        !openingBowlerId
      ) {
        throw new Error("Complete the toss and opening selections");
      }

      return client.initializeMatchScoring({
        matchId: numericMatchId,
        tossWinnerId,
        tossDecision,
        strikerId,
        nonStrikerId,
        openingBowlerId,
      });
    },
    onSuccess: async () => {
      toast.success("Scoring initialized");
      await invalidateScoringQueries();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initialize scoring");
    },
  });

  const saveBallMutation = useMutation({
    mutationFn: async (payload: ScoreBallUpdateInput) =>
      client.saveScoringDelivery(payload),
  });

  const createNextDeliveryMutation = useMutation({
    mutationFn: async (payload: {
      inningsId: number;
      nextBowlerId: number;
      nextNonStrikerId: number;
      nextStrikerId: number;
    }) => client.createNextScoringDelivery(payload),
  });

  const endInningsMutation = useMutation({
    mutationFn: async (inningsId: number) =>
      client.endScoringInnings({
        inningsId,
      }),
  });

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

  const lineupComplete = Boolean(scoringSetup?.lineupComplete);
  const hasCurrentInnings = Boolean(scoringSetup?.currentInnings);
  const hasTossSelection =
    isTossConfirmed &&
    typeof tossWinnerId === "number" &&
    (tossDecision === "bat" || tossDecision === "bowl");

  const scoringStep = resolveScoringStep({
    lineupComplete,
    hasCurrentInnings,
    hasToss: hasTossSelection,
  });

  const team1Id = match?.team1Id ?? null;
  const team2Id = match?.team2Id ?? null;
  const teamLineupPlayers = scoringSetup?.teamLineupPlayers ?? {
    team1: [],
    team2: [],
  };

  const derivedTeamsFromToss = resolveBattingAndBowlingTeamIds({
    team1Id,
    team2Id,
    tossWinnerId,
    tossDecision,
  });

  const battingTeamId =
    scoringSetup?.currentInnings?.battingTeamId ??
    derivedTeamsFromToss?.battingTeamId ??
    null;
  const bowlingTeamId =
    scoringSetup?.currentInnings?.bowlingTeamId ??
    derivedTeamsFromToss?.bowlingTeamId ??
    null;

  let battingLineupPlayers = [] as typeof teamLineupPlayers.team1;
  if (battingTeamId === team1Id) {
    battingLineupPlayers = teamLineupPlayers.team1;
  } else if (battingTeamId === team2Id) {
    battingLineupPlayers = teamLineupPlayers.team2;
  }

  let bowlingLineupPlayers = [] as typeof teamLineupPlayers.team1;
  if (bowlingTeamId === team1Id) {
    bowlingLineupPlayers = teamLineupPlayers.team1;
  } else if (bowlingTeamId === team2Id) {
    bowlingLineupPlayers = teamLineupPlayers.team2;
  }

  const bowlingPlayersForScorer: ScoringPlayerOption[] =
    bowlingLineupPlayers.map((player) => ({
      id: player.playerId,
      name: player.name,
    }));

  useEffect(() => {
    if (battingLineupPlayers.length < 2) {
      setStrikerId(null);
      setNonStrikerId(null);
      return;
    }

    const battingIds = new Set(battingLineupPlayers.map((row) => row.playerId));
    const defaultStrikerId = battingLineupPlayers[0]?.playerId ?? null;
    const defaultNonStrikerId = battingLineupPlayers[1]?.playerId ?? null;

    setStrikerId((previous) =>
      previous && battingIds.has(previous) ? previous : defaultStrikerId
    );
    setNonStrikerId((previous) => {
      const resolvedPrevious =
        previous && battingIds.has(previous) ? previous : defaultNonStrikerId;
      if (resolvedPrevious === strikerId) {
        return (
          battingLineupPlayers.find((row) => row.playerId !== strikerId)
            ?.playerId ?? null
        );
      }
      return resolvedPrevious;
    });
  }, [battingLineupPlayers, strikerId]);

  useEffect(() => {
    if (bowlingLineupPlayers.length === 0) {
      setOpeningBowlerId(null);
      return;
    }

    const bowlingIds = new Set(bowlingLineupPlayers.map((row) => row.playerId));
    const defaultBowlerId = bowlingLineupPlayers[0]?.playerId ?? null;
    setOpeningBowlerId((previous) =>
      previous && bowlingIds.has(previous) ? previous : defaultBowlerId
    );
  }, [bowlingLineupPlayers]);

  const currentInningsDeliveries =
    scoringSetup?.currentInnings?.deliveries ?? [];
  const currentDeliverySource =
    scoringSetup?.currentDelivery ?? currentInningsDeliveries.at(-1) ?? null;
  const currentDelivery = currentDeliverySource
    ? toScoringDelivery(currentDeliverySource)
    : null;
  const otherBalls = currentDelivery
    ? currentInningsDeliveries
        .filter(
          (delivery) => delivery.overNumber === currentDelivery.overNumber
        )
        .map(toScoringDelivery)
    : [];

  const dismissedPlayers = useMemo(
    () =>
      new Set(
        currentInningsDeliveries
          .filter(
            (delivery) =>
              delivery.isWicket &&
              typeof delivery.dismissedPlayerId === "number"
          )
          .map((delivery) => delivery.dismissedPlayerId as number)
      ),
    [currentInningsDeliveries]
  );

  const availableReplacementBatters = useMemo(() => {
    if (!(pendingTransition && currentDelivery)) {
      return [] as ScoringPlayerOption[];
    }

    const dismissedSet = new Set<number>(dismissedPlayers);
    if (typeof pendingTransition.dismissedPlayerId === "number") {
      dismissedSet.add(pendingTransition.dismissedPlayerId);
    }
    const activeIds = new Set([
      currentDelivery.strikerId,
      currentDelivery.nonStrikerId,
    ]);

    return battingLineupPlayers
      .filter((player) => !dismissedSet.has(player.playerId))
      .filter((player) => !activeIds.has(player.playerId))
      .map((player) => ({
        id: player.playerId,
        name: player.name,
      }));
  }, [
    battingLineupPlayers,
    currentDelivery,
    dismissedPlayers,
    pendingTransition,
  ]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Transition logic combines wicket and over-change cases in one place.
  const completePendingTransition = async () => {
    if (!pendingTransition) {
      return;
    }

    let nextStrikerId = pendingTransition.nextStrikerId;
    let nextNonStrikerId = pendingTransition.nextNonStrikerId;
    let nextBowlerId = pendingTransition.nextBowlerId;

    if (pendingTransition.requiresBatter) {
      if (!replacementBatterId) {
        toast.error("Select the incoming batter");
        return;
      }

      if (pendingTransition.replaceSlot === "striker") {
        nextStrikerId = replacementBatterId;
      } else if (pendingTransition.replaceSlot === "nonStriker") {
        nextNonStrikerId = replacementBatterId;
      }
    }

    if (pendingTransition.requiresBowler) {
      if (!replacementBowlerId) {
        toast.error("Select the next over bowler");
        return;
      }
      nextBowlerId = replacementBowlerId;
    }

    try {
      await createNextDeliveryMutation.mutateAsync({
        inningsId: pendingTransition.inningsId,
        nextStrikerId,
        nextNonStrikerId,
        nextBowlerId,
      });
      setPendingTransition(null);
      setReplacementBatterId(null);
      setReplacementBowlerId(null);
      await invalidateScoringQueries();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create next ball"
      );
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Ball submission needs to evaluate innings completion plus next-state transitions.
  const onSubmitBall = async (input: ScoreBallUpdateInput) => {
    if (!(currentDelivery && scoringSetup?.currentInnings)) {
      return;
    }

    try {
      const saveResult = await saveBallMutation.mutateAsync(input);
      const inningsAfterSave = saveResult.innings;
      const ballsAfterSave =
        inningsAfterSave?.ballsBowled ??
        scoringSetup.currentInnings.ballsBowled;
      const wicketsAfterSave =
        inningsAfterSave?.wickets ?? scoringSetup.currentInnings.wickets;
      const allOut = wicketsAfterSave >= playersPerSide - 1;
      const maxLegalBalls = scoringSetup.matchRules?.maxLegalBallsPerInnings;
      const limitReached =
        typeof maxLegalBalls === "number" && ballsAfterSave >= maxLegalBalls;

      if (allOut || limitReached) {
        await endInningsMutation.mutateAsync(scoringSetup.currentInnings.id);
        toast.success("Innings completed");
        await invalidateScoringQueries();
        return;
      }

      const creaseState = calculateNextCreaseState({
        ballsPerOver: scoringSetup.matchRules?.ballsPerOver ?? 6,
        currentBallInOver: currentDelivery.ballInOver,
        strikerId: input.strikerId,
        nonStrikerId: input.nonStrikerId,
        runsScored: input.runsScored,
        isWide: input.isWide,
        isNoBall: input.isNoBall,
      });

      const dismissedPlayerId =
        input.dismissedPlayerId ??
        (input.isWicket ? input.strikerId : undefined);
      const requiresBatter =
        Boolean(input.isWicket) && typeof dismissedPlayerId === "number";
      const requiresBowler = creaseState.isOverComplete;

      if (!(requiresBatter || requiresBowler)) {
        await createNextDeliveryMutation.mutateAsync({
          inningsId: scoringSetup.currentInnings.id,
          nextStrikerId: creaseState.nextStrikerId,
          nextNonStrikerId: creaseState.nextNonStrikerId,
          nextBowlerId: input.bowlerId,
        });
        await invalidateScoringQueries();
        return;
      }

      let replaceSlot: "nonStriker" | "striker" = "striker";
      if (dismissedPlayerId === creaseState.nextNonStrikerId) {
        replaceSlot = "nonStriker";
      } else if (dismissedPlayerId === creaseState.nextStrikerId) {
        replaceSlot = "striker";
      }

      setPendingTransition({
        dismissedPlayerId: dismissedPlayerId ?? null,
        inningsId: scoringSetup.currentInnings.id,
        nextStrikerId: creaseState.nextStrikerId,
        nextNonStrikerId: creaseState.nextNonStrikerId,
        nextBowlerId: input.bowlerId,
        requiresBatter,
        requiresBowler,
        replaceSlot: requiresBatter ? replaceSlot : null,
      });

      if (requiresBowler) {
        const nextBowlerCandidate = bowlingLineupPlayers.find(
          (player) => player.playerId !== input.bowlerId
        );
        setReplacementBowlerId(nextBowlerCandidate?.playerId ?? null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save ball"
      );
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
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

  const team1Name = match.team1?.name ?? "Team 1";
  const team2Name = match.team2?.name ?? "Team 2";
  const team1ShortName = match.team1?.shortName ?? "TBD";
  const team2ShortName = match.team2?.shortName ?? "TBD";
  const isLineupValid =
    team1Selection.playerIds.length === playersPerSide &&
    team2Selection.playerIds.length === playersPerSide;
  const tossTeamOptions = [
    {
      id: match.team1Id,
      label: match.team1?.name ?? "Team 1",
    },
    {
      id: match.team2Id,
      label: match.team2?.name ?? "Team 2",
    },
  ].filter((team) => typeof team.id === "number") as Array<{
    id: number;
    label: string;
  }>;

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
                Match Scoring
              </h1>
              <p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
                Complete lineup, toss, and opening setup to start live scoring.
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
            <StepPill active={scoringStep === "lineup"} label="1. Lineup" />
            <StepPill active={scoringStep === "toss"} label="2. Toss" />
            <StepPill
              active={scoringStep === "openingSelection"}
              label="3. Openers & Bowler"
            />
            <StepPill active={scoringStep === "scoring"} label="4. Scoring" />
          </div>
        </header>

        <section
          aria-labelledby="fixture-heading"
          className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
        >
          <h2 className="font-medium text-base sm:text-lg" id="fixture-heading">
            Fixture
          </h2>
          <div className="mt-4 grid items-center gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:p-4">
            <p className="min-w-0 truncate text-center font-semibold text-sm sm:text-base">
              {team1Name}
            </p>
            <SwordsIcon
              aria-hidden="true"
              className="mx-auto h-4 w-4 text-muted-foreground sm:h-5 sm:w-5"
            />
            <p className="min-w-0 truncate text-center font-semibold text-sm sm:text-base">
              {team2Name}
            </p>
          </div>
        </section>

        {scoringStep === "lineup" ? (
          <section className="space-y-5 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-1">
              <h2 className="font-medium text-base sm:text-lg">
                Select Playing Lineup
              </h2>
              <p className="text-muted-foreground text-sm">
                Select exactly {playersPerSide} players from each side.
              </p>
            </div>

            <p aria-live="polite" className="text-muted-foreground text-sm">
              {team1ShortName}: {team1Selection.playerIds.length}/
              {playersPerSide},{team2ShortName}:{" "}
              {team2Selection.playerIds.length}/{playersPerSide}
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

            <div className="sticky bottom-2 z-10 rounded-md border bg-card/95 p-3 shadow-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  className="h-12 w-full sm:w-auto"
                  disabled={!isLineupValid || saveLineupMutation.isPending}
                  onClick={() => saveLineupMutation.mutate()}
                  type="button"
                >
                  <CheckIcon className="mr-1 size-4" />
                  {saveLineupMutation.isPending
                    ? "Saving lineup..."
                    : "Save Lineup"}
                </Button>
                <p
                  aria-live="polite"
                  className={cn("text-sm sm:ml-auto", {
                    "text-emerald-600 dark:text-emerald-400": isLineupValid,
                    "text-muted-foreground": !isLineupValid,
                  })}
                >
                  {isLineupValid
                    ? "Lineups are complete."
                    : "Both teams must have complete lineups before saving."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {scoringStep === "toss" ? (
          <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-1">
              <h2 className="font-medium text-base sm:text-lg">Toss</h2>
              <p className="text-muted-foreground text-sm">
                Confirm toss winner and decision before selecting opening
                players.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Toss Winner</p>
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
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select toss winner" />
                  </SelectTrigger>
                  <SelectContent>
                    {tossTeamOptions.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Toss Decision</p>
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
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select toss decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bat">Batting</SelectItem>
                    <SelectItem value="bowl">Fielding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="sticky bottom-2 z-10 rounded-md border bg-card/95 p-3 shadow-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <Button
                className="h-12 w-full sm:w-auto"
                onClick={() => {
                  if (typeof tossWinnerId !== "number") {
                    toast.error("Select toss winner");
                    return;
                  }
                  setIsTossConfirmed(true);
                }}
                type="button"
              >
                Continue
              </Button>
            </div>
          </section>
        ) : null}

        {scoringStep === "openingSelection" ? (
          <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-1">
              <h2 className="font-medium text-base sm:text-lg">
                Openers and Opening Bowler
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose batting openers and the first over bowler.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p>
                Batting team:{" "}
                <span className="font-medium">
                  {battingTeamId === match.team1Id ? team1Name : team2Name}
                </span>
              </p>
              <p>
                Bowling team:{" "}
                <span className="font-medium">
                  {bowlingTeamId === match.team1Id ? team1Name : team2Name}
                </span>
              </p>
              <Button
                className="mt-3 h-10"
                onClick={() => setIsTossConfirmed(false)}
                size="sm"
                type="button"
                variant="outline"
              >
                Edit Toss
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  Striker (1st opener)
                </p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setStrikerId(Number.parseInt(value, 10));
                  }}
                  value={strikerId ? String(strikerId) : ""}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingLineupPlayers.map((player) => (
                      <SelectItem
                        key={player.playerId}
                        value={String(player.playerId)}
                      >
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  Non-Striker (2nd opener)
                </p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setNonStrikerId(Number.parseInt(value, 10));
                  }}
                  value={nonStrikerId ? String(nonStrikerId) : ""}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select non-striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingLineupPlayers
                      .filter((player) => player.playerId !== strikerId)
                      .map((player) => (
                        <SelectItem
                          key={player.playerId}
                          value={String(player.playerId)}
                        >
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Opening Bowler</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setOpeningBowlerId(Number.parseInt(value, 10));
                  }}
                  value={openingBowlerId ? String(openingBowlerId) : ""}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingLineupPlayers.map((player) => (
                      <SelectItem
                        key={player.playerId}
                        value={String(player.playerId)}
                      >
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="sticky bottom-2 z-10 rounded-md border bg-card/95 p-3 shadow-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <Button
                className="h-12 w-full sm:w-auto"
                disabled={
                  initializeScoringMutation.isPending ||
                  !strikerId ||
                  !nonStrikerId ||
                  !openingBowlerId ||
                  strikerId === nonStrikerId ||
                  typeof tossWinnerId !== "number"
                }
                onClick={() => initializeScoringMutation.mutate()}
                type="button"
              >
                {initializeScoringMutation.isPending
                  ? "Starting..."
                  : "Start Scoring"}
              </Button>
            </div>
          </section>
        ) : null}

        {scoringStep === "scoring" ? (
          <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Score</p>
                <p className="font-semibold text-lg">
                  {scoringSetup.currentInnings?.totalScore ?? 0}/
                  {scoringSetup.currentInnings?.wickets ?? 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Overs</p>
                <p className="font-semibold text-lg">
                  {Math.floor(
                    (scoringSetup.currentInnings?.ballsBowled ?? 0) /
                      (scoringSetup.matchRules?.ballsPerOver ?? 6)
                  )}
                  .
                  {(scoringSetup.currentInnings?.ballsBowled ?? 0) %
                    (scoringSetup.matchRules?.ballsPerOver ?? 6)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Batting</p>
                <p className="font-semibold text-lg">
                  {scoringSetup.currentInnings?.battingTeam?.shortName ?? "TBD"}
                </p>
              </div>
            </div>

            {currentDelivery ? (
              <ScoreABall
                ball={currentDelivery}
                bowlingPlayers={bowlingPlayersForScorer}
                hasBoundaryOut={Boolean(match.hasBoundaryOut)}
                hasBye={Boolean(match.hasBye)}
                hasLBW={Boolean(match.hasLBW)}
                hasLegBye={Boolean(match.hasLegBye)}
                isSubmitting={saveBallMutation.isPending}
                onSubmitBall={onSubmitBall}
                otherBalls={otherBalls}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Innings initialized. No active ball available.
              </p>
            )}
          </section>
        ) : null}
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setPendingTransition(null);
            setReplacementBatterId(null);
            setReplacementBowlerId(null);
          }
        }}
        open={pendingTransition !== null}
      >
        <SheetContent side="bottom">
          <SheetTitle className="pb-4">Next Ball Setup</SheetTitle>
          <div className="space-y-3">
            {pendingTransition?.requiresBatter ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Incoming Batter</p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setReplacementBatterId(Number.parseInt(value, 10));
                  }}
                  value={replacementBatterId ? String(replacementBatterId) : ""}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select batter" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReplacementBatters.map((player) => (
                      <SelectItem key={player.id} value={String(player.id)}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {pendingTransition?.requiresBowler ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  Next Over Bowler
                </p>
                <Select
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setReplacementBowlerId(Number.parseInt(value, 10));
                  }}
                  value={replacementBowlerId ? String(replacementBowlerId) : ""}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingPlayersForScorer.map((player) => (
                      <SelectItem key={player.id} value={String(player.id)}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <SheetFooter className="pt-6">
            <Button
              className="h-12 w-full"
              disabled={createNextDeliveryMutation.isPending}
              onClick={completePendingTransition}
              type="button"
            >
              {createNextDeliveryMutation.isPending
                ? "Creating..."
                : "Create Next Ball"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
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
    <section className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <h3 className="font-medium text-sm sm:text-base">{teamLabel} XI</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {players.join(", ")}
      </p>
    </section>
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
    <section className="space-y-4 rounded-lg border bg-muted/10 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm sm:text-base">{teamLabel} Lineup</h3>
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
                    "flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2.5 text-sm transition-colors",
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
        <legend className="font-medium text-sm">Optional Roles</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-captain`}
            >
              Captain
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-captain`}
              onChange={(event) =>
                setOptionalRole("captainPlayerId", event.target.value)
              }
              value={
                selection.captainPlayerId
                  ? String(selection.captainPlayerId)
                  : ""
              }
            >
              <option value="">Select captain</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-vice-captain`}
            >
              Vice Captain
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-vice-captain`}
              onChange={(event) =>
                setOptionalRole("viceCaptainPlayerId", event.target.value)
              }
              value={
                selection.viceCaptainPlayerId
                  ? String(selection.viceCaptainPlayerId)
                  : ""
              }
            >
              <option value="">Select vice captain</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-wicket-keeper`}
            >
              Wicket Keeper
            </label>
            <select
              className="h-12 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-wicket-keeper`}
              onChange={(event) =>
                setOptionalRole("wicketKeeperPlayerId", event.target.value)
              }
              value={
                selection.wicketKeeperPlayerId
                  ? String(selection.wicketKeeperPlayerId)
                  : ""
              }
            >
              <option value="">Select wicket keeper</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
    </section>
  );
}
