import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConflictedPlayer, ReassignDialogPlayer } from "./types";
import { VirtualizedPlayerList } from "./virtualized-player-list";

export function ConflictedPlayersCard({
  conflictedPlayers,
  onOpenReassignDialog,
  pendingAssignPlayerId,
  pendingUnassignPlayerId,
  pendingReassignPlayerId,
}: {
  conflictedPlayers: ConflictedPlayer[];
  onOpenReassignDialog: (player: ReassignDialogPlayer) => void;
  pendingAssignPlayerId: number | null;
  pendingUnassignPlayerId: number | null;
  pendingReassignPlayerId: number | null;
}) {
  let content: ReactNode = null;

  if (conflictedPlayers.length === 0) {
    content = (
      <p className="text-muted-foreground text-sm">
        No conflicts for this tournament.
      </p>
    );
  } else {
    content = (
      <VirtualizedPlayerList
        getItemKey={(player) => player.playerId}
        items={conflictedPlayers}
        renderItem={(player) => {
          const isPending =
            pendingAssignPlayerId === player.playerId ||
            pendingUnassignPlayerId === player.playerId ||
            pendingReassignPlayerId === player.playerId;

          return (
            <div className="flex flex-col gap-3 rounded-lg border p-3 transition-colors duration-150 hover:bg-muted/30 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">{player.name}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{player.role}</Badge>
                  <Badge variant="secondary">
                    {player.assignedTeamName ??
                      `Team #${String(player.assignedTeamId)}`}
                  </Badge>
                </div>
              </div>
              <Button
                className="md:shrink-0"
                disabled={
                  isPending || typeof player.assignedTeamId !== "number"
                }
                onClick={() => {
                  if (typeof player.assignedTeamId !== "number") {
                    return;
                  }

                  onOpenReassignDialog({
                    playerId: player.playerId,
                    name: player.name,
                    assignedTeamId: player.assignedTeamId,
                    assignedTeamName: player.assignedTeamName,
                  });
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw />
                Reassign
              </Button>
            </div>
          );
        }}
      />
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">
          Players assigned to other teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">{content}</CardContent>
    </Card>
  );
}
