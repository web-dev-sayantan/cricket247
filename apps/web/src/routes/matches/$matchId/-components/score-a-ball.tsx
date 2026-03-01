import type { WicketType } from "@cricket247/server/types";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ScoringPlayerOption {
  id: number;
  name: string;
}

export interface ScoringDelivery {
  assistedById: number | null;
  ballInOver: number;
  batterRuns: number;
  bowler: ScoringPlayerOption;
  bowlerId: number;
  byeRuns: number;
  dismissedPlayerId: number | null;
  id: number;
  inningsId: number;
  isWicket: boolean;
  legByeRuns: number;
  noBallRuns: number;
  nonStriker: ScoringPlayerOption;
  nonStrikerId: number;
  overNumber: number;
  sequenceNo: number;
  striker: ScoringPlayerOption;
  strikerId: number;
  totalRuns: number;
  wicketType: null | string;
  wideRuns: number;
}

export interface ScoreBallUpdateInput {
  assistPlayerId?: number;
  bowlerId: number;
  dismissedPlayerId?: number;
  id: number;
  inningsId: number;
  isBye: boolean;
  isLegBye: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  isWide: boolean;
  nonStrikerId: number;
  runsScored: number;
  strikerId: number;
  wicketType?: WicketType;
}

interface DismissalState {
  assistPlayerId?: number;
  dismissedPlayerId: number;
  type: WicketType;
}

interface ScoreABallProps {
  ball: ScoringDelivery;
  bowlingPlayers: ScoringPlayerOption[];
  hasBoundaryOut?: boolean;
  hasBye?: boolean;
  hasLBW?: boolean;
  hasLegBye?: boolean;
  isSubmitting?: boolean;
  onSubmitBall: (input: ScoreBallUpdateInput) => void;
  otherBalls: ScoringDelivery[];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Ball scoring interactions are intentionally grouped in a single mobile panel.
function ScoreABall({
  ball,
  otherBalls,
  bowlingPlayers,
  hasLBW,
  hasBoundaryOut,
  hasBye,
  hasLegBye,
  isSubmitting,
  onSubmitBall,
}: ScoreABallProps) {
  const [runsScored, setRunsScored] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isBye, setIsBye] = useState(false);
  const [isLegBye, setIsLegBye] = useState(false);
  const [selectedStrikerId, setSelectedStrikerId] = useState(ball.strikerId);
  const [dismissal, setDismissal] = useState<DismissalState | null>(null);
  const [sheetDismissalType, setSheetDismissalType] = useState<
    "caught" | "run out" | "stumped" | null
  >(null);
  const [sheetAssistPlayerId, setSheetAssistPlayerId] = useState<number | null>(
    null
  );
  const [sheetDismissedPlayerId, setSheetDismissedPlayerId] = useState<
    number | null
  >(null);

  useEffect(() => {
    setRunsScored(ball.batterRuns + ball.byeRuns + ball.legByeRuns);
    setIsWide(ball.wideRuns > 0);
    setIsNoBall(ball.noBallRuns > 0);
    setIsBye(ball.byeRuns > 0);
    setIsLegBye(ball.legByeRuns > 0);
    setSelectedStrikerId(ball.strikerId);
    setDismissal(
      ball.isWicket
        ? {
            type: (ball.wicketType as WicketType | null) ?? "bowled",
            dismissedPlayerId: ball.dismissedPlayerId ?? ball.strikerId,
            assistPlayerId: ball.assistedById ?? undefined,
          }
        : null
    );
    setSheetDismissalType(null);
    setSheetAssistPlayerId(null);
    setSheetDismissedPlayerId(null);
  }, [ball]);

  const selectedNonStrikerId =
    selectedStrikerId === ball.strikerId ? ball.nonStrikerId : ball.strikerId;

  const displayTotalRuns = runsScored + (isWide || isNoBall ? 1 : 0);

