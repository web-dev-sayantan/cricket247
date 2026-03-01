import { describe, expect, it } from "bun:test";
import { shouldShowBackToScoring } from "./scorecard-visibility";

describe("shouldShowBackToScoring", () => {
  it("returns true when match is live and user can score", () => {
    expect(
      shouldShowBackToScoring({
        canCurrentUserScore: true,
        isLive: true,
      })
    ).toBe(true);
  });

  it("returns false when match is not live", () => {
    expect(
      shouldShowBackToScoring({
        canCurrentUserScore: true,
        isLive: false,
      })
    ).toBe(false);
  });

  it("returns false when user cannot score", () => {
    expect(
      shouldShowBackToScoring({
        canCurrentUserScore: false,
        isLive: true,
      })
    ).toBe(false);
  });
});
