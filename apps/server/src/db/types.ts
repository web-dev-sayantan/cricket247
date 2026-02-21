/**
 * Database Types - Single Source of Truth
 *
 * All types are derived from Drizzle schema using InferSelectModel/InferInsertModel.
 * These types automatically update when the schema changes.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  account,
  balls,
  innings,
  matches,
  passkey,
  playerCareerStats,
  playerMatchPerformance,
  players,
  playerTournamentStats,
  session,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
  user,
  venues,
  verification,
} from "./schema";

// ============================================================================
// Entity Types (Select - for reading data)
// ============================================================================

// Auth entities
export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type Passkey = InferSelectModel<typeof passkey>;

// Domain entities
export type Player = InferSelectModel<typeof players>;
export type Team = InferSelectModel<typeof teams>;
export type TeamPlayer = InferSelectModel<typeof teamPlayers>;
export type Tournament = InferSelectModel<typeof tournaments>;
export type TournamentTeam = InferSelectModel<typeof tournamentTeams>;
export type Venue = InferSelectModel<typeof venues>;
export type Match = InferSelectModel<typeof matches>;
export type Innings = InferSelectModel<typeof innings>;
export type Ball = InferSelectModel<typeof balls>;
export type PlayerMatchPerformance = InferSelectModel<
  typeof playerMatchPerformance
>;
export type PlayerTournamentStats = InferSelectModel<
  typeof playerTournamentStats
>;
export type PlayerCareerStats = InferSelectModel<typeof playerCareerStats>;

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

// Auth inserts
export type NewUser = InferInsertModel<typeof user>;
export type NewSession = InferInsertModel<typeof session>;
export type NewAccount = InferInsertModel<typeof account>;
export type NewVerification = InferInsertModel<typeof verification>;
export type NewPasskey = InferInsertModel<typeof passkey>;

// Domain inserts
export type NewPlayer = InferInsertModel<typeof players>;
export type NewTeam = InferInsertModel<typeof teams>;
export type NewTeamPlayer = InferInsertModel<typeof teamPlayers>;
export type NewTournament = InferInsertModel<typeof tournaments>;
export type NewTournamentTeam = InferInsertModel<typeof tournamentTeams>;
export type NewVenue = InferInsertModel<typeof venues>;
export type NewMatch = InferInsertModel<typeof matches>;
export type NewInnings = InferInsertModel<typeof innings>;
export type NewBall = InferInsertModel<typeof balls>;
export type NewPlayerMatchPerformance = InferInsertModel<
  typeof playerMatchPerformance
>;
export type NewPlayerTournamentStats = InferInsertModel<
  typeof playerTournamentStats
>;
export type NewPlayerCareerStats = InferInsertModel<typeof playerCareerStats>;

// ============================================================================
// Domain Enums and Literal Types
// ============================================================================

/**
 * Supported cricket match formats.
 */
export type MatchFormat =
  | "T5"
  | "T6"
  | "T7"
  | "T8"
  | "T10"
  | "T12"
  | "T20"
  | "ODI"
  | "Test"
  | "Custom";

/**
 * Toss decision options.
 */
export type TossDecision = "bat" | "bowl";

/**
 * Types of extras in cricket.
 */
export type ExtrasType = "no" | "wide" | "bye" | "leg-bye" | "penalty";

/**
 * Types of dismissals in cricket.
 */
export type WicketType =
  | "bold"
  | "caught"
  | "run out"
  | "stumped"
  | "hit wicket"
  | "boundary out"
  | "lbw"
  | "caught and bowled"
  | "handled the ball"
  | "obstructing the field"
  | "timed out"
  | "retired hurt"
  | "retired out"
  | "others";

// ============================================================================
// Composite Types (for queries with relations)
// ============================================================================

/**
 * Team player with player details included.
 */
export interface TeamPlayerType {
  id: number;
  isCaptain: boolean;
  player: Player;
  playerId: number;
  teamId: number;
}

/**
 * Team with its players.
 */
export interface TeamWithPlayers extends Team {
  players: TeamPlayerType[];
}

/**
 * Match with related team data for display.
 */
export interface MatchWithTeams extends Match {
  playerOfTheMatch?: Player | null;
  team1: Team;
  team2: Team;
  tossWinner: Team;
  tournament?: Tournament | null;
  venue?: Venue | null;
  winner?: Team | null;
}

/**
 * Innings with team details.
 */
export interface InningsWithDetails extends Innings {
  battingTeam: Team;
  bowlingTeam: Team;
}

/**
 * Ball with player information for display.
 */
export interface BallWithPlayers extends Ball {
  bowler: Player;
  fielder?: Player;
  nonStriker: Player;
  striker: Player;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Represents extras information in scoring UI.
 */
export interface Extras {
  type: ExtrasType;
  value: boolean;
}

/**
 * Represents dismissal information in scoring UI.
 */
export interface Dismissed {
  type: WicketType;
  value: boolean;
}

/**
 * Data for updating a ball.
 */
export interface UpdateBallData {
  assistPlayerId?: number | null;
  ballNumber: number;
  bowlerId: number;
  dismissedPlayerId?: number | null;
  id: number;
  inningsId: number;
  isBye?: boolean;
  isLegBye?: boolean;
  isNoBall?: boolean;
  isWicket?: boolean;
  isWide?: boolean;
  nonStrikerId: number;
  runsScored: number;
  strikerId: number;
  wicketType?: WicketType;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes all properties of T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Creates a branded type for nominal typing.
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Branded ID types for type-safe entity references.
 */
export type PlayerId = Brand<number, "PlayerId">;
export type TeamId = Brand<number, "TeamId">;
export type MatchId = Brand<number, "MatchId">;
export type InningsId = Brand<number, "InningsId">;
export type TournamentId = Brand<number, "TournamentId">;
export type VenueId = Brand<number, "VenueId">;

/**
 * Represents the state of an async operation.
 */
export type AsyncState<T, E = Error> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly error: E };
