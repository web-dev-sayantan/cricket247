import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const getBatterStatusText = (row: BattingItem) => {
    if (row.status === "did_not_bat") {
      return "Did not bat";
    }

    if (row.status === "not_out") {
      return "Not out";
    }

    const dismissedByText = row.dismissedBy ? ` b ${row.dismissedBy.name}` : "";
    const assistedByText = row.assistedBy ? ` (${row.assistedBy.name})` : "";
    return `${row.dismissalType ?? "out"}${dismissedByText}${assistedByText}`;
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

  return (
    <main className="mx-auto flex size-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">
            {scorecard.match.team1.shortName} vs{" "}
            {scorecard.match.team2.shortName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {scorecard.match.format} • {scorecard.match.oversPerSide}{" "}
            overs/innings
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Link params={{ matchId }} to="/matches/$matchId/score">
            <ArrowLeftIcon />
            Back to Scoring
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {scorecard.innings.map((entry) => (
          <Button
            key={entry.id}
            onClick={() => setSelectedInningsId(entry.id)}
            size="sm"
            variant={selectedInningsId === entry.id ? "default" : "secondary"}
          >
            Innings {entry.inningsNumber}: {entry.battingTeam.shortName}{" "}
            {entry.summary.totalScore}/{entry.summary.wickets}
          </Button>
        ))}
      </div>

      {selectedInnings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedInnings.battingTeam.name} Innings
                <Badge variant="outline">
                  {selectedInnings.summary.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-5">
              <div>
                <div className="text-muted-foreground text-xs">Score</div>
                <div className="font-semibold text-xl">
                  {selectedInnings.summary.totalScore}/
                  {selectedInnings.summary.wickets}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Overs</div>
                <div className="font-semibold">
                  {selectedInnings.summary.overs}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Target</div>
                <div className="font-semibold">
                  {selectedInnings.summary.target === null
                    ? "NA"
                    : selectedInnings.summary.target}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Extras</div>
                <div className="font-semibold">
                  {selectedInnings.extras.total}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Result</div>
                <div className="font-semibold">
                  {scorecard.match.result ?? "In progress"}
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Batting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedInnings.batting.map((row) => (
                    <div
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-sm"
                      key={row.player.id}
                    >
                      <div>
                        <div className="font-medium">{row.player.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {getBatterStatusText(row)}
                        </div>
                      </div>
                      <div className="text-right">{row.runs}</div>
                      <div className="text-right text-muted-foreground">
                        ({row.ballsFaced})
                      </div>
                      <div className="text-right text-muted-foreground">
                        SR {row.strikeRate}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bowling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedInnings.bowling.map((row) => (
                    <div
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-sm"
                      key={row.player.id}
                    >
                      <div className="font-medium">{row.player.name}</div>
                      <div className="text-right">{row.overs}</div>
                      <div className="text-right">
                        {row.runsConceded}-{row.wicketsTaken}
                      </div>
                      <div className="text-right text-muted-foreground">
                        Econ {row.economy}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Extras</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div>Wides: {selectedInnings.extras.wides}</div>
                <div>No balls: {selectedInnings.extras.noBalls}</div>
                <div>Byes: {selectedInnings.extras.byes}</div>
                <div>Leg byes: {selectedInnings.extras.legByes}</div>
                <div>Penalty: {selectedInnings.extras.penaltyRuns}</div>
                <div>Others: {selectedInnings.extras.others}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fall of Wickets</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedInnings.fallOfWickets.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    No wickets yet
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {selectedInnings.fallOfWickets.map((row) => (
                      <div
                        className="flex items-center justify-between"
                        key={`${row.wicketNumber}-${row.over}`}
                      >
                        <div>
                          {row.wicketNumber}. {row.score} -{" "}
                          {row.batter?.name ?? "Unknown"}
                        </div>
                        <div className="text-muted-foreground">{row.over}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
