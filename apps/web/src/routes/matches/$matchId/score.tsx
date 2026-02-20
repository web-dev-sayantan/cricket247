import { createFileRoute } from "@tanstack/react-router";
import { SwordsIcon } from "lucide-react";
import ScoreABall from "@/routes/matches/$matchId/-components/score-a-ball";

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
  return (
    <main className="m-auto flex size-full flex-col gap-3 p-4 lg:w-1/2">
      <div className="mb-4 flex flex-col items-center justify-between gap-2">
        <div className="w-full flex-center gap-2 rounded-lg border bg-cover! bg-gradient p-3">
          <h1 className="font-bold text-sm">{match.team1.name}</h1>{" "}
          <SwordsIcon />
          <h1 className="font-bold text-sm">{match.team2.name}</h1>
        </div>
      </div>
      <div className="flex-center justify-between gap-3">
        <div className="flex items-baseline gap-x-2">
          <h1 className="text-center font-bold text-sm">
            {match.team1.shortName}:
          </h1>
          <p className="flex items-center gap-1 text-xl">
            <span className="font-bold">{innings.totalScore}</span>
            <span> / </span>
            <span className="font-bold text-red-500">{innings.wickets}</span>
          </p>
          <p className="flex items-baseline gap-1">
            <span className="text-muted-foreground">in</span>
            <span className="font-bold">
              {Math.floor(innings.ballsBowled / 6)}.{innings.ballsBowled % 6}
            </span>
            <span className="text-muted-foreground"> overs</span>
          </p>
        </div>
        <div className="flex-center">
          <Link href={`/play/matches/${matchId}/${inningsId}/scorecard`}>
            <Button size={"sm"} variant={"outline"}>
              Innings
            </Button>
          </Link>
          <Refresh onRefresh={revalidateGivenPath} />
        </div>
      </div>
      {ball && (
        <ScoreABall
          ball={ball}
          bowlingTeamId={match.team2Id}
          bowlingTeamPlayers={bowlingTeamPlayers}
          hasBoundaryOut={match.hasBoundaryOut}
          hasBye={match.hasBye}
          hasLBW={match.hasLBW}
          hasLegBye={match.hasLegBye}
          innings={innings}
          onSaveBallData={saveBallData}
          otherBalls={otherBalls}
        />
      )}
    </main>
  );
}
