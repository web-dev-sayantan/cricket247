import type { AppRouterClient } from "@cricket247/server/contract";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

interface QueryReference {
  queryKey: readonly unknown[];
}

type ScoringSessionMutationResult = Awaited<
  ReturnType<AppRouterClient["recordScoringDelivery"]>
>;

interface ApplyScoringSessionMutationResultParams {
  backgroundQueries: QueryReference[];
  queryClient: Pick<QueryClient, "invalidateQueries" | "setQueryData">;
  scoringQuery: QueryReference;
  session: ScoringSessionMutationResult;
}

export function applyScoringSessionMutationResult(
  params: ApplyScoringSessionMutationResultParams
) {
  params.queryClient.setQueryData(params.scoringQuery.queryKey, params.session);

  return params.backgroundQueries.map((query) =>
    params.queryClient.invalidateQueries({
      queryKey: query.queryKey,
    })
  );
}

interface BuildBackgroundScoreRefreshQueriesParams {
  matchId: number;
  tournamentId?: number;
}

export function buildBackgroundScoreRefreshQueries(
  params: BuildBackgroundScoreRefreshQueriesParams
) {
  const queries: QueryReference[] = [
    orpc.getMatchById.queryOptions({
      input: params.matchId,
    }),
    orpc.liveMatches.queryOptions(),
    orpc.getMatchScorecard.queryOptions({
      input: {
        matchId: params.matchId,
        includeBallByBall: false,
      },
    }),
  ];

  if (typeof params.tournamentId === "number") {
    queries.push(
      orpc.tournamentFixtures.queryOptions({
        input: {
          tournamentId: params.tournamentId,
        },
      })
    );
  }

  return queries;
}
