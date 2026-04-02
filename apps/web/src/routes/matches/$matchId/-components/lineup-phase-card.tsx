import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function RoleIcon({ role }: { role: string }) {
  const lower = role.toLowerCase();
  const isBatter = lower.includes("batter") || lower.includes("bat");
  const isBowler = lower.includes("bowler") || lower.includes("bowl");
  const isAllRounder =
    lower.includes("all-rounder") || lower.includes("all rounder");
  const isWk =
    lower.includes("wicket") ||
    lower.includes("keeper") ||
    lower.includes("wk");

  const iconClass = "size-3.5 opacity-60 dark:invert";

  if (isAllRounder) {
    return (
      <span className="flex items-center gap-0.5" title="All-rounder">
        <img
          alt="bat"
          className={iconClass}
          height={16}
          src="/bat.svg"
          width={16}
        />
        <img
          alt="bowl"
          className={iconClass}
          height={16}
          src="/bowl.svg"
          width={16}
        />
      </span>
    );
  }
  if (isWk) {
    return (
      <img
        alt="Wicket keeper"
        className={iconClass}
        height={16}
        src="/wk.svg"
        title="Wicket keeper"
        width={16}
      />
    );
  }
  if (isBowler) {
    return (
      <img
        alt="Bowler"
        className={iconClass}
        height={14}
        src="/bowl.svg"
        title="Bowler"
        width={14}
      />
    );
  }
  if (isBatter) {
    return (
      <img
        alt="Batter"
        className={iconClass}
        height={14}
        src="/bat.svg"
        title="Batter"
        width={14}
      />
    );
  }
  return (
    <span className="text-[0.65rem] uppercase tracking-[0.18em]">
      {role.slice(0, 3)}
    </span>
  );
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
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);

  const activeRoster = activeTeam === 1 ? team1Roster : team2Roster;
  const activeSelection = activeTeam === 1 ? team1Selection : team2Selection;
  const setActiveSelection =
    activeTeam === 1 ? setTeam1Selection : setTeam2Selection;
  const activeLabel = activeTeam === 1 ? team1ShortName : team2ShortName;

  const team1Full = team1Selection.playerIds.length >= maxPlayers;
  const team2Full = team2Selection.playerIds.length >= maxPlayers;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
          Playing lineups
        </h2>
        <p className="text-muted-foreground text-sm">
          Pick {maxPlayers} players per team before the toss.
        </p>
      </div>

      {/* Team switcher tabs */}
      <div className="flex gap-2" role="tablist">
        <TeamTab
          count={team1Selection.playerIds.length}
          isFull={team1Full}
          isSelected={activeTeam === 1}
          label={team1ShortName}
          onSelect={() => setActiveTeam(1)}
        />
        <TeamTab
          count={team2Selection.playerIds.length}
          isFull={team2Full}
          isSelected={activeTeam === 2}
          label={team2ShortName}
          onSelect={() => setActiveTeam(2)}
        />
      </div>

      {/* Active team panel */}
      <LineupPanel
        key={activeTeam}
        maxPlayers={maxPlayers}
        roster={activeRoster}
        selection={activeSelection}
        setSelection={setActiveSelection}
        teamLabel={activeLabel}
      />

      {/* Confirm */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <Button
          className="angled-cut h-11 px-6"
          disabled={!isLineupValid || isSaving}
          onClick={onSaveLineups}
          type="button"
        >
          <CheckIcon className="mr-2 size-4" />
          {isSaving ? "Saving..." : "Confirm lineups"}
        </Button>
        <p
          aria-live="polite"
          className={cn("text-sm", {
            "text-primary": isLineupValid,
            "text-muted-foreground": !isLineupValid,
          })}
        >
          {isLineupValid
            ? "Both squads are set."
            : `Select ${maxPlayers} players per team to continue.`}
        </p>
      </div>
    </section>
  );
}

