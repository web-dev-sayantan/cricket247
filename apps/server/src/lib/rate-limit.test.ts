import { describe, expect, it } from "bun:test";
import { evaluateTokenBucket } from "./rate-limit";

const TEST_BUCKET = {
  capacity: 3,
  refillRatePerSecond: 1,
} as const;

describe("evaluateTokenBucket", () => {
  it("consumes tokens within capacity", () => {
    const result = evaluateTokenBucket(TEST_BUCKET, undefined, 1000, 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfter).toBe(0);
  });

  it("rejects requests when the bucket is empty", () => {
    const result = evaluateTokenBucket(
      TEST_BUCKET,
      {
        lastRefillAt: 1000,
        tokens: 0,
      },
      1000,
      1
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(1);
  });

  it("refills tokens over time", () => {
    const result = evaluateTokenBucket(
      TEST_BUCKET,
      {
        lastRefillAt: 1000,
        tokens: 0,
      },
      2500,
      1
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(0);
  });

  it("caps refills at the maximum capacity", () => {
    const result = evaluateTokenBucket(
      TEST_BUCKET,
      {
        lastRefillAt: 1000,
        tokens: 1,
      },
      20_000,
      0
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.resetAfter).toBe(0);
  });
});
