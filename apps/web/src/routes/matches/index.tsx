import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, HistoryIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: liveMatches = [], isLoading } = useQuery(
    orpc.liveMatches.queryOptions()
  );

  return (
    <PageShell className="selection:bg-primary/20">
      <PageHeader
        description="Watch cricket matches in real-time"
        headingClassName="font-extrabold text-4xl lg:text-5xl"
        title="Live Matches"
      />

      <div className="space-y-8 sm:space-y-10">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link className="group" to="/matches/create-match">
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-primary backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary p-2.5 text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/90">
                  <PlusIcon className="relative z-10 size-5" />
                </div>
                <span className="font-bold text-base tracking-wide">
                  Create Match
                </span>
              </div>
            </div>
          </Link>
          <Link className="group" to="/matches/completed">
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border/80 hover:bg-card hover:shadow-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-secondary/80">
                  <HistoryIcon className="relative z-10 size-5" />
                </div>
                <span className="font-bold text-base text-foreground tracking-wide">
                  Completed Matches
                </span>
              </div>
            </div>
          </Link>
        </section>

        <section>
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="animate-pulse font-medium text-muted-foreground">
                Loading matches...
              </p>
            </div>
          )}

          {!isLoading && liveMatches.length === 0 && (
            <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center justify-center gap-6 rounded-3xl border border-border/60 border-dashed bg-muted/10 px-4 py-20 text-center">
              <div className="mb-2 rounded-full bg-primary/10 p-6 ring-8 ring-primary/5">
                <Activity className="size-10 text-primary opacity-80" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-2xl tracking-tight">
                  No Live Matches
                </p>
                <p className="mx-auto max-w-sm text-base text-muted-foreground">
                  You don't have any ongoing matches right now. Create a new one
                  to get started.
                </p>
              </div>
              <Link
                className={cn(
                  buttonVariants({
                    className:
                      "mt-4 h-12 rounded-full px-8 font-semibold text-base shadow-sm transition-all hover:shadow-md active:scale-95",
                  })
                )}
                to="/matches/create-match"
              >
                <PlusIcon className="mr-2 size-5" />
                Start a Match
              </Link>
            </div>
          )}

          {!isLoading && liveMatches.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="fade-in slide-in-from-left-4 flex animate-in items-center gap-3 fill-mode-both pb-2 delay-150 duration-500">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <h2 className="font-bold text-2xl tracking-tight">
                  Happening Now
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {liveMatches.map((match, index) => (
                  <div
                    className="fade-in zoom-in-95 animate-in fill-mode-both duration-500"
                    key={match.id}
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
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
