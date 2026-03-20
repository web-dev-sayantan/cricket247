import type { WicketType } from "@cricket247/server/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export interface MatchFlags {
  hasBoundaryOut: boolean;
  hasBye: boolean;
  hasLBW: boolean;
  hasLegBye: boolean;
  hasNoBalls: boolean;
  hasPenaltyRuns: boolean;
  hasWides: boolean;
}

type ExtraField =
  | "byeRuns"
  | "legByeRuns"
  | "noBallRuns"
  | "penaltyRuns"
  | "wideRuns";

interface ScoreABallProps {
  battingPlayers: ScoringPlayerOption[];
  bowlingPlayers: ScoringPlayerOption[];
  currentBallLabel: string;
  draft: DeliveryDraft;
  fieldingOptions: ScoringPlayerOption[];
  isEditing: boolean;
  isSubmitting?: boolean;
  matchFlags: MatchFlags;
  onChange: (patch: Partial<DeliveryDraft>) => void;
  onDelete?: () => void;
  onDiscardEdit?: () => void;
  onReset: () => void;
  onSubmit: () => void;
  requiredSelections: {
    bowler: boolean;
    nonStriker: boolean;
    striker: boolean;
  };
}

export function resolveBattingPairSelection(params: {
  currentNonStrikerId: null | number;
  currentStrikerId: null | number;
  nextPlayerId: null | number;
  role: "nonStriker" | "striker";
}) {
  const { currentNonStrikerId, currentStrikerId, nextPlayerId, role } = params;

  if (role === "striker") {
    if (nextPlayerId === null) {
      return {
        strikerId: null,
        nonStrikerId: currentNonStrikerId,
      };
    }

    if (nextPlayerId === currentNonStrikerId) {
      return {
        strikerId: currentNonStrikerId,
        nonStrikerId: currentStrikerId,
      };
    }

    return {
      strikerId: nextPlayerId,
      nonStrikerId:
        currentNonStrikerId === nextPlayerId ? null : currentNonStrikerId,
    };
  }

  if (nextPlayerId === null) {
    return {
      strikerId: currentStrikerId,
      nonStrikerId: null,
    };
  }

  if (nextPlayerId === currentStrikerId) {
    return {
      strikerId: currentNonStrikerId,
      nonStrikerId: currentStrikerId,
    };
  }

  return {
    strikerId: currentStrikerId === nextPlayerId ? null : currentStrikerId,
    nonStrikerId: nextPlayerId,
  };
}

const ALL_DISMISSAL_TYPES = [
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
] as const satisfies readonly WicketType[];

const COMMON_DISMISSAL_TYPES = [
  "bowled",
  "caught",
  "lbw",
  "run out",
  "stumped",
] as const satisfies readonly WicketType[];

const DISMISSAL_LABELS: Record<WicketType, string> = {
  bowled: "Bowled",
  bold: "Bowled",
  caught: "Caught",
  "caught and bowled": "Caught & bowled",
  lbw: "LBW",
  "run out": "Run out",
  stumped: "Stumped",
  "hit wicket": "Hit wicket",
  "boundary out": "Boundary out",
  "handled the ball": "Handled the ball",
  "obstructing the field": "Obstructing the field",
  "timed out": "Timed out",
  "retired hurt": "Retired hurt",
  "retired out": "Retired out",
  others: "Others",
};

const NO_BALL_ALLOWED_DISMISSALS = new Set<WicketType>(["run out"]);

const WIDE_ALLOWED_DISMISSALS = new Set<WicketType>([
  "run out",
  "stumped",
  "hit wicket",
  "obstructing the field",
]);

const BATTER_RUN_ALLOWED_DISMISSALS = new Set<WicketType>([
  "run out",
  "obstructing the field",
]);

export function normalizeDismissalTypeForUI(
  wicketType: "" | WicketType | null | undefined
): "" | Exclude<WicketType, "bold"> {
  if (!wicketType) {
    return "";
  }

  return wicketType === "bold" ? "bowled" : wicketType;
}

export function getVisibleExtras(matchFlags: MatchFlags) {
  const visibleExtras: ExtraField[] = [];

  if (matchFlags.hasWides) {
    visibleExtras.push("wideRuns");
  }

  if (matchFlags.hasNoBalls) {
    visibleExtras.push("noBallRuns");
  }

  if (matchFlags.hasBye) {
    visibleExtras.push("byeRuns");
  }

  if (matchFlags.hasLegBye) {
    visibleExtras.push("legByeRuns");
  }

  if (matchFlags.hasPenaltyRuns) {
    visibleExtras.push("penaltyRuns");
  }

  return visibleExtras;
}

