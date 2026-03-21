import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: liveMatches, isLoading: matchesLoading } = useQuery(
    orpc.liveMatches.queryOptions()
  );

  const heroMatch = liveMatches?.[0] ?? null;
  const heroInn1 = heroMatch?.innings.find((i) => i.inningsNumber === 1);
  const heroInn2 = heroMatch?.innings.find((i) => i.inningsNumber === 2);

  return (
    <div className="hero-surface overflow-x-hidden">
      <main
        className="mx-auto w-full max-w-7xl space-y-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
        id="main-content"
      >
        {/* ── HERO ── */}
        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16"
        >
          <div className="relative z-10 animate-stagger-1 space-y-8">
            <div className="angled-cut inline-flex w-fit items-center gap-3 border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-bold text-red-500 text-xs uppercase tracking-widest shadow-[0_0_12px_rgba(239,68,68,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live Scores
            </div>

            <div className="space-y-5">
              <h1
                className="text-balance font-extrabold font-serif text-5xl text-foreground leading-[1.05] tracking-tight drop-shadow-sm sm:text-6xl lg:text-7xl"
                id="hero-title"
              >
                Every Ball.{" "}
                <span className="relative z-10 inline-block text-primary italic">
                  Every Boundary.
                  <span className="slanted-wavy absolute -bottom-2 left-0 z-[-1] h-[4px] w-full bg-accent" />
                </span>
                <br />
                Live.
              </h1>
              <p className="max-w-xl font-sans text-lg text-muted-foreground leading-relaxed sm:text-xl">
                Real-time cricket scores, ball-by-ball updates, and complete
                scorecards — for every match in your tournament.
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "angled-cut h-14 px-8 text-base shadow-[0_0_20px_rgba(var(--color-primary)/0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(var(--color-primary)/0.5)]"
                )}
                to="/matches"
              >
                View Live Scores
                <Activity className="ml-2 size-4" />
              </Link>
              <Link
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "angled-cut h-14 border-border/50 bg-background/50 px-8 text-base transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
                )}
                to="/tournaments"
              >
                Explore Tournaments
              </Link>
            </div>
          </div>

          {/* Live score panel */}
          <figure className="group relative aspect-4/5 w-full animate-stagger-2">
            <div className="angled-cut-br absolute inset-0 z-0 translate-x-4 translate-y-4 bg-primary/20 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6" />
            <div className="angled-cut-br relative z-10 h-full w-full overflow-hidden border-2 border-foreground/10 bg-black/40">
              <img
                alt="A packed cricket stadium at dusk"
                className="h-full w-full object-cover opacity-80 mix-blend-overlay contrast-125 saturate-150 filter transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
                height={1200}
                loading="lazy"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIvdMNfmHQmC-njsrK454hNGBMEWD0lG1m1x-7ZfGW1UUjsp3gNhpDuYd0wXtuuLg-YrDi80WeB9d92yxWg75IfE6wthJuSg3xp0NV9IZsKQUaGumjystZMagh6Z_4Pe-fEFNG2-Rt43MOzB3-2Dgda6A9ex95eblMop0NXxy-Q8LtFqQ7l1qbcGMFAo9DlkxmkVNUj3tYN50ZA6pRiMnz6sBut39pYLe7MRZPQmBf7KpabF3EIOccZ59GUnKxnL9hDMGg4181D_4"
                width={960}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

              <figcaption className="absolute inset-x-0 bottom-0 flex items-end p-6">
                <div className="angled-cut w-full border border-border bg-background/85 p-4 shadow-xl backdrop-blur-md">
                  <HeroScoreOverlay
                    heroInn1Score={
                      heroInn1
                        ? `${heroInn1.totalScore || 0}/${heroInn1.wickets || 0}`
                        : null
                    }
                    heroInn2Score={
                      heroInn2
                        ? `${heroInn2.totalScore || 0}/${heroInn2.wickets || 0}`
                        : null
                    }
                    heroMatch={
                      heroMatch
                        ? {
                            result: heroMatch.result ?? null,
                            team1Name: heroMatch.team1.name,
                            team2Name: heroMatch.team2.name,
                          }
                        : null
                    }
                    isLoading={matchesLoading}
                  />
                </div>
              </figcaption>
            </div>
          </figure>
        </section>

        {/* ── HAPPENING NOW ── */}
        {(matchesLoading || (liveMatches && liveMatches.length > 0)) && (
          <section
            aria-labelledby="live-title"
            className="animate-stagger-3 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <h2
                  className="font-bold font-serif text-3xl text-foreground sm:text-4xl"
                  id="live-title"
                >
                  Happening Now
                </h2>
              </div>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-muted-foreground hover:text-foreground"
                )}
                to="/matches"
              >
                All matches{" "}
                <ArrowRight aria-hidden="true" className="ml-1.5 size-3.5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matchesLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                    <MatchSkeleton key={i} />
                  ))
                : liveMatches?.map((match) => {
                    const latestInnings = match.innings
                      .slice()
                      .sort((a, b) => b.inningsNumber - a.inningsNumber)[0];
                    return (
                      <LiveMatchTile
                        id={match.id}
                        inningsScore={
                          latestInnings
                            ? `${latestInnings.totalScore || 0}/${latestInnings.wickets || 0}`
                            : null
                        }
                        key={match.id}
                        status={match.result ?? "In Progress"}
                        team1Name={match.team1.name}
                        team2Name={match.team2.name}
                      />
                    );
                  })}
            </div>
          </section>
        )}

        {/* ── FAN FEATURES ── */}
        <section
          aria-labelledby="features-title"
          className="animate-stagger-3 space-y-12"
        >
          <div className="max-w-2xl space-y-4">
            <h2
              className="font-bold font-serif text-4xl text-foreground tracking-tight sm:text-5xl"
              id="features-title"
            >
              Your Match, <span className="text-primary italic">Your Way</span>
            </h2>
            <p className="font-sans text-lg text-muted-foreground">
              From the opening delivery to the last wicket — everything you need
              to follow every match.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <FanFeatureCard
              description="Every delivery logged the moment it lands — sixes, wickets, wides, and dot balls across all active matches."
              icon={<Activity aria-hidden="true" className="size-6" />}
              title="Ball by Ball"
            />
            <FanFeatureCard
              description="Full innings breakdowns with runs, wickets, extras, partnerships, and economy rates — nothing left out."
              icon={<BarChart3 aria-hidden="true" className="size-6" />}
              title="Full Scorecards"
            />
            <FanFeatureCard
              description="Points tables, net run rate, head-to-head records, and knockout draws — always up-to-date."
              icon={<CalendarDays aria-hidden="true" className="size-6" />}
              title="Tournament Standings"
            />
          </div>
        </section>

        {/* ── WHY ── */}
        <section
          aria-labelledby="why-title"
          className="relative animate-stagger-4 space-y-12"
        >
          <div className="absolute top-10 -left-10 z-0 hidden h-40 w-40 rounded-full bg-accent/10 blur-3xl dark:block" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <h2
              className="font-bold font-serif text-4xl tracking-tight sm:text-5xl"
              id="why-title"
            >
              Stay{" "}
              <span className="text-accent underline decoration-4 decoration-primary underline-offset-8">
                On the Crease
              </span>
            </h2>
            <p className="font-sans text-lg text-muted-foreground">
              Designed for the fan who can't afford to miss a single over.
            </p>
          </div>
          <div className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <WhyCard
              description="Score updates push instantly to every device — no page refresh, no lag, no guessing where the game is at."
              icon={
                <Activity
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Zero Lag"
            />
            <WhyCard
              description="Batting averages, bowling economy, fielding stats — a full century of numbers behind every player."
              icon={
                <Trophy
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Century of Stats"
            />
            <WhyCard
              description="Scorecards designed to be read fast — clean layout, zero clutter, every number exactly where you expect it."
              icon={
                <Users
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Clean Scorecards"
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          aria-labelledby="cta-title"
          className="animate-stagger-4 pt-10"
        >
          <div className="angled-cut-br group relative overflow-hidden border border-primary/30 bg-card p-10 text-center shadow-2xl sm:p-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 transition-opacity group-hover:opacity-40" />
            <div className="absolute top-0 right-0 z-0 h-64 w-64 bg-primary/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 z-0 h-64 w-64 bg-accent/20 blur-3xl" />
            <div className="relative z-10 mx-auto max-w-2xl space-y-6">
              <h2
                className="font-extrabold font-serif text-4xl tracking-tight drop-shadow-md sm:text-5xl"
                id="cta-title"
              >
                The Score Won't Wait.
              </h2>
              <p className="font-sans text-muted-foreground sm:text-xl">
                Dive into live matches, browse full scorecards, and never miss a
                critical over.
              </p>
              <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "angled-cut h-14 px-10 text-base shadow-[0_0_15px_rgba(var(--color-primary)/0.4)] hover:shadow-[0_0_25px_rgba(var(--color-primary)/0.6)]"
                  )}
                  to="/matches"
                >
                  View Live Scores
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "angled-cut h-14 border-border/50 px-10 text-base"
                  )}
                  to="/tournaments"
                >
                  Browse Tournaments
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mt-16 border-border border-t bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <div className="flex flex-col space-y-1">
            <p className="font-bold font-serif text-xl tracking-wide">
              Cricket <span className="text-primary italic">24/7</span>
            </p>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              © 2026 All rights reserved
            </p>
          </div>
          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center justify-center gap-6 font-medium font-sans text-sm uppercase tracking-wide sm:gap-8"
          >
            <Link
              className="font-semibold text-primary transition-colors hover:text-primary/80"
              to="/organize"
            >
              For Organizers →
            </Link>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/privacy"
            >
              Privacy
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/terms"
            >
              Terms
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/support"
            >
              Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function HeroScoreOverlay({
  isLoading,
  heroMatch,
  heroInn1Score,
  heroInn2Score,
}: {
  isLoading: boolean;
  heroMatch: {
    team1Name: string;
    team2Name: string;
    result: string | null;
  } | null;
  heroInn1Score: string | null;
  heroInn2Score: string | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    );
  }
  if (!heroMatch) {
    return (
      <div>
        <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
          No live matches right now
        </p>
        <p className="mt-0.5 font-sans text-muted-foreground text-sm">
          Check back when the next match is underway
        </p>
      </div>
    );
  }
  const currentScore = heroInn2Score ?? heroInn1Score ?? "0/0";
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-2 font-bold text-[10px] text-red-500 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Live
        </p>
        <p className="truncate font-semibold font-serif text-base text-foreground">
          {heroMatch.team1Name}{" "}
          <span className="mx-1 text-muted-foreground text-sm">vs</span>{" "}
          {heroMatch.team2Name}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold font-mono text-primary text-xl tracking-tighter">
          {currentScore}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          {heroMatch.result ?? "In Progress"}
        </p>
      </div>
    </div>
  );
}

