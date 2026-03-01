import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMonthDay } from "@/lib/date";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  id: number;
  isLive: boolean;
  matchDate: Date;
  score?: string;
  status: string;
  team1: { name: string };
  team2: { name: string };
}

export function MatchCard({
  id,
  team1,
  team2,
  status,
  isLive,
  score,
  matchDate,
}: MatchCardProps) {
  return (
    <Card className="group relative w-[clamp(16rem,82vw,22rem)] shrink-0 snap-center overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          {formatMonthDay(matchDate)}
        </CardTitle>
        {isLive && (
          <Badge
            className="animate-pulse border-red-500/20 bg-red-500/10 text-red-500 shadow-none hover:bg-red-500/20"
            variant="destructive"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            LIVE
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 text-center">
            <span className="line-clamp-2 font-bold text-lg leading-tight md:text-xl">
              {team1.name}
            </span>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary">
            <span className="font-bold text-[10px]">VS</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <span className="line-clamp-2 font-bold text-lg leading-tight md:text-xl">
              {team2.name}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          {score && (
            <div className="font-black text-2xl text-primary tracking-tight">
              {score}
            </div>
          )}
          <div className="text-center font-semibold text-muted-foreground/80 text-xs uppercase tracking-wide">
            {status}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-5 pb-5">
        <Link
          className={cn(
            buttonVariants({
              className:
                "w-full opacity-90 transition-opacity group-hover:opacity-100",
              variant: isLive ? "default" : "secondary",
            })
          )}
          params={{ matchId: id.toString() }}
          to="/matches/$matchId/scorecard"
        >
          View Scorecard
        </Link>
      </CardFooter>
      <div className="pointer-events-none absolute inset-0 z-[-1] bg-linear-to-t from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}
