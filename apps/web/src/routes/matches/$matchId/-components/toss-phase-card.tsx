import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TossPhaseCardProps {
  onConfirmToss: () => void;
  onTossDecisionChange: (decision: "bat" | "bowl") => void;
  onTossWinnerChange: (teamId: number) => void;
  team1Id: number;
  team1Name: string;
  team2Id: number;
  team2Name: string;
  tossDecision: "bat" | "bowl";
  tossWinnerId: null | number;
}

export function TossPhaseCard({
  onConfirmToss,
  onTossDecisionChange,
  onTossWinnerChange,
  team1Id,
  team1Name,
  team2Id,
  team2Name,
  tossDecision,
  tossWinnerId,
}: TossPhaseCardProps) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="font-medium text-xl">Confirm toss</h2>
        <p className="text-muted-foreground text-sm">
          Confirm who won the toss and whether they chose to bat or field first.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Toss winner</p>
          <Select
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              onTossWinnerChange(Number.parseInt(value, 10));
            }}
            value={tossWinnerId ? String(tossWinnerId) : ""}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Select toss winner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(team1Id)}>{team1Name}</SelectItem>
              <SelectItem value={String(team2Id)}>{team2Name}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Toss decision</p>
          <Select
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              onTossDecisionChange(value === "bowl" ? "bowl" : "bat");
            }}
            value={tossDecision}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Select toss decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bat">Bat first</SelectItem>
              <SelectItem value="bowl">Field first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="h-12 rounded-2xl"
        onClick={onConfirmToss}
        type="button"
      >
        Continue to innings setup
      </Button>
    </section>
  );
}
