import { ListIcon, PenLineIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { ScoringPlayerOption } from "@/routes/matches/$matchId/-components/score-a-ball";

export interface InningsSetupPhaseCardProps {
  battingTeamName: string;
  bowlingTeamName: string;
  canEditToss: boolean;
  followOn?: {
    isApplied: boolean;
    onToggle: (checked: boolean) => void;
  } | null;
  inningsSetupAvailable: boolean;
  inningsTitle: string;
  isStarting: boolean;
  nonStrikerId: null | number;
  nonStrikerOptions: ScoringPlayerOption[];
  onEditToss: () => void;
  onNonStrikerChange: (playerId: null | number) => void;
  onOpeningBowlerChange: (playerId: null | number) => void;
  onStartInnings: () => void;
  onStrikerChange: (playerId: null | number) => void;
  openingBowlerId: null | number;
  openingBowlerOptions: ScoringPlayerOption[];
  strikerId: null | number;
  strikerOptions: ScoringPlayerOption[];
  team1LineupNames: string[];
  team1ShortName: string;
  team2LineupNames: string[];
  team2ShortName: string;
}

export function InningsSetupPhaseCard({
  battingTeamName,
  inningsSetupAvailable,
  inningsTitle,
  isStarting,
  onEditToss,
  onNonStrikerChange,
  onOpeningBowlerChange,
  onStartInnings,
  onStrikerChange,
  openingBowlerId,
  openingBowlerOptions,
  bowlingTeamName,
  canEditToss,
  followOn,
  nonStrikerId,
  nonStrikerOptions,
  strikerId,
  strikerOptions,
  team1LineupNames,
  team1ShortName,
  team2LineupNames,
  team2ShortName,
}: InningsSetupPhaseCardProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
          {inningsTitle}
        </h2>
        <p className="text-muted-foreground text-sm">
          Set the opening pair and bowler to begin.
        </p>
      </div>

      {/* Follow-on */}
      {followOn ? (
        <div className="flex items-center justify-between gap-4 border-border/60 border-t border-b py-4">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Apply follow-on</p>
            <p className="text-muted-foreground text-xs">
              Keep batting &amp; bowling sides from innings 2.
            </p>
          </div>
          <Switch
            aria-label="Apply follow-on"
            checked={followOn.isApplied}
            onCheckedChange={followOn.onToggle}
          />
        </div>
      ) : null}

      {/* Team cards with pickers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Batting side */}
        <div className="space-y-4 border border-border/50 p-4">
          <div className="flex items-center gap-2.5">
            <img
              alt=""
              className="size-4 opacity-50 dark:invert"
              height={16}
              src="/bat.svg"
              width={16}
            />
            <div className="flex-1">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
                Batting
              </p>
              <p className="font-medium text-sm leading-tight">
                {battingTeamName}
              </p>
            </div>
            <LineupSheet
              players={team1LineupNames}
              teamLabel={team1ShortName}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PlayerPicker
              label="Striker"
              onValueChange={(value) =>
                onStrikerChange(value ? Number.parseInt(value, 10) : null)
              }
              players={strikerOptions}
              value={strikerId ? String(strikerId) : ""}
            />
            <PlayerPicker
              label="Non-striker"
              onValueChange={(value) =>
                onNonStrikerChange(value ? Number.parseInt(value, 10) : null)
              }
              players={nonStrikerOptions}
              value={nonStrikerId ? String(nonStrikerId) : ""}
            />
          </div>
        </div>

        {/* Bowling side */}
        <div className="space-y-4 border border-border/50 p-4">
          <div className="flex items-center gap-2.5">
            <img
              alt=""
              className="size-4 opacity-50 dark:invert"
              height={16}
              src="/bowl.svg"
              width={16}
            />
            <div className="flex-1">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
                Bowling
              </p>
              <p className="font-medium text-sm leading-tight">
                {bowlingTeamName}
              </p>
            </div>
            <LineupSheet
              players={team2LineupNames}
              teamLabel={team2ShortName}
            />
          </div>
          <PlayerPicker
            label="Opening bowler"
            onValueChange={(value) =>
              onOpeningBowlerChange(value ? Number.parseInt(value, 10) : null)
            }
            players={openingBowlerOptions}
            value={openingBowlerId ? String(openingBowlerId) : ""}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <Button
          className="angled-cut h-11 px-6"
          disabled={!inningsSetupAvailable || isStarting}
          onClick={onStartInnings}
          type="button"
        >
          <PlayIcon className="mr-2 size-4" />
          {isStarting ? "Starting..." : "Start innings"}
        </Button>
        {canEditToss ? (
          <Button
            className="h-11 px-5"
            onClick={onEditToss}
            type="button"
            variant="outline"
          >
            <PenLineIcon className="mr-2 size-3.5" />
            Edit toss
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function LineupSheet({
  players,
  teamLabel,
}: {
  players: string[];
  teamLabel: string;
}) {
  return (
    <Sheet>
      <SheetTrigger className="flex cursor-pointer items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground">
        <ListIcon className="size-3.5" />
        <span>Lineup</span>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader className="border-border/50 border-b px-5 pt-5 pb-4">
          <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
            Confirmed squad
          </p>
          <SheetTitle className="font-serif text-2xl tracking-tight">
            {teamLabel} lineup
          </SheetTitle>
          <SheetDescription className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em]">
            {players.length} players selected
          </SheetDescription>
        </SheetHeader>
        <ol className="px-5 pb-8">
          {players.map((name, i) => (
            <li
              className="flex items-baseline gap-4 border-border/30 border-b py-3 last:border-0"
              key={name}
            >
              <span className="w-5 shrink-0 text-[0.65rem] text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm">{name}</span>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

function PlayerPicker({
  label,
  onValueChange,
  players,
  value,
}: {
  label: string;
  onValueChange: (value: null | string) => void;
  players: ScoringPlayerOption[];
  value: string;
}) {
  const selectedPlayerName =
    players.find((player) => String(player.id) === value)?.name ?? "";

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {selectedPlayerName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {players.map((player) => (
            <SelectItem
              key={player.id}
              label={player.name}
              value={String(player.id)}
            >
              {player.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
