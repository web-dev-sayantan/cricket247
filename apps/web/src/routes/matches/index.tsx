import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon, HistoryIcon, Activity } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: liveMatches = [], isLoading } = useQuery(
    orpc.liveMatches.queryOptions()
  );

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/20">
      {/* Header */}
      <header className="px-4 py-8 md:px-8 md:py-10 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Live Matches</h1>
        <p className="mt-2 text-lg text-muted-foreground/80 font-medium tracking-tight">
          Watch cricket matches in real-time
        </p>
      </header>

      {/* Content */}
      <main className="px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
        
        {/* Top Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/matches/create-match" className="group">
             <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-primary transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background backdrop-blur-sm">
                 <div className="flex items-center gap-3">
                     <div className="rounded-full bg-primary p-2.5 text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/90">
                        <PlusIcon className="size-5 relative z-10" />
                     </div>
                    <span className="text-base font-bold tracking-wide">Create Match</span>
                 </div>
             </div>
          </Link>
          <Link to="/matches/completed" className="group">
             <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-border/50 bg-card/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border/80 hover:bg-card hover:shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                     <div className="rounded-full bg-secondary p-2.5 text-secondary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-secondary/80">
                        <HistoryIcon className="size-5 relative z-10" />
                     </div>
                    <span className="text-base font-bold tracking-wide text-foreground">Completed Matches</span>
                 </div>
             </div>
          </Link>
        </section>

        <section>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">Loading matches...</p>
            </div>
          )}

          {!isLoading && liveMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-6 py-20 px-4 text-center rounded-3xl border border-dashed border-border/60 bg-muted/10 mx-auto max-w-2xl mt-4">
              <div className="rounded-full bg-primary/10 p-6 ring-8 ring-primary/5 mb-2">
                <Activity className="size-10 text-primary opacity-80" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-2xl tracking-tight">No Live Matches</p>
                <p className="text-muted-foreground text-base max-w-sm mx-auto">
                  You don't have any ongoing matches right now. Create a new one to get started.
                </p>
              </div>
              <Link to="/matches/create-match" className="mt-4 inline-block">
                <Button className="rounded-full px-8 h-12 shadow-sm hover:shadow-md active:scale-95 transition-all text-base font-semibold">
                  <PlusIcon className="mr-2 size-5" />
                  Start a Match
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && liveMatches.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 pb-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-150 fill-mode-both">
                  <span className="relative flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight">Happening Now</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {liveMatches.map((match, index) => (
                  <div 
                    key={match.id}
                    className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
