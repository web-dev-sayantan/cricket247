import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, SwordsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
      <main className="m-auto flex size-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="font-semibold text-2xl">Match not found</h1>
        <p className="text-muted-foreground">
          The requested match could not be loaded.
        </p>
        <Button>
          <Link to="/matches">
            <ArrowLeftIcon />
            Back to Matches
          </Link>
        </Button>
      </main>
    );
  }

  if (!canCurrentUserScore) {
    return (
      <main className="m-auto flex size-full max-w-xl flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="font-semibold text-2xl">Scoring Access Denied</h1>
        <p className="text-muted-foreground">
          You are not allowed to score this match.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline">
            <Link params={{ matchId }} to="/matches/$matchId/scorecard">
              View Scorecard
            </Link>
          </Button>
          <Button>
            <Link to="/matches">
              <ArrowLeftIcon />
              Back to Matches
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const team1ShortName = match.team1?.shortName ?? "TBD";
  const team2ShortName = match.team2?.shortName ?? "TBD";

  return (
    <main className="m-auto flex size-full max-w-5xl flex-col gap-4 p-4">
      <div className="w-full flex-center gap-2 rounded-lg border bg-cover! bg-gradient p-3">
        <h1 className="font-bold text-sm">{match.team1.name}</h1>
        <SwordsIcon />
        <h1 className="font-bold text-sm">{match.team2.name}</h1>
      </div>

      {isLineupSaved ? (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Playing lineup is saved. Live scoring controls can be placed here
              next.
            </p>
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <p className="font-medium">{team1ShortName} XI</p>
              <p className="text-muted-foreground">
                {team1Selection.playerIds
                  .map((playerId) => team1RosterById.get(playerId) ?? "Unknown")
                  .join(", ")}
              </p>
              <p className="font-medium">{team2ShortName} XI</p>
              <p className="text-muted-foreground">
                {team2Selection.playerIds
                  .map((playerId) => team2RosterById.get(playerId) ?? "Unknown")
                  .join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsLineupSaved(false)}
                size="sm"
                variant="outline"
              >
                Edit Lineup
              </Button>
              <Button size="sm" variant="outline">
                <Link params={{ matchId }} to="/matches/$matchId/scorecard">
                  View Scorecard
                </Link>
              </Button>
              <Button size="sm" variant="ghost">
                <Link to="/matches">
                  <ArrowLeftIcon />
                  Back
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Select Playing Lineup</CardTitle>
            <p className="text-muted-foreground text-sm">
              Select exactly {playersPerSide} players for each team before
              entering the scoring console.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={!isLineupValid || saveLineupMutation.isPending}
                onClick={() => saveLineupMutation.mutate()}
                type="button"
              >
                <CheckIcon className="mr-1 size-4" />
                Save Lineup and Continue
              </Button>
              <Button size="sm" variant="outline">
                <Link params={{ matchId }} to="/matches/$matchId/scorecard">
                  View Scorecard
                </Link>
              </Button>
              <Button size="sm" variant="ghost">
                <Link to="/matches">
                  <ArrowLeftIcon />
                  Back
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
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
  roster: Array<{
    isCaptain: boolean;
    isViceCaptain: boolean;
    name: string;
    playerId: number;
    role: string;
    teamId: number;
  }>;
  selection: TeamSelection;
  setSelection: (selection: TeamSelection) => void;
  teamLabel: string;
}) {
  const selectedPlayerSet = useMemo(
    () => new Set(selection.playerIds),
    [selection.playerIds]
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

  const captainLabel = selection.captainPlayerId
    ? selectedPlayers.find(
        (player) => player.playerId === selection.captainPlayerId
      )?.name
    : "";
  const viceCaptainLabel = selection.viceCaptainPlayerId
    ? selectedPlayers.find(
        (player) => player.playerId === selection.viceCaptainPlayerId
      )?.name
    : "";
  const wicketKeeperLabel = selection.wicketKeeperPlayerId
    ? selectedPlayers.find(
        (player) => player.playerId === selection.wicketKeeperPlayerId
      )?.name
    : "";

  return (
    <section className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">{teamLabel} Lineup</h3>
        <span className="text-muted-foreground text-xs">
          Selected: {selection.playerIds.length}/{maxPlayers}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {roster.map((player) => {
          const isChecked = selectedPlayerSet.has(player.playerId);
          const isDisabled =
            !isChecked && selection.playerIds.length >= maxPlayers;

          return (
            <label
              className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm"
              htmlFor={`${teamLabel}-${String(player.playerId)}`}
              key={player.playerId}
            >
              <Checkbox
                checked={isChecked}
                disabled={isDisabled}
                id={`${teamLabel}-${String(player.playerId)}`}
                onCheckedChange={() => togglePlayer(player.playerId)}
              />
              <span className="font-medium">{player.name}</span>
              <span className="text-muted-foreground text-xs">
                ({player.role})
              </span>
            </label>
          );
        })}
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs">Captain (optional)</span>
          <select
            className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
            onChange={(event) =>
              setSelection({
                ...selection,
                captainPlayerId:
                  event.target.value.length > 0
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
              })
            }
            value={captainLabel ? String(selection.captainPlayerId) : ""}
          >
            <option value="">Select captain</option>
            {selectedPlayers.map((player) => (
              <option key={player.playerId} value={String(player.playerId)}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs">Vice Captain (optional)</span>
          <select
            className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
            onChange={(event) =>
              setSelection({
                ...selection,
                viceCaptainPlayerId:
                  event.target.value.length > 0
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
              })
            }
            value={
              viceCaptainLabel ? String(selection.viceCaptainPlayerId) : ""
            }
          >
            <option value="">Select vice captain</option>
            {selectedPlayers.map((player) => (
              <option key={player.playerId} value={String(player.playerId)}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs">Wicket Keeper (optional)</span>
          <select
            className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
            onChange={(event) =>
              setSelection({
                ...selection,
                wicketKeeperPlayerId:
                  event.target.value.length > 0
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
              })
            }
            value={
              wicketKeeperLabel ? String(selection.wicketKeeperPlayerId) : ""
            }
          >
            <option value="">Select wicket keeper</option>
            {selectedPlayers.map((player) => (
              <option key={player.playerId} value={String(player.playerId)}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
