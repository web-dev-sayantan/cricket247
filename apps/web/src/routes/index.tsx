import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SwordsIcon } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: liveMatches } = useSuspenseQuery(
    orpc.liveMatches.queryOptions()
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-lg p-4">
          <h2 className="mb-2 text-center font-medium">Live Matches</h2>
          <div className="flex items-center gap-2">
            <Suspense fallback={<div>Loading...</div>}>
              {liveMatches.map((match) => (
                <div
                  className="flex w-full flex-col items-center justify-center gap-4 rounded-md border p-4"
                  key={match.id}
                >
                  <div className="flex flex-col items-center justify-center gap-2 md:flex-row">
                    <span className="text-center font-bold">
                      {match.team1.name}
                    </span>
                    <span className="text-muted-foreground">
                      <SwordsIcon />
                    </span>
                    <span className="font-bold">{match.team2.name}</span>
                  </div>
                  {match.isLive ? (
                    <Button className="w-full">Resume Match</Button>
                  ) : (
                    <Button className="w-full">Start Match</Button>
                  )}
                </div>
              ))}
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