  const dismissalLabel = useMemo(() => {
    if (!dismissal) {
      return "None";
    }

    let dismissedName = "Batter";
    if (dismissal.dismissedPlayerId === ball.strikerId) {
      dismissedName = ball.striker.name;
    } else if (dismissal.dismissedPlayerId === ball.nonStrikerId) {
      dismissedName = ball.nonStriker.name;
    }
    const assistName = dismissal.assistPlayerId
      ? bowlingPlayers.find((row) => row.id === dismissal.assistPlayerId)?.name
      : null;

    if (assistName) {
      return `${dismissal.type} • ${dismissedName} • ${assistName}`;
    }

    return `${dismissal.type} • ${dismissedName}`;
  }, [dismissal, ball, bowlingPlayers]);

  const clearBall = () => {
    setRunsScored(0);
    setIsWide(false);
    setIsNoBall(false);
    setIsBye(false);
    setIsLegBye(false);
    setSelectedStrikerId(ball.strikerId);
    setDismissal(null);
  };

  const submitBall = () => {
    onSubmitBall({
      id: ball.id,
      inningsId: ball.inningsId,
      strikerId: selectedStrikerId,
      nonStrikerId: selectedNonStrikerId,
      bowlerId: ball.bowlerId,
      runsScored,
      isWide,
      isNoBall,
      isBye,
      isLegBye,
      isWicket: Boolean(dismissal),
      wicketType: dismissal?.type,
      assistPlayerId: dismissal?.assistPlayerId,
      dismissedPlayerId: dismissal?.dismissedPlayerId,
    });
  };

  const setSimpleDismissal = (type: WicketType) => {
    setDismissal({
      type,
      dismissedPlayerId: selectedStrikerId,
    });
  };