function LiveMatchTile({
  id,
  team1Name,
  team2Name,
  inningsScore,
  status,
}: {
  id: number;
  team1Name: string;
  team2Name: string;
  inningsScore: string | null;
  status: string;
}) {
  return (
    <Link
      className="angled-cut group block border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--color-primary)/0.1)]"
      params={{ matchId: String(id) }}
      to="/matches/$matchId/scorecard"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-bold text-[10px] text-red-500 uppercase tracking-widest">
            Live
          </span>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate font-bold font-serif text-base">
          {team1Name}
        </span>
        <span className="shrink-0 px-2 font-medium text-muted-foreground/70 text-xs">
          vs
        </span>
        <span className="min-w-0 flex-1 truncate text-right font-bold font-serif text-base">
          {team2Name}
        </span>
      </div>

      {inningsScore && (
        <div className="mt-3 flex items-center justify-between border-border/30 border-t pt-3">
          <span className="font-black font-mono text-primary text-xl tracking-tight">
            {inningsScore}
          </span>
          <span className="ml-3 truncate font-medium text-muted-foreground/70 text-xs uppercase tracking-wide">
            {status}
          </span>
        </div>
      )}
    </Link>
  );
}

function MatchSkeleton() {
  return (
    <div className="angled-cut border border-border/40 bg-card/40 p-5">
      <Skeleton className="mb-4 h-3 w-12" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-4 w-6 shrink-0" />
        <Skeleton className="h-5 flex-1" />
      </div>
      <div className="mt-3 flex items-center justify-between border-border/30 border-t pt-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function FanFeatureCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="angled-cut glass-surface group relative space-y-4 overflow-hidden p-6 backdrop-blur-xl transition-colors hover:border-primary/50">
      <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-colors group-hover:bg-primary/20" />
      <div className="angled-cut relative z-10 inline-flex border border-primary/20 bg-primary/10 p-3 text-primary shadow-[0_0_10px_rgba(var(--color-primary)/0.2)]">
        {icon}
      </div>
      <h3 className="relative z-10 font-bold font-serif text-xl">{title}</h3>
      <p className="relative z-10 font-sans text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </article>
  );
}

function WhyCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="angled-cut group border border-border/60 bg-card/60 p-6 backdrop-blur-lg transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(var(--color-accent)/0.15)]">
      <div className="angled-cut mb-4 inline-flex border border-accent/20 bg-accent/10 p-3 text-accent shadow-[0_0_10px_rgba(var(--color-accent)/0.2)] transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-bold font-serif text-xl">{title}</h3>
      <p className="mt-2 font-sans text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </article>
  );
}
