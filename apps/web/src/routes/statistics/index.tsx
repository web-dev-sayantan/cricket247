import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, Shield, Target, Trophy, Zap } from "lucide-react";
import { type FormEvent, useDeferredValue, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfileImageUrl } from "@/lib/profile-image-url";
import { cn, getInitials } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type StatisticsLandingView = Awaited<
  ReturnType<typeof client.statisticsLanding>
>;
type StatisticsLandingLeader =
  StatisticsLandingView["leaders"][keyof StatisticsLandingView["leaders"]];
type StatisticsLandingPlayer = StatisticsLandingView["players"][number];

const MAX_SEARCH_RESULTS = 6;

export const Route = createFileRoute("/statistics/")({
  component: RouteComponent,
});

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getPlayerMeta(player: StatisticsLandingPlayer) {
  return [player.role, player.nationality].filter((value): value is string =>
    Boolean(value)
  );
}

function getSpotlightPlayers(
  leaders: StatisticsLandingView["leaders"]
): StatisticsLandingPlayer[] {
  const spotlightPlayers: StatisticsLandingPlayer[] = [];
  const seenPlayerIds = new Set<number>();

  for (const leader of [
    leaders.highestRunGetter,
    leaders.highestWicketTaker,
    leaders.bestAverageBatter,
    leaders.bestEconomyBowler,
  ]) {
    if (!leader || seenPlayerIds.has(leader.player.id)) {
      continue;
    }

    spotlightPlayers.push(leader.player);
    seenPlayerIds.add(leader.player.id);
  }

  return spotlightPlayers;
}

