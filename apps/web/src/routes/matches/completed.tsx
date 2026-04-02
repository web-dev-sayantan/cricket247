import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  History,
  PlusIcon,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match-card";
import { buttonVariants } from "@/components/ui/button";
import { formatWeekdayMonthDayYear } from "@/lib/date";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/completed")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: completedMatches = [], isLoading } = useQuery(
    orpc.completedMatches.queryOptions()
  );
  const latestMatchDate = completedMatches[0]?.matchDate;

  return (
    <PageShell className="selection:bg-primary/20">
      <PageHeader
        actions={
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "w-full sm:w-auto"
            )}
            to="/matches"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Live Matches
          </Link>
        }
        description="View past match results and statistics"
        headingClassName="font-normal font-serif text-4xl lg:text-5xl"
        title="Completed Matches"
      />

      <div className="space-y-8 sm:space-y-10">
        <section className="angled-cut relative overflow-hidden border border-primary/25 bg-linear-to-br from-primary/10 via-primary/5 to-background px-4 py-6 sm:px-6 sm:py-8">
          <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-12 size-40 rounded-full bg-chart-3/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-3 py-1 font-medium text-primary text-xs">
                <History className="size-3.5" />
                Match archive
              </div>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Revisit every completed match, review scorecards, and track team
                progress from one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-1 xl:grid-cols-3">
              <div className="angled-cut border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
                <p className="text-muted-foreground text-xs">Total Matches</p>
                <div className="mt-2 flex items-center gap-2">
                  <Trophy className="size-4 text-primary" />
                  <p className="font-bold text-2xl leading-none">
                    {completedMatches.length}
                  </p>
                </div>
              </div>

              <div className="angled-cut border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <p className="font-semibold text-sm">Finalized Results</p>
                </div>
              </div>

              <div className="angled-cut border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
                <p className="text-muted-foreground text-xs">Latest Match</p>
                <div className="mt-2 flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  <p className="line-clamp-1 font-medium text-sm">
                    {latestMatchDate
                      ? formatWeekdayMonthDayYear(latestMatchDate)
                      : "No data yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link className="group" to="/matches">
            <div className="angled-cut inline-flex w-full bg-border/70 p-px transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary/35 group-hover:shadow-md">
              <div className="angled-cut flex min-h-24 w-full items-center justify-between bg-card/60 p-4 backdrop-blur-sm">
                <div>
                  <p className="font-semibold text-base">
                    Back to Live Matches
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Continue scoring active games
                  </p>
                </div>
                <ArrowLeft className="size-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
              </div>
            </div>
          </Link>

          <Link className="group" to="/matches/create-match">
            <div className="angled-cut inline-flex w-full bg-primary/40 p-px text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary/55 group-hover:shadow-md">
              <div className="angled-cut flex min-h-24 w-full items-center justify-between bg-primary/10 p-4">
                <div>
                  <p className="font-semibold text-base">Create a New Match</p>
                  <p className="text-primary/80 text-sm">
                    Start fresh and score in real time
                  </p>
                </div>
                <div className="angled-cut bg-primary p-2 text-primary-foreground transition-transform duration-300 group-hover:scale-105">
                  <PlusIcon className="size-4" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        <section>
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="animate-pulse font-medium text-muted-foreground">
                Loading completed matches...
              </p>
            </div>
          )}

          {!isLoading && completedMatches.length === 0 && (
            <div className="angled-cut mx-auto mt-4 flex max-w-2xl flex-col items-center justify-center gap-6 border border-border/60 border-dashed bg-muted/10 px-4 py-20 text-center">
              <div className="angled-cut mb-2 bg-primary/10 p-6 ring-8 ring-primary/5">
                <History className="size-10 text-primary opacity-80" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-2xl tracking-tight">
                  No Completed Matches Yet
                </p>
                <p className="mx-auto max-w-sm text-base text-muted-foreground">
                  Completed match scorecards will show up here once your live
                  games are finished.
                </p>
              </div>
              <Link
                className="angled-cut group mt-4 inline-flex bg-primary/40 p-px shadow-sm transition-all hover:shadow-md active:scale-95"
                to="/matches/create-match"
              >
                <span
                  className={cn(
                    buttonVariants(),
                    "angled-cut h-12 border-transparent bg-primary px-8 font-semibold text-base"
                  )}
                >
                  <PlusIcon className="mr-2 size-5" />
                  Start a Match
                </span>
              </Link>
            </div>
          )}

          {!isLoading && completedMatches.length > 0 && (
            <div className="flex flex-col gap-5">
              <div className="fade-in slide-in-from-left-4 flex animate-in items-center justify-between gap-3 fill-mode-both pb-2 delay-150 duration-500">
                <h2 className="font-bold text-2xl tracking-tight">
                  Recent Results
                </h2>
                <span className="inline-flex items-center gap-1 font-medium text-muted-foreground text-sm">
                  View details
                  <ArrowUpRight className="size-4" />
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {completedMatches.map((match, index) => (
                  <div
                    className="fade-in zoom-in-95 animate-in fill-mode-both duration-500"
                    key={match.id}
                    style={{ animationDelay: `${(index + 1) * 120}ms` }}
                  >
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
