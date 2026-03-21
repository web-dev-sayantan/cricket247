import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="font-medium text-xl">{inningsTitle}</h2>
        <p className="text-muted-foreground text-sm">
          The batting and bowling sides are derived automatically. Set the
          opening pair and opening bowler to begin the innings.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TeamSummary label="Batting team" value={battingTeamName} />
        <TeamSummary label="Bowling team" value={bowlingTeamName} />
      </div>

      {followOn ? (
        <section className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Apply follow-on</h3>
            <p className="text-muted-foreground text-sm">
              Keep the batting and bowling teams the same as innings 2.
            </p>
          </div>
          <Switch
            aria-label="Apply follow-on"
            checked={followOn.isApplied}
            onCheckedChange={followOn.onToggle}
          />
        </section>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
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
        <PlayerPicker
          label="Opening bowler"
          onValueChange={(value) =>
            onOpeningBowlerChange(value ? Number.parseInt(value, 10) : null)
          }
          players={openingBowlerOptions}
          value={openingBowlerId ? String(openingBowlerId) : ""}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <LineupSummary players={team1LineupNames} teamLabel={team1ShortName} />
        <LineupSummary players={team2LineupNames} teamLabel={team2ShortName} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          className="h-12 rounded-2xl"
          disabled={!inningsSetupAvailable || isStarting}
          onClick={onStartInnings}
          type="button"
        >
          <PlayIcon className="mr-2 size-4" />
          {isStarting ? "Starting..." : "Start innings"}
        </Button>
        {canEditToss ? (
          <Button
            className="h-12 rounded-2xl"
            onClick={onEditToss}
            type="button"
            variant="outline"
          >
            Edit toss
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function TeamSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="flex h-12 items-center rounded-2xl border border-border/60 bg-muted/10 px-4 text-sm">
        {value}
      </div>
    </div>
  );
}

function LineupSummary({
  players,
  teamLabel,
}: {
  players: string[];
  teamLabel: string;
}) {
  return (
    <section className="space-y-2 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4">
      <h3 className="font-medium text-sm sm:text-base">{teamLabel} lineup</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {players.join(", ")}
      </p>
    </section>
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
        <SelectTrigger className="h-12 rounded-2xl">
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
