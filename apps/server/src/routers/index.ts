import type { RouterClient } from "@orpc/server";
import { coreRouter } from "@/routers/core.router";
import { fixtureRouter } from "@/routers/fixture.router";
import { matchRouter } from "@/routers/match.router";
import { playerRouter } from "@/routers/player.router";
import { scoringRouter } from "@/routers/scoring.router";
import { teamRouter } from "@/routers/team.router";
import { tournamentRouter } from "@/routers/tournament.router";

export const appRouter = {
  ...coreRouter,
  ...matchRouter,
  ...tournamentRouter,
  ...fixtureRouter,
  ...playerRouter,
  ...teamRouter,
  ...scoringRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
