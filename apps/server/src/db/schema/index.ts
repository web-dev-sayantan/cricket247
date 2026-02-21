import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestampMs = () =>
  integer({ mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull();

const booleanFlag = () => integer({ mode: "boolean" }).default(false).notNull();

const timestampCols = {
  createdAt: timestampMs(),
  updatedAt: timestampMs(),
};

export const user = sqliteTable("user", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  username: text().unique(),
  displayUsername: text().unique(),
  email: text().notNull().unique(),
  emailVerified: booleanFlag(),
  image: text(),
  phoneNumber: text().unique(),
  phoneNumberVerified: booleanFlag(),
  authProvider: text(),
  role: text().notNull().default("user"),
  ...timestampCols,
});

export const session = sqliteTable(
  "session",
  {
    id: integer().primaryKey().notNull(),
    userId: integer()
      .notNull()
      .references(() => user.id),
    token: text().notNull(),
    expiresAt: timestampMs().notNull(),
    ipAddress: text(),
    userAgent: text(),
    factors: text({ mode: "json" }),
    lastActiveAt: timestampMs(),
    ...timestampCols,
  },
  (table) => [
    index("session_user_idx").on(table.userId),
    index("session_expires_idx").on(table.expiresAt),
  ]
);

export const account = sqliteTable("account", {
  id: integer().primaryKey().notNull(),
  userId: integer()
    .notNull()
    .references(() => user.id),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp" }),
  scope: text(),
  idToken: text(),
  password: text(),
  ...timestampCols,
});

export const verification = sqliteTable("verification", {
  id: integer().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestampMs().notNull(),
  ...timestampCols,
});

export const passkey = sqliteTable(
  "passkey",
  {
    id: integer().primaryKey().notNull(),
    name: text(),
    publicKey: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id),
    credentialID: text().notNull(),
    counter: integer().notNull().default(0),
    deviceType: text().notNull(),
    backedUp: integer({ mode: "boolean" }).notNull().default(false),
    transports: text().notNull(),
    aaguid: text(),
    ...timestampCols,
  },
  (table) => [
    index("passkey_user_idx").on(table.userId),
    index("passkey_credential_idx").on(table.credentialID),
  ]
);

export const players = sqliteTable("players", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  dob: integer({ mode: "timestamp" }).notNull(),
  sex: text().notNull(),
  nationality: text(),
  height: integer(),
  weight: integer(),
  image: text(),
  role: text().notNull(), // "Batsman", "Bowler", "All-rounder"
  battingStance: text().default("Right handed").notNull(),
  bowlingStance: text(),
  isWicketKeeper: integer({ mode: "boolean" }).default(false).notNull(),
  ...timestampCols,
});

export const playerVerification = sqliteTable("player_verification", {
  id: integer().primaryKey().notNull(),
  playerId: integer()
    .notNull()
    .references(() => players.id),
  verificationType: text().notNull(), // "Passport", "Driver's License", "National ID", etc.
  verificationId: text().notNull(),
  ...timestampCols,
});

export const teams = sqliteTable("teams", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  shortName: text().notNull(),
  baseLocation: text(),
  country: text().notNull(),
  ...timestampCols,
});

export const teamPlayers = sqliteTable(
  "team_players",
  {
    id: integer().primaryKey().notNull(),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    playerId: integer()
      .notNull()
      .references(() => players.id),
    isCaptain: integer({ mode: "boolean" }).default(false).notNull(),
    isViceCaptain: integer({ mode: "boolean" }).default(false).notNull(),
    ...timestampCols,
  },
  (t) => [uniqueIndex("unique_team_player").on(t.teamId, t.playerId)]
);

export const tournaments = sqliteTable("tournaments", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  startDate: integer({ mode: "timestamp" }).notNull(),
  endDate: integer({ mode: "timestamp" }).notNull(),
  format: text().notNull(), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI"
  ...timestampCols,
});

export const tournamentTeams = sqliteTable("tournament_teams", {
  id: integer().primaryKey(),
  tournamentId: integer()
    .notNull()
    .references(() => tournaments.id),
  teamId: integer()
    .notNull()
    .references(() => teams.id),
  points: integer().default(0),
  matchesPlayed: integer().default(0),
  matchesWon: integer().default(0),
  matchesLost: integer().default(0),
  matchesTied: integer().default(0),
  matchesDrawn: integer().default(0),
  ...timestampCols,
});

