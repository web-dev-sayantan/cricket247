import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowLeft, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const RECENT_FORM_JOINER = " • ";

export const Route = createFileRoute("/teams/$teamId/stats")({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamId } = Route.useParams();
  const parsedTeamId = Number(teamId);

  const { data, isLoading } = useQuery(
    orpc.getTeamStatsById.queryOptions({
      input: parsedTeamId,
    })
  );

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <p className="text-center text-muted-foreground" role="alert">
          Invalid team id.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return <TeamStatsSkeleton />;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-6">
        <Link to="/teams">
          <Button size="sm" variant="outline">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Back to Teams
          </Button>
        </Link>
        <output className="mt-8 block text-center text-muted-foreground">
          Team stats not found.
        </output>
      </main>
    );
  }

  const recentForm = data.career?.recentForm?.length
    ? data.career.recentForm.join(RECENT_FORM_JOINER)
    : "—";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:space-y-10 md:px-6">
      {/* Page header */}
      <header className="space-y-4">
        <nav aria-label="Breadcrumb">
          <Link to="/teams">
            <Button
              className="transition-transform duration-200 hover:-translate-x-0.5"
              size="sm"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
              Back to Teams
            </Button>
          </Link>
        </nav>
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
            {data.team.name}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            #{data.team.id} • {data.team.shortName}
          </p>
        </div>
      </header>

      {/* Match Record */}
      <section aria-labelledby="match-record-heading" className="space-y-4">
        <SectionHeading
          icon={<History aria-hidden="true" className="h-5 w-5" />}
          id="match-record-heading"
          title="Match Record"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Played" value={data.career?.matchesPlayed ?? 0} />
          <MetricCard label="Won" value={data.career?.matchesWon ?? 0} />
          <MetricCard label="Lost" value={data.career?.matchesLost ?? 0} />
          <MetricCard label="Tied" value={data.career?.matchesTied ?? 0} />
          <MetricCard label="Drawn" value={data.career?.matchesDrawn ?? 0} />
          <MetricCard
            label="Abandoned"
            value={data.career?.matchesAbandoned ?? 0}
          />
        </div>
      </section>

      {/* Performance Overview */}
      <section aria-labelledby="performance-heading" className="space-y-4">
        <SectionHeading
          icon={<Trophy aria-hidden="true" className="h-5 w-5" />}
          id="performance-heading"
          title="Performance"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Points" value={data.career?.points ?? 0} />
          <MetricCard
            label="Win %"
            value={`${String(formatDecimal(data.career?.winPercentage ?? 0))}%`}
          />
          <MetricCard
            label="Net Run Rate"
            value={formatDecimal(data.career?.netRunRate ?? 0)}
          />
          <MetricCard
            highlight
            label="Trophies"
            value={data.career?.trophiesWon ?? 0}
          />
        </div>
      </section>

      {/* Batting & Bowling */}
      <section aria-labelledby="bat-bowl-heading" className="space-y-4">
        <SectionHeading
          icon={<Activity aria-hidden="true" className="h-5 w-5" />}
          id="bat-bowl-heading"
          title="Batting & Bowling"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Runs Scored"
            value={data.career?.runsScored ?? 0}
          />
          <MetricCard
            label="Runs Conceded"
            value={data.career?.runsConceded ?? 0}
          />
          <MetricCard
            label="Balls Faced"
            value={data.career?.ballsFaced ?? 0}
          />
          <MetricCard
            label="Balls Bowled"
            value={data.career?.ballsBowled ?? 0}
          />
        </div>
      </section>

      {/* Recent Form & Tournament History side-by-side */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col transition-shadow duration-300 hover:shadow-md">
          <CardHeader>
            <CardTitle>Recent Form</CardTitle>
            <CardDescription>Last 5 matches</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center py-6">
            <p className="font-bold text-2xl tracking-widest">{recentForm}</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col transition-shadow duration-300 hover:shadow-md">
          <CardHeader>
            <CardTitle>Tournament History</CardTitle>
            <CardDescription>Across all competitions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {data.tournaments.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-muted-foreground text-sm">
                  No tournament stats yet.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {data.tournaments.map((entry) => (
                  <li
                    className="flex flex-col justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40 sm:flex-row sm:items-center"
                    key={entry.id}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold text-sm">
                        {entry.tournament?.name ??
                          `Tournament #${String(entry.tournamentId)}`}
                      </p>
                      <p className="flex flex-wrap gap-x-2 text-muted-foreground text-xs">
                        <span title="Played">P {entry.matchesPlayed}</span>
                        <span title="Won">W {entry.matchesWon}</span>
                        <span title="Lost">L {entry.matchesLost}</span>
                        <span title="Tied">T {entry.matchesTied}</span>
                        <span title="Drawn">D {entry.matchesDrawn}</span>
                        <span title="Abandoned">
                          A {entry.matchesAbandoned}
                        </span>
                      </p>
                    </div>
                    <dl className="flex shrink-0 items-center gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-muted-foreground text-xs">Pts</dt>
                        <dd className="font-semibold">{entry.points}</dd>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-muted-foreground text-xs">NRR</dt>
                        <dd className="font-medium">
                          {formatDecimal(entry.netRunRate)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function SectionHeading({
  id,
  icon,
  title,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="font-semibold text-lg tracking-tight md:text-xl" id={id}>
        {title}
      </h2>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? "border-primary/30 bg-primary/5" : ""
      }`}
    >
      <CardHeader className="pb-1">
        <CardTitle
          className={`font-medium text-xs uppercase tracking-wider ${
            highlight ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`truncate font-bold text-2xl tabular-nums ${
            highlight ? "text-primary" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function TeamStatsSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading team statistics"
      className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:space-y-10 md:px-6"
    >
      {/* Header skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Stat sections skeleton */}
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <div
          className="space-y-4"
          key={`section-skeleton-${String(sectionIdx)}`}
        >
          <Skeleton className="h-7 w-44" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, cardIdx) => (
              <Skeleton
                className="h-24 w-full"
                key={`card-skeleton-${String(sectionIdx)}-${String(cardIdx)}`}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Bottom cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </main>
  );
}

function formatDecimal(value: number): number {
  return Number(value.toFixed(2));
}
