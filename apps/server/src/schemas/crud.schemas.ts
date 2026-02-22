import { z } from "zod";
import {
  insertDeliverySchema,
  insertInningsSchema,
  insertMatchLineupSchema,
  insertMatchSchema,
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

export const createTeamBodySchema = insertTeamSchema.omit({ id: true });
export const updateTeamBodySchema = createTeamBodySchema.partial();

export const createMatchBodySchema = insertMatchSchema.omit({ id: true });
export const updateMatchBodySchema = createMatchBodySchema.partial();

export const createTournamentBodySchema = insertTournamentSchema.omit({
  id: true,
});
export const updateTournamentBodySchema = createTournamentBodySchema.partial();

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