export const venues = sqliteTable("venues", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  location: text(),
  street: text(),
  city: text(),
  state: text(),
  country: text(),
  pincode: text(),
  capacity: integer().default(0),
  ...timestampCols,
});

export const matches = sqliteTable(
  "matches",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer().references(() => tournaments.id),
    matchDate: integer({ mode: "timestamp" }).notNull(),
    tossWinnerId: integer()
      .notNull()
      .references(() => teams.id),
    tossDecision: text().notNull(), // "bat" or "bowl"
    team1Id: integer()
      .notNull()
      .references(() => teams.id),
    team2Id: integer()
      .notNull()
      .references(() => teams.id),
    inningsPerSide: integer().notNull().default(1),
    oversPerSide: integer().notNull().default(20),
    maxOverPerBowler: integer().notNull().default(4),
    result: text(),
    winnerId: integer().references(() => teams.id),
    ranked: integer({ mode: "boolean" }).default(false),
    isLive: integer({ mode: "boolean" }).default(true),
    isCompleted: integer({ mode: "boolean" }).default(false),
    isAbandoned: integer({ mode: "boolean" }).default(false),
    isTied: integer({ mode: "boolean" }).default(false),
    margin: text(), // e.g., "10 runs", "5 wickets"
    playerOfTheMatchId: integer().references(() => players.id),
    hasLBW: integer({ mode: "boolean" }).default(false),
    hasBye: integer({ mode: "boolean" }).default(false),
    hasLegBye: integer({ mode: "boolean" }).default(false),
    hasBoundaryOut: integer({ mode: "boolean" }).default(false),
    hasWides: integer({ mode: "boolean" }).default(false),
    hasNoBalls: integer({ mode: "boolean" }).default(false),
    hasPenaltyRuns: integer({ mode: "boolean" }).default(false),
    hasSuperOver: integer({ mode: "boolean" }).default(false),
    venueId: integer().references(() => venues.id),
    format: text().notNull().default("T20"), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI", "Test", "Custom"
    notes: text(),
    ...timestampCols,
  },
  (t) => [index("rank_idx").on(t.winnerId)]
);

export const roster = sqliteTable("roster", {
  id: integer().primaryKey().notNull(),
  matchId: integer()
    .notNull()
    .references(() => matches.id),
  teamId: integer()
    .notNull()
    .references(() => teams.id),
  player1Id: integer()
    .notNull()
    .references(() => players.id),
  player2Id: integer()
    .notNull()
    .references(() => players.id),
  player3Id: integer()
    .notNull()
    .references(() => players.id),
  player4Id: integer()
    .notNull()
    .references(() => players.id),
  player5Id: integer()
    .notNull()
    .references(() => players.id),
  player6Id: integer()
    .notNull()
    .references(() => players.id),
  player7Id: integer()
    .notNull()
    .references(() => players.id),
  player8Id: integer()
    .notNull()
    .references(() => players.id),
  player9Id: integer()
    .notNull()
    .references(() => players.id),
  player10Id: integer()
    .notNull()
    .references(() => players.id),
  player11Id: integer()
    .notNull()
    .references(() => players.id),
  captainId: integer()
    .notNull()
    .references(() => players.id),
  viceCaptainId: integer()
    .notNull()
    .references(() => players.id),
  wicketKeeperId: integer()
    .notNull()
    .references(() => players.id),
  superSubId: integer()
    .notNull()
    .references(() => players.id),
  ...timestampCols,
});

export const innings = sqliteTable(
  "innings",
  {
    id: integer().primaryKey().notNull(),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    battingTeamId: integer()
      .notNull()
      .references(() => teams.id),
    bowlingTeamId: integer()
      .notNull()
      .references(() => teams.id),
    inningsNumber: integer().notNull().default(1),
    totalScore: integer().notNull().default(0),
    wickets: integer().notNull().default(0),
    ballsBowled: integer().notNull().default(0),
    extras: integer().notNull().default(0),
    isCompleted: integer({ mode: "boolean" }).default(false),
    ...timestampCols,
  },
  (t) => [index("match_idx").on(t.matchId)]
);

