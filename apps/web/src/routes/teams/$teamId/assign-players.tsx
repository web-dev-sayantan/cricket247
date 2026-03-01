import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
    <PageShell>
      <PageHeader
        actions={
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            params={{ teamId: String(parsedTeamId) }}
            to="/teams/$teamId/stats"
          >
            <ArrowLeft />
            Back to team
          </Link>
        }
        description={
          assignments.team
            ? `${assignments.team.name} (${assignments.team.shortName})`
            : `Team #${String(parsedTeamId)}`
        }
        title="Assign Players"
      />

      <div className="space-y-5">
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
    </PageShell>
  );
}
