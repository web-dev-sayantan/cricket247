import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UnauthorizedView({
  navigateToTeams,
}: {
  navigateToTeams: () => void;
}) {
  return (
    <PageShell>
      <PageHeader
        description="You need admin access to manage team roster assignments."
        title="Assign Players"
      />
      <Card className="rounded-xl border-dashed">
        <CardContent className="space-y-4 p-6">
          <p className="text-muted-foreground text-sm">
            Your account does not have permission to assign team players.
          </p>
          <Button
            onClick={navigateToTeams}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeft />
            Back to teams
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function AssignPlayersSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function RosterListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton className="h-16 w-full" key={`roster-row-${String(index)}`} />
      ))}
    </div>
  );
}
