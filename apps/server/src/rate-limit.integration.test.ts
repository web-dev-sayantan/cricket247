import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { RateLimiterNamespaceLike } from "@/lib/rate-limit";

interface SessionState {
  session: {
    user: {
      email: string;
      id: string;
    };
  } | null;
}

const authState: SessionState = {
  session: null,
};

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(authState.session),
    },
  },
}));

mock.module("@/services/match.service", () => ({
  createMatchAction: () => Promise.resolve({ id: 1 }),
  getAllMatches: () => Promise.resolve([]),
  getCompletedMatches: () => Promise.resolve([]),
  getLiveMatches: () => Promise.resolve([]),
  getMatchById: () => Promise.resolve(null),
  getMatchScorecard: () => Promise.resolve(null),
}));

const appModulePromise = import("./index");
const openApiModulePromise = import("./openapi");

interface NamedDurableObjectId {
  name: string;
}

class RecordingRateLimiterNamespace implements RateLimiterNamespaceLike {
  readonly keys: string[] = [];
  private readonly handleFetch: (key: string) => Promise<Response> | Response;

  constructor(handleFetch: (key: string) => Promise<Response> | Response) {
    this.handleFetch = handleFetch;
  }

  idFromName(name: string): NamedDurableObjectId {
    return { name };
  }

  get(id: NamedDurableObjectId) {
    return {
      fetch: async () => {
        this.keys.push(id.name);
        return await this.handleFetch(id.name);
      },
    };
  }
}

function createAllowedRateLimitResponse() {
  return Response.json({
    allowed: true,
    limit: 10,
    remaining: 9,
    resetAfter: 5,
    retryAfter: 0,
    state: {
      lastRefillAt: Date.now(),
      tokens: 9,
    },
  });
}

function createDeniedRateLimitResponse() {
  return Response.json({
    allowed: false,
    limit: 10,
    remaining: 0,
    resetAfter: 1,
    retryAfter: 1,
    state: {
      lastRefillAt: Date.now(),
      tokens: 0,
    },
  });
}

async function requestApp(
  path: string,
  namespace: RateLimiterNamespaceLike,
  init?: RequestInit
) {
  const { app } = await appModulePromise;

  return app.fetch(new Request(`http://localhost${path}`, init), {
    RATE_LIMITER: namespace,
  });
}

const createMatchPayload = {
  tournamentId: 1,
  matchDate: "2026-03-21T00:00:00.000Z",
  tossWinnerId: 1,
  tossDecision: "bat",
  team1Id: 1,
  team2Id: 2,
  oversPerSide: 20,
  maxOverPerBowler: 4,
};

const recordDeliveryPayload = {
  inningsId: 1,
  strikerId: 11,
  nonStrikerId: 12,
  bowlerId: 13,
};

describe("ORPC rate limiting", () => {
  beforeEach(() => {
    authState.session = null;
  });

  it("applies the public bucket to public procedures", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const response = await requestApp("/rpc/completedMatches", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(namespace.keys).toEqual(["rpc:public:ip:203.0.113.10"]);
  });

  it("applies the protected bucket to protected procedures", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const response = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.11",
      },
      method: "POST",
    });

    expect(response.status).toBe(401);
    expect(namespace.keys).toEqual(["rpc:protected:ip:203.0.113.11"]);
    expect(response.headers.get("RateLimit-Limit")).toBe("10");
  });

  it("applies the sensitive bucket to non-scoring sensitive procedures", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const response = await requestApp("/rpc/createMatch", namespace, {
      body: JSON.stringify(createMatchPayload),
      headers: {
        "cf-connecting-ip": "203.0.113.12",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(401);
    expect(namespace.keys).toEqual(["rpc:sensitive:ip:203.0.113.12"]);
  });

  it("applies the scoring bucket to high-frequency scoring procedures", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const response = await requestApp("/rpc/recordScoringDelivery", namespace, {
      body: JSON.stringify(recordDeliveryPayload),
      headers: {
        "cf-connecting-ip": "203.0.113.13",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(401);
    expect(namespace.keys).toEqual(["rpc:scoring:ip:203.0.113.13"]);
  });

  it("exempts the health check procedure", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const response = await requestApp("/rpc/healthCheck", namespace, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(namespace.keys).toEqual([]);
  });

  it("shares the same key across rpc and api transports", async () => {
    const seen = new Map<string, number>();
    const namespace = new RecordingRateLimiterNamespace((key) => {
      const nextCount = (seen.get(key) ?? 0) + 1;
      seen.set(key, nextCount);

      return nextCount === 1
        ? createAllowedRateLimitResponse()
        : createDeniedRateLimitResponse();
    });

    const rpcResponse = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.14",
      },
      method: "POST",
    });
    const apiResponse = await requestApp("/api/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.14",
      },
      method: "POST",
    });

    expect(rpcResponse.status).toBe(401);
    expect(apiResponse.status).toBe(429);
    expect(namespace.keys).toEqual([
      "rpc:protected:ip:203.0.113.14",
      "rpc:protected:ip:203.0.113.14",
    ]);
  });

  it("keys authenticated traffic by user and ip", async () => {
    authState.session = {
      user: {
        email: "scorer@example.com",
        id: "user_123",
      },
    };

    const namespace = new RecordingRateLimiterNamespace(() =>
      createAllowedRateLimitResponse()
    );

    const firstResponse = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.15",
      },
      method: "POST",
    });
    const secondResponse = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.16",
      },
      method: "POST",
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(namespace.keys).toEqual([
      "rpc:protected:user:user_123:ip:203.0.113.15",
      "rpc:protected:user:user_123:ip:203.0.113.16",
    ]);
  });

  it("returns 429 headers and retryAfter metadata when the bucket is empty", async () => {
    const namespace = new RecordingRateLimiterNamespace(() =>
      createDeniedRateLimitResponse()
    );

    const response = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.17",
      },
      method: "POST",
    });
    const body = await response.json();
    const payload =
      typeof body === "object" &&
      body !== null &&
      "json" in body &&
      typeof body.json === "object" &&
      body.json !== null
        ? body.json
        : body;

    expect(response.status).toBe(429);
    expect(response.headers.get("RateLimit-Limit")).toBe("10");
    expect(response.headers.get("RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("RateLimit-Reset")).toBe("1");
    expect(response.headers.get("Retry-After")).toBe("1");
    expect(payload).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      data: {
        retryAfter: 1,
      },
      message: "Too many requests",
      status: 429,
    });
  });

  it("fails open when the limiter backend errors", async () => {
    const namespace = new RecordingRateLimiterNamespace(() => {
      throw new Error("backend unavailable");
    });

    const response = await requestApp("/rpc/privateData", namespace, {
      headers: {
        "cf-connecting-ip": "203.0.113.18",
      },
      method: "POST",
    });

    expect(response.status).toBe(401);
  });

  it("adds rate-limit responses to the generated OpenAPI spec", async () => {
    const { generateOpenApiSpec } = await openApiModulePromise;
    const spec = await generateOpenApiSpec("http://localhost:3000/api");

    const privateDataPath = spec.paths?.["/privateData"];
    const healthCheckPath = spec.paths?.["/healthCheck"];

    expect(privateDataPath?.post?.responses?.["429"]).toBeDefined();
    expect(healthCheckPath?.post?.responses?.["429"]).toBeUndefined();
  });
});
