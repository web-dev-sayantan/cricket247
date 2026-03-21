import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfileImageUrl } from "@/lib/profile-image-url";
import { getInitials } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type PlayerStatisticsView = Awaited<ReturnType<typeof client.playerStatistics>>;

const OPEN_SECTION_VALUES = ["batting", "bowling", "fielding"];

export const Route = createFileRoute("/statistics/$playerId")({
  component: RouteComponent,
});

function formatMetricValue(value: null | number | string) {
  if (value === null) {
    return "—";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return value;
}

function formatOvers(balls: number, ballsPerOver: number) {
  const safeBallsPerOver = ballsPerOver > 0 ? ballsPerOver : 6;
  const completedOvers = Math.floor(balls / safeBallsPerOver);
  const remainingBalls = balls % safeBallsPerOver;
  return `${String(completedOvers)}.${String(remainingBalls)}`;
}

function getBackTarget() {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return true;
  }

  return false;
}

function RouteComponent() {
  const navigate = useNavigate();
  const { playerId } = Route.useParams();
  const parsedPlayerId = Number(playerId);
  const isValidPlayerId =
    Number.isInteger(parsedPlayerId) && parsedPlayerId > 0;

  const { data, error, isPending } = useQuery({
    ...orpc.playerStatistics.queryOptions({
      input: parsedPlayerId,
    }),
    enabled: isValidPlayerId,
  });

  const handleBack = () => {
    const usedHistory = getBackTarget();
    if (!usedHistory) {
      navigate({
        to: "/players",
      });
    }
  };

  if (!isValidPlayerId) {
    return (
      <PageShell>
        <Card className="border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <h1 className="font-semibold text-xl">Invalid player id</h1>
            <p className="text-muted-foreground text-sm">
              The statistics page could not resolve the requested player.
            </p>
            <Button
              onClick={handleBack}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowLeft />
              Back to players
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (isPending) {
    return <PlayerStatisticsSkeleton />;
  }

  if (error || !data) {
    return (
      <PageShell>
        <PageHeader
          actions={
            <Button
              onClick={handleBack}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowLeft />
              Back
            </Button>
          }
          description="Player statistics could not be loaded."
          title="Player Statistics"
        />
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 p-6">
            <h2 className="font-medium text-lg">Unable to load statistics</h2>
            <p className="text-muted-foreground text-sm">
              {error?.message ??
                "The requested player statistics were not found."}
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="wide">
      <PageHeader
        actions={
          <Button
            onClick={handleBack}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeft />
            Back
          </Button>
        }
        description="Format-by-format performance across completed matches."
        title="Player Statistics"
      />

      <PlayerSummaryCard player={data.player} />

      {data.formats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-8 text-center">
            <h2 className="font-medium text-lg">
              No completed-match stats yet
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-sm">
              This player does not have any completed-match performance data
              yet. Statistics will appear here once completed matches and
              tournament awards are recorded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={data.formats[0]?.format}>
          <TabsList className="h-auto flex-wrap gap-2 p-0" variant="line">
            {data.formats.map((formatStats) => (
              <TabsTrigger
                className="min-w-[7rem] border-b px-3 py-2 text-sm"
                key={formatStats.format}
                value={formatStats.format}
              >
                {formatStats.format}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.formats.map((formatStats) => (
            <FormatStatisticsTab
              formatStats={formatStats}
              key={formatStats.format}
            />
          ))}
        </Tabs>
      )}
    </PageShell>
  );
}

function FormatStatisticsTab({
  formatStats,
}: {
  formatStats: NonNullable<PlayerStatisticsView>["formats"][number];
}) {
  const hasSections = Boolean(
    formatStats.batting || formatStats.bowling || formatStats.fielding
  );

  return (
    <TabsContent
      className="space-y-6 border-t pt-5"
      key={formatStats.format}
      value={formatStats.format}
    >
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-medium text-lg">Overview</h2>
          <p className="text-muted-foreground text-sm">
            Snapshot of {formatStats.format} performance.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Matches Played"
            value={formatStats.overview.matchesPlayed}
          />
          <MetricCard
            label="Runs Scored"
            value={formatStats.overview.runsScored}
          />
          <MetricCard
            label="Wickets Taken"
            value={formatStats.overview.wicketsTaken}
          />
          <MetricCard
            label="Player of the Matches"
            value={formatStats.overview.playerOfTheMatchCount}
          />
          <MetricCard
            label="Player of the Tournaments"
            value={formatStats.overview.playerOfTheTournamentCount}
          />
        </div>
      </section>

      {hasSections ? (
        <Accordion
          className="border"
          defaultValue={OPEN_SECTION_VALUES}
          multiple
        >
          {formatStats.batting ? (
            <AccordionItem value="batting">
              <AccordionTrigger className="px-4 py-3 text-sm">
                Batting
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <MetricGrid
                  items={[
                    {
                      label: "Innings Batted",
                      value: formatStats.batting.inningsBatted,
                    },
                    {
                      label: "Runs Scored",
                      value: formatStats.batting.runsScored,
                    },
                    {
                      label: "Average",
                      value: formatMetricValue(formatStats.batting.average),
                    },
                    {
                      label: "Strike Rate",
                      value: formatMetricValue(formatStats.batting.strikeRate),
                    },
                    ...(typeof formatStats.batting.thirties === "number"
                      ? [
                          {
                            label: "30s",
                            value: formatStats.batting.thirties,
                          },
                        ]
                      : []),
                    {
                      label: "50s",
                      value: formatStats.batting.fifties,
                    },
                    {
                      label: "100s",
                      value: formatStats.batting.hundreds,
                    },
                    {
                      label: "4s Hit",
                      value: formatStats.batting.fours,
                    },
                    {
                      label: "6s Hit",
                      value: formatStats.batting.sixes,
                    },
                    {
                      label: "Not Outs",
                      value: formatStats.batting.notOuts,
                    },
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {formatStats.bowling ? (
            <AccordionItem value="bowling">
              <AccordionTrigger className="px-4 py-3 text-sm">
                Bowling
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <MetricGrid
                  items={[
                    {
                      label: "Overs Bowled",
                      value: formatOvers(
                        formatStats.bowling.ballsBowled,
                        formatStats.bowling.ballsPerOver
                      ),
                    },
                    {
                      label: "Wickets Taken",
                      value: formatStats.bowling.wicketsTaken,
                    },
                    {
                      label: "Runs Conceded",
                      value: formatStats.bowling.runsConceded,
                    },
                    {
                      label: "Economy",
                      value: formatMetricValue(formatStats.bowling.economy),
                    },
                    {
                      label: "Average",
                      value: formatMetricValue(formatStats.bowling.average),
                    },
                    {
                      label: "Strike Rate",
                      value: formatMetricValue(formatStats.bowling.strikeRate),
                    },
                    {
                      label: "3 Wicket Hauls",
                      value: formatStats.bowling.threeWicketHauls,
                    },
                    {
                      label: "5 Wicket Hauls",
                      value: formatStats.bowling.fiveWicketHauls,
                    },
                    {
                      label: "10 Wicket Hauls",
                      value: formatStats.bowling.tenWicketHauls,
                    },
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {formatStats.fielding ? (
            <AccordionItem value="fielding">
              <AccordionTrigger className="px-4 py-3 text-sm">
                Fielding
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <MetricGrid
                  items={[
                    {
                      label: "Catches",
                      value: formatStats.fielding.catches,
                    },
                    {
                      label: "Run Outs",
                      value: formatStats.fielding.runOuts,
                    },
                    ...(typeof formatStats.fielding.stumpings === "number"
                      ? [
                          {
                            label: "Stumpings",
                            value: formatStats.fielding.stumpings,
                          },
                        ]
                      : []),
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-muted-foreground text-sm">
            No batting, bowling, or fielding entries were recorded for this
            format in completed matches.
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

function PlayerSummaryCard({
  player,
}: {
  player: PlayerStatisticsView["player"];
}) {
  const playerImageUrl = getProfileImageUrl(player.image);
  const summaryLines = [
    player.role,
    player.nationality ? player.nationality : null,
    player.battingStance,
    player.bowlingStance ? player.bowlingStance : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardHeader className="gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex items-start gap-4">
          {playerImageUrl ? (
            <img
              alt={player.name}
              className="size-16 rounded-full border object-cover"
              height={64}
              src={playerImageUrl}
              width={64}
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-primary/10 font-medium text-lg text-primary">
              {getInitials(player.name)}
            </div>
          )}
          <div className="space-y-1">
            <CardTitle className="text-xl">{player.name}</CardTitle>
            <CardDescription>
              {summaryLines.length > 0
                ? summaryLines.join(" • ")
                : "Player profile summary"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
          {label}
        </p>
        <p className="font-semibold text-2xl tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: number | string }>;
}) {
  return (
    <dl className="grid gap-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div className="space-y-1 border bg-background p-3" key={item.label}>
          <dt className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {item.label}
          </dt>
          <dd className="font-medium text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PlayerStatisticsSkeleton() {
  return (
    <PageShell maxWidth="wide">
      <PageHeader
        actions={<Skeleton className="h-7 w-24" />}
        description={
          <span className="inline-block h-4 w-64 animate-pulse rounded-none bg-muted align-middle" />
        }
        title={
          <span className="inline-block h-8 w-56 animate-pulse rounded-none bg-muted align-middle" />
        }
      />
      <Card>
        <CardHeader className="gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              className="h-24 w-full"
              key={`player-stat-metric-skeleton-${String(index)}`}
            />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </PageShell>
  );
}
