import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import {
  buildCreateTournamentFromScratchPayload,
  getDefaultWizardValues,
  type TournamentWizardValues,
} from "@/routes/tournaments/-create-wizard";
import { TournamentWizardForm } from "@/routes/tournaments/-tournament-wizard-form";
import { client, orpc } from "@/utils/orpc";

type CreateTournamentFromScratchPayload = Parameters<
  typeof client.createTournamentFromScratch
>[0];

export const Route = createFileRoute("/tournaments/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [initialValues] = useState(() => getDefaultWizardValues(new Date()));

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

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

  const createTournamentMutation = useMutation({
    mutationFn: async (payload: CreateTournamentFromScratchPayload) =>
      client.createTournamentFromScratch(payload),
    onSuccess: async () => {
      toast.success("Tournament created");
      await Promise.all([
        queryClient.invalidateQueries(orpc.tournaments.queryOptions()),
        queryClient.invalidateQueries(orpc.liveTournaments.queryOptions()),
        queryClient.invalidateQueries(orpc.teams.queryOptions()),
        queryClient.invalidateQueries(orpc.organizations.queryOptions()),
        queryClient.invalidateQueries(orpc.matchFormats.queryOptions()),
      ]);
      navigate({ to: "/tournaments" });
    },
  });

  if (organizationsError || matchFormatsError || teamsError) {
    const errorMessage =
      organizationsError?.message ||
      matchFormatsError?.message ||
      teamsError?.message ||
      "Failed to load tournament setup data";

    return (
      <PageShell>
        <Card className="rounded-xl border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <h1 className="font-semibold text-xl">Tournament Setup Failed</h1>
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <Button onClick={() => navigate({ to: "/tournaments" })} size="sm">
              <ArrowLeft />
              Back to tournaments
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (isSessionPending) {
    return (
      <PageShell>
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
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell maxWidth="form">
        <PageHeader
          description="You need admin access to create tournaments."
          title="Create Tournament"
        />
        <Card className="rounded-xl border-dashed">
          <CardContent className="space-y-4 p-6">
            <p className="text-muted-foreground text-sm">
              Your account does not have permission to create tournaments.
            </p>
            <Button
              onClick={() => navigate({ to: "/tournaments" })}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowLeft />
              Back to tournaments
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const isLookupLoading =
    organizationsPending || matchFormatsPending || teamsPending;

  return (
    <TournamentWizardForm
      cancelLabel="Cancel"
      description="Build a tournament from scratch with teams and template-based structure."
      heading="Create Tournament"
      initialValues={initialValues}
      isLookupLoading={isLookupLoading}
      matchFormats={matchFormats}
      mode="create"
      onCancel={() => navigate({ to: "/tournaments" })}
      onSubmit={async (values: TournamentWizardValues) => {
        const payload = buildCreateTournamentFromScratchPayload(
          values
        ) as CreateTournamentFromScratchPayload;
        try {
          await createTournamentMutation.mutateAsync(payload);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message || "Failed to create tournament"
              : "Failed to create tournament";
          toast.error(message);
          throw new Error(message);
        }
      }}
      organizations={organizations}
      submitBusyLabel="Creating..."
      submitIdleLabel="Create tournament"
      submitting={createTournamentMutation.isPending}
      teams={teams}
    />
  );
}
