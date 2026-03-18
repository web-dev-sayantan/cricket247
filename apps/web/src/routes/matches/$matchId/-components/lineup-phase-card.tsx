import { CheckIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  RosterPlayer,
  TeamSelection,
} from "@/routes/matches/$matchId/-pre-match-types";

export interface LineupPhaseCardProps {
  isLineupValid: boolean;
  isSaving: boolean;
  maxPlayers: number;
  onSaveLineups: () => void;
  setTeam1Selection: (selection: TeamSelection) => void;
  setTeam2Selection: (selection: TeamSelection) => void;
  team1Roster: RosterPlayer[];
  team1Selection: TeamSelection;
  team1ShortName: string;
  team2Roster: RosterPlayer[];
  team2Selection: TeamSelection;
  team2ShortName: string;
}

export function LineupPhaseCard({
  isLineupValid,
  isSaving,
  maxPlayers,
  onSaveLineups,
  setTeam1Selection,
  setTeam2Selection,
  team1Roster,
  team1Selection,
  team1ShortName,
  team2Roster,
  team2Selection,
  team2ShortName,
}: LineupPhaseCardProps) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="font-medium text-xl">Choose playing lineups</h2>
        <p className="text-muted-foreground text-sm">
          Pick the players in today&apos;s XI for both teams before the toss.
        </p>
      </div>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {team1ShortName}: {team1Selection.playerIds.length}/{maxPlayers}
        {" • "}
        {team2ShortName}: {team2Selection.playerIds.length}/{maxPlayers}
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineupSelectorCard
          maxPlayers={maxPlayers}
          roster={team1Roster}
          selection={team1Selection}
          setSelection={setTeam1Selection}
          teamLabel={team1ShortName}
        />
        <LineupSelectorCard
          maxPlayers={maxPlayers}
          roster={team2Roster}
          selection={team2Selection}
          setSelection={setTeam2Selection}
          teamLabel={team2ShortName}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          className="h-12 rounded-2xl"
          disabled={!isLineupValid || isSaving}
          onClick={onSaveLineups}
          type="button"
        >
          <CheckIcon className="mr-2 size-4" />
          {isSaving ? "Saving..." : "Save playing lineups"}
        </Button>
        <p
          aria-live="polite"
          className={cn("text-sm", {
            "text-emerald-600": isLineupValid,
            "text-muted-foreground": !isLineupValid,
          })}
        >
          {isLineupValid
            ? "Both teams have full playing lineups."
            : "Select a full playing lineup for both teams."}
        </p>
      </div>
    </section>
  );
}

function LineupSelectorCard({
  maxPlayers,
  roster,
  selection,
  setSelection,
  teamLabel,
}: {
  maxPlayers: number;
  roster: RosterPlayer[];
  selection: TeamSelection;
  setSelection: (selection: TeamSelection) => void;
  teamLabel: string;
}) {
  const selectedPlayerSet = useMemo(
    () => new Set(selection.playerIds),
    [selection.playerIds]
  );

  const idPrefix = useMemo(
    () =>
      `${teamLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${roster[0]?.teamId ?? "team"}`,
    [teamLabel, roster]
  );

  const removePlayerDependentFlags = (
    nextPlayerIds: number[],
    previousSelection: TeamSelection
  ) => ({
    playerIds: nextPlayerIds,
    captainPlayerId: nextPlayerIds.includes(
      previousSelection.captainPlayerId ?? -1
    )
      ? previousSelection.captainPlayerId
      : undefined,
    viceCaptainPlayerId: nextPlayerIds.includes(
      previousSelection.viceCaptainPlayerId ?? -1
    )
      ? previousSelection.viceCaptainPlayerId
      : undefined,
    wicketKeeperPlayerId: nextPlayerIds.includes(
      previousSelection.wicketKeeperPlayerId ?? -1
    )
      ? previousSelection.wicketKeeperPlayerId
      : undefined,
  });

  const togglePlayer = (playerId: number) => {
    const isSelected = selectedPlayerSet.has(playerId);

    if (isSelected) {
      const nextPlayerIds = selection.playerIds.filter((id) => id !== playerId);
      setSelection(removePlayerDependentFlags(nextPlayerIds, selection));
      return;
    }

    if (selection.playerIds.length >= maxPlayers) {
      return;
    }

    setSelection({
      ...selection,
      playerIds: [...selection.playerIds, playerId],
    });
  };

  const selectedPlayers = roster.filter((player) =>
    selection.playerIds.includes(player.playerId)
  );

  const setOptionalRole = (
    key: "captainPlayerId" | "viceCaptainPlayerId" | "wicketKeeperPlayerId",
    rawValue: string
  ) => {
    setSelection({
      ...selection,
      [key]: rawValue.length > 0 ? Number.parseInt(rawValue, 10) : undefined,
    });
  };

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm sm:text-base">{teamLabel} lineup</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Selected: {selection.playerIds.length}/{maxPlayers}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Select players for {teamLabel}</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roster.map((player) => {
            const isChecked = selectedPlayerSet.has(player.playerId);
            const isDisabled =
              !isChecked && selection.playerIds.length >= maxPlayers;
            const inputId = `${idPrefix}-player-${String(player.playerId)}`;

            return (
              <li key={player.playerId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[1.1rem] border bg-background p-2.5 text-sm transition-colors",
                    {
                      "border-primary/60 bg-primary/5": isChecked,
                      "cursor-not-allowed opacity-60": isDisabled,
                    }
                  )}
                  htmlFor={inputId}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    id={inputId}
                    onCheckedChange={() => togglePlayer(player.playerId)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {player.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {player.role}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">Optional roles</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <RolePicker
            id={`${idPrefix}-captain`}
            label="Captain"
            onChange={(value) => setOptionalRole("captainPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.captainPlayerId ? String(selection.captainPlayerId) : ""
            }
          />
          <RolePicker
            id={`${idPrefix}-vice-captain`}
            label="Vice captain"
            onChange={(value) => setOptionalRole("viceCaptainPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.viceCaptainPlayerId
                ? String(selection.viceCaptainPlayerId)
                : ""
            }
          />
          <RolePicker
            id={`${idPrefix}-wicket-keeper`}
            label="Wicket keeper"
            onChange={(value) => setOptionalRole("wicketKeeperPlayerId", value)}
            players={selectedPlayers}
            value={
              selection.wicketKeeperPlayerId
                ? String(selection.wicketKeeperPlayerId)
                : ""
            }
          />
        </div>
      </fieldset>
    </section>
  );
}

function RolePicker({
  id,
  label,
  onChange,
  players,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  players: RosterPlayer[];
  value: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs" htmlFor={id}>
        {label}
      </label>
      <select
        className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
        disabled={players.length === 0}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {players.map((player) => (
          <option key={player.playerId} value={String(player.playerId)}>
            {player.name}
          </option>
        ))}
      </select>
    </div>
  );
}
