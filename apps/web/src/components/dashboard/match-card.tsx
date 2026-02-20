import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MatchCardProps {
  id: number;
  team1: { name: string };
  team2: { name: string };
  status: string;
  isLive: boolean;
  score?: string;
  matchDate: Date;
}

export function MatchCard({ id, team1, team2, status, isLive, score, matchDate }: MatchCardProps) {
  return (
    <Card className="group relative w-[85vw] max-w-[320px] shrink-0 snap-center overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/20 md:max-w-[350px]">
      <CardHeader className="pb-2 pt-5 flex flex-row items-center justify-between space-y-0 px-5">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {new Date(matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </CardTitle>
        {isLive && (
          <Badge variant="destructive" className="animate-pulse bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 shadow-none">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
            LIVE
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 w-[40%] text-center">
            <span className="font-bold text-lg leading-tight md:text-xl line-clamp-2">{team1.name}</span>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary">
            <span className="text-[10px] font-bold">VS</span>
          </div>
          <div className="flex flex-col items-center gap-1 w-[40%] text-center">
            <span className="font-bold text-lg leading-tight md:text-xl line-clamp-2">{team2.name}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-1">
          {score && (
            <div className="text-2xl font-black tracking-tight text-primary">
              {score}
            </div>
          )}
          <div className="text-center text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
            {status}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-5 pb-5">
        <Button asChild className="w-full opacity-90 transition-opacity group-hover:opacity-100" variant={isLive ? "default" : "secondary"}>
          <Link to="/matches/$matchId" params={{ matchId: id.toString() }}>
             View Scorecard
          </Link>
        </Button>
      </CardFooter>
      <div className="pointer-events-none absolute inset-0 z-[-1] bg-linear-to-t from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}
