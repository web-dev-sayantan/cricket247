export function shouldShowBackToScoring(params: {
  canCurrentUserScore: boolean;
  isLive: boolean;
}) {
  return params.isLive && params.canCurrentUserScore;
}
