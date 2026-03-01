import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { client, orpc } from "@/utils/orpc";
import { resolveSelectedTournamentId } from "./-tournament-selection";
import type { ReassignDialogPlayer } from "./-types";

export function useTeamAssignments({
  teamId,
  isAdmin,
  initialTournamentId,
}: {
  teamId: number;
  isAdmin: boolean;
  initialTournamentId?: string;
}) {
  const queryClient = useQueryClient();

  const [selectedTournamentId, setSelectedTournamentId] = useState(
    initialTournamentId ?? ""
  );
  const [pendingAssignPlayerId, setPendingAssignPlayerId] = useState<
    number | null
  >(null);
  const [pendingUnassignPlayerId, setPendingUnassignPlayerId] = useState<
    number | null
  >(null);
  const [pendingReassignPlayerId, setPendingReassignPlayerId] = useState<
    number | null
  >(null);
  const [reassignDialogPlayer, setReassignDialogPlayer] =
    useState<ReassignDialogPlayer | null>(null);

  const isValidTeamId = Number.isInteger(teamId) && teamId > 0;

  const teamQueryOptions = orpc.getTeamById.queryOptions({ input: teamId });
  const teamTournamentsQueryOptions = orpc.teamTournaments.queryOptions({
    input: { teamId },
  });

  const { data: team, isLoading: isTeamLoading } = useQuery({
    ...teamQueryOptions,
    enabled: isValidTeamId,
  });

  const {
    data: teamTournaments = [],
    isLoading: isTournamentsLoading,
    isFetching: isTournamentsFetching,
  } = useQuery({
    ...teamTournamentsQueryOptions,
    enabled: isValidTeamId && isAdmin,
  });

  useEffect(() => {
    const resolvedTournamentId = resolveSelectedTournamentId({
      selectedTournamentId,
      initialTournamentId,
      teamTournaments,
    });

    if (resolvedTournamentId !== selectedTournamentId) {
      setSelectedTournamentId(resolvedTournamentId);
    }
  }, [initialTournamentId, selectedTournamentId, teamTournaments]);

  const parsedTournamentId = Number(selectedTournamentId);
  const hasValidTournamentSelection =
    Number.isInteger(parsedTournamentId) && parsedTournamentId > 0;

  const rosterQueryOptions = orpc.getTournamentTeamRoster.queryOptions({
    input: {
      tournamentId: parsedTournamentId,
      teamId,
    },
  });

  const {
    data: roster,
    isLoading: isRosterLoading,
    isFetching: isRosterFetching,
  } = useQuery({
    ...rosterQueryOptions,
    enabled: isValidTeamId && hasValidTournamentSelection && isAdmin,
  });

  const refreshRoster = async () => {
    if (!hasValidTournamentSelection) {
      await queryClient.invalidateQueries({
        queryKey: teamTournamentsQueryOptions.queryKey,
      });
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: rosterQueryOptions.queryKey,
    });
  };

  const assignMutation = useMutation({
    mutationFn: async (playerId: number) =>
      client.registerTournamentTeamPlayer({
        tournamentId: parsedTournamentId,
        teamId,
        playerId,
      }),
    onMutate: (playerId) => {
      setPendingAssignPlayerId(playerId);
    },
    onSuccess: async () => {
      toast.success("Player assigned");
      await refreshRoster();
    },
    onError: () => {
      toast.error("Failed to assign player");
    },
    onSettled: () => {
      setPendingAssignPlayerId(null);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (playerId: number) =>
      client.unassignTournamentTeamPlayer({
        tournamentId: parsedTournamentId,
        teamId,
        playerId,
      }),
    onMutate: (playerId) => {
      setPendingUnassignPlayerId(playerId);
    },
    onSuccess: async () => {
      toast.success("Player unassigned");
      await refreshRoster();
    },
    onError: () => {
      toast.error("Failed to unassign player");
    },
    onSettled: () => {
      setPendingUnassignPlayerId(null);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async (input: {
      playerId: number;
      expectedFromTeamId: number;
    }) =>
      client.reassignTournamentTeamPlayer({
        tournamentId: parsedTournamentId,
        toTeamId: teamId,
        playerId: input.playerId,
        expectedFromTeamId: input.expectedFromTeamId,
        confirmReassign: true,
      }),
    onMutate: ({ playerId }) => {
      setPendingReassignPlayerId(playerId);
    },
    onSuccess: async () => {
      toast.success("Player reassigned to this team");
      setReassignDialogPlayer(null);
      await refreshRoster();
    },
    onError: () => {
      toast.error(
        "Failed to reassign player. Reassign is only allowed before tournament start date."
      );
    },
    onSettled: () => {
      setPendingReassignPlayerId(null);
    },
  });

  const selectedTournament = useMemo(
    () =>
      teamTournaments.find(
        (tournament) => String(tournament.id) === selectedTournamentId
      ) ?? null,
    [selectedTournamentId, teamTournaments]
  );

  const openReassignDialog = (player: ReassignDialogPlayer) => {
    setReassignDialogPlayer(player);
  };

  const closeReassignDialog = () => {
    if (pendingReassignPlayerId !== null) {
      return;
    }

    setReassignDialogPlayer(null);
  };

  const confirmReassignPlayer = () => {
    if (!reassignDialogPlayer) {
      return;
    }

    reassignMutation.mutate({
      playerId: reassignDialogPlayer.playerId,
      expectedFromTeamId: reassignDialogPlayer.assignedTeamId,
    });
  };

  return {
    team,
    isTeamLoading,
    teamTournaments,
    isTournamentsLoading,
    isTournamentsFetching,
    roster,
    isRosterLoading,
    isRosterFetching,
    selectedTournament,
    selectedTournamentId,
    setSelectedTournamentId: (value: string | null) => {
      setSelectedTournamentId(value ?? "");
    },
    hasValidTournamentSelection,
    refreshRoster,
    assignPlayer: assignMutation.mutate,
    unassignPlayer: unassignMutation.mutate,
    pendingAssignPlayerId,
    pendingUnassignPlayerId,
    pendingReassignPlayerId,
    reassignDialogPlayer,
    openReassignDialog,
    closeReassignDialog,
    confirmReassignPlayer,
  };
}
