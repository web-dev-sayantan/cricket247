import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReassignDialogPlayer } from "./-types";

export function ReassignDialog({
  player,
  pendingReassignPlayerId,
  onClose,
  onConfirm,
}: {
  player: ReassignDialogPlayer | null;
  pendingReassignPlayerId: number | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isPending = pendingReassignPlayerId !== null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || isPending)) {
          onClose();
        }
      }}
      open={player !== null}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign player?</DialogTitle>
          <DialogDescription>
            {player
              ? `${player.name} is currently assigned to ${player.assignedTeamName ?? `Team #${String(player.assignedTeamId)}`}. Continue to move this player to the selected team? Captain and vice-captain flags will reset.`
              : "Continue with reassignment?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isPending || player === null}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? "Reassigning..." : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