export const balls = sqliteTable(
  "balls",
  {
    id: integer().primaryKey().notNull(),
    inningsId: integer()
      .notNull()
      .references(() => innings.id),
    ballNumber: integer().notNull(),
    strikerId: integer()
      .notNull()
      .references(() => players.id),
    nonStrikerId: integer()
      .notNull()
      .references(() => players.id),
    bowlerId: integer()
      .notNull()
      .references(() => players.id),
    runsScored: integer().notNull().default(0),
    isWicket: integer({ mode: "boolean" }).notNull().default(false),
    wicketType: text(),
    dismissedPlayerId: integer().references(() => players.id),
    assistPlayerId: integer().references(() => players.id),
    isWide: integer({ mode: "boolean" }).notNull().default(false),
    isNoBall: integer({ mode: "boolean" }).notNull().default(false),
    isBye: integer({ mode: "boolean" }).notNull().default(false),
    isLegBye: integer({ mode: "boolean" }).notNull().default(false),
    ...timestampCols,
  },
  (t) => [
    index("over_idx").on(t.inningsId, t.bowlerId),
    index("innings_idx").on(t.inningsId),
  ]
);

export const playerMatchPerformance = sqliteTable(
  "player_match_performance",
  {
    id: integer().primaryKey().notNull(),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    playerId: integer()
      .notNull()
      .references(() => players.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    runsScored: integer().notNull().default(0),
    ballsFaced: integer().notNull().default(0),
    fours: integer().notNull().default(0),
    sixes: integer().notNull().default(0),
    isDismissed: integer({ mode: "boolean" }).notNull().default(false),
    dismissalType: text(),
    dismissedById: integer().references(() => players.id),
    ballsBowled: integer().notNull().default(0),
    runsConceded: integer().notNull().default(0),
    wicketsTaken: integer().notNull().default(0),
    dotBalls: integer().notNull().default(0),
    catches: integer().notNull().default(0),
    runOuts: integer().notNull().default(0),
    stumpings: integer().notNull().default(0),
    ...timestampCols,
  },
  (t) => [
    index("player_idx").on(t.playerId),
    uniqueIndex("player_match_performance_idx").on(t.playerId, t.matchId),
  ]
);

export const playerTournamentStats = sqliteTable("player_tournament_stats", {
  id: integer().primaryKey().notNull(),
  playerId: integer()
    .notNull()
    .references(() => players.id),
  tournamentId: integer()
    .notNull()
    .references(() => tournaments.id),
  teamId: integer()
    .notNull()
    .references(() => teams.id),
  matchesPlayed: integer().notNull().default(0),
  runsScored: integer().notNull().default(0),
  ballsFaced: integer().notNull().default(0),
  fours: integer().notNull().default(0),
  sixes: integer().notNull().default(0),
  avgStrikeRate: real().notNull().default(0),
  highestScore: integer().notNull().default(0),
  fifties: integer().notNull().default(0),
  hundreds: integer().notNull().default(0),
  ballsBowled: integer().notNull().default(0),
  runsConceded: integer().notNull().default(0),
  wicketsTaken: integer().notNull().default(0),
  avgEconomy: real().notNull().default(0),
  bestBowling: text(),
  fifers: integer().notNull().default(0),
  catches: integer().notNull().default(0),
  runOuts: integer().notNull().default(0),
  stumpings: integer().notNull().default(0),
  ...timestampCols,
});

export const playerCareerStats = sqliteTable("player_career_stats", {
  id: integer().primaryKey().notNull(),
  playerId: integer()
    .notNull()
    .references(() => players.id),
  format: text().notNull(), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI"
  matchesPlayed: integer().notNull().default(0),
  runsScored: integer().notNull().default(0),
  ballsFaced: integer().notNull().default(0),
  fours: integer().notNull().default(0),
  sixes: integer().notNull().default(0),
  avgStrikeRate: real().notNull().default(0),
  highestScore: integer().notNull().default(0),
  fifties: integer().notNull().default(0),
  hundreds: integer().notNull().default(0),
  ballsBowled: integer().notNull().default(0),
  runsConceded: integer().notNull().default(0),
  wicketsTaken: integer().notNull().default(0),
  avgEconomy: real().notNull().default(0),
  bestBowling: text(),
  fifers: integer().notNull().default(0),
  catches: integer().notNull().default(0),
  runOuts: integer().notNull().default(0),
  stumpings: integer().notNull().default(0),
  ...timestampCols,
});
