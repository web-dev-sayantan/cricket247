export const API_VERSION = "v1";

export const API_PREFIX = `/api/${API_VERSION}`;

export const RATE_LIMITS = {
  GENERAL: 100,
  AUTH: 10,
  STRICT: 5,
} as const;

export const RPC_RATE_LIMIT_BUCKETS = {
  public: {
    capacity: 120,
    refillRatePerSecond: 2,
  },
  protected: {
    capacity: 60,
    refillRatePerSecond: 1,
  },
  sensitive: {
    capacity: 20,
    refillRatePerSecond: 0.25,
  },
  scoring: {
    capacity: 60,
    refillRatePerSecond: 1,
  },
} as const;

export const RPC_RATE_LIMIT_EXEMPT_PROCEDURES = ["healthCheck"] as const;

export const RPC_RATE_LIMIT_SCORING_PROCEDURES = [
  "startMatchScoring",
  "saveMatchLineup",
  "initializeMatchScoring",
  "startScoringInnings",
  "recordScoringDelivery",
  "updateScoringDelivery",
  "deleteScoringDelivery",
  "closeCurrentScoringInnings",
  "saveScoringDelivery",
  "createNextScoringDelivery",
  "endScoringInnings",
] as const;

export const RATE_LIMITER_DURABLE_OBJECT_TIMEOUT_MS = 250;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  SCORER: "scorer",
} as const;

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
} as const;

export const INNINGS_TYPE = {
  FIRST: "first",
  SECOND: "second",
} as const;

export const DISMISSAL_TYPES = {
  BOWLED: "bowled",
  CAUGHT: "caught",
  LBW: "lbw",
  RUN_OUT: "run_out",
  STUMPED: "stumped",
  HIT_WICKET: "hit_wicket",
  RETIRED_HURT: "retired_hurt",
  TIMED_OUT: "timed_out",
} as const;
