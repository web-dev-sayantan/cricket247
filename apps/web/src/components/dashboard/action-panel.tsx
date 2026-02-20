import { PlusIcon, UsersIcon, TrophyIcon, ShieldIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ActionPanel() {
  return (
    <section className="py-6 px-4 md:px-8 relative">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight md:text-2xl">Quick Actions</h3>
        </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        <Link to="/tournaments" className="group flex h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg backdrop-blur-sm">
            <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <TrophyIcon className="h-6 w-6 relative z-10" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Tournaments</span>
        </Link>
        <Link to="/teams" className="group flex h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg backdrop-blur-sm">
             <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <ShieldIcon className="h-6 w-6 relative z-10" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Teams</span>
        </Link>
        <Link to="/players" className="group flex h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg backdrop-blur-sm">
            <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <UsersIcon className="h-6 w-6 relative z-10" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Players</span>
        </Link>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="group flex h-28 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background backdrop-blur-sm">
                    <div className="rounded-full bg-primary p-3 text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/90">
                        <PlusIcon className="h-6 w-6 relative z-10" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide">Create New</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 backdrop-blur-md p-2">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3 md:py-2">
                    <Link to="/matches/create" className="w-full">Match</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3 md:py-2">
                    <Link to="/tournaments/create" className="w-full">Tournament</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3 md:py-2">
                    <Link to="/teams/create" className="w-full">Team</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3 md:py-2">
                    <Link to="/players/create" className="w-full">Player</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
