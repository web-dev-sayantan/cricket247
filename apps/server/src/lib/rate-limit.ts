import {
  RATE_LIMITER_DURABLE_OBJECT_TIMEOUT_MS,
  RPC_RATE_LIMIT_BUCKETS,
  RPC_RATE_LIMIT_EXEMPT_PROCEDURES,
  RPC_RATE_LIMIT_SCORING_PROCEDURES,
} from "@/config/constants";

export type RateLimitBucketName = keyof typeof RPC_RATE_LIMIT_BUCKETS;

export interface RateLimitBucketConfig {
  capacity: number;
  refillRatePerSecond: number;
}

export interface TokenBucketState {
  lastRefillAt: number;
  tokens: number;
}

export interface RateLimitEvaluation {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfter: number;
  retryAfter: number;
  state: TokenBucketState;
}

interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

interface DurableObjectIdLike {
  readonly name?: string;
}

interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface RateLimiterNamespaceLike {
  get(id: DurableObjectIdLike): DurableObjectStubLike;
  idFromName(name: string): DurableObjectIdLike;
}

interface ConsumeRateLimitRequest {
  bucket: RateLimitBucketName;
  cost: number;
}

interface ConsumeRateLimitOptions {
  bucket: RateLimitBucketName;
  cost?: number;
  key: string;
  namespace?: RateLimiterNamespaceLike;
  now?: number;
}

const TOKEN_BUCKET_STATE_KEY = "token-bucket-state";
const CONSUME_PATH = "https://rate-limiter/consume";
const LOCAL_RATE_LIMIT_STORE = new Map<string, TokenBucketState>();
const SCORING_PROCEDURE_SET = new Set<string>(
  RPC_RATE_LIMIT_SCORING_PROCEDURES
);
const EXEMPT_PROCEDURE_SET = new Set<string>(RPC_RATE_LIMIT_EXEMPT_PROCEDURES);

function ceilSeconds(milliseconds: number) {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}

export function evaluateTokenBucket(
  config: RateLimitBucketConfig,
  currentState: TokenBucketState | undefined,
  now: number,
  cost = 1
): RateLimitEvaluation {
  const capacity = config.capacity;
  const refillRatePerMillisecond = config.refillRatePerSecond / 1000;
  const baselineState = currentState ?? {
    lastRefillAt: now,
    tokens: capacity,
  };
  const elapsedMs = Math.max(0, now - baselineState.lastRefillAt);
  const refilledTokens = Math.min(
    capacity,
    baselineState.tokens + elapsedMs * refillRatePerMillisecond
  );
  const remainingTokens = refilledTokens - cost;
  const allowed = remainingTokens >= 0;
  const nextState = allowed
    ? {
        lastRefillAt: now,
        tokens: remainingTokens,
      }
    : {
        lastRefillAt: now,
        tokens: refilledTokens,
      };
  const missingTokens = allowed ? 0 : Math.max(0, cost - refilledTokens);
  const retryAfterMs =
    missingTokens === 0
      ? 0
      : Math.ceil(missingTokens / refillRatePerMillisecond);
  const resetAfterMs =
    nextState.tokens >= capacity
      ? 0
      : Math.ceil((capacity - nextState.tokens) / refillRatePerMillisecond);

  return {
    allowed,
    limit: capacity,
    remaining: Math.max(0, Math.floor(nextState.tokens)),
    resetAfter: ceilSeconds(resetAfterMs),
    retryAfter: ceilSeconds(retryAfterMs),
    state: nextState,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Rate limiter timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function consumeLocalRateLimit(
  options: Omit<ConsumeRateLimitOptions, "namespace">
) {
  const config = RPC_RATE_LIMIT_BUCKETS[options.bucket];
  const now = options.now ?? Date.now();
  const currentState = LOCAL_RATE_LIMIT_STORE.get(options.key);
  const evaluation = evaluateTokenBucket(
    config,
    currentState,
    now,
    options.cost ?? 1
  );

  LOCAL_RATE_LIMIT_STORE.set(options.key, evaluation.state);

  return evaluation;
}

export async function consumeRateLimit(options: ConsumeRateLimitOptions) {
  if (!options.namespace) {
    return consumeLocalRateLimit(options);
  }

  const id = options.namespace.idFromName(options.key);
  const stub = options.namespace.get(id);
  const response = await withTimeout(
    stub.fetch(CONSUME_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        bucket: options.bucket,
        cost: options.cost ?? 1,
      } satisfies ConsumeRateLimitRequest),
    }),
    RATE_LIMITER_DURABLE_OBJECT_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(
      `Rate limiter durable object failed with status ${response.status}`
    );
  }

  return (await response.json()) as RateLimitEvaluation;
}

export function getRateLimitHeaders(evaluation: RateLimitEvaluation) {
  return {
    "RateLimit-Limit": evaluation.limit.toString(),
    "RateLimit-Remaining": evaluation.remaining.toString(),
    "RateLimit-Reset": evaluation.resetAfter.toString(),
  } as const;
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("cf-connecting-ip")?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  const proxiedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (proxiedFor) {
    return proxiedFor;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return undefined;
}

interface SessionLike {
  user?: {
    email?: string;
    id?: string;
  } | null;
}

export function getRateLimitPrincipalKey(
  session: SessionLike | null | undefined,
  clientIp: string | undefined
) {
  const userKey = session?.user?.id ?? session?.user?.email;

  if (userKey && clientIp) {
    return `user:${userKey}:ip:${clientIp}`;
  }

  if (userKey) {
    return `user:${userKey}`;
  }

  if (clientIp) {
    return `ip:${clientIp}`;
  }

  return "anonymous";
}

export function getRateLimitBucketName(
  procedureName: string,
  defaultBucket: Exclude<RateLimitBucketName, "scoring">
) {
  if (SCORING_PROCEDURE_SET.has(procedureName)) {
    return "scoring" satisfies RateLimitBucketName;
  }

  return defaultBucket;
}

export function isRateLimitExemptProcedure(procedureName: string) {
  return EXEMPT_PROCEDURE_SET.has(procedureName);
}

export class RateLimitDurableObject {
  private readonly state: DurableObjectStateLike;

  constructor(state: DurableObjectStateLike) {
    this.state = state;
  }

  async fetch(request: Request) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
      });
    }

    const payload = (await request.json()) as ConsumeRateLimitRequest;
    const config = RPC_RATE_LIMIT_BUCKETS[payload.bucket];
    const currentState = await this.state.storage.get<TokenBucketState>(
      TOKEN_BUCKET_STATE_KEY
    );
    const evaluation = evaluateTokenBucket(
      config,
      currentState,
      Date.now(),
      payload.cost
    );

    await this.state.storage.put(TOKEN_BUCKET_STATE_KEY, evaluation.state);

    return Response.json(evaluation);
  }
}
