import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <p className="text-muted-foreground">Invalid team id.</p>
      </div>
    );
  }

  if (isLoading) {
    return <TeamStatsSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-6">
        <Link to="/teams">
          <Button size="sm" variant="outline">
            <ArrowLeft />
            Back to Teams
          </Button>
        </Link>
        <p className="text-muted-foreground">Team stats not found.</p>
      </div>
    );
  }

  const recentForm = data.career?.recentForm?.join(RECENT_FORM_JOINER) ?? "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <Link to="/teams">
          <Button size="sm" variant="outline">
            <ArrowLeft />
            Back to Teams
          </Button>
        </Link>
        <h1 className="font-semibold text-2xl md:text-3xl">
          {data.team.name} stats
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Team #{data.team.id} • {data.team.shortName}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Matches" value={data.career?.matchesPlayed ?? 0} />
        <MetricCard label="Won" value={data.career?.matchesWon ?? 0} />
        <MetricCard label="Lost" value={data.career?.matchesLost ?? 0} />
        <MetricCard label="Trophies" value={data.career?.trophiesWon ?? 0} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Tied" value={data.career?.matchesTied ?? 0} />
        <MetricCard label="Drawn" value={data.career?.matchesDrawn ?? 0} />
        <MetricCard
          label="Abandoned/NR"
          value={data.career?.matchesAbandoned ?? 0}
        />
        <MetricCard label="Points" value={data.career?.points ?? 0} />
        <MetricCard
          label="Win %"
          value={formatDecimal(data.career?.winPercentage ?? 0)}
        />
        <MetricCard
          label="Net RR"
          value={formatDecimal(data.career?.netRunRate ?? 0)}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Runs Scored" value={data.career?.runsScored ?? 0} />
        <MetricCard
          label="Runs Conceded"
          value={data.career?.runsConceded ?? 0}
        />
        <MetricCard label="Balls Faced" value={data.career?.ballsFaced ?? 0} />
        <MetricCard
          label="Balls Bowled"
          value={data.career?.ballsBowled ?? 0}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent form (last 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium text-lg">{recentForm}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tournament stats</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tournaments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No tournament stats yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.tournaments.map((entry) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  key={entry.id}
                >
                  <div>
                    <p className="font-medium">
                      {entry.tournament?.name ??
                        `Tournament #${String(entry.tournamentId)}`}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      P {entry.matchesPlayed} • W {entry.matchesWon} • L{" "}
                      {entry.matchesLost} • T {entry.matchesTied} • D{" "}
                      {entry.matchesDrawn} • A {entry.matchesAbandoned}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p>Pts: {entry.points}</p>
                    <p>NRR: {formatDecimal(entry.netRunRate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function TeamStatsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-5 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            className="h-28 w-full"
            key={`stats-skeleton-${String(index)}`}
          />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function formatDecimal(value: number): number {
  return Number(value.toFixed(2));
}
