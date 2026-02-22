/**
 * Drizzle-Zod Schemas
 *
 * Auto-generated Zod schemas from Drizzle tables.
 * These are the single source of truth for validation.
 */

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import {
  deliveries,
  innings,
  matches,
  matchLineup,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
  venues,
} from "@/db/schema";

// ============================================================================
// Select Schemas (for reading/response validation)
// ============================================================================

export const selectPlayerSchema = createSelectSchema(players);
export const selectTeamSchema = createSelectSchema(teams);
export const selectTeamPlayerSchema = createSelectSchema(teamPlayers);
export const selectTournamentSchema = createSelectSchema(tournaments);
export const selectTournamentTeamSchema = createSelectSchema(tournamentTeams);
export const selectVenueSchema = createSelectSchema(venues);
export const selectMatchSchema = createSelectSchema(matches);
export const selectInningsSchema = createSelectSchema(innings);
export const selectDeliverySchema = createSelectSchema(deliveries);
export const selectMatchLineupSchema = createSelectSchema(matchLineup);
export const selectPlayerInningsStatsSchema =
  createSelectSchema(playerInningsStats);
export const selectPlayerTournamentStatsSchema = createSelectSchema(
  playerTournamentStats
);
export const selectPlayerCareerStatsSchema =
  createSelectSchema(playerCareerStats);

// ============================================================================
// Insert Schemas (for create/update validation)
// ============================================================================

export const insertPlayerSchema = createInsertSchema(players);
export const insertTeamSchema = createInsertSchema(teams);
export const insertTeamPlayerSchema = createInsertSchema(teamPlayers);
export const insertTournamentSchema = createInsertSchema(tournaments);
export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams);
export const insertVenueSchema = createInsertSchema(venues);
export const insertMatchSchema = createInsertSchema(matches);
export const insertInningsSchema = createInsertSchema(innings);
export const insertDeliverySchema = createInsertSchema(deliveries);
export const insertMatchLineupSchema = createInsertSchema(matchLineup);
export const insertPlayerInningsStatsSchema =
  createInsertSchema(playerInningsStats);
export const insertPlayerTournamentStatsSchema = createInsertSchema(
  playerTournamentStats
);
export const insertPlayerCareerStatsSchema =
  createInsertSchema(playerCareerStats);
