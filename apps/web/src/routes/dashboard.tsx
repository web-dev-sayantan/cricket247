import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { ActionPanel } from "@/components/dashboard/action-panel";
import { MatchCard } from "@/components/dashboard/match-card";
import { SectionScroll } from "@/components/dashboard/section-scroll";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
  pendingComponent: DashboardSkeleton,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }

    return { session };
  },
});

function DashboardComponent() {
  const { session } = Route.useRouteContext();

  // Fetch data
  const { data: liveMatches } = useSuspenseQuery(
    orpc.liveMatches.queryOptions()
  );
  const { data: liveTournaments } = useSuspenseQuery(
    orpc.liveTournaments.queryOptions()
  );
  const { data: completedMatches } = useSuspenseQuery(
    orpc.completedMatches.queryOptions()
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24 selection:bg-primary/20">
      <header className="px-4 py-8 md:px-8 md:py-10">
        <h1 className="font-extrabold text-4xl tracking-tight lg:text-5xl">
          Dashboard
        </h1>
        <p className="mt-2 font-medium text-lg text-muted-foreground/80 tracking-tight">
          Welcome back, {session.data?.user.name}
        </p>
      </header>

      <main className="space-y-12">
        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <SectionScroll title="Live Matches">
            {liveMatches.map((match) => (
              <MatchCard
                id={match.id}
                isLive={true}
                key={match.id}
                matchDate={match.matchDate}
                score={`${match.innings.find((i) => i.inningsNumber === 1)?.totalScore || 0}/${match.innings.find((i) => i.inningsNumber === 1)?.wickets || 0}`}
                status={match.result || "In Progress"}
                team1={match.team1}
                team2={match.team2}
              />
            ))}

            {liveMatches.length === 1 && (
              <div className="group relative flex min-h-[212px] w-[85vw] max-w-[320px] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 border-border/40 border-dashed bg-card/20 md:max-w-[350px]">
                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/60 transition-transform duration-500 ease-in-out group-hover:translate-x-2">
                  <ArrowRightIcon className="h-10 w-10 animate-pulse duration-2000" />
                  <span className="font-medium text-sm uppercase tracking-wide">
                    No more matches live
                  </span>
                </div>
              </div>
            )}
          </SectionScroll>
        )}

        {/* Live Tournaments */}
        {liveTournaments.length > 0 && (
          <SectionScroll title="Live Tournaments">
            {liveTournaments.map((tournament) => (
              <TournamentCard
                endDate={tournament.endDate}
                format={tournament.format}
                id={tournament.id}
                key={tournament.id}
                name={tournament.name}
                startDate={tournament.startDate}
              />
            ))}
          </SectionScroll>
        )}

        {/* Recently Concluded Matches */}
        {completedMatches.length > 0 && (
          <SectionScroll title="Recently Concluded">
            {completedMatches.map((match) => (
              <MatchCard
                id={match.id}
                isLive={false}
                key={match.id}
                matchDate={match.matchDate}
                score={`${match.innings.find((i) => i.inningsNumber === 1)?.totalScore || 0}/${match.innings.find((i) => i.inningsNumber === 1)?.wickets || 0}`}
                status={match.result || "Completed"}
                team1={match.team1}
                team2={match.team2}
              />
            ))}
          </SectionScroll>
        )}

        {/* Action Panel */}
        <ActionPanel />
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24 selection:bg-primary/20">
      <header className="px-4 py-8 md:px-8 md:py-10">
        <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
        <Skeleton className="mt-3 h-6 w-3/4 max-w-sm md:h-7" />
      </header>

      <main className="space-y-12">
        <SectionScroll title="Live Matches">
          {["live-1", "live-2", "live-3"].map((key) => (
            <Skeleton
              className="h-[212px] w-[85vw] max-w-[320px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[350px]"
              key={key}
            />
          ))}
        </SectionScroll>

        <SectionScroll title="Live Tournaments">
          {["tourney-1", "tourney-2", "tourney-3"].map((key) => (
            <Skeleton
              className="h-[188px] w-[85vw] max-w-[300px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[320px]"
              key={key}
            />
          ))}
        </SectionScroll>

        <SectionScroll title="Recently Concluded">
          {["recent-1", "recent-2", "recent-3"].map((key) => (
            <Skeleton
              className="h-[212px] w-[85vw] max-w-[320px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[350px]"
              key={key}
            />
          ))}
        </SectionScroll>

        <div className="px-4 md:px-8">
          <Skeleton className="h-[140px] w-full rounded-xl bg-card/50" />
        </div>
      </main>
    </div>
  );
}