function RouteComponent() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const { data, error, isPending } = useQuery(
    orpc.statisticsLanding.queryOptions()
  );

  const filteredPlayers =
    data?.players
      .filter((player) =>
        normalizedSearchQuery.length === 0
          ? false
          : player.name.toLowerCase().includes(normalizedSearchQuery)
      )
      .slice(0, MAX_SEARCH_RESULTS) ?? [];

  const spotlightPlayers = data ? getSpotlightPlayers(data.leaders) : [];
  const displayedPlayers =
    normalizedSearchQuery.length > 0 ? filteredPlayers : spotlightPlayers;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!(data && trimmedQuery.length > 0)) {
      return;
    }

    const exactMatch = data.players.find(
      (player) => player.name.toLowerCase() === trimmedQuery
    );
    const targetPlayer = exactMatch ?? filteredPlayers[0];

    if (!targetPlayer) {
      return;
    }

    navigate({
      params: {
        playerId: String(targetPlayer.id),
      },
      to: "/statistics/$playerId",
    });
  };

  if (isPending) {
    return <StatisticsLandingSkeleton />;
  }

  if (error || !data) {
    return (
      <PageShell maxWidth="wide">
        <section className="overflow-hidden border border-destructive/30 bg-card">
          <div className="space-y-3 px-6 py-8 sm:px-8">
            <p className="text-[0.7rem] text-muted-foreground uppercase tracking-[0.28em]">
              Player Hub
            </p>
            <h1 className="text-3xl tracking-tight sm:text-4xl">
              The stats board is taking a break
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
              {error?.message ??
                "We could not load player numbers and leaderboard highlights right now."}
            </p>
            <Link className={buttonVariants({ size: "lg" })} to="/players">
              Browse all players
              <ArrowRight />
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="hero-surface"
      contentClassName="space-y-10"
      maxWidth="wide"
    >
      <section className="relative animate-stagger-1 overflow-hidden border border-foreground/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-card)_86%,var(--color-primary)_14%),color-mix(in_oklab,var(--color-card)_82%,var(--color-accent)_18%))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_40%,transparent)_0%,transparent_40%),linear-gradient(110deg,transparent_0%,transparent_55%,color-mix(in_oklab,var(--color-foreground)_6%,transparent)_55%,transparent_62%)]" />
        <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)] lg:px-10 lg:py-12">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2 text-[0.68rem] text-foreground/70 uppercase tracking-[0.28em]">
              <span className="border border-foreground/15 bg-background/60 px-3 py-1">
                Player Spotlight
              </span>
              <span className="border border-foreground/15 bg-background/40 px-3 py-1">
                Match-day numbers
              </span>
              <span className="border border-foreground/15 bg-background/40 px-3 py-1">
                Search any name
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-[clamp(2.9rem,8vw,6.25rem)] leading-[0.9] tracking-[-0.05em]">
                Follow the players
                <br />
                everyone is talking about.
              </h1>
              <p className="max-w-2xl text-[0.95rem] text-foreground/78 leading-7 sm:text-[1.05rem]">
                Search for a player, jump into their full numbers, and catch up
                on who is scoring big, striking often, and keeping it tight with
                the ball.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMarker
                label="Players in view"
                value={`${String(data.players.length)} players`}
              />
              <HeroMarker
                label="Stories to watch"
                value={`${String(
                  [
                    data.leaders.highestRunGetter,
                    data.leaders.highestWicketTaker,
                    data.leaders.bestAverageBatter,
                    data.leaders.bestEconomyBowler,
                  ].filter(Boolean).length
                )} live slots`}
              />
              <HeroMarker label="Economy rule" value="Min. 1 over bowled" />
            </div>
          </div>

          <div className="relative animate-stagger-2 overflow-hidden border border-foreground/10 bg-background/88 p-5 backdrop-blur-sm sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-primary)_55%,transparent),transparent)]" />
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
                  Find Your Player
                </p>
                <h2 className="font-sans font-semibold text-xl tracking-tight sm:text-2xl">
                  Search a player name
                </h2>
                <p className="text-muted-foreground text-sm leading-6">
                  Type a name and jump straight to that player&apos;s runs,
                  wickets, averages, and match-by-match story.
                </p>
              </div>

              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="statistics-player-search">
                  Search by player name
                </label>
                <div className="flex items-center gap-3 border border-foreground/10 bg-[color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%)] px-4 py-3">
                  <Search className="size-4 text-primary" />
                  <Input
                    autoComplete="off"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                    id="statistics-player-search"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Start typing a player name"
                    type="search"
                    value={searchQuery}
                  />
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
                    {normalizedSearchQuery.length > 0
                      ? "Search results"
                      : "Quick picks"}
                  </p>
                  <span className="text-[0.72rem] text-muted-foreground">
                    {normalizedSearchQuery.length > 0
                      ? `${String(filteredPlayers.length)} shown`
                      : `${String(displayedPlayers.length)} players to watch`}
                  </span>
                </div>

                {displayedPlayers.length > 0 ? (
                  <div className="space-y-2">
                    {displayedPlayers.map((player, index) => (
                      <SearchResultItem
                        index={index}
                        key={player.id}
                        player={player}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border border-foreground/15 border-dashed bg-background/70 px-4 py-5 text-muted-foreground text-sm">
                    No match yet. Try a first name, surname, or a shorter part
                    of the name.
                  </div>
                )}
              </div>

              <Link
                className={buttonVariants({
                  className: "w-full justify-between",
                  size: "lg",
                  variant: "outline",
                })}
                to="/players"
              >
                See every player
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex animate-stagger-2 flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
              This Week&apos;s Headliners
            </p>
            <h2 className="text-3xl tracking-tight sm:text-4xl">
              Four players setting the tone.
            </h2>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-6">
            A quick look at the names fans are following and players are chasing
            across the biggest batting and bowling numbers.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <LeaderboardCard
            accentClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_18%,var(--color-card)),color-mix(in_oklab,var(--color-card)_76%,var(--color-primary)_24%))]"
            className="animate-stagger-2 lg:col-span-7"
            description="The player piling up the most runs when the games count."
            icon={Trophy}
            leader={data.leaders.highestRunGetter}
            metricLabel="Runs"
            secondaryLabel="Matches"
            title="Leading run scorer"
          />
          <LeaderboardCard
            accentClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent)_18%,var(--color-card)),color-mix(in_oklab,var(--color-card)_76%,var(--color-accent)_24%))]"
            className="animate-stagger-3 lg:col-span-5"
            description="The bowler knocking over batters more than anyone else."
            icon={Target}
            leader={data.leaders.highestWicketTaker}
            metricLabel="Wickets"
            secondaryLabel="Matches"
            title="Leading wicket taker"
          />
          <LeaderboardCard
            accentClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_12%,var(--color-card)),color-mix(in_oklab,var(--color-accent)_16%,var(--color-card)))]"
            className="animate-stagger-3 lg:col-span-5"
            description="The batter making every innings count with the strongest average."
            icon={Zap}
            leader={data.leaders.bestAverageBatter}
            metricLabel="Average"
            secondaryLabel="Innings"
            title="Best batting average"
          />
          <LeaderboardCard
            accentClassName="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent)_10%,var(--color-card)),color-mix(in_oklab,var(--color-primary)_20%,var(--color-card)))]"
            className="animate-stagger-4 lg:col-span-7"
            description="The bowler giving away the fewest runs per over among qualified spell-makers."
            detailLabel="Conceded"
            detailValue={(leader) => String(leader.runsConceded)}
            icon={Shield}
            leader={data.leaders.bestEconomyBowler}
            metricLabel="Economy"
            secondaryLabel="Balls"
            title="Best bowling economy"
          />
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

function SearchResultItem({
  index,
  player,
}: {
  index: number;
  player: StatisticsLandingPlayer;
}) {
  return (
    <Link
      className="group flex items-center justify-between gap-4 border border-foreground/8 bg-background/70 px-4 py-3 transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/18 hover:bg-background"
      params={{
        playerId: String(player.id),
      }}
      to="/statistics/$playerId"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center border border-foreground/10 bg-[color-mix(in_oklab,var(--color-primary)_12%,var(--color-card))] font-semibold text-primary text-sm">
          {String(index + 1).padStart(2, "0")}
        </div>
        <PlayerIdentity player={player} />
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
    </Link>
  );
}

