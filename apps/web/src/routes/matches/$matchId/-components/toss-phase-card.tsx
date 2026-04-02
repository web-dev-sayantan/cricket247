import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const isReady = tossWinnerId !== null;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
          Confirm toss
        </h2>
        <p className="text-muted-foreground text-sm">
          Who won the toss and what did they elect?
        </p>
      </div>

      {/* Toss winner */}
      <div className="space-y-3">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
          Toss winner
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TossTeamTile
            isSelected={tossWinnerId === team1Id}
            name={team1Name}
            onSelect={() => onTossWinnerChange(team1Id)}
          />
          <TossTeamTile
            isSelected={tossWinnerId === team2Id}
            name={team2Name}
            onSelect={() => onTossWinnerChange(team2Id)}
          />
        </div>
      </div>

      {/* Toss decision */}
      <div className="space-y-3">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
          Elected to
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TossDecisionTile
            icon="/bat.svg"
            isSelected={tossDecision === "bat"}
            label="Bat first"
            onSelect={() => onTossDecisionChange("bat")}
          />
          <TossDecisionTile
            icon="/bowl.svg"
            isSelected={tossDecision === "bowl"}
            label="Field first"
            onSelect={() => onTossDecisionChange("bowl")}
          />
        </div>
      </div>

      {/* Summary + CTA */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <Button
          className="angled-cut h-11 px-6"
          disabled={!isReady}
          onClick={onConfirmToss}
          type="button"
        >
          <ArrowRightIcon className="mr-2 size-4" />
          Continue to innings setup
        </Button>
        {isReady ? (
          <p className="text-primary text-sm">
            {tossWinnerId === team1Id ? team1Name : team2Name} elected to{" "}
            {tossDecision === "bat" ? "bat" : "field"} first.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select the toss winner to continue.
          </p>
        )}
      </div>
    </section>
  );
}

function TossTeamTile({
  isSelected,
  name,
  onSelect,
}: {
  isSelected: boolean;
  name: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "angled-cut group relative flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "border border-border/50 bg-card text-foreground hover:border-primary/30"
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="font-medium text-sm">{name}</span>
      {isSelected ? (
        <CheckIcon className="size-3.5 text-primary-foreground/80" />
      ) : null}
    </button>
  );
}

function TossDecisionTile({
  icon,
  isSelected,
  label,
  onSelect,
}: {
  icon: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "group flex cursor-pointer items-center gap-3 border px-4 py-3 text-left transition-colors",
        isSelected
          ? "border-primary/50 bg-[color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%)] text-foreground"
          : "border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
      onClick={onSelect}
      type="button"
    >
      <img
        alt=""
        className={cn(
          "size-5 transition-opacity dark:invert",
          isSelected ? "opacity-80" : "opacity-40 group-hover:opacity-60"
        )}
        height={20}
        src={icon}
        width={20}
      />
      <span className="font-medium text-sm">{label}</span>
      {isSelected ? (
        <CheckIcon className="ml-auto size-3.5 text-primary" />
      ) : null}
    </button>
  );
}
