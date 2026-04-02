import type { AppRouterClient } from "@cricket247/server/contract";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScorecardLoadingSkeleton } from "@/routes/matches/$matchId/-components/scorecard-loading-skeleton";
import { shouldShowBackToScoring } from "./-scorecard-visibility";

const SCORECARD_STALE_TIME = 10_000;

type MatchScorecardResult = Awaited<
  ReturnType<AppRouterClient["getMatchScorecard"]>
>;

export interface ScorecardPageProps {
  matchId: string;
  scorecard: MatchScorecardResult;
}

interface BatterStatusRow {
  assistedBy: { name: string } | null;
  dismissalType: string | null;
  dismissedBy: { name: string } | null;
  status: "did_not_bat" | "not_out" | "out";
}

interface CurrentParticipants {
  bowlerId: number | null;
  nonStrikerId: number | null;
  strikerId: number | null;
}

function getLiveRoleLabel({
  isCurrentBowler,
  isCurrentNonStriker,
  isCurrentStriker,
}: {
  isCurrentBowler?: boolean;
  isCurrentNonStriker?: boolean;
  isCurrentStriker?: boolean;
}) {
  if (isCurrentStriker) {
    return "Current striker";
  }

  if (isCurrentNonStriker) {
    return "Current non-striker";
  }

  if (isCurrentBowler) {
    return "Current bowler";
  }

  return null;
}

function getBatterLiveRole({
  isCurrentNonStriker,
  isCurrentStriker,
}: {
  isCurrentNonStriker: boolean;
  isCurrentStriker: boolean;
}) {
  if (isCurrentStriker) {
    return "striker";
  }

  if (isCurrentNonStriker) {
    return "non-striker";
  }

  return undefined;
}

function getBattingRowClasses(isCurrentBatter: boolean) {
  if (isCurrentBatter) {
    return "bg-primary/5 hover:bg-primary/10";
  }

  return "hover:bg-muted/10";
}

function getBowlingRowClasses({
  hasWickets,
  isCurrentBowler,
}: {
  hasWickets: boolean;
  isCurrentBowler: boolean;
}) {
  if (isCurrentBowler) {
    return "bg-primary/5 hover:bg-primary/10";
  }

  if (hasWickets) {
    return "bg-primary/3 hover:bg-primary/8";
  }

  return "hover:bg-muted/10";
}

function getCurrentBatterState(
  currentParticipants: CurrentParticipants | undefined,
  playerId: number
) {
  const isCurrentStriker = currentParticipants?.strikerId === playerId;
  const isCurrentNonStriker = currentParticipants?.nonStrikerId === playerId;

  return {
    isCurrentBatter: isCurrentStriker || isCurrentNonStriker,
    isCurrentNonStriker,
    isCurrentStriker,
    liveRole: getBatterLiveRole({
      isCurrentNonStriker,
      isCurrentStriker,
    }),
    liveRoleLabel: getLiveRoleLabel({
      isCurrentNonStriker,
      isCurrentStriker,
    }),
  };
}

export const Route = createFileRoute("/matches/$matchId/scorecard")({
  component: RouteComponent,
  pendingComponent: ScorecardLoadingSkeleton,
  staleTime: SCORECARD_STALE_TIME,
  loader: async ({ params, context }) => {
    const matchId = Number(params.matchId);
    const scorecard = await context.queryClient.ensureQueryData({
      ...context.orpc.getMatchScorecard.queryOptions({
        input: {
          matchId,
          includeBallByBall: false,
        },
      }),
      staleTime: SCORECARD_STALE_TIME,
    });

    return { scorecard };
  },
});

function formatShortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return name;
  }
  const firstName = parts[0];
  const lastPart = parts.at(-1);
  const lastNameInitial = lastPart ? lastPart[0] : "";
  return `${firstName} ${lastNameInitial}.`.trim();
}

function getBatterStatusText(row: BatterStatusRow) {
  if (row.status === "did_not_bat") {
    return "Did not bat";
  }

  if (row.status === "not_out") {
    return "Not out";
  }

  const bowlerName = row.dismissedBy
    ? formatShortName(row.dismissedBy.name)
    : "";
  const fielderName = row.assistedBy
    ? formatShortName(row.assistedBy.name)
    : "";

  switch (row.dismissalType) {
    case "bowled":
      return `b ${bowlerName}`;
    case "caught":
      if (bowlerName && fielderName && bowlerName === fielderName) {
        return `c&b ${bowlerName}`;
      }
      if (fielderName) {
        return `c ${fielderName} b ${bowlerName}`;
      }
      return `c unknown b ${bowlerName}`;
    case "lbw":
      return `lbw ${bowlerName}`;
    case "run_out":
      if (fielderName && bowlerName) {
        return `R.O ${fielderName} (${bowlerName})`;
      }
      return `R.O ${fielderName || bowlerName || "unknown"}`;
    case "stumped":
      return `st ${fielderName} b ${bowlerName}`;
    case "hit_wicket":
      return `hit wicket b ${bowlerName}`;
    default: {
      const dismissedByText = bowlerName ? ` b ${bowlerName}` : "";
      const assistedByText = fielderName ? ` (${fielderName})` : "";
      return `${row.dismissalType ?? "out"}${dismissedByText}${assistedByText}`;
    }
  }
}

