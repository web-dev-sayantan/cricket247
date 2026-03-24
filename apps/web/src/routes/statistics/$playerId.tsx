import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Shield, Star, Target, Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfileImageUrl } from "@/lib/profile-image-url";
import { cn, getInitials } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type PlayerStatisticsView = Awaited<ReturnType<typeof client.playerStatistics>>;
type FormatStatistics = NonNullable<PlayerStatisticsView>["formats"][number];

interface MetricItem {
  label: string;
  value: number | string;
}

const OPEN_SECTION_VALUES = ["batting", "bowling", "fielding"];

const OVERVIEW_ACCENTS = [
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_84%,var(--color-primary)_16%),color-mix(in_oklab,var(--color-card)_88%,var(--color-accent)_12%))]",
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%),color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%))]",
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_88%,var(--color-primary)_12%),color-mix(in_oklab,var(--color-card)_78%,var(--color-accent)_22%))]",
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_80%,var(--color-accent)_20%),color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%))]",
  "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%),color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%))]",
] as const;

export const Route = createFileRoute("/statistics/$playerId")({
  component: RouteComponent,
});

function formatMetricValue(value: null | number | string) {
  if (value === null) {
    return "—";
  }

  if (typeof value === "number") {
    return value.toFixed(2);
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

function getPlayerSummaryLines(player: PlayerStatisticsView["player"]) {
  return [
    player.role,
    player.nationality ? player.nationality : null,
    player.battingStance,
    player.bowlingStance ? player.bowlingStance : null,
  ].filter((value): value is string => Boolean(value));
}

function getCareerTotals(formats: FormatStatistics[]) {
  return formats.reduce(
    (totals, formatStats) => ({
      awards:
        totals.awards +
        formatStats.overview.playerOfTheMatchCount +
        formatStats.overview.playerOfTheTournamentCount,
      formatsCount: totals.formatsCount + 1,
      matchesPlayed: totals.matchesPlayed + formatStats.overview.matchesPlayed,
      runsScored: totals.runsScored + formatStats.overview.runsScored,
      wicketsTaken: totals.wicketsTaken + formatStats.overview.wicketsTaken,
    }),
    {
      awards: 0,
      formatsCount: 0,
      matchesPlayed: 0,
      runsScored: 0,
      wicketsTaken: 0,
    }
  );
}

function getPlayerPulse(
  player: PlayerStatisticsView["player"],
  totals: ReturnType<typeof getCareerTotals>
) {
  if (totals.runsScored > 0 && totals.wicketsTaken > 0) {
    return `${player.name} influences both innings.`;
  }

  if (totals.runsScored > 0) {
    return `${player.name} is building the scoreboard with the bat.`;
  }

  if (totals.wicketsTaken > 0) {
    return `${player.name} is shaping games with the ball.`;
  }

  return `${player.name}'s completed-match impact is still loading in.`;
}

function getFormatStory(formatStats: FormatStatistics) {
  const hasBatting = Boolean(formatStats.batting);
  const hasBowling = Boolean(formatStats.bowling);
  const hasFielding = Boolean(formatStats.fielding);

  if (hasBatting && hasBowling) {
    return `${formatStats.format} shows all-round impact with batting and bowling numbers both live.`;
  }

  if (hasBatting) {
    return `${formatStats.format} is led by batting output, with completed innings driving the story.`;
  }

  if (hasBowling) {
    return `${formatStats.format} leans on bowling control, wickets, and economy.`;
  }

  if (hasFielding) {
    return `${formatStats.format} is currently defined by fielding actions and support play.`;
  }

  return `${formatStats.format} has completed-match results, but no detailed phase breakdown yet.`;
}

function getSectionCount(formatStats: FormatStatistics) {
  return [
    formatStats.batting,
    formatStats.bowling,
    formatStats.fielding,
  ].filter(Boolean).length;
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
      <StatisticsState
        actionLabel="Back to players"
        description="The statistics page could not resolve the requested player."
        onAction={handleBack}
        title="Invalid player id"
      />
    );
  }

  if (isPending) {
    return <PlayerStatisticsSkeleton />;
  }

  if (error || !data) {
    return (
      <StatisticsState
        actionLabel="Back"
        description={
          error?.message ?? "The requested player statistics were not found."
        }
        onAction={handleBack}
        title="Unable to load statistics"
      />
    );
  }

  const summaryLines = getPlayerSummaryLines(data.player);
  const careerTotals = getCareerTotals(data.formats);
  const playerImageUrl = getProfileImageUrl(data.player.image);
  const pulse = getPlayerPulse(data.player, careerTotals);

  return (
    <PageShell
      className="hero-surface"
      contentClassName="space-y-10"
      maxWidth="wide"
    >
      <section className="relative animate-stagger-1 overflow-hidden border border-foreground/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_86%,var(--color-primary)_14%),color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_36%,transparent)_0%,transparent_42%),linear-gradient(115deg,transparent_0%,transparent_58%,color-mix(in_oklab,var(--color-foreground)_6%,transparent)_58%,transparent_66%)]" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)] lg:px-10 lg:py-12">
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-[0.68rem] text-foreground/70 uppercase tracking-[0.28em]">
                <span className="border border-foreground/15 bg-background/60 px-3 py-1">
                  Player Numbers
                </span>
                <span className="border border-foreground/15 bg-background/40 px-3 py-1">
                  Completed matches only
                </span>
                <span className="border border-foreground/15 bg-background/40 px-3 py-1">
                  Format split
                </span>
              </div>
              <Button
                className="border-foreground/15 bg-background/60 hover:bg-background/80"
                onClick={handleBack}
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeft />
                Back
              </Button>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.05em]">
                {data.player.name}
              </h1>
              <p className="max-w-3xl text-[0.95rem] text-foreground/78 leading-7 sm:text-[1.05rem]">
                {summaryLines.length > 0
                  ? `${summaryLines.join(" • ")}.`
                  : "Format-by-format performance across completed matches."}{" "}
                Jump between formats to see how the player is stacking runs,
                wickets, awards, and support work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMarker
                label="Formats tracked"
                value={`${String(careerTotals.formatsCount)} boards`}
              />
              <HeroMarker
                label="Matches logged"
                value={`${String(careerTotals.matchesPlayed)} matches`}
              />
              <HeroMarker
                label="Runs banked"
                value={`${String(careerTotals.runsScored)} runs`}
              />
              <HeroMarker
                label="Wickets landed"
                value={`${String(careerTotals.wicketsTaken)} wickets`}
              />
            </div>
          </div>

          <div className="relative animate-stagger-2 overflow-hidden border border-foreground/10 bg-background/88 p-5 backdrop-blur-sm sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-primary)_55%,transparent),transparent)]" />
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                {playerImageUrl ? (
                  <img
                    alt={data.player.name}
                    className="size-18 shrink-0 border border-foreground/10 object-cover sm:size-20"
                    height={80}
                    src={playerImageUrl}
                    width={80}
                  />
                ) : (
                  <div className="flex size-18 shrink-0 items-center justify-center border border-foreground/10 bg-[color-mix(in_oklab,var(--color-primary)_12%,var(--color-card))] font-semibold text-2xl text-primary sm:size-20">
                    {getInitials(data.player.name)}
                  </div>
                )}

                <div className="min-w-0 space-y-2">
                  <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
                    Career pulse
                  </p>
                  <h2 className="font-sans font-semibold text-xl tracking-tight sm:text-2xl">
                    {pulse}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-6">
                    Awards, match volume, and phase-by-phase output stay in one
                    view so you can read the shape of the player quickly.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <SpotlightRail
                  label="Awards collected"
                  toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_10%,var(--color-card)),color-mix(in_oklab,var(--color-card)_84%,var(--color-primary)_16%))]"
                  value={String(careerTotals.awards)}
                />
                <SpotlightRail
                  label="Formats with detail"
                  toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent)_10%,var(--color-card)),color-mix(in_oklab,var(--color-card)_86%,var(--color-accent)_14%))]"
                  value={String(
                    data.formats.filter((formatStats) =>
                      getSectionCount(formatStats)
                    ).length
                  )}
                />
                <SpotlightRail
                  label="Stat zones live"
                  toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_8%,var(--color-card)),color-mix(in_oklab,var(--color-accent)_12%,var(--color-card)))]"
                  value={String(
                    data.formats.reduce(
                      (count, formatStats) =>
                        count + getSectionCount(formatStats),
                      0
                    )
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex animate-stagger-2 flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
              Format boards
            </p>
            <h2 className="text-3xl tracking-tight sm:text-4xl">
              Switch the lens, keep the same momentum.
            </h2>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-6">
            Each format gets its own scoreboard, overview, and phase-by-phase
            breakdown so the numbers stay easy to scan on desktop and mobile.
          </p>
        </div>

        {data.formats.length === 0 ? (
          <EmptyFormatState />
        ) : (
          <Tabs defaultValue={data.formats[0]?.format}>
            <TabsList className="h-auto flex-wrap gap-2 p-0" variant="line">
              {data.formats.map((formatStats) => (
                <TabsTrigger
                  className="min-w-[8rem] border border-foreground/10 bg-background/68 px-4 py-2.5 text-[0.72rem] text-foreground/70 uppercase tracking-[0.22em] transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/18 hover:bg-background hover:text-foreground data-active:border-foreground/20 data-active:bg-[color-mix(in_oklab,var(--color-card)_84%,var(--color-primary)_16%)] data-active:text-foreground"
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
      </section>
    </PageShell>
  );
}

function FormatStatisticsTab({
  formatStats,
}: {
  formatStats: FormatStatistics;
}) {
  const hasSections = Boolean(
    formatStats.batting || formatStats.bowling || formatStats.fielding
  );

  const overviewItems = [
    {
      label: "Matches Played",
      value: formatStats.overview.matchesPlayed,
    },
    {
      label: "Runs Scored",
      value: formatStats.overview.runsScored,
    },
    {
      label: "Wickets Taken",
      value: formatStats.overview.wicketsTaken,
    },
    {
      label: "Player of the Matches",
      value: formatStats.overview.playerOfTheMatchCount,
    },
    {
      label: "Player of the Tournaments",
      value: formatStats.overview.playerOfTheTournamentCount,
    },
  ] satisfies MetricItem[];

  return (
    <TabsContent
      className="space-y-8 border-foreground/10 border-t pt-6"
      key={formatStats.format}
      value={formatStats.format}
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="relative overflow-hidden border border-foreground/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_88%,var(--color-primary)_12%),color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%))] px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,transparent_0%,transparent_52%,color-mix(in_oklab,var(--color-foreground)_5%,transparent)_52%,transparent_64%)]" />
          <div className="relative space-y-3">
            <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
              Overview
            </p>
            <h3 className="text-2xl tracking-tight sm:text-3xl">
              {formatStats.format} scoreboard
            </h3>
            <p className="max-w-2xl text-foreground/78 text-sm leading-6 sm:text-base">
              {getFormatStory(formatStats)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <HeroMarker
            label="Sections live"
            value={`${String(getSectionCount(formatStats))} zones`}
          />
          <HeroMarker
            label="Matches logged"
            value={`${String(formatStats.overview.matchesPlayed)} matches`}
          />
          <HeroMarker
            label="Awards"
            value={`${String(
              formatStats.overview.playerOfTheMatchCount +
                formatStats.overview.playerOfTheTournamentCount
            )} combined`}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {overviewItems.map((item, index) => (
          <MetricCard
            accentClassName={OVERVIEW_ACCENTS[index % OVERVIEW_ACCENTS.length]}
            key={item.label}
            label={item.label}
            value={item.value}
          />
        ))}
      </section>

      {hasSections ? (
        <Accordion
          className="space-y-3"
          defaultValue={OPEN_SECTION_VALUES}
          multiple
        >
          {formatStats.batting ? (
            <PerformanceAccordionItem
              description="Runs, rates, milestones, and the innings shape behind the top-line total."
              icon={Trophy}
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
              title="Batting"
              toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_10%,var(--color-card)),color-mix(in_oklab,var(--color-card)_84%,var(--color-primary)_16%))]"
              value="batting"
            />
          ) : null}

          {formatStats.bowling ? (
            <PerformanceAccordionItem
              description="Overs, wickets, control, and strike power from completed spells."
              icon={Target}
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
              title="Bowling"
              toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent)_12%,var(--color-card)),color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%))]"
              value="bowling"
            />
          ) : null}

          {formatStats.fielding ? (
            <PerformanceAccordionItem
              description="The support work that changes moments: catches, run-outs, and keeper impact."
              icon={Shield}
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
              title="Fielding"
              toneClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_8%,var(--color-card)),color-mix(in_oklab,var(--color-accent)_12%,var(--color-card)))]"
              value="fielding"
            />
          ) : null}
        </Accordion>
      ) : (
        <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-5 text-muted-foreground text-sm sm:px-6 sm:py-6">
          No batting, bowling, or fielding entries were recorded for this format
          in completed matches.
        </div>
      )}
    </TabsContent>
  );
}

