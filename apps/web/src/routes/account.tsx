import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPlayerBulkImportCard } from "@/components/account/admin-player-bulk-import-card";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { data: status } = useSuspenseQuery(
    orpc.onboardingStatus.queryOptions()
  );
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const linkedPlayerName = status.linkedPlayer?.name ?? null;
  const onboardingComplete = Boolean(status.onboardingCompletedAt);

  const handleConfirmAccountDelete = async () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const { error } = await authClient.deleteUser();

      if (error) {
        toast.error(error.message || "Failed to delete account");
        setIsDeletingAccount(false);
        return;
      }

      window.location.assign("/goodbye");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setIsDeletingAccount(false);
    }
  };

  return (
    <PageShell className="hero-surface" maxWidth="content">
      {/* ── Page Header ── */}
      <header className="animate-stagger-1 space-y-3 pb-2">
        <h1 className="font-normal font-serif text-4xl text-foreground leading-tight tracking-tight sm:text-5xl">
          My Account
        </h1>
        <p className="max-w-xl font-sans text-muted-foreground text-sm leading-6 sm:text-base">
          Manage your onboarding and player profile connection.
        </p>
      </header>

      <div className="animate-stagger-2 space-y-6">
        {/* ── Player Profile Panel ── */}
        <section
          aria-labelledby="player-profile-heading"
          className="overflow-hidden border border-foreground/10 bg-[color-mix(in_oklab,var(--color-card)_92%,var(--color-primary)_8%)]"
        >
          <div className="border-foreground/10 border-b p-4">
            <h2
              className="mt-0.5 font-sans font-semibold text-lg tracking-tight"
              id="player-profile-heading"
            >
              Player Profile
            </h2>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[0.64rem] text-muted-foreground uppercase tracking-[0.22em]">
                Linked Player
              </p>
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center border border-foreground/10 bg-[color-mix(in_oklab,var(--color-primary)_10%,var(--color-card))]">
                  <Link2 className="size-3.5 text-primary" />
                </div>
                <p className="font-sans font-semibold text-base tracking-tight">
                  {linkedPlayerName ?? (
                    <span className="font-normal text-muted-foreground">
                      Not linked
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[0.64rem] text-muted-foreground uppercase tracking-[0.22em]">
                Onboarding Status
              </p>
              <div className="flex items-center gap-2.5">
                {onboardingComplete ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <XCircle className="size-4 text-muted-foreground" />
                )}
                <p className="font-sans font-semibold text-base tracking-tight">
                  {onboardingComplete ? "Completed" : "Incomplete"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-foreground/10 border-t px-6 py-4">
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
        </section>

        {isAdmin ? <AdminPlayerBulkImportCard /> : null}

        <section
          aria-labelledby="account-deletion-heading"
          className="overflow-hidden border border-destructive/30 bg-destructive/5"
        >
          <div className="border-destructive/20 border-b p-4">
            <h2
              className="mt-0.5 font-sans font-semibold text-lg tracking-tight"
              id="account-deletion-heading"
            >
              Danger Zone
            </h2>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center border border-destructive/20 bg-destructive/10">
                <AlertTriangle className="size-4 text-destructive" />
              </div>

              <div className="space-y-2">
                <p className="font-sans font-semibold text-base tracking-tight">
                  Delete account
                </p>
                <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                  This permanently removes your account, active sessions,
                  connected sign-in methods, and registered passkeys. Your
                  linked player profile and related cricket data stay intact.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-destructive/20 border-t px-6 py-4">
            <Button
              onClick={() => {
                setIsDeleteDialogOpen(true);
              }}
              type="button"
              variant="destructive"
            >
              <Trash2 />
              Delete account
            </Button>
          </div>
        </section>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!(open || isDeletingAccount)) {
            setIsDeleteDialogOpen(false);
          }
        }}
        open={isDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Deleting your account removes your
              sign-in access, active sessions, linked auth providers, and
              passkeys. Your linked player profile and related cricket records
              will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isDeletingAccount}
              onClick={() => setIsDeleteDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeletingAccount}
              onClick={handleConfirmAccountDelete}
              type="button"
              variant="destructive"
            >
              {isDeletingAccount ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
