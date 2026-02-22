import { Link } from "@tanstack/react-router";
import { PlusIcon, ShieldIcon, TrophyIcon, UsersIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ActionPanel() {
  return (
    <section className="relative px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-bold text-xl tracking-tight md:text-2xl">
          Quick Actions
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        <Link
          className="group flex h-28 flex-col items-center justify-center gap-3 border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg"
          to="/tournaments"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
            <TrophyIcon className="relative z-10 h-6 w-6" />
          </div>
          <span className="font-semibold text-sm tracking-wide">
            Tournaments
          </span>
        </Link>
        <Link
          className="group flex h-28 flex-col items-center justify-center gap-3 border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg"
          to="/teams"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
            <ShieldIcon className="relative z-10 h-6 w-6" />
          </div>
          <span className="font-semibold text-sm tracking-wide">Teams</span>
        </Link>
        <Link
          className="group flex h-28 flex-col items-center justify-center gap-3 border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg"
          to="/players"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
            <UsersIcon className="relative z-10 h-6 w-6" />
          </div>
          <span className="font-semibold text-sm tracking-wide">Players</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <button
              className="group flex h-28 w-full flex-col items-center justify-center gap-3 border border-primary/20 bg-primary/5 p-4 text-primary backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
              type="button"
            >
              <div className="rounded-full bg-primary p-3 text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/90">
                <PlusIcon className="relative z-10 h-6 w-6" />
              </div>
              <span className="font-semibold text-sm tracking-wide">
                Create New
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-border/50 p-2 backdrop-blur-md"
          >
            <DropdownMenuItem className="cursor-pointer py-3 md:py-2">
              <Link className="w-full" to="/matches/create">
                Match
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-3 md:py-2">
              <Link className="w-full" to="/tournaments/create">
                Tournament
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-3 md:py-2">
              <Link className="w-full" to="/teams/create">
                Team
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-3 md:py-2">
              <Link className="w-full" to="/players/create">
                Player
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