function StatisticsState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel: string;
  description: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <PageShell
      className="hero-surface"
      contentClassName="space-y-8"
      maxWidth="wide"
    >
      <section className="relative overflow-hidden border border-foreground/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%),color-mix(in_oklab,var(--color-card)_84%,var(--color-accent)_16%))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_28%,transparent)_0%,transparent_46%)]" />
        <div className="relative space-y-4 px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
            Player Hub
          </p>
          <h1 className="max-w-3xl text-3xl tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-foreground/78 text-sm leading-6 sm:text-base">
            {description}
          </p>
          <Button
            className="border-foreground/15 bg-background/65 hover:bg-background/85"
            onClick={onAction}
            size="lg"
            type="button"
            variant="outline"
          >
            <ArrowLeft />
            {actionLabel}
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

function HeroMarker({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-foreground/10 bg-background/55 px-4 py-4 backdrop-blur-sm">
      <p className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.24em]">
        {label}
      </p>
      <p className="mt-2 font-sans font-semibold text-base tracking-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function SpotlightRail({
  label,
  toneClassName,
  value,
}: {
  label: string;
  toneClassName: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "border border-foreground/10 px-4 py-4 backdrop-blur-sm",
        toneClassName
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.24em]">
            {label}
          </p>
          <p className="font-sans font-semibold text-2xl tracking-[-0.04em]">
            {value}
          </p>
        </div>
        <Star className="size-4 text-primary" />
      </div>
    </div>
  );
}

