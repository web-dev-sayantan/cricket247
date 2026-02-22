import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AdminPlayerBulkImportCard } from "@/components/account/admin-player-bulk-import-card";
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            Account
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your onboarding and player profile connection.
          </p>
        </header>

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
    </div>
  );
}