  const saveSheetDismissal = () => {
    if (!(sheetDismissalType && sheetDismissedPlayerId)) {
      return;
    }

    setDismissal({
      type: sheetDismissalType,
      dismissedPlayerId: sheetDismissedPlayerId,
      assistPlayerId: sheetAssistPlayerId ?? undefined,
    });
    setSheetDismissalType(null);
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-base">Current Ball</h2>
          <span className="text-muted-foreground text-sm">
            Over {ball.overNumber}.{ball.ballInOver}
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-full gap-2 pb-1">
            {otherBalls.map((row) => {
              const label = row.isWicket ? "W" : String(row.totalRuns);
              return (
                <div
                  className={cn(
                    "rounded-md border px-2 py-1 text-sm",
                    row.id === ball.id && "border-primary bg-primary/10",
                    row.isWicket && "text-destructive"
                  )}
                  key={row.id}
                >
                  {label}
                  {row.wideRuns > 0 ? " wd" : ""}
                  {row.noBallRuns > 0 ? " nb" : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="h-12 justify-start px-3"
          onClick={() => setSelectedStrikerId(ball.strikerId)}
          variant={selectedStrikerId === ball.strikerId ? "default" : "outline"}
        >
          {ball.striker.name}
        </Button>
        <Button
          className="h-12 justify-start px-3"
          onClick={() => setSelectedStrikerId(ball.nonStrikerId)}
          variant={
            selectedStrikerId === ball.nonStrikerId ? "default" : "outline"
          }
        >
          {ball.nonStriker.name}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">Bowler: {ball.bowler.name}</p>
        <div className="flex items-center gap-3">
          <Input
            className="h-14 text-center font-semibold text-2xl"
            max={7}
            min={0}
            onChange={(event) =>
              setRunsScored(Number.parseInt(event.target.value || "0", 10) || 0)
            }
            type="number"
            value={displayTotalRuns}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setRunsScored(Math.max(0, runsScored - 1))}
              size="lg"
              type="button"
              variant="outline"
            >
              <MinusIcon />
            </Button>
            <Button
              onClick={() => setRunsScored(Math.min(7, runsScored + 1))}
              size="lg"
              type="button"
              variant="outline"
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 4, 6].map((runs) => (
            <Button
              key={runs}
              onClick={() => setRunsScored(runs)}
              size="lg"
              type="button"
              variant={runsScored === runs ? "default" : "secondary"}
            >
              {runs}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="font-medium text-sm">Extras</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            className="h-12"
            onClick={() => {
              setIsWide((value) => !value);
              setIsNoBall(false);
            }}
            type="button"
            variant={isWide ? "default" : "outline"}
          >
            Wide
          </Button>
          <Button
            className="h-12"
            onClick={() => {
              setIsNoBall((value) => !value);
              setIsWide(false);
            }}
            type="button"
            variant={isNoBall ? "default" : "outline"}
          >
            No Ball
          </Button>
          {hasBye ? (
            <Button
              className="h-12"
              onClick={() => {
                setIsBye((value) => !value);
                setIsLegBye(false);
              }}
              type="button"
              variant={isBye ? "default" : "outline"}
            >
              Bye
            </Button>
          ) : null}
          {hasLegBye ? (
            <Button
              className="h-12"
              onClick={() => {
                setIsLegBye((value) => !value);
                setIsBye(false);
              }}
              type="button"
              variant={isLegBye ? "default" : "outline"}
            >
              Leg Bye
            </Button>
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Dismissal</h3>
          <span className="text-muted-foreground text-xs capitalize">
            {dismissalLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            className="h-12"
            onClick={() => setSimpleDismissal("bowled")}
            type="button"
            variant={dismissal?.type === "bowled" ? "destructive" : "outline"}
          >
            Bowled
          </Button>
          <Button
            className="h-12"
            onClick={() => {
              setSheetDismissalType("caught");
              setSheetDismissedPlayerId(selectedStrikerId);
            }}
            type="button"
            variant={dismissal?.type === "caught" ? "destructive" : "outline"}
          >
            Caught
          </Button>
          <Button
            className="h-12"
            onClick={() => {
              setSheetDismissalType("run out");
              setSheetDismissedPlayerId(selectedStrikerId);
            }}
            type="button"
            variant={dismissal?.type === "run out" ? "destructive" : "outline"}
          >
            Run Out
          </Button>
          <Button
            className="h-12"
            onClick={() => {
              setSheetDismissalType("stumped");
              setSheetDismissedPlayerId(selectedStrikerId);
            }}
            type="button"
            variant={dismissal?.type === "stumped" ? "destructive" : "outline"}
          >
            Stumped
          </Button>
          {hasLBW ? (
            <Button
              className="h-12"
              onClick={() => setSimpleDismissal("lbw")}
              type="button"
              variant={dismissal?.type === "lbw" ? "destructive" : "outline"}
            >
              LBW
            </Button>
          ) : null}
          {hasBoundaryOut ? (
            <Button
              className="h-12"
              onClick={() => setSimpleDismissal("boundary out")}
              type="button"
              variant={
                dismissal?.type === "boundary out" ? "destructive" : "outline"
              }
            >
              Boundary Out
            </Button>
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button
          className="h-12"
          onClick={clearBall}
          type="button"
          variant="destructive"
        >
          Clear
        </Button>
        <Button
          className="h-12 flex-1"
          disabled={isSubmitting}
          onClick={submitBall}
          type="button"
        >
          {isSubmitting ? "Saving..." : "Next Ball"}
        </Button>
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setSheetDismissalType(null);
          }
        }}
        open={sheetDismissalType !== null}
      >
        <SheetContent side="bottom">
          <SheetTitle className="pb-4">
            {sheetDismissalType === "caught" && "Caught details"}
            {sheetDismissalType === "run out" && "Run out details"}
            {sheetDismissalType === "stumped" && "Stumped details"}
          </SheetTitle>
          <div className="space-y-3">
            {sheetDismissalType === "run out" ? (
              <Select
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setSheetDismissedPlayerId(Number.parseInt(value, 10));
                }}
                value={
                  sheetDismissedPlayerId ? String(sheetDismissedPlayerId) : ""
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Dismissed batter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(ball.strikerId)}>
                    {ball.striker.name}
                  </SelectItem>
                  <SelectItem value={String(ball.nonStrikerId)}>
                    {ball.nonStriker.name}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                setSheetAssistPlayerId(Number.parseInt(value, 10));
              }}
              value={sheetAssistPlayerId ? String(sheetAssistPlayerId) : ""}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Fielder" />
              </SelectTrigger>
              <SelectContent>
                {bowlingPlayers.map((player) => (
                  <SelectItem key={player.id} value={String(player.id)}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SheetFooter className="pt-6">
            <SheetClose>
              <Button
                className="h-12 w-full"
                onClick={saveSheetDismissal}
                type="button"
              >
                Save dismissal
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export default ScoreABall;
