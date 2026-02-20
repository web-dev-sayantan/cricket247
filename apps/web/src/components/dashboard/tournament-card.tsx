import { CalendarIcon, TrophyIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TournamentCardProps {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  format: string;
}

export function TournamentCard({ id, name, startDate, endDate, format }: TournamentCardProps) {
    const isLive = new Date() >= new Date(startDate) && new Date() <= new Date(endDate);

  return (
    <Card className="group relative w-[85vw] max-w-[300px] shrink-0 snap-center overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/20 md:max-w-[320px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {format}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
            <TrophyIcon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="mt-2 text-xl font-bold leading-tight line-clamp-2 md:text-2xl">{name}</div>
        <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
              {" - "} 
              {new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
        </div>
        <div className="mt-5">
             {isLive ? (
                 <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-none">Ongoing</Badge>
             ) : (
                 <Badge variant="secondary" className="bg-secondary/50 shadow-none hover:bg-secondary/70">Scheduled</Badge>
             )}
        </div>
      </CardContent>
      <div className="pointer-events-none absolute inset-0 z-[-1] bg-linear-to-t from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}
