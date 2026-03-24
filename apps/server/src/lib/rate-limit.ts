import {
  LOCAL_RATE_LIMIT_STORE_ENTRY_TTL_MS,
  LOCAL_RATE_LIMIT_STORE_PRUNE_INTERVAL_MS,
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
  lastSeen: number;
  nextRefill: number;
  tokens: number;
}

type StoredTokenBucketState = Pick<
  TokenBucketState,
  "lastRefillAt" | "tokens"
> &
  Partial<Pick<TokenBucketState, "lastSeen" | "nextRefill">>;

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

const MAX_LOCAL_STORE_SIZE = 10_000;
const LOCAL_RATE_LIMIT_STORE = new Map<string, TokenBucketState>();
let lastLocalRateLimitStorePruneAt = 0;
const SCORING_PROCEDURE_SET = new Set<string>(
  RPC_RATE_LIMIT_SCORING_PROCEDURES
);
const EXEMPT_PROCEDURE_SET = new Set<string>(RPC_RATE_LIMIT_EXEMPT_PROCEDURES);

function ceilSeconds(milliseconds: number) {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}

function getNextRefillTimestamp(
  config: RateLimitBucketConfig,
  tokens: number,
  now: number
) {
  if (tokens >= config.capacity) {
    return now;
  }

  const refillRatePerMillisecond = config.refillRatePerSecond / 1000;
  if (refillRatePerMillisecond <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return now + Math.ceil((config.capacity - tokens) / refillRatePerMillisecond);
}

function normalizeTokenBucketState(
  config: RateLimitBucketConfig,
  currentState: StoredTokenBucketState | undefined,
  now: number
): TokenBucketState {
  const lastRefillAt = currentState?.lastRefillAt ?? now;
  const tokens = Math.min(
    config.capacity,
    Math.max(0, currentState?.tokens ?? config.capacity)
  );

  return {
    lastRefillAt,
    lastSeen: currentState?.lastSeen ?? lastRefillAt,
    nextRefill:
      currentState?.nextRefill ??
      getNextRefillTimestamp(config, tokens, lastRefillAt),
    tokens,
  };
}

function shouldPruneLocalRateLimitState(state: TokenBucketState, now: number) {
  if (now >= state.nextRefill) {
    return true;
  }

  return now - state.lastSeen > LOCAL_RATE_LIMIT_STORE_ENTRY_TTL_MS;
}

function enforceLocalRateLimitStoreSize() {
  if (LOCAL_RATE_LIMIT_STORE.size <= MAX_LOCAL_STORE_SIZE) {
    return;
  }

  const entries = Array.from(LOCAL_RATE_LIMIT_STORE.entries());
  entries.sort((a, b) => a[1].lastSeen - b[1].lastSeen);

  let index = 0;
  while (
    LOCAL_RATE_LIMIT_STORE.size > MAX_LOCAL_STORE_SIZE &&
    index < entries.length
  ) {
    const [key] = entries[index];
    LOCAL_RATE_LIMIT_STORE.delete(key);
    index += 1;
  }
}

export function pruneLocalRateLimitStore(now = Date.now()) {
  if (
    now - lastLocalRateLimitStorePruneAt <
    LOCAL_RATE_LIMIT_STORE_PRUNE_INTERVAL_MS
  ) {
    return;
  }

  for (const [key, state] of LOCAL_RATE_LIMIT_STORE) {
    if (shouldPruneLocalRateLimitState(state, now)) {
      LOCAL_RATE_LIMIT_STORE.delete(key);
    }
  }

  lastLocalRateLimitStorePruneAt = now;
}

function getLocalRateLimitState(key: string, now: number) {
  const state = LOCAL_RATE_LIMIT_STORE.get(key);
  if (!state) {
    return undefined;
  }

  if (shouldPruneLocalRateLimitState(state, now)) {
    LOCAL_RATE_LIMIT_STORE.delete(key);
    return undefined;
  }

  return state;
}

function setLocalRateLimitState(
  key: string,
  state: TokenBucketState,
  now: number
) {
  if (shouldPruneLocalRateLimitState(state, now)) {
    LOCAL_RATE_LIMIT_STORE.delete(key);
    return;
  }

  LOCAL_RATE_LIMIT_STORE.set(key, state);
  enforceLocalRateLimitStoreSize();
}

export function clearLocalRateLimitStoreForTests() {
  LOCAL_RATE_LIMIT_STORE.clear();
  lastLocalRateLimitStorePruneAt = 0;
}

export function getLocalRateLimitStoreSizeForTests() {
  return LOCAL_RATE_LIMIT_STORE.size;
}

export function setLocalRateLimitStateForTests(
  key: string,
  state: TokenBucketState
) {
  LOCAL_RATE_LIMIT_STORE.set(key, state);
}

export function evaluateTokenBucket(
  config: RateLimitBucketConfig,
  currentState: StoredTokenBucketState | undefined,
  now: number,
  cost = 1
): RateLimitEvaluation {
  const capacity = config.capacity;
  const refillRatePerMillisecond = config.refillRatePerSecond / 1000;
  const baselineState = normalizeTokenBucketState(config, currentState, now);
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
        lastSeen: now,
        nextRefill: getNextRefillTimestamp(config, remainingTokens, now),
        tokens: remainingTokens,
      }
    : {
        lastRefillAt: now,
        lastSeen: now,
        nextRefill: getNextRefillTimestamp(config, refilledTokens, now),
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

function buildRateLimitStateKey(bucket: RateLimitBucketName, key: string) {
  return `${bucket}:${key}`;
}

function consumeLocalRateLimit(
  options: Omit<ConsumeRateLimitOptions, "namespace">
) {
  const config = RPC_RATE_LIMIT_BUCKETS[options.bucket];
  const now = options.now ?? Date.now();
  pruneLocalRateLimitStore(now);
  const stateKey = buildRateLimitStateKey(options.bucket, options.key);
  const currentState = getLocalRateLimitState(stateKey, now);
  const evaluation = evaluateTokenBucket(
    config,
    currentState,
    now,
    options.cost ?? 1
  );

  setLocalRateLimitState(stateKey, evaluation.state, now);

  return evaluation;
}

export async function consumeRateLimit(options: ConsumeRateLimitOptions) {
  if (!options.namespace) {
    return consumeLocalRateLimit(options);
  }

  const id = options.namespace.idFromName(
    buildRateLimitStateKey(options.bucket, options.key)
  );
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

export interface GetClientIpOptions {
  /**
   * Enable parsing of proxy headers (x-forwarded-for, x-real-ip).
   * Only enable if the request is known to come through a trusted proxy.
   * By default, only Cloudflare's cf-connecting-ip header is trusted.
   */
  trustedProxy?: boolean;
}

export function getClientIp(
  headers: Headers,
  options: GetClientIpOptions = {}
) {
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  if (options.trustedProxy) {
    const proxiedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (proxiedFor) {
      return proxiedFor;
    }

    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) {
      return realIp;
    }
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
    const currentState = await this.state.storage.get<StoredTokenBucketState>(
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
