import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { ActionPanel } from "@/components/dashboard/action-panel";
import { MatchCard } from "@/components/dashboard/match-card";
import { SectionScroll } from "@/components/dashboard/section-scroll";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

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

    const onboardingStatus = await client.onboardingStatus();
    if (
      onboardingStatus.shouldPrompt &&
      onboardingStatus.onboardingCompletedAt === null
    ) {
      redirect({
        to: "/onboarding",
        search: {
          from: "/dashboard",
        },
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
    <PageShell className="overflow-x-hidden selection:bg-primary/20">
      <PageHeader
        description={`Welcome back, ${session.data?.user.name ?? "there"}`}
        headingClassName="font-extrabold text-4xl lg:text-5xl"
        title="Dashboard"
      />

      <div className="space-y-8 sm:space-y-10">
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
              <div className="group relative flex min-h-52 w-[clamp(16rem,82vw,22rem)] shrink-0 snap-center flex-col items-center justify-center rounded-xl border-2 border-border/40 border-dashed bg-card/20">
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

        {liveTournaments.length > 0 && (
          <SectionScroll title="Live Tournaments">
            {liveTournaments.map((tournament) => (
              <TournamentCard
                endDate={tournament.endDate}
                format={tournament.type}
                id={tournament.id}
                key={tournament.id}
                name={tournament.name}
                startDate={tournament.startDate}
              />
            ))}
          </SectionScroll>
        )}

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

        <ActionPanel />
      </div>
    </PageShell>
  );
}

function DashboardSkeleton() {
  return (
    <PageShell className="overflow-x-hidden selection:bg-primary/20">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
        <Skeleton className="h-6 w-3/4 max-w-sm md:h-7" />
      </div>

      <div className="space-y-8 sm:space-y-10">
        <SectionScroll title="Live Matches">
          {["live-1", "live-2", "live-3"].map((key) => (
            <Skeleton
              className="h-52 w-[clamp(16rem,82vw,22rem)] shrink-0 snap-center rounded-xl bg-card/50"
              key={key}
            />
          ))}
        </SectionScroll>

        <SectionScroll title="Live Tournaments">
          {["tourney-1", "tourney-2", "tourney-3"].map((key) => (
            <Skeleton
              className="h-47 w-[clamp(16rem,82vw,20rem)] shrink-0 snap-center rounded-xl bg-card/50"
              key={key}
            />
          ))}
        </SectionScroll>

        <SectionScroll title="Recently Concluded">
          {["recent-1", "recent-2", "recent-3"].map((key) => (
            <Skeleton
              className="h-52 w-[clamp(16rem,82vw,22rem)] shrink-0 snap-center rounded-xl bg-card/50"
              key={key}
            />
          ))}
        </SectionScroll>

        <Skeleton className="h-35 w-full rounded-xl bg-card/50" />
      </div>
    </PageShell>
  );
}
