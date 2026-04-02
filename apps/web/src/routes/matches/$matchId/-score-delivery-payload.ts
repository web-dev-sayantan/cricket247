import type { DeliveryDraft } from "@/routes/matches/$matchId/-components/score-a-ball";

export function buildDeliveryMutationPayload(payload: DeliveryDraft) {
  const wicketType = payload.wicketType || undefined;

  return {
    inningsId: payload.inningsId,
    strikerId: payload.strikerId as number,
    nonStrikerId: payload.nonStrikerId as number,
    bowlerId: payload.bowlerId as number,
    batterRuns: payload.batterRuns,
    wideRuns: payload.wideRuns,
    noBallRuns: payload.noBallRuns,
    byeRuns: payload.byeRuns,
    legByeRuns: payload.legByeRuns,
    penaltyRuns: payload.penaltyRuns,
    wicketType,
    ...(wicketType
      ? {
          dismissedPlayerId: payload.dismissedPlayerId,
          assistedById: payload.assistedById,
        }
      : {}),
  };
}
