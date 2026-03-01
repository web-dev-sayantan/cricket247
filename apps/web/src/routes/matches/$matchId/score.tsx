import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, SwordsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/$matchId/score")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { matchId } = params;
    const { orpc } = context;

    const scoringSetup = await orpc.getMatchScoringSetup.call({
      matchId: Number(matchId),
    });

    return { scoringSetup };
  },
});

interface TeamSelection {
  captainPlayerId?: number;
  playerIds: number[];
  viceCaptainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

interface RosterPlayer {
  isCaptain: boolean;
  isViceCaptain: boolean;
  name: string;
  playerId: number;
  role: string;
  teamId: number;
}

function normalizeSelection(
  selection: TeamSelection | undefined
): TeamSelection {
  if (!selection) {
    return { playerIds: [] };
  }

  return {
    playerIds: selection.playerIds,
    captainPlayerId: selection.captainPlayerId,
    viceCaptainPlayerId: selection.viceCaptainPlayerId,
    wicketKeeperPlayerId: selection.wicketKeeperPlayerId,
  };
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const { matchId } = Route.useParams();
  const numericMatchId = Number(matchId);
  const { scoringSetup } = Route.useLoaderData();

  const match = scoringSetup?.match ?? null;
  const canCurrentUserScore = scoringSetup?.canCurrentUserScore ?? false;
  const playersPerSide = scoringSetup?.playersPerSide ?? 0;
  const team1Roster = scoringSetup?.team1Roster ?? [];
  const team2Roster = scoringSetup?.team2Roster ?? [];
  const tournamentId = match?.tournamentId;

  const initialTeam1Selection = normalizeSelection(
    scoringSetup?.savedLineup?.team1
  );
  const initialTeam2Selection = normalizeSelection(
    scoringSetup?.savedLineup?.team2
  );

  const [team1Selection, setTeam1Selection] = useState<TeamSelection>(
    initialTeam1Selection
  );
  const [team2Selection, setTeam2Selection] = useState<TeamSelection>(
    initialTeam2Selection
  );
  const [isLineupSaved, setIsLineupSaved] = useState(false);

  const saveLineupMutation = useMutation({
    mutationFn: async () =>
      client.saveMatchLineup({
        matchId: numericMatchId,
        team1: team1Selection,
        team2: team2Selection,
      }),
    onSuccess: async () => {
      toast.success("Playing lineup saved");
      setIsLineupSaved(true);

      const invalidationTasks = [
        queryClient.invalidateQueries(orpc.liveMatches.queryOptions()),
        queryClient.invalidateQueries(
          orpc.getMatchScoringSetup.queryOptions({
            input: { matchId: numericMatchId },
          })
        ),
        queryClient.invalidateQueries(
          orpc.getMatchById.queryOptions({ input: numericMatchId })
        ),
      ];

      if (typeof tournamentId === "number") {
        invalidationTasks.push(
          queryClient.invalidateQueries(
            orpc.tournamentFixtures.queryOptions({
              input: { tournamentId },
            })
          )
        );
      }

      await Promise.all(invalidationTasks);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save lineup");
    },
  });

  const isLineupValid =
    team1Selection.playerIds.length === playersPerSide &&
    team2Selection.playerIds.length === playersPerSide;

  const team1RosterById = useMemo(
    () => new Map(team1Roster.map((player) => [player.playerId, player.name])),
    [team1Roster]
  );
  const team2RosterById = useMemo(
    () => new Map(team2Roster.map((player) => [player.playerId, player.name])),
    [team2Roster]
  );

  if (!(scoringSetup && match)) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
        <section className="w-full space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-semibold text-2xl">Match not found</h1>
          <p className="text-muted-foreground">
            The requested match could not be loaded.
          </p>
          <div className="flex justify-center">
            <Link
              className={buttonVariants({ variant: "default" })}
              to="/matches"
            >
              <ArrowLeftIcon />
              Back to Matches
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!canCurrentUserScore) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl items-center px-4 py-8">
        <section className="w-full space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-semibold text-2xl">Scoring Access Denied</h1>
          <p className="text-muted-foreground">
            You are not allowed to score this match.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              className={buttonVariants({ variant: "outline" })}
              params={{ matchId }}
              to="/matches/$matchId/scorecard"
            >
              View Scorecard
            </Link>
            <Link
              className={buttonVariants({ variant: "default" })}
              to="/matches"
            >
              <ArrowLeftIcon />
              Back to Matches
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const team1Name = match.team1?.name ?? "Team 1";
  const team2Name = match.team2?.name ?? "Team 2";
  const team1ShortName = match.team1?.shortName ?? "TBD";
  const team2ShortName = match.team2?.shortName ?? "TBD";

