/**
 * Drizzle-Zod Schemas
 *
 * Auto-generated Zod schemas from Drizzle tables.
 * These are the single source of truth for validation.
 */

import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import {
  deliveries,
  fixtureChangeLog,
  fixtureConstraints,
  fixtureRounds,
  fixtureVersionMatches,
  fixtureVersions,
  innings,
  matches,
  matchFormats,
  matchLineup,
  matchParticipantSources,
  organizations,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  swissRoundStandings,
  teamCareerStats,
  teamPlayers,
  teams,
  teamTournamentStats,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournamentStageTeamEntries,
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
export const selectTeamCareerStatsSchema = createSelectSchema(teamCareerStats);
export const selectTeamTournamentStatsSchema =
  createSelectSchema(teamTournamentStats);
export const selectOrganizationSchema = createSelectSchema(organizations);
export const selectMatchFormatSchema = createSelectSchema(matchFormats);
export const selectTournamentSchema = createSelectSchema(tournaments);
export const selectTournamentTeamSchema = createSelectSchema(tournamentTeams);
export const selectTournamentStageSchema = createSelectSchema(tournamentStages);
export const selectTournamentStageGroupSchema = createSelectSchema(
  tournamentStageGroups
);
export const selectTournamentStageTeamEntrySchema = createSelectSchema(
  tournamentStageTeamEntries
);
export const selectTournamentStageAdvancementSchema = createSelectSchema(
  tournamentStageAdvancements
);
export const selectVenueSchema = createSelectSchema(venues);
export const selectMatchSchema = createSelectSchema(matches);
export const selectMatchParticipantSourceSchema = createSelectSchema(
  matchParticipantSources
);
export const selectFixtureVersionSchema = createSelectSchema(fixtureVersions);
export const selectFixtureRoundSchema = createSelectSchema(fixtureRounds);
export const selectFixtureVersionMatchSchema = createSelectSchema(
  fixtureVersionMatches
);
export const selectFixtureChangeLogSchema =
  createSelectSchema(fixtureChangeLog);
export const selectFixtureConstraintSchema =
  createSelectSchema(fixtureConstraints);
export const selectSwissRoundStandingSchema =
  createSelectSchema(swissRoundStandings);
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
export const insertTeamCareerStatsSchema = createInsertSchema(teamCareerStats);
export const insertTeamTournamentStatsSchema =
  createInsertSchema(teamTournamentStats);
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertMatchFormatSchema = createInsertSchema(matchFormats);
export const insertTournamentSchema = createInsertSchema(tournaments);
export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams);
export const insertTournamentStageSchema = createInsertSchema(tournamentStages);
export const insertTournamentStageGroupSchema = createInsertSchema(
  tournamentStageGroups
);
export const insertTournamentStageTeamEntrySchema = createInsertSchema(
  tournamentStageTeamEntries
);
export const insertTournamentStageAdvancementSchema = createInsertSchema(
  tournamentStageAdvancements
);
export const insertVenueSchema = createInsertSchema(venues);
export const insertMatchSchema = createInsertSchema(matches);
export const insertMatchParticipantSourceSchema = createInsertSchema(
  matchParticipantSources
);
export const insertFixtureVersionSchema = createInsertSchema(fixtureVersions);
export const insertFixtureRoundSchema = createInsertSchema(fixtureRounds);
export const insertFixtureVersionMatchSchema = createInsertSchema(
  fixtureVersionMatches
);
export const insertFixtureChangeLogSchema =
  createInsertSchema(fixtureChangeLog);
export const insertFixtureConstraintSchema =
  createInsertSchema(fixtureConstraints);
export const insertSwissRoundStandingSchema =
  createInsertSchema(swissRoundStandings);
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
