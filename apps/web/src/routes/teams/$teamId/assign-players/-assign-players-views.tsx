import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UnauthorizedView({
  navigateToTeams,
}: {
  navigateToTeams: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            Assign Players
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            You need admin access to manage team roster assignments.
          </p>
        </header>
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
      </div>
    </div>
  );
}

export function AssignPlayersSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 md:px-6 md:py-8">
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
