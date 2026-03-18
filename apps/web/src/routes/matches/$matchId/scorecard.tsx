import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { shouldShowBackToScoring } from "./-scorecard-visibility";

export const Route = createFileRoute("/matches/$matchId/scorecard")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { matchId } = params;
    const { orpc } = context;

    const scorecard = await orpc.getMatchScorecard.call({
      matchId: Number(matchId),
      includeBallByBall: false,
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

function RouteComponent() {
  const { scorecard } = Route.useLoaderData();
  const { matchId } = Route.useParams();

  const [selectedInningsId, setSelectedInningsId] = useState<number | null>(
    scorecard?.innings[0]?.id ?? null
  );

  const selectedInnings = useMemo(() => {
    if (!scorecard || selectedInningsId === null) {
      return null;
    }
    return (
      scorecard.innings.find((entry) => entry.id === selectedInningsId) ?? null
    );
  }, [scorecard, selectedInningsId]);

  type InningsItem = NonNullable<typeof scorecard>["innings"][number];
  type BattingItem = InningsItem["batting"][number];

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Switch statement is verbose but readable
  const getBatterStatusText = (row: BattingItem) => {
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
  };

  if (!scorecard) {
    return (
      <main className="m-auto flex size-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="font-semibold text-2xl">Match not found</h1>
        <Button>
          <Link to="/matches">
            <ArrowLeftIcon />
            Back to Matches
          </Link>
        </Button>
      </main>
    );
  }

  const team1ShortName = scorecard.match.team1?.shortName ?? "TBD";
  const team2ShortName = scorecard.match.team2?.shortName ?? "TBD";
  const canShowBackToScoring = shouldShowBackToScoring({
    canCurrentUserScore: scorecard.canCurrentUserScore,
    isLive: scorecard.match.isLive,
  });

  return (
    <main className="mx-auto flex size-full max-w-4xl flex-col bg-background">
      {/* Header Section */}
      <div className="flex items-center justify-between border-border/40 border-b px-4 pt-6 pb-4 md:px-8">
        <div className="space-y-1">
          <h1 className="font-semibold text-foreground text-xl tracking-tight">
            {team1ShortName} vs {team2ShortName}
          </h1>
          <p className="font-medium text-muted-foreground text-sm">
            {scorecard.match.format} • {scorecard.match.oversPerSide} overs
          </p>
        </div>
        {canShowBackToScoring ? (
          <Button className="h-8 rounded-full" size="sm" variant="outline">
            <Link
              className="flex items-center gap-1.5"
              params={{ matchId }}
              to="/matches/$matchId/score"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to Scoring</span>
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Innings Tabs */}
      <div className="hide-scrollbar overflow-x-auto border-border/40 border-b px-4 md:px-8">
        <div className="flex space-x-6">
          {scorecard.innings.map((entry) => {
            const isActive = selectedInningsId === entry.id;
            return (
              <button
                className={`relative whitespace-nowrap py-4 font-medium text-sm transition-colors hover:text-foreground ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
                key={entry.id}
                onClick={() => setSelectedInningsId(entry.id)}
                type="button"
              >
                {entry.battingTeam.shortName} Innings
                {isActive && (
                  <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedInnings && (
        <div className="flex-1 pb-16">
          {/* Innings Summary */}
          <div className="border-border/40 border-b bg-muted/20 px-4 py-8 md:px-8">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="mb-2 font-medium text-muted-foreground text-sm uppercase tracking-wider">
                  {selectedInnings.battingTeam.name}
                  {selectedInnings.summary.status !== "completed" && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs lowercase normal-case">
                      {selectedInnings.summary.status.replace("_", " ")}
                    </span>
                  )}
                </h2>
                <div className="flex items-baseline gap-3">
                  <div className="font-semibold text-5xl tracking-tighter">
                    {selectedInnings.summary.totalScore}
                    <span className="font-normal text-3xl text-muted-foreground">
                      /{selectedInnings.summary.wickets}
                    </span>
                  </div>
                  <div className="text-lg text-muted-foreground">
                    ({selectedInnings.summary.overs} ov)
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {selectedInnings.summary.target !== null && (
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="font-medium">
                      {selectedInnings.summary.target}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Result: </span>
                  <span className="font-medium">
                    {scorecard.match.result ?? "Match underway"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Batting Table */}
          <div className="border-border/40 border-b">
            <div className="border-border/40 border-b bg-muted/30 px-4 py-3 md:px-8">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 font-medium text-muted-foreground text-xs tracking-widest md:grid-cols-[1fr_2rem_2rem_3rem_3rem]">
                <div>Batter</div>
                <div className="whitespace-nowrap text-right">R (B)</div>
                <div className="hidden text-right md:block">4s</div>
                <div className="hidden text-right md:block">6s</div>
                <div className="hidden text-right md:block">S.R.</div>
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {selectedInnings.batting.map((row) => (
                <div
                  className="group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/10 md:grid-cols-[1fr_2rem_2rem_3rem_3rem] md:px-8"
                  key={row.player.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate font-medium text-foreground">
                      {formatShortName(row.player.name)}
                      {row.status === "not_out" && (
                        <span className="mt-1 text-lg text-primary leading-none">
                          *
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-0.5 truncate text-[13px] text-muted-foreground"
                      title={getBatterStatusText(row)}
                    >
                      {getBatterStatusText(row)}
                    </div>
                  </div>
                  <div className="text-right font-medium text-foreground tabular-nums">
                    {row.runs}{" "}
                    <span className="font-normal text-muted-foreground text-xs">
                      ({row.ballsFaced})
                    </span>
                  </div>
                  <div className="hidden text-right text-muted-foreground text-sm md:block">
                    {row.fours ?? 0}
                  </div>
                  <div className="hidden text-right text-muted-foreground text-sm md:block">
                    {row.sixes ?? 0}
                  </div>
                  <div className="hidden text-right text-muted-foreground text-sm tabular-nums md:block">
                    {Number(row.strikeRate).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extras and Bowling Table */}
          <div className="border-border/40 border-b">
            {/* Extras */}
            <div className="border-border/40 border-b bg-muted/10 px-4 py-4 text-sm md:px-8">
              <span className="mr-2 font-medium text-foreground">
                Extras {selectedInnings.extras.total}
              </span>
              <span className="text-muted-foreground">
                (w {selectedInnings.extras.wides}, nb{" "}
                {selectedInnings.extras.noBalls}, lb{" "}
                {selectedInnings.extras.legByes}, b{" "}
                {selectedInnings.extras.byes}, p{" "}
                {selectedInnings.extras.penaltyRuns})
              </span>
            </div>

            {/* Bowling Header */}
            <div className="border-border/40 border-b bg-muted/30 px-4 py-3 md:px-8">
              <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 font-medium text-muted-foreground text-xs uppercase tracking-widest md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem]">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="hidden text-right md:block">Econ</div>
                <div className="hidden text-right md:block">Dots</div>
              </div>
            </div>

            {/* Bowling Data */}
            <div className="divide-y divide-border/20">
              {selectedInnings.bowling.map((row) => (
                <div
                  className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/10 md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem] md:px-8"
                  key={row.player.id}
                >
                  <div className="truncate font-medium text-foreground">
                    {formatShortName(row.player.name)}
                  </div>
                  <div className="text-right text-muted-foreground tabular-nums">
                    {row.overs}
                  </div>
                  <div className="text-right font-medium text-foreground tabular-nums">
                    {row.runsConceded}
                  </div>
                  <div className="text-right font-medium text-foreground tabular-nums">
                    {row.wicketsTaken}
                  </div>
                  <div className="hidden text-right text-muted-foreground tabular-nums md:block">
                    {Number(row.economy).toFixed(2)}
                  </div>
                  <div className="hidden text-right text-muted-foreground tabular-nums md:block">
                    {row.dotBalls ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fall of Wickets */}
          <div className="border-border/40 border-b px-4 py-8 md:px-8">
            <h3 className="mb-4 font-medium text-muted-foreground text-sm uppercase tracking-widest">
              Fall of Wickets
            </h3>
            {selectedInnings.fallOfWickets.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No wickets fell
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm leading-relaxed">
                {selectedInnings.fallOfWickets.map((row) => (
                  <span
                    className="inline-flex items-center gap-1.5"
                    key={`${row.wicketNumber}-${row.over}`}
                  >
                    <span className="font-medium text-foreground">
                      {row.batter
                        ? formatShortName(row.batter.name)
                        : "Unknown"}
                    </span>
                    <span className="text-muted-foreground">
                      {row.score}/{row.wicketNumber} ({row.over})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
