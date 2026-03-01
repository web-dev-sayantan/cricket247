import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { MatchCard } from "@/components/match-card";
import { buttonVariants } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/completed")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: completedMatches = [], isLoading } = useQuery(
    orpc.completedMatches.queryOptions()
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            to="/matches"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Live Matches
          </Link>
        }
        description="View past match results and statistics"
        title="Completed Matches"
      />

      <section>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading matches...</div>
          </div>
        )}

        {!isLoading && completedMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="text-muted-foreground">
              <svg
                className="mx-auto mb-4 size-16 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <title>No matches</title>
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="font-medium text-base">No completed matches</p>
              <p className="text-sm">Completed matches will appear here</p>
            </div>
          </div>
        )}

        {!isLoading && completedMatches.length > 0 && (
          <div className="flex flex-col gap-3">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
