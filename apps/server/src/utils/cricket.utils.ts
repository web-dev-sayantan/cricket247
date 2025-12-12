export function calculateStrikeRate(runs: number, ballsFaced: number): number {
  if (ballsFaced === 0) return 0;
  return Number(((runs / ballsFaced) * 100).toFixed(2));
}

export function calculateBowlingEconomy(
  runsConceded: number,
  oversBowled: number
): number {
  if (oversBowled === 0) return 0;
  return Number((runsConceded / oversBowled).toFixed(2));
}

export function calculateBowlingAverage(
  runsConceded: number,
  wicketsTaken: number
): number {
  if (wicketsTaken === 0) return 0;
  return Number((runsConceded / wicketsTaken).toFixed(2));
}

export function calculateNetRunRate(
  runsScored: number,
  oversBatted: number,
  runsConceded: number,
  oversBowled: number
): number {
  if (oversBatted === 0 || oversBowled === 0) return 0;
  const runRate = runsScored / oversBatted;
  const concededRate = runsConceded / oversBowled;
  return Number((runRate - concededRate).toFixed(2));
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
}

export function ballsToOvers(balls: number): number {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return Number((overs + remainingBalls / 10).toFixed(1));
}

export function oversToTotalBalls(overs: number): number {
  const completeOvers = Math.floor(overs);
  const remainingBalls = Math.round((overs - completeOvers) * 10);
  return completeOvers * 6 + remainingBalls;
}