function LeaderboardCard({
  accentClassName,
  className,
  description,
  detailLabel = "Runs",
  detailValue,
  icon: Icon,
  leader,
  metricLabel,
  secondaryLabel,
  title,
}: {
  accentClassName: string;
  className?: string;
  description: string;
  detailLabel?: string;
  detailValue?: (leader: NonNullable<StatisticsLandingLeader>) => string;
  icon: typeof Trophy;
  leader: StatisticsLandingLeader;
  metricLabel: string;
  secondaryLabel: "Balls" | "Innings" | "Matches";
  title: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border border-foreground/10",
        accentClassName,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,transparent_0%,transparent_55%,color-mix(in_oklab,var(--color-foreground)_5%,transparent)_55%,transparent_66%)]" />
      <div className="relative flex h-full flex-col justify-between gap-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
                Leaderboard
              </p>
              <h3 className="font-sans font-semibold text-xl tracking-tight">
                {title}
              </h3>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center border border-foreground/10 bg-background/65">
              <Icon className="size-4 text-primary" />
            </div>
          </div>

          <p className="max-w-xl text-muted-foreground text-sm leading-6">
            {description}
          </p>
        </div>

        {leader ? (
          <Link
            className="group/link flex flex-col gap-5 border border-foreground/10 bg-background/74 px-4 py-4 backdrop-blur-sm transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-foreground/18"
            params={{
              playerId: String(leader.player.id),
            }}
            to="/statistics/$playerId"
          >
            <div className="flex items-start justify-between gap-4">
              <PlayerIdentity player={leader.player} />
              <div className="text-right">
                <p className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.24em]">
                  {metricLabel}
                </p>
                <p className="font-sans font-semibold text-[clamp(2rem,5vw,3.5rem)] text-foreground leading-none tracking-[-0.05em]">
                  {formatMetricValue(leader.metric)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 border-foreground/8 border-t pt-4 sm:grid-cols-3">
              <StatRail
                label={secondaryLabel}
                value={getSecondaryValue(leader, secondaryLabel)}
              />
              <StatRail
                label={detailLabel}
                value={
                  detailValue ? detailValue(leader) : String(leader.runsScored)
                }
              />
              <StatRail label="Wickets" value={String(leader.wicketsTaken)} />
            </div>
          </Link>
        ) : (
          <div className="border border-foreground/15 border-dashed bg-background/70 px-4 py-6 text-muted-foreground text-sm">
            No completed-match data qualifies a leader for this slot yet.
          </div>
        )}
      </div>
    </div>
  );
}

function getSecondaryValue(
  leader: NonNullable<StatisticsLandingLeader>,
  secondaryLabel: "Balls" | "Innings" | "Matches"
) {
  if (secondaryLabel === "Balls") {
    return String(leader.ballsBowled);
  }

  if (secondaryLabel === "Innings") {
    return String(leader.inningsBatted);
  }

  return String(leader.matchesPlayed);
}

function PlayerIdentity({ player }: { player: StatisticsLandingPlayer }) {
  const playerImageUrl = getProfileImageUrl(player.image);
  const meta = getPlayerMeta(player);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {playerImageUrl ? (
        <img
          alt={player.name}
          className="size-11 shrink-0 border border-foreground/10 object-cover"
          height={44}
          src={playerImageUrl}
          width={44}
        />
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center border border-foreground/10 bg-[color-mix(in_oklab,var(--color-primary)_10%,var(--color-card))] font-semibold text-primary text-sm">
          {getInitials(player.name)}
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <p className="truncate font-sans font-semibold text-base tracking-tight">
          {player.name}
        </p>
        <p className="truncate text-muted-foreground text-xs uppercase tracking-[0.18em]">
          {meta.length > 0 ? meta.join(" • ") : "Player profile"}
        </p>
      </div>
    </div>
  );
}

function StatRail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.64rem] text-muted-foreground uppercase tracking-[0.22em]">
        {label}
      </p>
      <p className="font-sans font-semibold text-sm tracking-tight">{value}</p>
    </div>
  );
}

function StatisticsLandingSkeleton() {
  return (
    <PageShell className="hero-surface" maxWidth="wide">
      <section className="overflow-hidden border border-foreground/10 bg-card">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)] lg:px-10 lg:py-12">
          <div className="space-y-6">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-24 w-full max-w-3xl" />
            <Skeleton className="h-16 w-full max-w-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton
                  className="h-24 w-full"
                  key={`statistics-hero-marker-${String(index)}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-4 border border-foreground/10 bg-background/88 p-5 sm:p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-14 w-full" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                className="h-20 w-full"
                key={`statistics-search-row-${String(index)}`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 w-full lg:col-span-7" />
        <Skeleton className="h-80 w-full lg:col-span-5" />
        <Skeleton className="h-72 w-full lg:col-span-5" />
        <Skeleton className="h-72 w-full lg:col-span-7" />
      </div>
    </PageShell>
  );
}
