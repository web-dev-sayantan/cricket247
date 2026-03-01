import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  AssignPlayersSkeleton,
  UnauthorizedView,
} from "./assign-players/-assign-players-views";
import { AssignedPlayersCard } from "./assign-players/-assigned-players-card";
import { AvailablePlayersCard } from "./assign-players/-available-players-card";
import { ConflictedPlayersCard } from "./assign-players/-conflicted-players-card";
import { ReassignDialog } from "./assign-players/-reassign-dialog";
import { TournamentSelectorCard } from "./assign-players/-tournament-selector-card";
import { useTeamAssignments } from "./assign-players/-use-team-assignments";

const searchSchema = z
  .object({
    tournamentId: z.string().optional(),
  })
  .catch({});

export const Route = createFileRoute("/teams/$teamId/assign-players")({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { teamId } = Route.useParams();
  const { tournamentId } = Route.useSearch();
  const parsedTeamId = Number(teamId);

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const assignments = useTeamAssignments({
    initialTournamentId: tournamentId,
    isAdmin,
    teamId: parsedTeamId,
  });

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <p className="text-muted-foreground">Invalid team id.</p>
      </div>
    );
  }

  if (isSessionPending || assignments.isTeamLoading) {
    return <AssignPlayersSkeleton />;
  }

  if (!isAdmin) {
    return (
      <UnauthorizedView navigateToTeams={() => navigate({ to: "/teams" })} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col items-start gap-3">
          <Link
            className="inline-flex"
            params={{ teamId: String(parsedTeamId) }}
            to="/teams/$teamId/stats"
          >
            <Button size="sm" type="button" variant="outline">
              <ArrowLeft />
              Back to team
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
              Assign Players
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {assignments.team
                ? `${assignments.team.name} (${assignments.team.shortName})`
                : `Team #${String(parsedTeamId)}`}
            </p>
          </div>
        </header>

        <TournamentSelectorCard
          isRosterFetching={assignments.isRosterFetching}
          isTournamentsFetching={assignments.isTournamentsFetching}
          isTournamentsLoading={assignments.isTournamentsLoading}
          onRefresh={assignments.refreshRoster}
          onTournamentChange={assignments.setSelectedTournamentId}
          selectedTournament={assignments.selectedTournament}
          selectedTournamentId={assignments.selectedTournamentId}
          tournaments={assignments.teamTournaments}
        />

        {assignments.hasValidTournamentSelection ? (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <AssignedPlayersCard
              assignedPlayers={assignments.roster?.assignedPlayers ?? []}
              isLoading={assignments.isRosterLoading}
              onUnassign={assignments.unassignPlayer}
              pendingAssignPlayerId={assignments.pendingAssignPlayerId}
              pendingReassignPlayerId={assignments.pendingReassignPlayerId}
              pendingUnassignPlayerId={assignments.pendingUnassignPlayerId}
            />
            <AvailablePlayersCard
              availablePlayers={assignments.roster?.availablePlayers ?? []}
              isLoading={assignments.isRosterLoading}
              onAssign={assignments.assignPlayer}
              pendingAssignPlayerId={assignments.pendingAssignPlayerId}
              pendingReassignPlayerId={assignments.pendingReassignPlayerId}
              pendingUnassignPlayerId={assignments.pendingUnassignPlayerId}
            />
          </div>
        ) : null}

        {assignments.hasValidTournamentSelection ? (
          <ConflictedPlayersCard
            conflictedPlayers={assignments.roster?.conflictedPlayers ?? []}
            onOpenReassignDialog={assignments.openReassignDialog}
            pendingAssignPlayerId={assignments.pendingAssignPlayerId}
            pendingReassignPlayerId={assignments.pendingReassignPlayerId}
            pendingUnassignPlayerId={assignments.pendingUnassignPlayerId}
          />
        ) : null}
      </div>

      <ReassignDialog
        onClose={assignments.closeReassignDialog}
        onConfirm={assignments.confirmReassignPlayer}
        pendingReassignPlayerId={assignments.pendingReassignPlayerId}
        player={assignments.reassignDialogPlayer}
      />
    </div>
  );
}
