import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/matches/$matchId/scorecard")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/matches/$matchId/scorecard"!</div>;
}
