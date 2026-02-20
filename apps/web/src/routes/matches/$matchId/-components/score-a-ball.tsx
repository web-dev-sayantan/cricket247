import type {
  BallWithPlayers,
  Dismissed,
  Innings,
  TeamPlayerType,
  UpdateBallData,
  WicketType,
} from "@cricket247/server/types";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn, getFirstName, shortenName } from "@/lib/utils";

function ScoreABall({
  ball,
  otherBalls,
  innings,
  bowlingTeamId,
  bowlingTeamPlayers,
  hasLBW,
  hasBoundaryOut,
  hasBye,
  hasLegBye,
  onSaveBallData,
}: {
  ball: BallWithPlayers;
  otherBalls: BallWithPlayers[];
  innings: Innings;
  bowlingTeamPlayers: TeamPlayerType[];
  bowlingTeamId: number;
  hasLBW?: boolean;
  hasBoundaryOut?: boolean;
  hasBye?: boolean;
  hasLegBye?: boolean;
  onSaveBallData: (
    data: UpdateBallData,
    inningsState: {
      inningsId: number;
      wickets: number;
      balls: number;
      extras: number;
      totalScore: number;
    },
    matchState: {
      matchId: number;
    }
  ) => Promise<void>;
}) {
  const [run, setRun] = useState(ball.runsScored);
  const [dismissed, setDismissed] = useState<Dismissed>();
  const [wide, setWide] = useState(ball.isWide);
  const [noBall, setNoBall] = useState(ball.isNoBall);
  const [bye, setBye] = useState(ball.isBye);
  const [legBye, setLegBye] = useState(ball.isLegBye);
  const [batsman, setBatsman] = useState(ball.striker);
  const [dismissedBy, setDismissedBy] = useState<number | undefined | null>(
    null
  );
  const [batterDismissed, setBatterDismissed] = useState<
    number | undefined | null
  >(null);
  const ballScore = useMemo(
    () => run + (wide || noBall ? 1 : 0),
    [run, wide, noBall]
  );
  const dismissedbyLabel = useMemo(
    () =>
      dismissed
        ? getFirstName(
            bowlingTeamPlayers.find(({ player }) => player.id === dismissedBy)
              ?.player.name
          )
        : undefined,
    [bowlingTeamPlayers, dismissed, dismissedBy]
  );
  const wicketLabel: Record<string, string> = {
    "run out": "R.O",
    caught: "W",
    stumped: "W",
    bold: "W",
    "boundary out": "W",
  };
  function handleWide() {
    if (noBall) {
      setNoBall(false);
    }
    if (
      !wide &&
      dismissed?.value &&
      !(dismissed.type === "run out" || dismissed.type === "stumped")
    ) {
      //Checking for !wide as state isn't updated yet
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    }
    setWide(!wide);
  }
  function handleNo() {
    if (wide) {
      setWide(false);
    }
    if (!noBall && dismissed?.value && dismissed.type !== "run out") {
      //Checking for !noball as state isn't updated yet
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    }
    setNoBall(!noBall);
  }

  function handleBye() {
    setBye(!bye);
  }
  function handleLegBye() {
    setLegBye(!legBye);
  }

  function handleRunScored(runScored: number) {
    setRun(runScored);
    if (dismissed?.value) {
      if (
        dismissed?.type === "run out" ||
        (dismissed?.type === "stumped" && runScored > 1)
      ) {
        return;
      }
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    }
  }

  function handleBoldOut() {
    if (dismissed?.type === "bold") {
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    } else {
      setDismissed({ value: true, type: "bold" });
      setDismissedBy(undefined);
      setBatterDismissed(ball.strikerId);
      setRun(0);
      if (wide) {
        setWide(false);
      }
      if (noBall) {
        setNoBall(false);
      }
    }
  }

  function handleLBW() {
    if (dismissed?.type === "lbw") {
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    } else {
      setDismissed({ value: true, type: "lbw" });
      setDismissedBy(undefined);
      setBatterDismissed(ball.strikerId);
      setRun(0);
      if (wide) {
        setWide(false);
      }
      if (noBall) {
        setNoBall(false);
      }
    }
  }

  function handleBoundaryOut() {
    if (dismissed?.value && dismissed.type === "boundary out") {
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    } else {
      setDismissed({ value: true, type: "boundary out" });
      setBatterDismissed(ball.strikerId);
      setRun(0);
      if (wide) {
        setWide(false);
      }
      if (noBall) {
        setNoBall(false);
      }
    }
  }

  function handleOtherDismissals() {
    if (dismissed?.value) {
      setDismissed(undefined);
      setDismissedBy(undefined);
      setBatterDismissed(undefined);
    }
  }
  function saveDismissal(type: WicketType) {
    setDismissed({
      value: true,
      type,
    });
    if (type !== "run out") {
      setBatterDismissed(ball.strikerId);
      setRun(0);
      if (type !== "stumped" && wide) {
        setWide(false);
      }
      if (noBall) {
        setNoBall(false);
      }
    }
  }

  function handleNext() {
    onSaveBallData(
      {
        id: ball.id,
        inningsId: innings.id,
        strikerId: batsman.id,
        nonStrikerId:
          batsman.id === ball.striker.id ? ball.nonStriker.id : batsman.id,
        runsScored: run,
        isWide: wide,
        isNoBall: noBall,
        isBye: bye,
        isLegBye: legBye,
        isWicket: dismissed ? dismissed.value : false,
        wicketType: dismissed?.value ? dismissed.type : undefined,
        assistPlayerId: dismissedBy ? dismissedBy : undefined,
        dismissedPlayerId: batterDismissed ? batterDismissed : undefined,
        ballNumber: ball.ballNumber,
        bowlerId: ball.bowlerId,
      },
      {
        inningsId: innings.id,
        balls: innings.ballsBowled,
        wickets: innings.wickets,
        extras: innings.extras,
        totalScore: innings.totalScore,
      },
      {
        matchId: innings.matchId,
      }
    );
  }

  return (
    <section className="flex size-full flex-col gap-3">
      <div className="w-full flex-y-center justify-center gap-4">
        <div className="flex flex-1">
          <Button
            className="w-full"
            onClick={() => setBatsman(ball.striker)}
            variant={batsman.id === ball.striker.id ? "default" : "secondary"}
          >
            <span className="text-ellipsis">{ball.striker.name}</span>
          </Button>
        </div>
        <div className="flex flex-1">
          <Button
            className="w-full"
            onClick={() => setBatsman(ball.nonStriker)}
            variant={batsman.id === ball.nonStrikerId ? "default" : "secondary"}
          >
            {ball.nonStriker.name}
          </Button>
        </div>
      </div>
      <div className="flex-y-center gap-2">
        <h1 className="font-bold">{shortenName(ball.bowler.name)} : </h1>
        <div className="flex-y-center gap-2">
          {otherBalls.map((b) => (
            <div
              className={cn(
                "flex-center cursor-pointer items-baseline rounded-lg bg-secondary px-2 py-1",
                {
                  "animate-pulse bg-primary": b.id === ball.id,
                  "text-red-500": b.isWicket,
                }
              )}
              key={b.id}
            >
              {b.isWicket && b.wicketType
                ? wicketLabel[b.wicketType]
                : b.runsScored}
              <span className="text-muted-foreground text-sm">
                {b.isWide ? "wd" : ""}
                {b.isNoBall ? "nb" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-y-center gap-4">
        <Input
          className="h-[6rem] w-full font-bold text-4xl"
          max={7}
          min={0}
          onChange={(e) => {
            handleRunScored(Number(e.target.value));
          }}
          type="number"
          value={ballScore}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => run > 0 && handleRunScored(run - 1)}
            size={"lg"}
            variant={run > 0 ? "default" : "secondary"}
          >
            <MinusIcon />
          </Button>
          <Button
            onClick={() => run < 8 && handleRunScored(run + 1)}
            size={"lg"}
            variant={run < 7 ? "default" : "secondary"}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <Separator className="mt-1" />
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full items-center justify-center gap-4">
          <Button
            className="flex-1"
            onClick={() => handleRunScored(0)}
            size={"squareLg"}
            variant={run === 0 ? "default" : "secondary"}
          >
            0
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleRunScored(1)}
            size={"squareLg"}
            variant={run === 1 ? "default" : "secondary"}
          >
            1
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleRunScored(4)}
            size={"squareLg"}
            variant={run === 4 ? "default" : "secondary"}
          >
            4
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleRunScored(6)}
            size={"squareLg"}
            variant={run === 6 ? "default" : "secondary"}
          >
            6
          </Button>
        </div>
      </div>
      <Separator className="my-1" />
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-lg">Extras: </h1>
        <div className="flex w-full items-center justify-center gap-4">
          <Button
            className="flex-1"
            onClick={handleWide}
            size={"lg"}
            variant={wide ? "default" : "secondary"}
          >
            Wide
          </Button>
          <Button
            className="flex-1"
            onClick={handleNo}
            size={"lg"}
            variant={noBall ? "default" : "secondary"}
          >
            No Ball
          </Button>
          {hasBye && (
            <Button
              className="flex-1"
              onClick={handleBye}
              size={"lg"}
              variant={bye ? "default" : "secondary"}
            >
              Byes
            </Button>
          )}
          {hasLegBye && (
            <Button
              className="flex-1"
              onClick={handleLegBye}
              size={"lg"}
              variant={legBye ? "default" : "secondary"}
            >
              Leg Byes
            </Button>
          )}
        </div>
      </div>
      <Separator className="my-2" />
      <div className="flex flex-col gap-4">
        <h1 className="flex items-baseline justify-between font-bold text-lg">
          Dismissed:
          <span className="font-normal text-muted-foreground text-sm capitalize">
            {dismissedbyLabel && dismissed?.value
              ? `${dismissed.type} by `
              : ""}{" "}
            {dismissedbyLabel}
          </span>
        </h1>
        <div className="flex w-full items-center justify-center gap-4">
          <Button
            className="flex-1"
            onClick={handleBoldOut}
            size={"lg"}
            variant={
              dismissed && dismissed.type === "bold"
                ? "destructive"
                : "secondary"
            }
          >
            Bold
          </Button>
          <Sheet>
            <SheetTrigger>
              <Button
                className="flex-1"
                onClick={handleOtherDismissals}
                size={"lg"}
                variant={
                  dismissed && dismissed.type === "caught"
                    ? "destructive"
                    : "secondary"
                }
              >
                Caught
              </Button>
            </SheetTrigger>
            <SheetContent side={"bottom"}>
              <SheetTitle className="p-4">Caught By</SheetTitle>
              <div className="w-full px-4">
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      setDismissedBy(+value);
                    }
                  }}
                  value={dismissedBy?.toString() || ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingTeamPlayers.map(({ player }) => (
                      <SelectItem key={player.id} value={`${player.id}`}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SheetFooter>
                <SheetClose>
                  <Button onClick={saveDismissal.bind(null, "caught")}>
                    Save
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex w-full items-center justify-center gap-4">
          {/* Run Out Button */}
          <Sheet>
            <SheetTrigger>
              <Button
                className="flex-1"
                onClick={handleOtherDismissals}
                variant={
                  dismissed && dismissed.type === "run out"
                    ? "destructive"
                    : "secondary"
                }
              >
                Run Out
              </Button>
            </SheetTrigger>
            <SheetContent side={"bottom"}>
              <SheetTitle className="p-4">Run Out Details</SheetTitle>
              <div className="flex flex-col gap-8 px-4">
                <Select
                  defaultValue={ball.strikerId.toString()}
                  onValueChange={(value) => {
                    if (value) {
                      setBatterDismissed(+value);
                    }
                  }}
                  value={batterDismissed?.toString() || ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Who got out" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      key={ball.strikerId}
                      value={`${ball.strikerId}`}
                    >
                      {ball.striker.name}
                    </SelectItem>
                    <SelectItem
                      key={ball.nonStrikerId}
                      value={`${ball.nonStrikerId}`}
                    >
                      {ball.nonStriker.name}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      setDismissedBy(+value);
                    }
                  }}
                  value={dismissedBy?.toString() || ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Fielder" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingTeamPlayers.map(({ player }) => (
                      <SelectItem key={player.id} value={`${player.id}`}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SheetFooter>
                <SheetClose>
                  <Button onClick={saveDismissal.bind(null, "run out")}>
                    Save
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          {/* Boundary Out Button */}
          {hasBoundaryOut && (
            <Button
              className="flex-1"
              onClick={handleBoundaryOut}
              variant={
                dismissed && dismissed.type === "boundary out"
                  ? "destructive"
                  : "secondary"
              }
            >
              Boundary Out
            </Button>
          )}
          {/* LBW Out Button */}
          {hasLBW && (
            <Button
              className="flex-1"
              onClick={handleLBW}
              variant={
                dismissed && dismissed.type === "lbw"
                  ? "destructive"
                  : "secondary"
              }
            >
              LBW
            </Button>
          )}
          {/* Stump Out Button */}
          <Sheet>
            <SheetTrigger>
              <Button
                className="flex-1"
                onClick={handleOtherDismissals}
                variant={
                  dismissed && dismissed.type === "stumped"
                    ? "destructive"
                    : "secondary"
                }
              >
                Stumped
              </Button>
            </SheetTrigger>
            <SheetContent side={"bottom"}>
              <SheetTitle className="p-4">Stumped By</SheetTitle>
              <div className="px-4">
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      setDismissedBy(+value);
                    }
                  }}
                  value={dismissedBy?.toString() || ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Player" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingTeamPlayers.map(({ player }) => (
                      <SelectItem key={player.id} value={`${player.id}`}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SheetFooter>
                <SheetClose>
                  <Button onClick={saveDismissal.bind(null, "stumped")}>
                    Save
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Separator className="my-1" />
      <div className="flex gap-4">
        <Button size={"lg"} variant={"destructive"}>
          Clear
        </Button>
        <Button className="flex-1" onClick={handleNext} size={"lg"}>
          Next Ball
        </Button>
      </div>
    </section>
  );
}

export default ScoreABall;
