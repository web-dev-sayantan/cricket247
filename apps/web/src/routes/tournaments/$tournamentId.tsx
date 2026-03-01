import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tournaments/$tournamentId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
