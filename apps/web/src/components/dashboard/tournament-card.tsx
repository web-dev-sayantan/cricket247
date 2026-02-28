import { CalendarIcon, TrophyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthDay, isDateWithinInclusiveRange } from "@/lib/date";
import { cn } from "@/lib/utils";

interface TournamentCardProps {
  className?: string;
  endDate: Date;
  format: string;
  id: number;
  name: string;
  startDate: Date;
}

export function TournamentCard({
  className,
  id: _id,
  name,
  startDate,
  endDate,
  format,
}: TournamentCardProps) {
  const isLive = isDateWithinInclusiveRange(new Date(), startDate, endDate);

  return (
    <Card className={cn("group relative w-[85vw] max-w-75 shrink-0 snap-center overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-xl md:max-w-[320px]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          {format}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
          <TrophyIcon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="mt-2 line-clamp-2 font-bold text-xl leading-tight md:text-2xl">
          {name}
        </div>
        <div className="mt-4 flex items-center font-medium text-muted-foreground text-xs">
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {formatMonthDay(startDate)}
            {" - "}
            {formatMonthDay(endDate)}
          </span>
        </div>
        <div className="mt-5">
          {isLive ? (
            <Badge
              className="border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/20"
              variant="default"
            >
              Ongoing
            </Badge>
          ) : (
            <Badge
              className="bg-secondary/50 shadow-none hover:bg-secondary/70"
              variant="secondary"
            >
              Scheduled
            </Badge>
          )}
        </div>
      </CardContent>
      <div className="pointer-events-none absolute inset-0 z-[-1] bg-linear-to-t from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}