export function getVisibleDismissals(matchFlags: MatchFlags) {
  return ALL_DISMISSAL_TYPES.filter((type) => {
    if (type === "lbw") {
      return matchFlags.hasLBW;
    }

    if (type === "boundary out") {
      return matchFlags.hasBoundaryOut;
    }

    return true;
  });
}

export function dismissalAllowsBatterRuns(
  wicketType: "" | WicketType | null | undefined
) {
  const normalizedWicketType = normalizeDismissalTypeForUI(wicketType);
  if (!normalizedWicketType) {
    return true;
  }

  return BATTER_RUN_ALLOWED_DISMISSALS.has(normalizedWicketType);
}

export function getAllowedDismissals(params: {
  draft: Pick<DeliveryDraft, "noBallRuns" | "wideRuns">;
  matchFlags: MatchFlags;
}) {
  const visibleDismissals = getVisibleDismissals(params.matchFlags);

  if (params.draft.noBallRuns > 0) {
    return visibleDismissals.filter((dismissalType) =>
      NO_BALL_ALLOWED_DISMISSALS.has(dismissalType)
    );
  }

  if (params.draft.wideRuns > 0) {
    return visibleDismissals.filter((dismissalType) =>
      WIDE_ALLOWED_DISMISSALS.has(dismissalType)
    );
  }

  return visibleDismissals;
}