  const team1LineupNames = team1Selection.playerIds.map(
    (playerId) => team1RosterById.get(playerId) ?? "Unknown"
  );
  const team2LineupNames = team2Selection.playerIds.map(
    (playerId) => team2RosterById.get(playerId) ?? "Unknown"
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
                Match Scoring Setup
              </h1>
              <p className="max-w-2xl text-muted-foreground text-sm sm:text-base">
                Confirm the playing XI for both teams before entering the live
                scoring console.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                params={{ matchId }}
                to="/matches/$matchId/scorecard"
              >
                View Scorecard
              </Link>
              <Link
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                to="/matches"
              >
                <ArrowLeftIcon />
                Back
              </Link>
            </div>
          </div>
        </header>

        <section
          aria-labelledby="fixture-heading"
          className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
        >
          <h2 className="font-medium text-base sm:text-lg" id="fixture-heading">
            Fixture
          </h2>
          <div className="mt-4 grid items-center gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:p-4">
            <p className="min-w-0 truncate text-center font-semibold text-sm sm:text-base">
              {team1Name}
            </p>
            <SwordsIcon
              aria-hidden="true"
              className="mx-auto h-4 w-4 text-muted-foreground sm:h-5 sm:w-5"
            />
            <p className="min-w-0 truncate text-center font-semibold text-sm sm:text-base">
              {team2Name}
            </p>
          </div>
        </section>

        {isLineupSaved ? (
          <section
            aria-labelledby="saved-lineup-heading"
            className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="space-y-1">
              <h2
                className="font-medium text-base sm:text-lg"
                id="saved-lineup-heading"
              >
                Lineup Saved
              </h2>
              <p className="text-muted-foreground text-sm">
                Playing lineups are locked in and ready for scoring.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <LineupSummary
                players={team1LineupNames}
                teamLabel={team1ShortName}
              />
              <LineupSummary
                players={team2LineupNames}
                teamLabel={team2ShortName}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={() => setIsLineupSaved(false)}
                size="sm"
                variant="outline"
              >
                Edit Lineup
              </Button>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                params={{ matchId }}
                to="/matches/$matchId/scorecard"
              >
                View Scorecard
              </Link>
              <Link
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                to="/matches"
              >
                <ArrowLeftIcon />
                Back
              </Link>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="lineup-heading"
            className="space-y-5 rounded-xl border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="space-y-1">
              <h2
                className="font-medium text-base sm:text-lg"
                id="lineup-heading"
              >
                Select Playing Lineup
              </h2>
              <p className="text-muted-foreground text-sm">
                Select exactly {playersPerSide} players from each side.
              </p>
            </div>

            <p aria-live="polite" className="text-muted-foreground text-sm">
              {team1ShortName}: {team1Selection.playerIds.length}/
              {playersPerSide} players, {team2ShortName}:{" "}
              {team2Selection.playerIds.length}/{playersPerSide} players.
            </p>

            <div className="grid gap-4 xl:grid-cols-2">
              <LineupSelectorCard
                maxPlayers={playersPerSide}
                roster={team1Roster}
                selection={team1Selection}
                setSelection={setTeam1Selection}
                teamLabel={team1ShortName}
              />
              <LineupSelectorCard
                maxPlayers={playersPerSide}
                roster={team2Roster}
                selection={team2Selection}
                setSelection={setTeam2Selection}
                teamLabel={team2ShortName}
              />
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                disabled={!isLineupValid || saveLineupMutation.isPending}
                onClick={() => saveLineupMutation.mutate()}
                type="button"
              >
                <CheckIcon className="mr-1 size-4" />
                {saveLineupMutation.isPending
                  ? "Saving lineup..."
                  : "Save Lineup and Continue"}
              </Button>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                params={{ matchId }}
                to="/matches/$matchId/scorecard"
              >
                View Scorecard
              </Link>
              <Link
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                to="/matches"
              >
                <ArrowLeftIcon />
                Back
              </Link>
              <p
                aria-live="polite"
                className={cn("text-sm sm:ml-auto", {
                  "text-emerald-600 dark:text-emerald-400": isLineupValid,
                  "text-muted-foreground": !isLineupValid,
                })}
              >
                {isLineupValid
                  ? "Lineups are complete and ready to save."
                  : "Both teams must have complete lineups before saving."}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function LineupSummary({
  teamLabel,
  players,
}: {
  teamLabel: string;
  players: string[];
}) {
  return (
    <section className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <h3 className="font-medium text-sm sm:text-base">{teamLabel} XI</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {players.join(", ")}
      </p>
    </section>
  );
}

function LineupSelectorCard({
  roster,
  selection,
  setSelection,
  maxPlayers,
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
      `${teamLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${
        roster[0]?.teamId ?? "team"
      }`,
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
    <section className="space-y-4 rounded-lg border bg-muted/10 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm sm:text-base">{teamLabel} Lineup</h3>
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
                    "flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2.5 text-sm transition-colors",
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
        <legend className="font-medium text-sm">Optional Roles</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-captain`}
            >
              Captain
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-captain`}
              onChange={(event) =>
                setOptionalRole("captainPlayerId", event.target.value)
              }
              value={
                selection.captainPlayerId
                  ? String(selection.captainPlayerId)
                  : ""
              }
            >
              <option value="">Select captain</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-vice-captain`}
            >
              Vice Captain
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-vice-captain`}
              onChange={(event) =>
                setOptionalRole("viceCaptainPlayerId", event.target.value)
              }
              value={
                selection.viceCaptainPlayerId
                  ? String(selection.viceCaptainPlayerId)
                  : ""
              }
            >
              <option value="">Select vice captain</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor={`${idPrefix}-wicket-keeper`}
            >
              Wicket Keeper
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={selectedPlayers.length === 0}
              id={`${idPrefix}-wicket-keeper`}
              onChange={(event) =>
                setOptionalRole("wicketKeeperPlayerId", event.target.value)
              }
              value={
                selection.wicketKeeperPlayerId
                  ? String(selection.wicketKeeperPlayerId)
                  : ""
              }
            >
              <option value="">Select wicket keeper</option>
              {selectedPlayers.map((player) => (
                <option key={player.playerId} value={String(player.playerId)}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
    </section>
  );
}
