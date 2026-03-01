import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import {
  buildUpdateTournamentFromScratchPayload,
  deriveWizardValuesFromTournamentView,
  inferTemplateFromTournamentView,
  type TournamentWizardValues,
} from "@/routes/tournaments/-create-wizard";
import { TournamentWizardForm } from "@/routes/tournaments/-tournament-wizard-form";
import { client, orpc } from "@/utils/orpc";

type UpdateTournamentFromScratchPayload = Parameters<
  typeof client.updateTournamentFromScratch
>[0];

export const Route = createFileRoute("/tournaments/$tournamentId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tournamentId } = Route.useParams();
  const numericTournamentId = Number(tournamentId);

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const {
    data: tournamentView,
    error: tournamentViewError,
    isPending: tournamentViewPending,
  } = useQuery({
    ...orpc.tournamentView.queryOptions({
      input: {
        tournamentId: numericTournamentId,
      },
    }),
    enabled: Number.isFinite(numericTournamentId) && numericTournamentId > 0,
  });

  const {
    data: organizations = [],
    error: organizationsError,
    isPending: organizationsPending,
  } = useQuery({
    ...orpc.organizations.queryOptions(),
    enabled: isAdmin,
  });

  const {
    data: matchFormats = [],
    error: matchFormatsError,
    isPending: matchFormatsPending,
  } = useQuery({
    ...orpc.matchFormats.queryOptions(),
    enabled: isAdmin,
  });

  const {
    data: teams = [],
    error: teamsError,
    isPending: teamsPending,
  } = useQuery({
    ...orpc.teams.queryOptions(),
    enabled: isAdmin,
  });

  const templateInference = useMemo(() => {
    if (!tournamentView) {
      return null;
    }

    return inferTemplateFromTournamentView(tournamentView);
  }, [tournamentView]);

  const initialValues = useMemo(() => {
    if (!tournamentView) {
      return null;
    }

    return deriveWizardValuesFromTournamentView(tournamentView);
  }, [tournamentView]);

  const updateTournamentMutation = useMutation({
    mutationFn: async (payload: UpdateTournamentFromScratchPayload) =>
      client.updateTournamentFromScratch(payload),
    onSuccess: async (result) => {
      toast.success("Tournament updated");
      const invalidations: Promise<void>[] = [
        queryClient.invalidateQueries(orpc.tournaments.queryOptions()),
        queryClient.invalidateQueries(orpc.liveTournaments.queryOptions()),
        queryClient.invalidateQueries(
          orpc.tournamentView.queryOptions({
            input: { tournamentId: numericTournamentId },
          })
        ),
        queryClient.invalidateQueries(
          orpc.tournamentFixtures.queryOptions({
            input: {
              tournamentId: numericTournamentId,
              includeDraft: true,
              status: "all",
            },
          })
        ),
        queryClient.invalidateQueries(
          orpc.tournamentStandings.queryOptions({
            input: {
              tournamentId: numericTournamentId,
              includeDraft: false,
            },
          })
        ),
      ];

      if (
        result.createdTeams.length > 0 ||
        result.createdOrganization ||
        result.createdMatchFormat
      ) {
        invalidations.push(
          queryClient.invalidateQueries(orpc.teams.queryOptions()),
          queryClient.invalidateQueries(orpc.organizations.queryOptions()),
          queryClient.invalidateQueries(orpc.matchFormats.queryOptions())
        );
      }

      await Promise.all(invalidations);
      navigate({
        params: { tournamentId: String(numericTournamentId) },
        to: "/tournaments/$tournamentId",
      });
    },
  });

  if (!Number.isFinite(numericTournamentId) || numericTournamentId <= 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
          <Card className="rounded-xl border-destructive/40">
            <CardContent className="space-y-4 p-6">
              <h1 className="font-semibold text-xl">Invalid Tournament ID</h1>
              <p className="text-muted-foreground text-sm">
                The tournament id in the URL is invalid.
              </p>
              <Button
                onClick={() => navigate({ to: "/tournaments" })}
                size="sm"
              >
                <ArrowLeft />
                Back to tournaments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSessionPending) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <Skeleton className="h-8 w-60" />
          <Card className="rounded-xl">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent className="space-y-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <header className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
              Edit Tournament
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              You need admin access to edit tournaments.
            </p>
          </header>
          <Card className="rounded-xl border-dashed">
            <CardContent className="space-y-4 p-6">
              <p className="text-muted-foreground text-sm">
                Your account does not have permission to edit tournaments.
              </p>
              <Button
                onClick={() =>
                  navigate({
                    params: { tournamentId: String(numericTournamentId) },
                    to: "/tournaments/$tournamentId",
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeft />
                Back to tournament
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (
    tournamentViewError ||
    organizationsError ||
    matchFormatsError ||
    teamsError
  ) {
    const errorMessage =
      tournamentViewError?.message ||
      organizationsError?.message ||
      matchFormatsError?.message ||
      teamsError?.message ||
      "Failed to load tournament edit data";

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
          <Card className="rounded-xl border-destructive/40">
            <CardContent className="space-y-4 p-6">
              <h1 className="font-semibold text-xl">Tournament Edit Failed</h1>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
              <Button
                onClick={() =>
                  navigate({
                    params: { tournamentId: String(numericTournamentId) },
                    to: "/tournaments/$tournamentId",
                  })
                }
                size="sm"
              >
                <ArrowLeft />
                Back to tournament
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!(tournamentView && initialValues && templateInference)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
          <Card className="rounded-xl border-destructive/40">
            <CardContent className="space-y-4 p-6">
              <h1 className="font-semibold text-xl">Tournament Not Found</h1>
              <p className="text-muted-foreground text-sm">
                Unable to load tournament data for editing.
              </p>
              <Button
                onClick={() => navigate({ to: "/tournaments" })}
                size="sm"
              >
                <ArrowLeft />
                Back to tournaments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isLookupLoading =
    tournamentViewPending ||
    organizationsPending ||
    matchFormatsPending ||
    teamsPending;
  const teamsLocked =
    tournamentView.tournament.startDate <= new Date()
      ? "Team membership is locked because the tournament has already started."
      : undefined;
  const structureLocked =
    tournamentView.counts.totalMatchCount > 0
      ? "Structure changes are locked because fixtures or matches already exist."
      : undefined;
  const structureUnsupported = templateInference.supported
    ? undefined
    : "Current structure is custom/unsupported for wizard edits. Basics and advanced fields are still editable.";

  return (
    <TournamentWizardForm
      cancelLabel="Cancel"
      description="Update tournament settings, teams, and structure using the same guided flow."
      heading="Edit Tournament"
      initialValues={initialValues}
      isLookupLoading={isLookupLoading}
      lockReasons={{
        teamsLocked,
        structureLocked,
        structureUnsupported,
      }}
      matchFormats={matchFormats}
      mode="edit"
      onCancel={() =>
        navigate({
          params: { tournamentId: String(numericTournamentId) },
          to: "/tournaments/$tournamentId",
        })
      }
      onSubmit={async (values: TournamentWizardValues) => {
        const payload = buildUpdateTournamentFromScratchPayload({
          tournamentId: numericTournamentId,
          values,
        }) as UpdateTournamentFromScratchPayload;

        if (!templateInference.supported) {
          payload.structure = {
            ...payload.structure,
            stageEdits: [],
            groupEdits: [],
          };
        }

        try {
          await updateTournamentMutation.mutateAsync(payload);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message || "Failed to update tournament"
              : "Failed to update tournament";
          toast.error(message);
          throw new Error(message);
        }
      }}
      organizations={organizations}
      submitBusyLabel="Saving..."
      submitIdleLabel="Update tournament"
      submitting={updateTournamentMutation.isPending}
      teams={teams}
    />
  );
}
