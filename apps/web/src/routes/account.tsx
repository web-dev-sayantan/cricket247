import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AdminPlayerBulkImportCard } from "@/components/account/admin-player-bulk-import-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { client, orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/account")({
  component: AccountRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
  },
});

function AccountRoute() {
  const navigate = useNavigate({ from: "/account" });
  const { data: status } = useSuspenseQuery(
    orpc.onboardingStatus.queryOptions()
  );
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const linkedPlayerName = status.linkedPlayer?.name ?? "Not linked";

  return (
    <PageShell maxWidth="form">
      <PageHeader
        description="Manage your onboarding and player profile connection."
        title="Account"
      />

      <div className="space-y-4">
        <Card className="rounded-xl">
          <CardHeader className="border-b pb-4">
            <h2 className="font-medium text-lg">Player Profile</h2>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 text-sm">
            <p>
              <span className="font-medium">Linked player:</span>{" "}
              {linkedPlayerName}
            </p>
            <p>
              <span className="font-medium">Onboarding completed:</span>{" "}
              {status.onboardingCompletedAt ? "Yes" : "No"}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => {
                  navigate({ to: "/onboarding" });
                }}
                type="button"
              >
                Open Onboarding
              </Button>
              <Button
                onClick={async () => {
                  await client.markOnboardingSeen();
                  await queryClient.invalidateQueries();
                }}
                type="button"
                variant="outline"
              >
                Dismiss onboarding prompt
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin ? <AdminPlayerBulkImportCard /> : null}
      </div>
    </PageShell>
  );
}
