import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { MatchCard } from "@/components/dashboard/match-card";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { SectionScroll } from "@/components/dashboard/section-scroll";
import { ActionPanel } from "@/components/dashboard/action-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon } from "lucide-react";

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
  const { data: liveMatches } = useSuspenseQuery(orpc.liveMatches.queryOptions());
  const { data: liveTournaments } = useSuspenseQuery(orpc.liveTournaments.queryOptions());
  const { data: completedMatches } = useSuspenseQuery(orpc.completedMatches.queryOptions());

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-24 selection:bg-primary/20">
      <header className="px-4 py-8 md:px-8 md:py-10">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground/80 font-medium tracking-tight">
          Welcome back, {session.data?.user.name}
        </p>
      </header>
      
      <main className="space-y-12">
        {/* Live Matches */}
        {liveMatches.length > 0 && (
            <SectionScroll title="Live Matches">
                {liveMatches.map((match) => (
                    <MatchCard
                        key={match.id}
                        id={match.id}
                        team1={match.team1}
                        team2={match.team2}
                        status={match.result || "In Progress"}
                        isLive={true}
                        score={`${match.innings.find(i => i.inningsNumber === 1)?.totalScore || 0}/${match.innings.find(i => i.inningsNumber === 1)?.wickets || 0}`} 
                        matchDate={match.matchDate}
                  />
                ))}
                
                {liveMatches.length === 1 && (
                  <div className="group relative flex w-[85vw] max-w-[320px] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-card/20 md:max-w-[350px] min-h-[212px]">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/60 transition-transform duration-500 ease-in-out group-hover:translate-x-2">
                       <ArrowRightIcon className="h-10 w-10 animate-pulse duration-2000" />
                       <span className="text-sm font-medium tracking-wide uppercase">No more matches live</span>
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
                        key={tournament.id}
                        id={tournament.id}
                        name={tournament.name}
                        startDate={tournament.startDate}
                        endDate={tournament.endDate}
                        format={tournament.format}
                    />
                ))}
             </SectionScroll>
        )}

        {/* Recently Concluded Matches */}
        {completedMatches.length > 0 && (
             <SectionScroll title="Recently Concluded">
                {completedMatches.map((match) => (
                    <MatchCard
                        key={match.id}
                        id={match.id}
                        team1={match.team1}
                        team2={match.team2}
                        status={match.result || "Completed"}
                        isLive={false}
                         score={`${match.innings.find(i => i.inningsNumber === 1)?.totalScore || 0}/${match.innings.find(i => i.inningsNumber === 1)?.wickets || 0}`}
                         matchDate={match.matchDate}
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`live-${i}`} className="h-[212px] w-[85vw] max-w-[320px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[350px]" />
          ))}
        </SectionScroll>

        <SectionScroll title="Live Tournaments">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`tourney-${i}`} className="h-[188px] w-[85vw] max-w-[300px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[320px]" />
          ))}
        </SectionScroll>

        <SectionScroll title="Recently Concluded">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`recent-${i}`} className="h-[212px] w-[85vw] max-w-[320px] shrink-0 snap-center rounded-xl bg-card/50 md:max-w-[350px]" />
          ))}
        </SectionScroll>

        <div className="px-4 md:px-8">
           <Skeleton className="h-[140px] w-full rounded-xl bg-card/50" />
        </div>
      </main>
    </div>
  );
}