function getDismissalLabel(wicketType: WicketType) {
  return DISMISSAL_LABELS[wicketType] ?? wicketType;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The delivery editor intentionally groups the scorer controls into one focused surface.
function ScoreABall({
  draft,
  battingPlayers,
  bowlingPlayers,
  currentBallLabel,
  fieldingOptions,
  matchFlags,
  requiredSelections,
  isEditing,
  isSubmitting,
  onChange,
  onDiscardEdit,
  onDelete,
  onReset,
  onSubmit,
}: ScoreABallProps) {
  const dismissalTypesWithAssist = new Set<WicketType>([
    "boundary out",
    "caught",
    "run out",
    "stumped",
  ]);
  const strikerOnlyDismissalTypes = new Set<WicketType>([
    "bowled",
    "lbw",
    "caught",
    "hit wicket",
    "caught and bowled",
    "stumped",
    "handled the ball",
  ]);
  const visibleExtras = getVisibleExtras(matchFlags);
  const visibleDismissals = getAllowedDismissals({
    draft,
    matchFlags,
  });
  const commonDismissals = COMMON_DISMISSAL_TYPES.filter((type) =>
    visibleDismissals.includes(type)
  );
  const commonDismissalSet = new Set<WicketType>(commonDismissals);
  const moreDismissals = visibleDismissals.filter(
    (type) => !commonDismissalSet.has(type)
  );
  const normalizedWicketType = normalizeDismissalTypeForUI(draft.wicketType);
  const dismissalRequiresAssist = normalizedWicketType
    ? dismissalTypesWithAssist.has(normalizedWicketType)
    : false;
  const isWicketActive = normalizedWicketType.length > 0;
  const moreDismissalPlaceholder = "__more__";

  const hasExtras =
    draft.wideRuns > 0 ||
    draft.noBallRuns > 0 ||
    draft.byeRuns > 0 ||
    draft.legByeRuns > 0 ||
    draft.penaltyRuns > 0;
  const [showExtras, setShowExtras] = useState(false);
  const extrasVisible = showExtras || hasExtras;
  const hasWide = draft.wideRuns > 0;
  const hasNoBall = draft.noBallRuns > 0;
  const hasBye = draft.byeRuns > 0;
  const hasLegBye = draft.legByeRuns > 0;
  const hasBatRuns = draft.batterRuns > 0;
  const canScoreBatterRuns = dismissalAllowsBatterRuns(normalizedWicketType);
  const selectedMoreDismissalValue = moreDismissals.some(
    (type) => type === normalizedWicketType
  )
    ? normalizedWicketType
    : moreDismissalPlaceholder;

  useEffect(() => {
    if (hasExtras) {
      setShowExtras(true);
    }
  }, [hasExtras]);

  useEffect(() => {
    const patch: Partial<DeliveryDraft> = {};

    if (
      normalizedWicketType &&
      !visibleDismissals.includes(normalizedWicketType)
    ) {
      patch.wicketType = "";
      patch.dismissedPlayerId = null;
      patch.assistedById = null;
    }

    if (draft.batterRuns > 0 && !canScoreBatterRuns) {
      patch.batterRuns = 0;
    }

    if (Object.keys(patch).length > 0) {
      onChange(patch);
    }
  }, [
    canScoreBatterRuns,
    draft.batterRuns,
    normalizedWicketType,
    onChange,
    visibleDismissals,
  ]);

  let submitLabel = "Record delivery";
  if (isSubmitting) {
    submitLabel = isEditing ? "Updating delivery..." : "Recording delivery...";
  } else if (isEditing) {
    submitLabel = "Update delivery";
  }

  const applyDismissalType = (nextWicketType: "" | WicketType) => {
    if (!nextWicketType) {
      onChange({
        wicketType: "",
        dismissedPlayerId: null,
        assistedById: null,
      });
      return;
    }

    onChange({
      wicketType: nextWicketType,
      batterRuns: dismissalAllowsBatterRuns(nextWicketType)
        ? draft.batterRuns
        : 0,
      dismissedPlayerId: strikerOnlyDismissalTypes.has(nextWicketType)
        ? draft.strikerId
        : null,
      assistedById: dismissalTypesWithAssist.has(nextWicketType)
        ? draft.assistedById
        : null,
    });
  };

  const setBatterRuns = (value: number) => {
    onChange({
      batterRuns: value,
      byeRuns: value > 0 ? 0 : draft.byeRuns,
      legByeRuns: value > 0 ? 0 : draft.legByeRuns,
      wideRuns: value > 0 ? 0 : draft.wideRuns,
    });
  };

  const setByeRuns = (value: number) => {
    onChange({
      batterRuns: value > 0 ? 0 : draft.batterRuns,
      byeRuns: value,
      legByeRuns: value > 0 ? 0 : draft.legByeRuns,
    });
  };

  const setLegByeRuns = (value: number) => {
    onChange({
      batterRuns: value > 0 ? 0 : draft.batterRuns,
      byeRuns: value > 0 ? 0 : draft.byeRuns,
      legByeRuns: value,
      wideRuns: value > 0 ? 0 : draft.wideRuns,
    });
  };

  const toggleWideRuns = () => {
    if (hasWide) {
      onChange({ wideRuns: 0 });
      return;
    }

    onChange({
      batterRuns: 0,
      legByeRuns: 0,
      noBallRuns: 0,
      wideRuns: 1,
    });
  };

  const toggleNoBallRuns = () => {
    if (hasNoBall) {
      onChange({ noBallRuns: 0 });
      return;
    }

    onChange({
      noBallRuns: 1,
      wideRuns: 0,
    });
  };

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

                onChange(
                  resolveBattingPairSelection({
                    currentNonStrikerId: draft.nonStrikerId,
                    currentStrikerId: draft.strikerId,
                    nextPlayerId: nextStrikerId,
                    role: "striker",
                  })
                );
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
              onValueChange={(value) => {
                const nextNonStrikerId =
                  value && value.length > 0 ? Number.parseInt(value, 10) : null;

                onChange(
                  resolveBattingPairSelection({
                    currentNonStrikerId: draft.nonStrikerId,
                    currentStrikerId: draft.strikerId,
                    nextPlayerId: nextNonStrikerId,
                    role: "nonStriker",
                  })
                );
              }}
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
                aria-pressed={draft.batterRuns === runs}
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-2xl border font-semibold text-base transition-colors",
                  draft.batterRuns === runs
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background hover:border-primary/50",
                  hasWide || hasBye || hasLegBye
                    ? "cursor-not-allowed opacity-60"
                    : null
                )}
                disabled={hasWide || hasBye || hasLegBye || !canScoreBatterRuns}
                key={runs}
                onClick={() => setBatterRuns(runs)}
                type="button"
              >
                {runs}
              </button>
            ))}
          </div>
          <NumberField
            disabled={hasWide || hasBye || hasLegBye || !canScoreBatterRuns}
            label="Other bat runs"
            onChange={setBatterRuns}
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
            <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/10 p-4">
              {visibleExtras.includes("wideRuns") ||
              visibleExtras.includes("noBallRuns") ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleExtras.includes("wideRuns") ? (
                    <ToggleField
                      active={hasWide}
                      description="Adds 1 run and marks the ball as a wide"
                      label="Wide"
                      onClick={toggleWideRuns}
                    />
                  ) : null}
                  {visibleExtras.includes("noBallRuns") ? (
                    <ToggleField
                      active={hasNoBall}
                      description="Adds 1 run and marks the ball as a no-ball"
                      label="No-ball"
                      onClick={toggleNoBallRuns}
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleExtras.includes("byeRuns") ? (
                  <NumberField
                    disabled={hasBatRuns || hasLegBye}
                    label="Bye runs"
                    onChange={setByeRuns}
                    value={draft.byeRuns}
                  />
                ) : null}
                {visibleExtras.includes("legByeRuns") ? (
                  <NumberField
                    disabled={hasBatRuns || hasBye || hasWide}
                    label="Leg-bye runs"
                    onChange={setLegByeRuns}
                    value={draft.legByeRuns}
                  />
                ) : null}
                {visibleExtras.includes("penaltyRuns") ? (
                  <NumberField
                    label="Penalty runs"
                    onChange={(value) => onChange({ penaltyRuns: value })}
                    value={draft.penaltyRuns}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Dismissal */}
        <div
          className={cn(
            "space-y-4 rounded-[1.5rem] border p-4 sm:p-5",
            isWicketActive
              ? "border-destructive/40 bg-destructive/10"
              : "border-border/60 bg-muted/15"
          )}
        >
          <div className="space-y-1">
            <p
              className={cn(
                "font-medium text-sm",
                isWicketActive ? "text-destructive" : null
              )}
            >
              Dismissal
            </p>
            <p className="text-muted-foreground text-xs">
              Keep common wickets one tap away and hide invalid options for this
              match.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <DismissalQuickButton
              active={!isWicketActive}
              label="No wicket"
              onClick={() => applyDismissalType("")}
              tone="default"
            />
            {commonDismissals.map((dismissalType) => (
              <DismissalQuickButton
                active={normalizedWicketType === dismissalType}
                key={dismissalType}
                label={getDismissalLabel(dismissalType)}
                onClick={() => applyDismissalType(dismissalType)}
                tone="destructive"
              />
            ))}
          </div>

          {moreDismissals.length > 0 ? (
            <div className="space-y-1.5">
              <span className="truncate text-muted-foreground text-xs">
                More dismissals
              </span>
              <Select
                onValueChange={(value) => {
                  if (value === moreDismissalPlaceholder) {
                    return;
                  }

                  applyDismissalType(value as WicketType);
                }}
                value={selectedMoreDismissalValue}
              >
                <SelectTrigger className="h-14 w-full rounded-2xl [&>span]:min-w-0 [&>span]:truncate">
                  <SelectValue placeholder="More dismissal types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={moreDismissalPlaceholder}>
                    More dismissal types
                  </SelectItem>
                  {moreDismissals.map((dismissalType) => (
                    <SelectItem key={dismissalType} value={dismissalType}>
                      <span className="block truncate">
                        {getDismissalLabel(dismissalType)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isWicketActive ? (
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
          <div className="md:flex md:items-center md:justify-between md:gap-2">
            <Button
              className="h-14 flex-1 rounded-2xl font-semibold text-base [&_svg]:shrink-0"
              disabled={isSubmitting}
              onClick={onSubmit}
              type="button"
            >
              {submitLabel}
            </Button>

            {isEditing && onDiscardEdit ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="h-12 rounded-2xl"
                      disabled={isSubmitting}
                      onClick={onDiscardEdit}
                      title="Back to Latest Delivery"
                      type="button"
                      variant="destructive"
                    >
                      Discard edit
                    </Button>
                  }
                />
                <TooltipContent side="top">
                  Back to Latest Delivery
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

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

function ToggleField({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background hover:border-primary/40"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="font-medium text-sm">{label}</span>
      <span
        className={cn(
          "mt-1 text-xs",
          active ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        {description}
      </span>
    </button>
  );
}

function DismissalQuickButton({
  active,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone: "default" | "destructive";
}) {
  let toneClasses = "border-border/60 bg-background hover:border-primary/40";

  if (tone === "destructive") {
    toneClasses = active
      ? "border-destructive bg-destructive text-destructive-foreground"
      : "border-destructive/30 bg-background text-foreground hover:border-destructive/60";
  } else if (active) {
    toneClasses = "border-primary bg-primary text-primary-foreground";
  }

  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex min-h-12 items-center justify-center rounded-2xl border px-3 py-2 font-medium text-sm transition-colors",
        toneClasses
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
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

export default ScoreABall;
