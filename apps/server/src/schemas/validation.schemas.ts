import { z } from "zod";

// Common validation schemas
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number"),
});

export const paginationSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

// User validation schemas
export const userRoleSchema = z.enum(["admin", "user", "scorer"]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .optional(),
  email: z.string().email("Invalid email address"),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
    .optional(),
  role: userRoleSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial();

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
  shortName: z.string().min(1).max(10).optional(),
  logo: z.string().url("Invalid logo URL").optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

// Player validation schemas
export const playerRoleSchema = z.enum([
  "batsman",
  "bowler",
  "all_rounder",
  "wicket_keeper",
]);

export const battingStyleSchema = z.enum(["right_handed", "left_handed"]);

export const bowlingStyleSchema = z.enum([
  "right_arm_fast",
  "left_arm_fast",
  "right_arm_medium",
  "left_arm_medium",
  "right_arm_spin",
  "left_arm_spin",
  "none",
]);

export const createPlayerSchema = z.object({
  name: z.string().min(1, "Player name is required").max(100),
  dateOfBirth: z.string().datetime("Invalid date format").optional(),
  role: playerRoleSchema,
  battingStyle: battingStyleSchema,
  bowlingStyle: bowlingStyleSchema,
  jerseyNumber: z.number().int().min(1).max(999).optional(),
  nationality: z.string().max(100).optional(),
  image: z.string().url("Invalid image URL").optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

// Match validation schemas
export const matchFormatSchema = z.enum(["test", "odi", "t20", "t10", "other"]);

export const matchStatusSchema = z.enum([
  "scheduled",
  "live",
  "completed",
  "abandoned",
]);

export const tossDecisionSchema = z.enum(["bat", "bowl"]);

export const createMatchSchema = z.object({
  team1Id: z.number().int().positive("Team 1 ID is required"),
  team2Id: z.number().int().positive("Team 2 ID is required"),
  venueId: z.number().int().positive("Venue ID is required"),
  matchDate: z.string().datetime("Invalid date format"),
  format: matchFormatSchema,
  overs: z.number().int().positive().optional(),
  isLive: z.boolean().default(false),
  status: matchStatusSchema.default("scheduled"),
  tossWinnerId: z.number().int().positive().optional(),
  tossDecision: tossDecisionSchema.optional(),
  resultText: z.string().max(500).optional(),
});

export const updateMatchSchema = createMatchSchema.partial();

// Innings validation schemas
export const inningsTypeSchema = z.enum(["first", "second"]);

export const createInningsSchema = z.object({
  matchId: z.number().int().positive("Match ID is required"),
  battingTeamId: z.number().int().positive("Batting team ID is required"),
  bowlingTeamId: z.number().int().positive("Bowling team ID is required"),
  inningsType: inningsTypeSchema,
  totalRuns: z.number().int().min(0).default(0),
  totalWickets: z.number().int().min(0).max(10).default(0),
  totalOvers: z.number().min(0).default(0),
  extras: z.number().int().min(0).default(0),
});

export const updateInningsSchema = createInningsSchema.partial();

// Ball validation schemas
export const dismissalTypeSchema = z.enum([
  "bowled",
  "caught",
  "lbw",
  "run_out",
  "stumped",
  "hit_wicket",
  "retired_hurt",
  "timed_out",
]);

export const recordBallSchema = z.object({
  inningsId: z.number().int().positive("Innings ID is required"),
  batsmanId: z.number().int().positive("Batsman ID is required"),
  bowlerId: z.number().int().positive("Bowler ID is required"),
  runs: z.number().int().min(0).max(6),
  isWide: z.boolean().default(false),
  isNoBall: z.boolean().default(false),
  isBye: z.boolean().default(false),
  isLegBye: z.boolean().default(false),
  isWicket: z.boolean().default(false),
  dismissalType: dismissalTypeSchema.optional(),
  fielder1Id: z.number().int().positive().optional(),
  fielder2Id: z.number().int().positive().optional(),
  overNumber: z.number().min(0),
  ballNumber: z.number().int().min(1).max(6),
});

export const updateBallSchema = recordBallSchema.partial();

// Venue validation schemas
export const createVenueSchema = z.object({
  name: z.string().min(1, "Venue name is required").max(200),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  capacity: z.number().int().positive().optional(),
});

export const updateVenueSchema = createVenueSchema.partial();
