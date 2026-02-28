import { describe, expect, it } from "bun:test";

import {
  ballsToOvers,
  calculateBowlingAverage,
  calculateBowlingEconomy,
  calculateNetRunRate,
  calculateStrikeRate,
  formatOvers,
  oversToTotalBalls,
} from "./cricket.utils";

describe("cricket.utils", () => {
  it("calculates strike rate and handles zero balls", () => {
    expect(calculateStrikeRate(36, 24)).toBe(150);
    expect(calculateStrikeRate(15, 0)).toBe(0);
  });

  it("calculates bowling economy and average with zero guards", () => {
    expect(calculateBowlingEconomy(30, 4)).toBe(7.5);
    expect(calculateBowlingEconomy(30, 0)).toBe(0);
    expect(calculateBowlingAverage(28, 2)).toBe(14);
    expect(calculateBowlingAverage(28, 0)).toBe(0);
  });

  it("calculates net run rate and handles invalid overs", () => {
    expect(calculateNetRunRate(160, 20, 140, 20)).toBe(1);
    expect(calculateNetRunRate(100, 0, 80, 20)).toBe(0);
    expect(calculateNetRunRate(100, 20, 80, 0)).toBe(0);
  });

  it("formats and converts overs consistently", () => {
    expect(formatOvers(38)).toBe("6.2");
    expect(ballsToOvers(38)).toBe(6.2);
    expect(oversToTotalBalls(6.2)).toBe(38);
  });
});
