/**
 * Database Types - Single Source of Truth
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  account,
  deliveries,
  innings,
  matches,
  matchLineup,
  organizations,
  passkey,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  session,
  teamCareerStats,
  teamPlayers,
  teams,
  teamTournamentStats,
  tournaments,
  tournamentTeams,
  user,
  venues,
  verification,
} from "./schema";

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
export type TeamCareerStats = InferSelectModel<typeof teamCareerStats>;
export type TeamTournamentStats = InferSelectModel<typeof teamTournamentStats>;
export type Organization = InferSelectModel<typeof organizations>;
export type Tournament = InferSelectModel<typeof tournaments>;
export type TournamentTeam = InferSelectModel<typeof tournamentTeams>;
export type Venue = InferSelectModel<typeof venues>;
export type Match = InferSelectModel<typeof matches>;
export type Innings = InferSelectModel<typeof innings>;
export type Delivery = InferSelectModel<typeof deliveries>;
export type MatchLineup = InferSelectModel<typeof matchLineup>;
export type PlayerInningsStats = InferSelectModel<typeof playerInningsStats>;
export type PlayerTournamentStats = InferSelectModel<
  typeof playerTournamentStats
>;
export type PlayerCareerStats = InferSelectModel<typeof playerCareerStats>;

// Backward-compatible aliases in code (schema is clean slate)
export type Ball = Delivery;
export type PlayerMatchPerformance = PlayerInningsStats;

// Insert types
export type NewUser = InferInsertModel<typeof user>;
export type NewSession = InferInsertModel<typeof session>;
export type NewAccount = InferInsertModel<typeof account>;
export type NewVerification = InferInsertModel<typeof verification>;
export type NewPasskey = InferInsertModel<typeof passkey>;

export type NewPlayer = InferInsertModel<typeof players>;
export type NewTeam = InferInsertModel<typeof teams>;
export type NewTeamPlayer = InferInsertModel<typeof teamPlayers>;
export type NewTeamCareerStats = InferInsertModel<typeof teamCareerStats>;
export type NewTeamTournamentStats = InferInsertModel<
  typeof teamTournamentStats
>;
export type NewOrganization = InferInsertModel<typeof organizations>;
export type NewTournament = InferInsertModel<typeof tournaments>;
export type NewTournamentTeam = InferInsertModel<typeof tournamentTeams>;
export type NewVenue = InferInsertModel<typeof venues>;
export type NewMatch = InferInsertModel<typeof matches>;
export type NewInnings = InferInsertModel<typeof innings>;
export type NewDelivery = InferInsertModel<typeof deliveries>;
export type NewMatchLineup = InferInsertModel<typeof matchLineup>;
export type NewPlayerInningsStats = InferInsertModel<typeof playerInningsStats>;
export type NewPlayerTournamentStats = InferInsertModel<
  typeof playerTournamentStats
>;
export type NewPlayerCareerStats = InferInsertModel<typeof playerCareerStats>;

export type NewBall = NewDelivery;
export type NewPlayerMatchPerformance = NewPlayerInningsStats;

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

export type TossDecision = "bat" | "bowl";

export type ExtrasType =
  | "wide"
  | "no-ball"
  | "bye"
  | "leg-bye"
  | "penalty"
  | "other";

export type WicketType =
  | "bowled"
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

export interface TeamPlayerType {
  id: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: Player;
  playerId: number;
  teamId: number;
  tournamentId: number;
}

export interface TeamWithPlayers extends Team {
  players: TeamPlayerType[];
}

export interface CurrentTeamRegistration {
  isCaptain: boolean;
  isViceCaptain: boolean;
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  teamId: number;
  teamName: string;
  teamShortName: string;
  tournamentCategory: string;
  tournamentId: number;
  tournamentName: string;
}

export interface PlayerWithCurrentTeams extends Player {
  currentTeams: CurrentTeamRegistration[];
}

export interface MatchWithTeams extends Match {
  playerOfTheMatch?: Player | null;
  team1: Team;
  team2: Team;
  tossWinner: Team;
  tournament?: Tournament | null;
  venue?: Venue | null;
  winner?: Team | null;
}

export interface InningsWithDetails extends Innings {
  battingTeam: Team;
  bowlingTeam: Team;
}

export interface DeliveryWithPlayers extends Delivery {
  assistedBy?: Player | null;
  bowler: Player;
  dismissedBy?: Player | null;
  dismissedPlayer?: Player | null;
  nonStriker: Player;
  striker: Player;
}

// Backward-compatible type name for existing web scorer component.
export type BallWithPlayers = DeliveryWithPlayers & {
  runsScored: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  assistPlayerId?: number | null;
};

export interface Extras {
  type: ExtrasType;
  value: boolean;
}

export interface Dismissed {
  type: WicketType;
  value: boolean;
}

export interface UpdateDeliveryData {
  assistedById?: number | null;
  ballInOver: number;
  batterRuns: number;
  bowlerId: number;
  byeRuns?: number;
  dismissedById?: number | null;
  dismissedPlayerId?: number | null;
  id: number;
  inningsId: number;
  isLegalDelivery: boolean;
  isWicket?: boolean;
  legByeRuns?: number;
  noBallRuns?: number;
  nonStrikerId: number;
  overNumber: number;
  penaltyRuns?: number;
  sequenceNo: number;
  strikerId: number;
  totalRuns: number;
  wicketType?: WicketType;
  wideRuns?: number;
}

// Backward-compatible type name for existing scorer component.
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

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Brand<T, B> = T & { readonly __brand: B };

export type PlayerId = Brand<number, "PlayerId">;
export type TeamId = Brand<number, "TeamId">;
export type MatchId = Brand<number, "MatchId">;
export type InningsId = Brand<number, "InningsId">;
export type TournamentId = Brand<number, "TournamentId">;
export type VenueId = Brand<number, "VenueId">;

export type AsyncState<T, E = Error> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error"; readonly error: E };
