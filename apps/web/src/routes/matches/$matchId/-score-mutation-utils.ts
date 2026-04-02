import type { AppRouterClient } from "@cricket247/server/contract";
import type { QueryClient } from "@tanstack/react-query";
import type { RouterAppContext } from "@/routes/__root";

interface QueryReference {
  queryKey: readonly unknown[];
}

type ScoringSetupResult = Awaited<
  ReturnType<AppRouterClient["getMatchScoringSetup"]>
>;

type ScoringSessionMutationResult = Awaited<
  ReturnType<AppRouterClient["recordScoringDelivery"]>
>;

type ResolvedScoringSetupResult = Exclude<ScoringSetupResult, null>;

function upsertAffectedInnings(
  innings: ResolvedScoringSetupResult["innings"],
  affectedInnings: ScoringSessionMutationResult["affectedInnings"],
  fallbackInnings: ResolvedScoringSetupResult["currentInnings"]
) {
  const existingAffectedInnings =
    innings.find((inningsRow) => inningsRow.id === affectedInnings.id) ??
    fallbackInnings;
  const nextAffectedInnings = existingAffectedInnings
    ? {
        ...existingAffectedInnings,
        ...affectedInnings,
      }
    : affectedInnings;
  const existingIndex = innings.findIndex(
    (inningsRow) => inningsRow.id === affectedInnings.id
  );

  if (existingIndex === -1) {
    return [...innings, nextAffectedInnings];
  }

  return innings.map((inningsRow) =>
    inningsRow.id === affectedInnings.id ? nextAffectedInnings : inningsRow
  );
}

function patchCurrentInningsDeliveries(params: {
  currentInnings: NonNullable<ResolvedScoringSetupResult["currentInnings"]>;
  mutation: ScoringSessionMutationResult;
}) {
  switch (params.mutation.action) {
    case "record": {
      if (!params.mutation.delivery) {
        return params.currentInnings.deliveries;
      }

      const alreadyExists = params.currentInnings.deliveries.some(
        (delivery) => delivery.id === params.mutation.delivery?.id
      );
      if (alreadyExists) {
        return params.currentInnings.deliveries.map((delivery) =>
          delivery.id === params.mutation.delivery?.id
            ? {
                ...delivery,
                ...params.mutation.delivery,
              }
            : delivery
        );
      }

      return [...params.currentInnings.deliveries, params.mutation.delivery];
    }
    case "update": {
      if (!params.mutation.delivery) {
        return params.currentInnings.deliveries;
      }

      return params.currentInnings.deliveries.map((delivery) =>
        delivery.id === params.mutation.delivery?.id
          ? {
              ...delivery,
              ...params.mutation.delivery,
            }
          : delivery
      );
    }
    case "delete":
      return params.currentInnings.deliveries.filter(
        (delivery) => delivery.id !== params.mutation.deletedDeliveryId
      );
    default:
      return params.currentInnings.deliveries;
  }
}

export function patchScoringSetupWithMutationResult(params: {
  mutation: ScoringSessionMutationResult;
  previous: ScoringSetupResult;
}): ScoringSetupResult {
  if (!params.previous) {
    return params.previous;
  }

  const nextInnings = upsertAffectedInnings(
    params.previous.innings,
    params.mutation.affectedInnings,
    params.previous.currentInnings
  );
  let currentInningsBase: ResolvedScoringSetupResult["currentInnings"] = null;
  if (params.mutation.currentInnings) {
    if (
      params.previous.currentInnings?.id === params.mutation.currentInnings.id
    ) {
      currentInningsBase = params.previous.currentInnings;
    } else {
      currentInningsBase =
        params.previous.innings.find(
          (inningsRow) => inningsRow.id === params.mutation.currentInnings?.id
        ) ?? null;
    }
  }
  const currentInnings = params.mutation.currentInnings
    ? {
        ...currentInningsBase,
        ...params.mutation.currentInnings,
        deliveries:
          currentInningsBase && "deliveries" in currentInningsBase
            ? patchCurrentInningsDeliveries({
                currentInnings: currentInningsBase,
                mutation: params.mutation,
              })
            : [],
      }
    : null;
  const patchedResult: ResolvedScoringSetupResult = {
    ...params.previous,
    availableBatters: params.mutation.availableBatters,
    availableBowlers: params.mutation.availableBowlers,
    currentInnings:
      currentInnings as ResolvedScoringSetupResult["currentInnings"],
    entryContext: params.mutation
      .entryContext as ResolvedScoringSetupResult["entryContext"],
    innings: nextInnings as ResolvedScoringSetupResult["innings"],
    match: {
      ...params.previous.match,
      ...params.mutation.match,
    } as ResolvedScoringSetupResult["match"],
    nextInningsDefaults: params.mutation
      .nextInningsDefaults as ResolvedScoringSetupResult["nextInningsDefaults"],
    pendingInningsClosure: params.mutation
      .pendingInningsClosure as ResolvedScoringSetupResult["pendingInningsClosure"],
    phase: params.mutation.phase as ResolvedScoringSetupResult["phase"],
    requiredSelections: params.mutation
      .requiredSelections as ResolvedScoringSetupResult["requiredSelections"],
  };

  return patchedResult;
}

interface ApplyScoringSessionMutationResultParams {
  backgroundQueries: QueryReference[];
  queryClient: Pick<QueryClient, "invalidateQueries" | "setQueryData">;
  scoringQuery: QueryReference;
  session: ScoringSessionMutationResult;
}

export function applyScoringSessionMutationResult(
  params: ApplyScoringSessionMutationResultParams
) {
  params.queryClient.setQueryData<ScoringSetupResult>(
    params.scoringQuery.queryKey,
    (previous) =>
      patchScoringSetupWithMutationResult({
        mutation: params.session,
        previous: previous ?? null,
      })
  );

  return params.backgroundQueries.map((query) =>
    params.queryClient.invalidateQueries({
      queryKey: query.queryKey,
    })
  );
}

interface BuildBackgroundScoreRefreshQueriesParams {
  matchId: number;
  orpc: RouterAppContext["orpc"];
  tournamentId?: number;
}

export function buildBackgroundScoreRefreshQueries(
  params: BuildBackgroundScoreRefreshQueriesParams
) {
  const queries: QueryReference[] = [
    params.orpc.getMatchById.queryOptions({
      input: params.matchId,
    }),
    params.orpc.liveMatches.queryOptions(),
    params.orpc.getMatchScorecard.queryOptions({
      input: {
        matchId: params.matchId,
        includeBallByBall: false,
      },
    }),
  ];

  if (typeof params.tournamentId === "number") {
    queries.push(
      params.orpc.tournamentFixtures.queryOptions({
        input: {
          tournamentId: params.tournamentId,
        },
      })
    );
  }

  return queries;
}
