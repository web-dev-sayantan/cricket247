import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/matches/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4">
      <Button>
        <Link to="/matches/create-match">Create Match</Link>
      </Button>
    </div>
  );
}
