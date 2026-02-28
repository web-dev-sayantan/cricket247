import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/tournaments/")({
  component: TournamentsPageComponent,
  pendingComponent: TournamentsPageSkeleton,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    return { session };
  },
});

function TournamentsPageComponent() {
  const { session } = Route.useRouteContext();
  const isAdmin =
    (session?.data?.user as { role?: string } | undefined)?.role === "admin";

  const { data: liveTournaments } = useSuspenseQuery(
    orpc.liveTournaments.queryOptions()
  );

  const { data: allTournaments } = useSuspenseQuery(
    orpc.tournaments.queryOptions()
  );

  const now = new Date();

  // Upcoming tournaments: strictly in the future, nearest first
  const upcomingTournaments = allTournaments
    .filter((t) => new Date(t.startDate) > now)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/20">
      <header className="flex flex-col gap-4 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-8 md:py-10">
        <div>
          <h1 className="font-extrabold text-4xl tracking-tight lg:text-5xl">
            Tournaments
          </h1>
          <p className="mt-2 font-medium text-lg text-muted-foreground/80 tracking-tight">
            Discover and manage cricket tournaments
          </p>
        </div>

        {isAdmin && (
          <Button
            className="group fade-in slide-in-from-bottom-2 mt-4 w-full animate-in md:mt-0 md:w-auto"
            size="lg"
          >
            <Link className="flex items-center" to="/tournaments/create">
              <PlusIcon className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
              Create Tournament
            </Link>
          </Button>
        )}
      </header>

      <main className="space-y-12 px-4 md:px-8">
        {/* Live Tournaments Section */}
        {liveTournaments.length > 0 && (
          <section className="fade-in slide-in-from-bottom-4 animate-in fill-mode-both duration-500">
            <h2 className="mb-6 font-bold text-2xl tracking-tight">Live Now</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveTournaments.map((tournament) => (
                <TournamentCard
                  className="w-full max-w-none shrink snap-align-none"
                  endDate={tournament.endDate}
                  format={tournament.type}
                  id={tournament.id}
                  key={tournament.id}
                  name={tournament.name}
                  startDate={tournament.startDate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Tournaments Section */}
        {upcomingTournaments.length > 0 && (
          <section className="fade-in slide-in-from-bottom-4 animate-in fill-mode-both delay-150 duration-500">
            <h2 className="mb-6 font-bold text-2xl tracking-tight">
              Upcoming Tournaments
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard
                  className="w-full max-w-none shrink snap-align-none"
                  endDate={tournament.endDate}
                  format={tournament.type}
                  id={tournament.id}
                  key={tournament.id}
                  name={tournament.name}
                  startDate={tournament.startDate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State when no tournaments */}
        {liveTournaments.length === 0 && upcomingTournaments.length === 0 && (
          <div className="fade-in zoom-in-95 flex min-h-64 animate-in flex-col items-center justify-center rounded-2xl border-2 border-border/40 border-dashed bg-card/20 text-center duration-500">
            <p className="font-medium text-lg text-muted-foreground">
              No live or upcoming tournaments found.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function TournamentsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/20">
      <header className="flex flex-col gap-4 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-8 md:py-10">
        <div>
          <Skeleton className="h-10 w-48 md:h-12 md:w-64" />
          <Skeleton className="mt-3 h-6 w-64 max-w-sm md:h-7 md:w-80" />
        </div>
        <Skeleton className="mt-4 h-11 w-full md:mt-0 md:w-44" />
      </header>

      <main className="space-y-12 px-4 md:px-8">
        <section>
          <Skeleton className="mb-6 h-8 w-40" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton className="h-47 w-full rounded-xl" key={i} />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="mb-6 h-8 w-56" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3].map((i) => (
              <Skeleton className="h-47 w-full rounded-xl" key={i} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