function TeamTab({
  count,
  isFull,
  isSelected,
  label,
  onSelect,
}: {
  count: number;
  isFull: boolean;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-selected={isSelected}
      className={cn(
        "angled-cut group relative flex flex-1 cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <span className="font-medium text-sm">{label}</span>
      {isFull ? (
        <CheckIcon
          className={cn(
            "size-3.5",
            isSelected ? "text-primary-foreground/80" : "text-primary"
          )}
        />
      ) : (
        <span
          className={cn(
            "font-semibold text-xs tabular-nums",
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function LineupPanel({
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

  const isFull = selection.playerIds.length >= maxPlayers;

  return (
    <div className="fade-in slide-in-from-right-2 animate-in space-y-5 duration-200">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
            choose {teamLabel} squad
          </p>
          <p aria-live="polite" className="text-sm tabular-nums">
            <span className="font-semibold text-foreground">
              {selection.playerIds.length}
            </span>
            <span className="text-muted-foreground">/{maxPlayers}</span>
          </p>
        </div>
        <div className="h-0.5 w-full overflow-hidden bg-border/80">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              isFull ? "bg-primary" : "bg-primary/60"
            )}
            style={{
              width: `${(selection.playerIds.length / maxPlayers) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Player grid */}
      <fieldset>
        <legend className="sr-only">Select players for {teamLabel}</legend>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {roster.map((player) => {
            const isChecked = selectedPlayerSet.has(player.playerId);
            const isDisabled = !isChecked && isFull;
            const inputId = `${idPrefix}-player-${String(player.playerId)}`;

            return (
              <li key={player.playerId}>
                <label
                  className={cn(
                    "group/tile flex w-full cursor-pointer flex-col items-start gap-1 p-3 text-left transition-all duration-150",
                    "border border-border/50 bg-card hover:border-primary/30",
                    isChecked &&
                      "border-primary/50 bg-[color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%)]",
                    isDisabled && "cursor-not-allowed opacity-40"
                  )}
                  htmlFor={inputId}
                >
                  <input
                    checked={isChecked}
                    className="sr-only"
                    disabled={isDisabled}
                    id={inputId}
                    onChange={() => togglePlayer(player.playerId)}
                    type="checkbox"
                  />
                  <span className="flex w-full items-start justify-between gap-1">
                    <span className="flex min-w-0 items-center gap-2 truncate font-medium text-sm leading-snug">
                      {player.name}
                      <RoleIcon role={player.role} />
                    </span>
                    {isChecked ? (
                      <span className="flex size-4 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                        <CheckIcon className="size-2.5" />
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* Role assignments */}
      {selectedPlayers.length > 0 ? (
        <div className="space-y-2 border-border/60 border-t pt-4">
          <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.22em]">
            Assign roles
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <RolePicker
              label="Captain"
              onChange={(value) =>
                setSelection({
                  ...selection,
                  captainPlayerId:
                    value.length > 0 ? Number.parseInt(value, 10) : undefined,
                })
              }
              players={selectedPlayers}
              value={
                selection.captainPlayerId
                  ? String(selection.captainPlayerId)
                  : ""
              }
            />
            <RolePicker
              label="Vice captain"
              onChange={(value) =>
                setSelection({
                  ...selection,
                  viceCaptainPlayerId:
                    value.length > 0 ? Number.parseInt(value, 10) : undefined,
                })
              }
              players={selectedPlayers}
              value={
                selection.viceCaptainPlayerId
                  ? String(selection.viceCaptainPlayerId)
                  : ""
              }
            />
            <RolePicker
              label="Wicket keeper"
              onChange={(value) =>
                setSelection({
                  ...selection,
                  wicketKeeperPlayerId:
                    value.length > 0 ? Number.parseInt(value, 10) : undefined,
                })
              }
              players={selectedPlayers}
              value={
                selection.wicketKeeperPlayerId
                  ? String(selection.wicketKeeperPlayerId)
                  : ""
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RolePicker({
  label,
  onChange,
  players,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  players: RosterPlayer[];
  value: string;
}) {
  const selectedPlayerName =
    players.find((player) => String(player.playerId) === value)?.name ?? "";

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <Select
        onValueChange={(value) => onChange(value ?? "")}
        value={value || undefined}
      >
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {selectedPlayerName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {players.map((player) => (
            <SelectItem
              key={player.playerId}
              label={player.name}
              value={String(player.playerId)}
            >
              {player.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
