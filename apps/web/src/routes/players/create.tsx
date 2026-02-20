import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/players/create")({
  component: () => <div>Create Player Page (Placeholder)</div>,
});
