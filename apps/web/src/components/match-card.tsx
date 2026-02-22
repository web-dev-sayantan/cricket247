import { Link } from "@tanstack/react-router";
import { FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatWeekdayMonthDayYear } from "@/lib/date";

interface MatchCardProps {
  match: {
    id: number;
    team1: { name: string; shortName: string };
    team2: { name: string; shortName: string };
    matchDate: Date;
    isLive?: boolean | null;
    innings?: Array<{
      id: number;
      totalScore: number;
      wickets: number;
      ballsBowled: number;
    }>;
  };
}

export const MatchCard = ({ match }: MatchCardProps) => {
  const firstInnings = match.innings?.[0];
  const secondInnings = match.innings?.[1];

  // Get the current innings (last innings with data)
  const currentInnings = secondInnings ?? firstInnings;
  const currentInningsId = currentInnings?.id;
  const currentBall = currentInnings?.ballsBowled ?? 0;

  const calculateOvers = (balls: number) => {
    const completeOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return remainingBalls > 0
      ? `${completeOvers}.${remainingBalls}`
      : `${completeOvers}`;
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {match.isLive && (
            <div className="flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              <span className="font-semibold text-red-600 text-sm">LIVE</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-base">
                {match.team1.shortName}
              </div>
              {firstInnings && (
                <div className="text-muted-foreground text-sm">
                  {firstInnings.totalScore}/{firstInnings.wickets} (
                  {calculateOvers(firstInnings.ballsBowled)})
                </div>
              )}
            </div>
            <div className="px-3 text-muted-foreground text-xs">vs</div>
            <div className="flex-1 text-right">
              <div className="font-semibold text-base">
                {match.team2.shortName}
              </div>
              {secondInnings && (
                <div className="text-muted-foreground text-sm">
                  {secondInnings.totalScore}/{secondInnings.wickets} (
                  {calculateOvers(secondInnings.ballsBowled)})
                </div>
              )}
            </div>
          </div>

          <div className="text-muted-foreground text-xs">
            {formatWeekdayMonthDayYear(match.matchDate)}
          </div>

          <div className="flex flex-col gap-4 pt-2 md:flex-row md:gap-2">
            <Link
              className="flex-1"
              params={{ matchId: String(match.id) }}
              search={{
                innings: currentInningsId,
                ball: currentBall,
              }}
              to="/matches/$matchId/score"
            >
              <Button className="w-full" size="sm" variant="default">
                <Play className="mr-1 size-4" />
                Resume Scoring
              </Button>
            </Link>
            <Link
              className="flex-1"
              params={{ matchId: String(match.id) }}
              to="/matches/$matchId/scorecard"
            >
              <Button className="w-full" size="sm" variant="outline">
                <FileText className="mr-1 size-4" />
                Scorecard
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