function EmptyFormatState() {
  return (
    <div className="border border-foreground/15 border-dashed bg-background/70 px-6 py-8 sm:px-8 sm:py-10">
      <div className="space-y-2">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
          No boards yet
        </p>
        <h3 className="text-2xl tracking-tight">
          No completed-match stats yet
        </h3>
        <p className="max-w-2xl text-muted-foreground text-sm leading-6">
          Statistics will appear here once completed matches and tournament
          awards are recorded for this player.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  accentClassName,
  label,
  value,
}: {
  accentClassName: string;
  label: string;
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-foreground/10 px-4 py-4",
        accentClassName
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,transparent_0%,transparent_58%,color-mix(in_oklab,var(--color-foreground)_5%,transparent)_58%,transparent_68%)]" />
      <div className="relative space-y-3">
        <p className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.24em]">
          {label}
        </p>
        <p className="font-sans font-semibold text-[clamp(2rem,4vw,3rem)] leading-none tracking-[-0.05em]">
          {value}
        </p>
      </div>
    </div>
  );
}

function PerformanceAccordionItem({
  description,
  icon: Icon,
  items,
  title,
  toneClassName,
  value,
}: {
  description: string;
  icon: typeof Trophy;
  items: MetricItem[];
  title: string;
  toneClassName: string;
  value: string;
}) {
  return (
    <AccordionItem
      className={cn(
        "overflow-hidden border border-foreground/10",
        toneClassName
      )}
      value={value}
    >
      <AccordionTrigger className="px-5 py-4 hover:no-underline sm:px-6 sm:py-5">
        <div className="flex w-full items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center border border-foreground/10 bg-background/70">
            <Icon className="size-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-sans font-semibold text-lg tracking-tight sm:text-xl">
                {title}
              </span>
              <span className="border border-foreground/10 bg-background/65 px-2 py-1 text-[0.66rem] text-muted-foreground uppercase tracking-[0.22em]">
                {String(items.length)} metrics
              </span>
            </div>
            <p className="max-w-2xl text-foreground/75 text-sm leading-6">
              {description}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5 sm:px-6 sm:pb-6">
        <MetricGrid items={items} />
      </AccordionContent>
    </AccordionItem>
  );
}

