import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, SwordsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/matches/$matchId/score")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { matchId } = params;
    const { orpc } = context;

    const match = await orpc.getMatchById.call(+matchId);
    return { match };
  },
});

function RouteComponent() {
  const { matchId } = Route.useParams();
  const { match } = Route.useLoaderData();

  if (!match) {
    return (
      <main className="m-auto flex size-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="font-semibold text-2xl">Match not found</h1>
        <p className="text-muted-foreground">
          The requested match could not be loaded.
        </p>
        <Button>
          <Link to="/matches">
            <ArrowLeftIcon />
            Back to Matches
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="m-auto flex size-full flex-col gap-3 p-4 lg:w-1/2">
      <div className="mb-4 flex flex-col items-center justify-between gap-2">
        <div className="w-full flex-center gap-2 rounded-lg border bg-cover! bg-gradient p-3">
          <h1 className="font-bold text-sm">{match.team1.name}</h1>{" "}
          <SwordsIcon />
          <h1 className="font-bold text-sm">{match.team2.name}</h1>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Scoring Console</h2>
          <p className="text-muted-foreground text-sm">
            Live scoring is being prepared for this match view.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            <Link params={{ matchId }} to="/matches/$matchId/scorecard">
              View Scorecard
            </Link>
          </Button>
          <Button size="sm" variant="ghost">
            <Link to="/matches">
              <ArrowLeftIcon />
              Back
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
