import { describe, expect, it } from "bun:test";
import {
  clearLocalRateLimitStoreForTests,
  consumeRateLimit,
  evaluateTokenBucket,
  getClientIp,
  getLocalRateLimitStoreSizeForTests,
  pruneLocalRateLimitStore,
  setLocalRateLimitStateForTests,
} from "./rate-limit";

const TEST_BUCKET = {
  capacity: 3,
  refillRatePerSecond: 1,
} as const;

describe("evaluateTokenBucket", () => {
  it("consumes tokens within capacity", () => {
    const result = evaluateTokenBucket(TEST_BUCKET, undefined, 1000, 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.state.lastSeen).toBe(1000);
    expect(result.state.nextRefill).toBe(2000);
    expect(result.retryAfter).toBe(0);
  });

  it("rejects requests when the bucket is empty", () => {
    const result = evaluateTokenBucket(
      TEST_BUCKET,
      {
        lastRefillAt: 1000,
        lastSeen: 1000,
        nextRefill: 4000,
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
        lastSeen: 1000,
        nextRefill: 4000,
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
        lastSeen: 1000,
        nextRefill: 3000,
        tokens: 1,
      },
      20_000,
      0
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.resetAfter).toBe(0);
  });

  it("hydrates missing metadata from stored legacy state", () => {
    const result = evaluateTokenBucket(
      TEST_BUCKET,
      {
        lastRefillAt: 1000,
        tokens: 0,
      },
      2000,
      0
    );

    expect(result.allowed).toBe(true);
    expect(result.state.lastSeen).toBe(2000);
    expect(result.state.nextRefill).toBe(4000);
  });
});

describe("local rate-limit store eviction", () => {
  it("prunes entries once they have had time to fully refill", async () => {
    clearLocalRateLimitStoreForTests();

    await consumeRateLimit({
      bucket: "protected",
      cost: 1,
      key: "principal:refill",
      now: 0,
    });

    expect(getLocalRateLimitStoreSizeForTests()).toBe(1);

    pruneLocalRateLimitStore(60_001);

    expect(getLocalRateLimitStoreSizeForTests()).toBe(0);
  });

  it("prunes stale full entries after the TTL backstop", () => {
    clearLocalRateLimitStoreForTests();

    setLocalRateLimitStateForTests("principal:ttl", {
      lastRefillAt: 0,
      lastSeen: 0,
      nextRefill: Number.POSITIVE_INFINITY,
      tokens: TEST_BUCKET.capacity,
    });

    pruneLocalRateLimitStore(960_001);

    expect(getLocalRateLimitStoreSizeForTests()).toBe(0);
  });
});

describe("getClientIp", () => {
  it("uses cf-connecting-ip by default", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.20",
      "x-real-ip": "198.51.100.21",
    });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("ignores x-forwarded-for and x-real-ip unless the request is from a trusted proxy", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20, 198.51.100.30",
      "x-real-ip": "198.51.100.21",
    });

    expect(getClientIp(headers)).toBeUndefined();
  });

  it("accepts proxied headers when the caller marks the request as trusted", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20, 198.51.100.30",
      "x-real-ip": "198.51.100.21",
    });

    expect(getClientIp(headers, { trustedProxy: true })).toBe("198.51.100.20");
  });

  it("falls back to x-real-ip for trusted proxies when x-forwarded-for is absent", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.21",
    });

    expect(getClientIp(headers, { trustedProxy: true })).toBe("198.51.100.21");
  });
});
