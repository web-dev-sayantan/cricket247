import { Search, UserPlus } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RosterListSkeleton } from "./assign-players-views";
import type { AvailablePlayer } from "./types";
import { VirtualizedPlayerList } from "./virtualized-player-list";

export function AvailablePlayersCard({
  availablePlayers,
  isLoading,
  onAssign,
  pendingAssignPlayerId,
  pendingUnassignPlayerId,
  pendingReassignPlayerId,
}: {
  availablePlayers: AvailablePlayer[];
  isLoading: boolean;
  onAssign: (playerId: number) => void;
  pendingAssignPlayerId: number | null;
  pendingUnassignPlayerId: number | null;
  pendingReassignPlayerId: number | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAvailablePlayers = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return availablePlayers;
    }

    return availablePlayers.filter((player) => {
      const playerName = player.name.toLowerCase();
      const playerRole = player.role.toLowerCase();
      const playerNationality = player.nationality?.toLowerCase() ?? "";

      return (
        playerName.includes(normalizedQuery) ||
        playerRole.includes(normalizedQuery) ||
        playerNationality.includes(normalizedQuery)
      );
    });
  }, [availablePlayers, normalizedQuery]);

  let content: ReactNode = null;

  if (isLoading) {
    content = <RosterListSkeleton />;
  } else if (availablePlayers.length === 0) {
    content = (
      <p className="text-muted-foreground text-sm">
        No unassigned players are currently available.
      </p>
    );
  } else if (filteredAvailablePlayers.length === 0) {
    content = (
      <p className="text-muted-foreground text-sm">
        No available players match your search.
      </p>
    );
  } else {
    content = (
      <VirtualizedPlayerList
        getItemKey={(player) => player.playerId}
        items={filteredAvailablePlayers}
        renderItem={(player) => {
          const isPending =
            pendingAssignPlayerId === player.playerId ||
            pendingUnassignPlayerId === player.playerId ||
            pendingReassignPlayerId === player.playerId;

          return (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors duration-150 hover:bg-muted/30">
              <div className="space-y-1.5">
                <p className="font-medium text-sm">{player.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{player.role}</Badge>
                  {player.nationality ? (
                    <Badge variant="ghost">{player.nationality}</Badge>
                  ) : null}
                </div>
              </div>
              <Button
                disabled={isPending}
                onClick={() => onAssign(player.playerId)}
                size="sm"
                type="button"
              >
                <UserPlus />
                {pendingAssignPlayerId === player.playerId
                  ? "Assigning..."
                  : "Assign"}
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
        <CardTitle className="text-base">Available players</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-3 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search available players"
            className="pl-8"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, role, or nationality"
            value={searchQuery}
          />
        </div>
        <div className="min-h-24 flex-1">{content}</div>
      </CardContent>
    </Card>
  );
}