function RouteComponent() {
  const { scorecard } = Route.useLoaderData();
  const { matchId } = Route.useParams();

  return <ScorecardPage matchId={matchId} scorecard={scorecard} />;
}

export function ScorecardPage({ matchId, scorecard }: ScorecardPageProps) {
  const ids = useId();
  const [selectedInningsId, setSelectedInningsId] = useState<number | null>(
    scorecard?.innings[0]?.id ?? null
  );

  useEffect(() => {
    if (!scorecard) {
      setSelectedInningsId(null);
      return;
    }

    setSelectedInningsId((previousSelectedInningsId) => {
      if (
        previousSelectedInningsId !== null &&
        scorecard.innings.some(
          (entry) => entry.id === previousSelectedInningsId
        )
      ) {
        return previousSelectedInningsId;
      }

      return scorecard.innings[0]?.id ?? null;
    });
  }, [scorecard]);

  const selectedInnings = useMemo(() => {
    if (!scorecard || selectedInningsId === null) {
      return null;
    }

    return (
      scorecard.innings.find((entry) => entry.id === selectedInningsId) ?? null
    );
  }, [scorecard, selectedInningsId]);

  if (!scorecard) {
    return (
      <main
        className="m-auto flex size-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center"
        id="main-content"
      >
        <h1 className="font-semibold text-2xl">Match not found</h1>
        <Link className={buttonVariants({ variant: "outline" })} to="/matches">
          <ArrowLeftIcon aria-hidden="true" />
          Back to Matches
        </Link>
      </main>
    );
  }

  const team1ShortName = scorecard.match.team1?.shortName ?? "TBD";
  const team2ShortName = scorecard.match.team2?.shortName ?? "TBD";
  const canShowBackToScoring = shouldShowBackToScoring({
    canCurrentUserScore: scorecard.canCurrentUserScore,
    isLive: scorecard.match.isLive,
  });
  const selectedPanelId =
    selectedInnings === null
      ? undefined
      : `${ids}-innings-panel-${selectedInnings.id}`;
  const inningsHeadingId =
    selectedInnings === null
      ? undefined
      : `${ids}-innings-heading-${selectedInnings.id}`;
  const battingHeadingId =
    selectedInnings === null
      ? undefined
      : `${ids}-batting-heading-${selectedInnings.id}`;
  const bowlingHeadingId =
    selectedInnings === null
      ? undefined
      : `${ids}-bowling-heading-${selectedInnings.id}`;
  const wicketsHeadingId =
    selectedInnings === null
      ? undefined
      : `${ids}-wickets-heading-${selectedInnings.id}`;
  const currentParticipants = selectedInnings?.currentParticipants;

  return (
    <main
      className="page-surface mx-auto flex size-full max-w-4xl flex-col"
      id="main-content"
    >
      {/* Hero header with radial glow */}
      <header className="hero-surface animate-stagger-1 border-border/40 border-b px-4 pt-8 pb-6 md:px-8">
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
              {team1ShortName} <span className="text-muted-foreground">vs</span>{" "}
              {team2ShortName}
            </h1>
            <div className="flex items-center gap-3">
              <Badge className="angled-cut" variant="secondary">
                {scorecard.match.format}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {scorecard.match.oversPerSide} overs
              </span>
              {scorecard.match.isLive ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="font-semibold text-red-600 text-xs uppercase tracking-wider dark:text-red-400">
                    Live
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          {canShowBackToScoring ? (
            <nav aria-label="Scorecard actions">
              <Link
                aria-label="Back to scoring"
                className={buttonVariants({
                  size: "sm",
                  variant: "outline",
                })}
                params={{ matchId }}
                to="/matches/$matchId/score"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">Scoring</span>
              </Link>
            </nav>
          ) : null}
        </div>

        {/* Match result banner */}
        {scorecard.match.result ? (
          <div className="mt-5 border-accent/30 border-l-2 pl-3">
            <p className="font-medium text-sm">{scorecard.match.result}</p>
          </div>
        ) : null}
      </header>

      {/* Innings tab selector */}
      <nav
        aria-label="Select innings"
        className="hide-scrollbar animate-stagger-2 overflow-x-auto border-border/40 border-b bg-card/50 px-4 md:px-8"
      >
        <div aria-orientation="horizontal" className="flex" role="tablist">
          {scorecard.innings.map((entry) => {
            const isActive = selectedInningsId === entry.id;
            const tabId = `${ids}-innings-tab-${entry.id}`;
            const panelId = `${ids}-innings-panel-${entry.id}`;

            return (
              <button
                aria-controls={panelId}
                aria-selected={isActive}
                className={cn(
                  "relative whitespace-nowrap px-5 py-3.5 font-medium text-sm transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
                id={tabId}
                key={entry.id}
                onClick={() => setSelectedInningsId(entry.id)}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {entry.battingTeam.shortName} Innings
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {selectedInnings ? (
        <div
          aria-labelledby={`${ids}-innings-tab-${selectedInnings.id}`}
          className="flex-1 pb-16"
          id={selectedPanelId}
          role="tabpanel"
        >
          {/* Score hero — the centrepiece */}
          <section
            aria-labelledby={inningsHeadingId}
            className="animate-stagger-2 px-4 py-10 md:px-8"
          >
            <div className="flex flex-col gap-1">
              <h2
                className="font-medium text-muted-foreground text-xs uppercase tracking-[0.15em]"
                id={inningsHeadingId}
              >
                {selectedInnings.battingTeam.name}
                {selectedInnings.summary.status === "completed" ? null : (
                  <Badge className="ml-2 lowercase" variant="outline">
                    {selectedInnings.summary.status.replace("_", " ")}
                  </Badge>
                )}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-6xl tracking-tighter md:text-7xl">
                  {selectedInnings.summary.totalScore}
                </span>
                <span className="font-serif text-4xl text-muted-foreground tracking-tight md:text-5xl">
                  /{selectedInnings.summary.wickets}
                </span>
                <span className="ml-1 self-end pb-2 text-muted-foreground text-sm">
                  ({selectedInnings.summary.overs} ov)
                </span>
              </div>
              {selectedInnings.summary.target === null ? null : (
                <p className="mt-1 text-muted-foreground text-sm">
                  Target{" "}
                  <span className="font-medium text-foreground">
                    {selectedInnings.summary.target}
                  </span>
                </p>
              )}
            </div>
          </section>

          {/* Batting */}
          <section
            aria-labelledby={battingHeadingId}
            className="animate-stagger-3 [contain-intrinsic-size:420px] [content-visibility:auto]"
          >
            <h3 className="sr-only" id={battingHeadingId}>
              Batting
            </h3>
            <div className="border-border/40 border-y bg-muted/30 px-4 py-2.5 md:px-8">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-[11px] text-muted-foreground uppercase tracking-[0.15em] md:grid-cols-[1fr_3.5rem_2.5rem_2.5rem_3.5rem]">
                <div>Batter</div>
                <div className="whitespace-nowrap text-right">R (B)</div>
                <div className="hidden text-right md:block">4s</div>
                <div className="hidden text-right md:block">6s</div>
                <div className="hidden text-right md:block">SR</div>
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {selectedInnings.batting.map((row, index) => {
                const batterStatusText = getBatterStatusText(row);
                const { isCurrentBatter, liveRole, liveRoleLabel } =
                  getCurrentBatterState(currentParticipants, row.player.id);

                return (
                  (!scorecard.match.isLive ||
                    (scorecard.match.isLive &&
                      row.status !== "did_not_bat")) && (
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 transition-colors duration-150 md:grid-cols-[1fr_3.5rem_2.5rem_2.5rem_3.5rem] md:px-8",
                        getBattingRowClasses(isCurrentBatter)
                      )}
                      data-live-role={liveRole}
                      key={row.player.id}
                      style={{
                        animationDelay: `${(index + 3) * 40}ms`,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate text-sm">
                          <span
                            className={cn(
                              "font-medium",
                              isCurrentBatter && "text-primary"
                            )}
                          >
                            {formatShortName(row.player.name)}
                          </span>
                          {liveRoleLabel ? (
                            <span className="sr-only">{liveRoleLabel}</span>
                          ) : null}
                          {row.status === "not_out" ? (
                            <span
                              aria-hidden="true"
                              className="font-bold text-primary text-sm leading-none"
                            >
                              *
                            </span>
                          ) : null}
                        </div>
                        <p
                          className="mt-0.5 truncate text-muted-foreground text-xs"
                          title={batterStatusText}
                        >
                          {batterStatusText}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="sr-only">Runs and balls </span>
                        <span className={cn("font-semibold text-sm")}>
                          {row.runs}
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">
                          ({row.ballsFaced})
                        </span>
                      </div>
                      <div className="hidden text-right text-muted-foreground text-sm tabular-nums md:block">
                        {row.fours ?? 0}
                      </div>
                      <div className="hidden text-right text-muted-foreground text-sm tabular-nums md:block">
                        {row.sixes ?? 0}
                      </div>
                      <div className="hidden text-right text-muted-foreground text-xs tabular-nums md:block">
                        {Number(row.strikeRate).toFixed(1)}
                      </div>
                    </div>
                  )
                );
              })}
            </div>
          </section>

          {/* Extras + Bowling */}
          <section
            aria-labelledby={bowlingHeadingId}
            className="animate-stagger-4 [contain-intrinsic-size:360px] [content-visibility:auto]"
          >
            <h3 className="sr-only" id={bowlingHeadingId}>
              Bowling and extras
            </h3>

            {/* Extras — compact inline strip */}
            <div className="border-border/40 border-y bg-muted/10 px-4 py-3 md:px-8">
              <div className="flex flex-wrap items-baseline gap-x-1 text-sm">
                <span className="font-medium">Extras</span>
                <span className="font-semibold text-accent">
                  {selectedInnings.extras.total}
                </span>
                <span className="text-muted-foreground text-xs">
                  (w {selectedInnings.extras.wides}, nb{" "}
                  {selectedInnings.extras.noBalls}, lb{" "}
                  {selectedInnings.extras.legByes}, b{" "}
                  {selectedInnings.extras.byes}, p{" "}
                  {selectedInnings.extras.penaltyRuns})
                </span>
              </div>
            </div>

            {/* Bowling header */}
            <div className="border-border/40 border-b bg-muted/30 px-4 py-2.5 md:px-8">
              <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 text-[11px] text-muted-foreground uppercase tracking-[0.15em] md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem]">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="hidden text-right md:block">Econ</div>
                <div className="hidden text-right md:block">Dots</div>
              </div>
            </div>

            {/* Bowling rows */}
            <div className="divide-y divide-border/20">
              {selectedInnings.bowling.map((row) => {
                const hasWickets = row.wicketsTaken > 0;
                const isCurrentBowler =
                  currentParticipants?.bowlerId === row.player.id;
                const liveRoleLabel = getLiveRoleLabel({
                  isCurrentBowler,
                });

                return (
                  <div
                    className={cn(
                      "grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 px-4 py-3 transition-colors duration-150 md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem] md:px-8",
                      getBowlingRowClasses({
                        hasWickets,
                        isCurrentBowler,
                      })
                    )}
                    data-live-role={isCurrentBowler ? "bowler" : undefined}
                    key={row.player.id}
                  >
                    <div
                      className={cn(
                        "truncate font-medium text-sm",
                        isCurrentBowler && "text-primary"
                      )}
                    >
                      {formatShortName(row.player.name)}
                      {liveRoleLabel ? (
                        <span className="sr-only"> {liveRoleLabel}</span>
                      ) : null}
                    </div>
                    <div className="text-right text-muted-foreground text-sm tabular-nums">
                      <span className="sr-only">Overs </span>
                      {row.overs}
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <span className="sr-only">Runs conceded </span>
                      {row.runsConceded}
                    </div>
                    <div
                      className={cn(
                        "text-right font-semibold text-sm tabular-nums",
                        (hasWickets || isCurrentBowler) && "text-primary"
                      )}
                    >
                      <span className="sr-only">Wickets </span>
                      {row.wicketsTaken}
                    </div>
                    <div className="hidden text-right text-muted-foreground text-xs tabular-nums md:block">
                      {Number(row.economy).toFixed(1)}
                    </div>
                    <div className="hidden text-right text-muted-foreground text-xs tabular-nums md:block">
                      {row.dotBalls ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Fall of wickets — timeline style */}
          <section
            aria-labelledby={wicketsHeadingId}
            className="px-4 py-8 [contain-intrinsic-size:180px] [content-visibility:auto] md:px-8"
          >
            <h3
              className="mb-5 text-muted-foreground text-xs uppercase tracking-[0.15em]"
              id={wicketsHeadingId}
            >
              Fall of Wickets
            </h3>
            {selectedInnings.fallOfWickets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No wickets fell</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {selectedInnings.fallOfWickets.map((row) => (
                  <div
                    className="angled-cut inline-flex items-baseline gap-2 border border-border/50 bg-card/60 px-3 py-1.5 text-sm"
                    key={`${row.wicketNumber}-${row.over}`}
                  >
                    <span className="font-semibold tabular-nums">
                      {row.score}/{row.wicketNumber}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {row.batter
                        ? formatShortName(row.batter.name)
                        : "Unknown"}{" "}
                      ({row.over})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
