import type { WicketType } from "@cricket247/server/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ScoringPlayerOption {
  battingOrder?: null | number;
  id: number;
  name: string;
  teamId: number;
}

export interface DeliveryDraft {
  assistedById: null | number;
  batterRuns: number;
  bowlerId: null | number;
  byeRuns: number;
  dismissedPlayerId: null | number;
  inningsId: number;
  legByeRuns: number;
  noBallRuns: number;
  nonStrikerId: null | number;
  penaltyRuns: number;
  strikerId: null | number;
  wicketType: "" | WicketType;
  wideRuns: number;
}

interface ScoreABallProps {
  battingLabel: string;
  battingPlayers: ScoringPlayerOption[];
  bowlingLabel: string;
  bowlingPlayers: ScoringPlayerOption[];
  currentBallLabel: string;
  draft: DeliveryDraft;
  fieldingOptions: ScoringPlayerOption[];
  isEditing: boolean;
  isSubmitting?: boolean;
  matchFlags: {
    hasBoundaryOut: boolean;
    hasBye: boolean;
    hasLBW: boolean;
    hasLegBye: boolean;
    hasNoBalls: boolean;
    hasPenaltyRuns: boolean;
    hasWides: boolean;
  };
  onChange: (patch: Partial<DeliveryDraft>) => void;
  onDelete?: () => void;
  onReset: () => void;
  onSubmit: () => void;
  requiredSelections: {
    bowler: boolean;
    nonStriker: boolean;
    striker: boolean;
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The delivery editor intentionally groups the scorer controls into one focused surface.
function ScoreABall({
  draft,
  battingLabel,
  bowlingLabel,
  battingPlayers,
  bowlingPlayers,
  currentBallLabel,
  fieldingOptions,
  matchFlags,
  requiredSelections,
  isEditing,
  isSubmitting,
  onChange,
  onDelete,
  onReset,
  onSubmit,
}: ScoreABallProps) {
  const wicketOptions = (
    [
      "bowled",
      "caught",
      "caught and bowled",
      "lbw",
      "run out",
      "stumped",
      "hit wicket",
      "boundary out",
      "handled the ball",
      "obstructing the field",
      "timed out",
      "retired hurt",
      "retired out",
      "others",
    ] as const
  ).filter((type) => {
    if (type === "lbw") {
      return matchFlags.hasLBW;
    }

    if (type === "boundary out") {
      return matchFlags.hasBoundaryOut;
    }

    return true;
  }) as WicketType[];

  const dismissalTypesWithAssist = new Set<WicketType>([
    "boundary out",
    "caught",
    "run out",
    "stumped",
  ]);
  const strikerOnlyDismissalTypes = new Set<WicketType>(["bowled", "lbw"]);
  const dismissalRequiresAssist = draft.wicketType
    ? dismissalTypesWithAssist.has(draft.wicketType)
    : false;
  const emptyDismissalValue = "__none__";

  const hasExtras =
    draft.wideRuns > 0 ||
    draft.noBallRuns > 0 ||
    draft.byeRuns > 0 ||
    draft.legByeRuns > 0 ||
    draft.penaltyRuns > 0;
  const [showExtras, setShowExtras] = useState(false);
  const extrasVisible = showExtras || hasExtras;

  let submitLabel = "Record delivery";
  if (isSubmitting) {
    submitLabel = isEditing ? "Updating delivery..." : "Recording delivery...";
  } else if (isEditing) {
    submitLabel = "Update delivery";
  }

  return (
    <section className="space-y-5 rounded-[1.75rem] border border-border/70 bg-card px-4 py-5 shadow-sm sm:px-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-medium text-muted-foreground text-xs uppercase tracking-[0.22em]">
              Live scoring
            </p>
            <h2 className="truncate font-semibold text-xl">
              {isEditing ? "Edit delivery" : "Record next delivery"}
            </h2>
          </div>
          <div className="max-w-full shrink-0 truncate rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-sm">
            {currentBallLabel}
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-border/60 bg-muted/20 p-3 sm:grid-cols-2">
          <StatChip label="Batting" value={battingLabel} />
          <StatChip label="Bowling" value={bowlingLabel} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Players on the ball */}
        <fieldset className="space-y-3">
          <legend className="font-medium text-sm">
            Players for this delivery
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <PlayerSelect
              label={
                requiredSelections.striker ? "Striker (required)" : "Striker"
              }
              onValueChange={(value) => {
                const nextStrikerId =
                  value && value.length > 0 ? Number.parseInt(value, 10) : null;

                onChange({
                  strikerId: nextStrikerId,
                  nonStrikerId:
                    draft.nonStrikerId === nextStrikerId
                      ? null
                      : draft.nonStrikerId,
                });
              }}
              options={battingPlayers}
              value={draft.strikerId ? String(draft.strikerId) : ""}
            />
            <PlayerSelect
              label={
                requiredSelections.nonStriker
                  ? "Non-striker (required)"
                  : "Non-striker"
              }
              onValueChange={(value) =>
                onChange({
                  nonStrikerId:
                    value && value.length > 0
                      ? Number.parseInt(value, 10)
                      : null,
                })
              }
              options={battingPlayers.filter(
                (player) => player.id !== draft.strikerId
              )}
              value={draft.nonStrikerId ? String(draft.nonStrikerId) : ""}
            />
            <PlayerSelect
              label={requiredSelections.bowler ? "Bowler (required)" : "Bowler"}
              onValueChange={(value) =>
                onChange({
                  bowlerId:
                    value && value.length > 0
                      ? Number.parseInt(value, 10)
                      : null,
                })
              }
              options={bowlingPlayers}
              value={draft.bowlerId ? String(draft.bowlerId) : ""}
            />
          </div>
        </fieldset>

        {/* Bat runs quick-pick */}
        <fieldset className="space-y-3">
          <legend className="font-medium text-sm">Bat runs</legend>
          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <button
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-2xl border font-semibold text-base transition-colors",
                  draft.batterRuns === runs
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background hover:border-primary/50"
                )}
                key={runs}
                onClick={() => onChange({ batterRuns: runs })}
                type="button"
              >
                {runs}
              </button>
            ))}
          </div>
          <NumberField
            label="Other bat runs"
            onChange={(value) => onChange({ batterRuns: value })}
            value={draft.batterRuns}
          />
        </fieldset>

        {/* Extras (collapsible) */}
        <div className="space-y-3">
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 font-medium text-sm transition-colors hover:bg-muted/40"
            onClick={() => setShowExtras((prev) => !prev)}
            type="button"
          >
            <span>Extras</span>
            {extrasVisible && !hasExtras ? (
              <ChevronUpIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            )}
          </button>

          {extrasVisible ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField
                disabled={!matchFlags.hasWides}
                label="Wide runs"
                onChange={(value) => onChange({ wideRuns: value })}
                value={draft.wideRuns}
              />
              <NumberField
                disabled={!matchFlags.hasNoBalls}
                label="No-ball runs"
                onChange={(value) => onChange({ noBallRuns: value })}
                value={draft.noBallRuns}
              />
              <NumberField
                disabled={!matchFlags.hasBye}
                label="Bye runs"
                onChange={(value) => onChange({ byeRuns: value })}
                value={draft.byeRuns}
              />
              <NumberField
                disabled={!matchFlags.hasLegBye}
                label="Leg-bye runs"
                onChange={(value) => onChange({ legByeRuns: value })}
                value={draft.legByeRuns}
              />
              <NumberField
                disabled={!matchFlags.hasPenaltyRuns}
                label="Penalty runs"
                onChange={(value) => onChange({ penaltyRuns: value })}
                value={draft.penaltyRuns}
              />
            </div>
          ) : null}
        </div>

        {/* Dismissal */}
        <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/15 p-4 sm:p-5">
          <p className="font-medium text-sm">Dismissal</p>
          <Select
            onValueChange={(value) => {
              if (value === null || value === emptyDismissalValue) {
                onChange({
                  wicketType: "",
                  dismissedPlayerId: null,
                  assistedById: null,
                });
                return;
              }

              const nextWicketType = value as WicketType;
              onChange({
                wicketType: nextWicketType,
                dismissedPlayerId: strikerOnlyDismissalTypes.has(nextWicketType)
                  ? draft.strikerId
                  : null,
                assistedById: dismissalTypesWithAssist.has(nextWicketType)
                  ? draft.assistedById
                  : null,
              });
            }}
            value={draft.wicketType || emptyDismissalValue}
          >
            <SelectTrigger className="h-14 w-full rounded-2xl capitalize [&>span]:min-w-0 [&>span]:truncate">
              <SelectValue placeholder="No wicket on this delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={emptyDismissalValue}>No wicket</SelectItem>
              {wicketOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="block truncate capitalize">{option}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {draft.wicketType ? (
            <div className="space-y-3">
              <PlayerSelect
                label="Dismissed batter"
                onValueChange={(value) =>
                  onChange({
                    dismissedPlayerId:
                      value && value.length > 0
                        ? Number.parseInt(value, 10)
                        : null,
                  })
                }
                options={battingPlayers.filter(
                  (player) =>
                    player.id === draft.strikerId ||
                    player.id === draft.nonStrikerId
                )}
                value={
                  draft.dismissedPlayerId ? String(draft.dismissedPlayerId) : ""
                }
              />

              <PlayerSelect
                label={
                  dismissalRequiresAssist
                    ? "Fielder (required)"
                    : "Fielder (optional)"
                }
                onValueChange={(value) =>
                  onChange({
                    assistedById:
                      value && value.length > 0
                        ? Number.parseInt(value, 10)
                        : null,
                  })
                }
                options={fieldingOptions}
                value={draft.assistedById ? String(draft.assistedById) : ""}
              />
            </div>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            className="h-14 w-full rounded-2xl font-semibold text-base [&_svg]:shrink-0"
            disabled={isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            {submitLabel}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-12 w-full truncate rounded-2xl [&_svg]:shrink-0"
              onClick={onReset}
              type="button"
              variant="outline"
            >
              <RotateCcwIcon className="mr-2 size-4" />
              <span className="truncate">Reset</span>
            </Button>
            <Button
              className="h-12 w-full truncate rounded-2xl [&_svg]:shrink-0"
              disabled={!(isEditing && onDelete) || isSubmitting}
              onClick={onDelete}
              type="button"
              variant="destructive"
            >
              <Trash2Icon className="mr-2 size-4" />
              <span className="truncate">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col space-y-1.5">
      <span className="truncate text-muted-foreground text-xs" title={label}>
        {label}
      </span>
      <Input
        className="h-14 w-full rounded-2xl text-base"
        disabled={disabled}
        min={0}
        onChange={(event) =>
          onChange(Number.parseInt(event.target.value || "0", 10) || 0)
        }
        type="number"
        value={value}
      />
    </div>
  );
}

function PlayerSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: string | null) => void;
  options: ScoringPlayerOption[];
  value: string;
}) {
  const selectedPlayerName =
    options.find((player) => String(player.id) === value)?.name ?? "";

  return (
    <div className="flex min-w-0 flex-col space-y-1.5">
      <span className="truncate text-muted-foreground text-xs" title={label}>
        {label}
      </span>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="h-14 w-full rounded-2xl [&>span]:min-w-0 [&>span]:truncate">
          <SelectValue placeholder="Select player">
            {selectedPlayerName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((player) => (
            <SelectItem
              key={player.id}
              label={player.name}
              value={String(player.id)}
            >
              <span className="block truncate">{player.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-[1.15rem] border border-border/60 bg-background/80 px-3 py-2.5">
      <p
        className="truncate font-medium text-[10px] text-muted-foreground uppercase tracking-[0.18em] sm:text-[11px]"
        title={label}
      >
        {label}
      </p>
      <p className="truncate font-medium text-sm sm:text-base" title={value}>
        {value}
      </p>
    </div>
  );
}

export default ScoreABall;
