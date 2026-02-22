import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/teams/$teamId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
