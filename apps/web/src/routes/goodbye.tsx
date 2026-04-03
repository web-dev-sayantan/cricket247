import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/goodbye")({
  component: GoodbyeRoute,
});

function GoodbyeRoute() {
  return (
    <div className="page-surface hero-surface">
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center border border-foreground/10 bg-card">
          <CheckCircle2 className="size-6 text-muted-foreground" />
        </div>

        <div className="space-y-3">
          <p className="text-[0.64rem] text-muted-foreground uppercase tracking-[0.28em]">
            Account deleted
          </p>
          <h1 className="font-normal font-serif text-4xl tracking-tight">
            Goodbye.
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            Your account has been permanently deleted. Your player profile and
            cricket records remain on file in case you return.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link className={buttonVariants({ variant: "default" })} to="/login">
            Create a new account
          </Link>
          <Link className={buttonVariants({ variant: "outline" })} to="/">
            Browse matches
          </Link>
        </div>
      </main>
    </div>
  );
}
