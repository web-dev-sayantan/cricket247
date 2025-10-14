import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { SwordsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
    ██████╗ ██████╗  ████████╗  ██████╗ ██╗  ██╗ ███████╗ ████████╗
   ██╔════╝ ██╔══██╗ ╚══██╔══╝ ██╔════╝ ██║ ██╔╝ ██╔════╝ ╚══██╔══╝
   ██║      ██████╔╝    ██║    ██║      █████╔╝  █████╗      ██║
   ██║      ██╔══██╗    ██║    ██║      ██╔═██╗  ██╔══╝      ██║
   ╚██████╗ ██║  ██║ ████████╗ ╚██████╗ ██║  ██╗ ███████╗    ██║
    ╚═════╝ ╚═╝  ╚═╝ ╚═══════╝  ╚═════╝ ╚═╝  ╚═╝ ╚══════╝    ╚═╝
  `;

function HomeComponent() {
	const { data: liveMatches } = useSuspenseQuery(orpc.liveMatches.queryOptions());

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			{/*<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>*/}
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">Live Matches</h2>
					<div className="flex items-center gap-2">
						<Suspense fallback={<div>Loading...</div>}>
              {liveMatches.map((match) => (
                <div
                  className="w-full flex flex-col gap-4 items-center justify-center p-4 rounded-md border "
                  key={match.id}
                >
                  {/* <h1 className="text-xl font-bold">Match {match.id} :</h1> */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                    <span className="font-bold text-center">{match.team1.name}</span>
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
