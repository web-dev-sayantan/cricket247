import { z } from "zod";
import {
  insertDeliverySchema,
  insertInningsSchema,
  insertMatchLineupSchema,
  insertMatchSchema,
  insertOrganizationSchema,
  insertPlayerCareerStatsSchema,
  insertPlayerInningsStatsSchema,
  insertPlayerSchema,
  insertPlayerTournamentStatsSchema,
  insertTeamPlayerSchema,
  insertTeamSchema,
  insertTournamentSchema,
  insertTournamentTeamSchema,
  insertVenueSchema,
} from "./drizzle.schemas";

export const idRouteParamSchema = z.coerce.number().int().positive();

export const createPlayerBodySchema = insertPlayerSchema.omit({ id: true });
export const updatePlayerBodySchema = createPlayerBodySchema.partial();

const MAX_BULK_PLAYER_IMPORT_ROWS = 1000;

export const bulkImportPlayerRowSchema = z.object({
  name: z.string().trim().min(2).max(100),
  dob: z.coerce.date(),
  sex: z.string().trim().min(1).max(30),
  nationality: z.string().trim().min(1).max(100).optional(),
  height: z.number().int().min(1).max(300).optional(),
  weight: z.number().int().min(1).max(250).optional(),
  image: z.url().optional(),
  role: z.string().trim().min(1).max(50),
  battingStance: z.string().trim().min(1).max(50),
  bowlingStance: z.string().trim().min(1).max(100).optional(),
  isWicketKeeper: z.boolean().optional(),
});

export const bulkImportPlayersBodySchema = z.object({
  rows: z
    .array(bulkImportPlayerRowSchema)
    .min(1)
    .max(MAX_BULK_PLAYER_IMPORT_ROWS),
});

export const createOwnPlayerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  dob: z.coerce.date(),
  sex: z.string().trim().min(1).max(30),
  nationality: z.string().trim().min(1).max(100).optional(),
  height: z.number().int().min(1).max(300).optional(),
  weight: z.number().int().min(1).max(250).optional(),
  image: z.url().optional(),
  role: z.string().trim().min(1).max(50),
  battingStance: z.string().trim().min(1).max(50),
  bowlingStance: z.string().trim().min(1).max(100).optional(),
  isWicketKeeper: z.boolean().optional(),
});

export const listClaimablePlayersQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
});

export const claimPlayerOtpRequestSchema = z.object({
  playerId: z.number().int().positive(),
});

export const claimPlayerVerifySchema = claimPlayerOtpRequestSchema.extend({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export const createTeamBodySchema = insertTeamSchema.omit({ id: true });
export const updateTeamBodySchema = createTeamBodySchema.partial();

export const createOrganizationBodySchema = insertOrganizationSchema.omit({
  id: true,
});
export const updateOrganizationBodySchema =
  createOrganizationBodySchema.partial();

export const createMatchBodySchema = insertMatchSchema.omit({ id: true });
export const updateMatchBodySchema = createMatchBodySchema.partial();

export const tournamentCategorySchema = z.enum([
  "competitive",
  "practice",
  "recreational",
  "one_off",
]);

const systemFallbackTournamentCategories = new Set([
  "practice",
  "recreational",
  "one_off",
]);

const createTournamentBodyBaseSchema = insertTournamentSchema
  .omit({
    id: true,
  })
  .extend({
    category: tournamentCategorySchema.optional(),
    organizationId: z.number().int().positive().optional(),
  });

export const createTournamentBodySchema =
  createTournamentBodyBaseSchema.superRefine((value, ctx) => {
    const category = value.category ?? "competitive";
    const hasOrganizationId = typeof value.organizationId === "number";
    const canUseSystemOrgFallback =
      systemFallbackTournamentCategories.has(category);

    if (!(hasOrganizationId || canUseSystemOrgFallback)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "organizationId is required for competitive tournaments and optional only for practice/recreational/one_off tournaments",
        path: ["organizationId"],
      });
    }
  });

export const updateTournamentBodySchema =
  createTournamentBodyBaseSchema.partial();

export const createVenueBodySchema = insertVenueSchema.omit({ id: true });
export const updateVenueBodySchema = createVenueBodySchema.partial();

export const createTeamPlayerBodySchema = insertTeamPlayerSchema.omit({
  id: true,
});
export const updateTeamPlayerBodySchema = createTeamPlayerBodySchema.partial();

export const createTournamentTeamBodySchema = insertTournamentTeamSchema.omit({
  id: true,
});
export const updateTournamentTeamBodySchema =
  createTournamentTeamBodySchema.partial();

export const createInningsBodySchema = insertInningsSchema.omit({ id: true });
export const updateInningsBodySchema = createInningsBodySchema.partial();

export const createDeliveryBodySchema = insertDeliverySchema.omit({ id: true });
export const updateDeliveryBodySchema = createDeliveryBodySchema.partial();

export const createMatchLineupBodySchema = insertMatchLineupSchema.omit({
  id: true,
});
export const updateMatchLineupBodySchema =
  createMatchLineupBodySchema.partial();

export const createPlayerInningsStatsBodySchema =
  insertPlayerInningsStatsSchema.omit({ id: true });
export const updatePlayerInningsStatsBodySchema =
  createPlayerInningsStatsBodySchema.partial();

export const createPlayerTournamentStatsBodySchema =
  insertPlayerTournamentStatsSchema.omit({ id: true });
export const updatePlayerTournamentStatsBodySchema =
  createPlayerTournamentStatsBodySchema.partial();

export const createPlayerCareerStatsBodySchema =
  insertPlayerCareerStatsSchema.omit({ id: true });
export const updatePlayerCareerStatsBodySchema =
  createPlayerCareerStatsBodySchema.partial();

// Transitional aliases to keep existing imports compiling.
export const createBallBodySchema = createDeliveryBodySchema;
export const updateBallBodySchema = updateDeliveryBodySchema;
export const createPlayerMatchPerformanceBodySchema =
  createPlayerInningsStatsBodySchema;
export const updatePlayerMatchPerformanceBodySchema =
  updatePlayerInningsStatsBodySchema;
