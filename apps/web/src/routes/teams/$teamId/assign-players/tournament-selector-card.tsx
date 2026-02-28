import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamTournament } from "./types";

export function TournamentSelectorCard({
  tournaments,
  selectedTournament,
  selectedTournamentId,
  onTournamentChange,
  onRefresh,
  isTournamentsLoading,
  isTournamentsFetching,
  isRosterFetching,
}: {
  tournaments: TeamTournament[];
  selectedTournament: TeamTournament | null;
  selectedTournamentId: string;
  onTournamentChange: (value: string | null) => void;
  onRefresh: () => Promise<void>;
  isTournamentsLoading: boolean;
  isTournamentsFetching: boolean;
  isRosterFetching: boolean;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-3 p-4 md:p-5">
        <div className="space-y-1.5">
          <p className="font-medium text-sm">Tournament</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <Select
                onValueChange={onTournamentChange}
                value={selectedTournamentId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tournament">
                    {selectedTournament?.name ?? "Select a tournament"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((tournament) => (
                    <SelectItem
                      key={tournament.id}
                      label={tournament.name}
                      value={String(tournament.id)}
                    >
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-8 w-full md:w-auto md:shrink-0"
              disabled={isTournamentsFetching || isRosterFetching}
              onClick={() => {
                onRefresh().catch(() => {
                  toast.error("Failed to refresh roster");
                });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw />
              Refresh
            </Button>
          </div>
        </div>

        {isTournamentsLoading ? (
          <p className="text-muted-foreground text-sm">
            Loading tournaments...
          </p>
        ) : null}

        {!isTournamentsLoading && tournaments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This team is not registered in any tournament yet.
          </p>
        ) : null}

        {selectedTournament ? (
          <p className="text-muted-foreground text-xs">
            Selected: {selectedTournament.name}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
