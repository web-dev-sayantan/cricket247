import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  balls,
  innings,
  matches,
  playerCareerStats,
  playerMatchPerformance,
  players,
  playerTournamentStats,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
  venues,
} from "./schema";

// Types for selecting (reading) data
export type Tournament = InferSelectModel<typeof tournaments>;
export type Team = InferSelectModel<typeof teams>;
export type Venue = InferSelectModel<typeof venues>;
export type Player = InferSelectModel<typeof players>;
export type Match = InferSelectModel<typeof matches>;
export type Innings = InferSelectModel<typeof innings>;
export type Ball = InferSelectModel<typeof balls>;
export type TournamentTeam = InferSelectModel<typeof tournamentTeams>;
export type TeamPlayer = InferSelectModel<typeof teamPlayers>;
export type PlayerMatchPerformance = InferSelectModel<
  typeof playerMatchPerformance
>;
export type PlayerTournamentStats = InferSelectModel<
  typeof playerTournamentStats
>;
export type PlayerCareerStats = InferSelectModel<typeof playerCareerStats>;

// Types for inserting new records
export type NewTournament = InferInsertModel<typeof tournaments>;
export type NewTeam = InferInsertModel<typeof teams>;
export type NewPlayer = InferInsertModel<typeof players>;
export type NewMatch = InferInsertModel<typeof matches>;
export type NewInnings = InferInsertModel<typeof innings>;
export type NewBall = InferInsertModel<typeof balls>;
export type NewTournamentTeam = InferInsertModel<typeof tournamentTeams>;
export type NewTeamPlayer = InferInsertModel<typeof teamPlayers>;
export type NewPlayerMatchPerformance = InferInsertModel<
  typeof playerMatchPerformance
>;
export type NewPlayerTournamentStats = InferInsertModel<
  typeof playerTournamentStats
>;
export type NewPlayerCareerStats = InferInsertModel<typeof playerCareerStats>;
