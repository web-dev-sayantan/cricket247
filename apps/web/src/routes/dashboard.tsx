import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { MatchCard } from "@/components/dashboard/match-card";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { SectionScroll } from "@/components/dashboard/section-scroll";
import { ActionPanel } from "@/components/dashboard/action-panel";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
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
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/20">
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
