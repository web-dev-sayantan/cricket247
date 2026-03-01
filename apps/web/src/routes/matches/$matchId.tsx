import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/matches/$matchId")({
  beforeLoad: ({ location, params }) => {
    const matchBasePath = `/matches/${params.matchId}`;
    const isMatchBaseRoute =
      location.pathname === matchBasePath ||
      location.pathname === `${matchBasePath}/`;

    if (!isMatchBaseRoute) {
      return;
    }

    throw redirect({
      to: "/matches/$matchId/scorecard",
      params,
    });
  },
});
