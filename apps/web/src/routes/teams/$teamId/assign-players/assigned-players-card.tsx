import { Search, UserMinus } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RosterListSkeleton } from "./-assign-players-views";
import type { AssignedPlayer } from "./types";
import { VirtualizedPlayerList } from "./virtualized-player-list";

export function AssignedPlayersCard({
  assignedPlayers,
  isLoading,
  onUnassign,
  pendingAssignPlayerId,
  pendingUnassignPlayerId,
  pendingReassignPlayerId,
}: {
  assignedPlayers: AssignedPlayer[];
  isLoading: boolean;
  onUnassign: (playerId: number) => void;
  pendingAssignPlayerId: number | null;
  pendingUnassignPlayerId: number | null;
  pendingReassignPlayerId: number | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAssignedPlayers = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return assignedPlayers;
    }

    return assignedPlayers.filter((player) => {
      const playerName = player.name.toLowerCase();
      const playerRole = player.role.toLowerCase();

      return (
        playerName.includes(normalizedQuery) ||
        playerRole.includes(normalizedQuery)
      );
    });
  }, [assignedPlayers, normalizedQuery]);

  let content: ReactNode = null;

  if (isLoading) {
    content = <RosterListSkeleton />;
  } else if (assignedPlayers.length === 0) {
    content = (
      <p className="text-muted-foreground text-sm">
        No players assigned to this team for the selected tournament.
      </p>
    );
  } else if (filteredAssignedPlayers.length === 0) {
    content = (
      <p className="text-muted-foreground text-sm">
        No assigned players match your search.
      </p>
    );
  } else {
    content = (
      <VirtualizedPlayerList
        getItemKey={(player) => player.playerId}
        items={filteredAssignedPlayers}
        renderItem={(player) => {
          const isPending =
            pendingUnassignPlayerId === player.playerId ||
            pendingAssignPlayerId === player.playerId ||
            pendingReassignPlayerId === player.playerId;

          return (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors duration-150 hover:bg-muted/30">
              <div className="space-y-1.5">
                <p className="font-medium text-sm">{player.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{player.role}</Badge>
                  {player.isCaptain ? (
                    <Badge variant="secondary">Captain</Badge>
                  ) : null}
                  {player.isViceCaptain ? (
                    <Badge variant="secondary">Vice Captain</Badge>
                  ) : null}
                </div>
              </div>
              <Button
                disabled={isPending}
                onClick={() => onUnassign(player.playerId)}
                size="sm"
                type="button"
                variant="outline"
              >
                <UserMinus />
                {pendingUnassignPlayerId === player.playerId
                  ? "Unassigning..."
                  : "Unassign"}
              </Button>
            </div>
          );
        }}
      />
    );
  }

  return (
    <Card className="h-full rounded-xl">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">Assigned to this team</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-3 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search assigned players"
            className="pl-8"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by player name or role"
            value={searchQuery}
          />
        </div>
        <div className="min-h-24 flex-1">{content}</div>
      </CardContent>
    </Card>
  );
}