function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          className="border border-foreground/10 bg-background/74 px-4 py-4 backdrop-blur-sm"
          key={item.label}
        >
          <dt className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.22em]">
            {item.label}
          </dt>
          <dd className="mt-3 font-sans font-semibold text-lg tracking-tight sm:text-xl">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PlayerStatisticsSkeleton() {
  return (
    <PageShell
      className="hero-surface"
      contentClassName="space-y-10"
      maxWidth="wide"
    >
      <section className="relative overflow-hidden border border-foreground/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%),color-mix(in_oklab,var(--color-card)_84%,var(--color-accent)_16%))]">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)] lg:px-10 lg:py-12">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full max-w-3xl" />
              <Skeleton className="h-5 w-full max-w-2xl" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  className="h-24 w-full"
                  key={`player-hero-marker-skeleton-${String(index)}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 border border-foreground/10 bg-background/80 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="size-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-full max-w-72" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton
                className="h-20 w-full"
                key={`player-spotlight-rail-skeleton-${String(index)}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-96 max-w-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <Skeleton className="h-12 w-full max-w-xl" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              className="h-28 w-full"
              key={`player-overview-card-skeleton-${String(index)}`}
            />
          ))}
        </div>

        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton
            className="h-40 w-full"
            key={`player-section-skeleton-${String(index)}`}
          />
        ))}
      </section>
    </PageShell>
  );
}
