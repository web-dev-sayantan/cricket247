export const API_VERSION = "v1";

export const API_PREFIX = `/api/${API_VERSION}`;

export const RATE_LIMITS = {
  GENERAL: 100,
  AUTH: 10,
  STRICT: 5,
} as const;

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
