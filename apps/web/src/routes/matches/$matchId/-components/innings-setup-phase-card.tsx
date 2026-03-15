import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScoringPlayerOption } from "@/routes/matches/$matchId/-components/score-a-ball";

export interface InningsSetupPhaseCardProps {
  battingTeamId: null | number;
  bowlingTeamId: null | number;
  canEditToss: boolean;
  inningsSetupAvailable: boolean;
  inningsTitle: string;
  isStarting: boolean;
  nonStrikerId: null | number;
  nonStrikerOptions: ScoringPlayerOption[];
  onBattingTeamChange: (teamId: number) => void;
  onBowlingTeamChange: (teamId: number) => void;
  onEditToss: () => void;
  onNonStrikerChange: (playerId: null | number) => void;
  onOpeningBowlerChange: (playerId: null | number) => void;
  onStartInnings: () => void;
  onStrikerChange: (playerId: null | number) => void;
  openingBowlerId: null | number;
  openingBowlerOptions: ScoringPlayerOption[];
  strikerId: null | number;
  strikerOptions: ScoringPlayerOption[];
  team1Id: number;
  team1LineupNames: string[];
  team1Name: string;
  team1ShortName: string;
  team2Id: number;
  team2LineupNames: string[];
  team2Name: string;
  team2ShortName: string;
}

export function InningsSetupPhaseCard({
  battingTeamId,
  inningsSetupAvailable,
  inningsTitle,
  isStarting,
  onBattingTeamChange,
  onBowlingTeamChange,
  onEditToss,
  onNonStrikerChange,
  onOpeningBowlerChange,
  onStartInnings,
  onStrikerChange,
  openingBowlerId,
  openingBowlerOptions,
  bowlingTeamId,
  canEditToss,
  nonStrikerId,
  nonStrikerOptions,
  strikerId,
  strikerOptions,
  team1Id,
  team1LineupNames,
  team1Name,
  team1ShortName,
  team2Id,
  team2LineupNames,
  team2Name,
  team2ShortName,
}: InningsSetupPhaseCardProps) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="font-medium text-xl">{inningsTitle}</h2>
        <p className="text-muted-foreground text-sm">
          Choose batting and bowling teams, then set the opening pair and
          opening bowler.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Batting team</p>
          <Select
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              onBattingTeamChange(Number.parseInt(value, 10));
            }}
            value={battingTeamId ? String(battingTeamId) : ""}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Select batting side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(team1Id)}>{team1Name}</SelectItem>
              <SelectItem value={String(team2Id)}>{team2Name}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Bowling team</p>
          <Select
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              onBowlingTeamChange(Number.parseInt(value, 10));
            }}
            value={bowlingTeamId ? String(bowlingTeamId) : ""}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Select bowling side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(team1Id)}>{team1Name}</SelectItem>
              <SelectItem value={String(team2Id)}>{team2Name}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
