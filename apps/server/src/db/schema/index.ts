import { sql } from "drizzle-orm";
import {
  foreignKey,
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

export const users = sqliteTable("users", {
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

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer().primaryKey().notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id),
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

export const accounts = sqliteTable("accounts", {
  id: integer().primaryKey().notNull(),
  userId: integer()
    .notNull()
    .references(() => users.id),
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

export const verifications = sqliteTable("verifications", {
  id: integer().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestampMs().notNull(),
  ...timestampCols,
});

export const passkeys = sqliteTable(
  "passkeys",
  {
    id: integer().primaryKey().notNull(),
    name: text(),
    publicKey: text().notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id),
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
  age: integer().notNull().default(0),
  dob: integer({ mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  sex: text().notNull().default("unknown"),
  nationality: text(),
  height: integer(),
  weight: integer(),
  image: text(),
  role: text().notNull().default("Batter"),
  battingStance: text().default("Right handed").notNull(),
  bowlingStance: text(),
  isWicketKeeper: booleanFlag(),
  ...timestampCols,
});

export const playerVerification = sqliteTable("player_verification", {
  id: integer().primaryKey().notNull(),
  playerId: integer()
    .notNull()
    .references(() => players.id),
  verificationType: text().notNull(),
  verificationId: text().notNull(),
  ...timestampCols,
});

export const teams = sqliteTable("teams", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  shortName: text().notNull(),
  baseLocation: text(),
  country: text().notNull().default("Unknown"),
  ...timestampCols,
});

export const organizations = sqliteTable(
  "organizations",
  {
    id: integer().primaryKey().notNull(),
    name: text().notNull(),
    shortName: text(),
    slug: text().notNull(),
    code: text(),
    type: text().notNull().default("association"),
    scope: text().notNull().default("local"),
    country: text(),
    website: text(),
    logo: text(),
    description: text(),
    isSystem: booleanFlag(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    parentOrganizationId: integer(),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("organizations_slug_unique").on(t.slug),
    uniqueIndex("organizations_code_unique").on(t.code),
    index("organizations_parent_idx").on(t.parentOrganizationId),
    index("organizations_active_idx").on(t.isActive),
    foreignKey({
      columns: [t.parentOrganizationId],
      foreignColumns: [t.id],
      name: "fk_organizations_parent_organization",
    }),
  ]
);

export const tournaments = sqliteTable(
  "tournaments",
  {
    id: integer().primaryKey().notNull(),
    name: text().notNull(),
    category: text().notNull().default("competitive"),
    organizationId: integer()
      .notNull()
      .references(() => organizations.id),
    startDate: integer({ mode: "timestamp" }).notNull(),
    endDate: integer({ mode: "timestamp" }).notNull(),
    format: text().notNull(),
    ...timestampCols,
  },
  (t) => [index("tournament_organization_idx").on(t.organizationId)]
);

export const tournamentTeams = sqliteTable(
  "tournament_teams",
  {
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
  },
  (t) => [uniqueIndex("unique_tournament_team").on(t.tournamentId, t.teamId)]
);

export const teamPlayers = sqliteTable(
  "team_players",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    playerId: integer()
      .notNull()
      .references(() => players.id),
    isCaptain: booleanFlag(),
    isViceCaptain: booleanFlag(),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("unique_tournament_player").on(t.tournamentId, t.playerId),
    foreignKey({
      columns: [t.tournamentId, t.teamId],
      foreignColumns: [tournamentTeams.tournamentId, tournamentTeams.teamId],
      name: "fk_team_players_tournament_team",
    }),
  ]
);

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
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    matchDate: integer({ mode: "timestamp" }).notNull(),
    tossWinnerId: integer()
      .notNull()
      .references(() => teams.id),
    tossDecision: text().notNull(),
    team1Id: integer()
      .notNull()
      .references(() => teams.id),
    team2Id: integer()
      .notNull()
      .references(() => teams.id),
    inningsPerSide: integer().notNull().default(1),
    oversPerSide: integer().notNull().default(20),
    maxOverPerBowler: integer().notNull().default(4),
    playersPerSide: integer().notNull().default(11),
    hasSuperSub: booleanFlag(),
    substitutesPerSide: integer().notNull().default(0),
    result: text(),
    winnerId: integer().references(() => teams.id),
    ranked: booleanFlag(),
    isLive: integer({ mode: "boolean" }).default(true),
    isCompleted: booleanFlag(),
    isAbandoned: booleanFlag(),
    isTied: booleanFlag(),
    margin: text(),
    playerOfTheMatchId: integer().references(() => players.id),
    hasLBW: booleanFlag(),
    hasBye: integer({ mode: "boolean" }).notNull().default(true),
    hasLegBye: booleanFlag(),
    hasBoundaryOut: booleanFlag(),
    hasWides: integer({ mode: "boolean" }).notNull().default(true),
    hasNoBalls: integer({ mode: "boolean" }).notNull().default(true),
    hasPenaltyRuns: booleanFlag(),
    hasSuperOver: booleanFlag(),
    venueId: integer().references(() => venues.id),
    format: text().notNull().default("T20"), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI", "Test", "Custom"
    notes: text(),
    ...timestampCols,
  },
  (t) => [index("rank_idx").on(t.winnerId)]
);

export const matchLineup = sqliteTable(
  "match_lineup",
  {
    id: integer().primaryKey().notNull(),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    playerId: integer()
      .notNull()
      .references(() => players.id),
    battingOrder: integer(),
    isCaptain: booleanFlag(),
    isViceCaptain: booleanFlag(),
    isWicketKeeper: booleanFlag(),
    isSubstitute: booleanFlag(),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("unique_match_lineup_player").on(
      t.matchId,
      t.teamId,
      t.playerId
    ),
    uniqueIndex("unique_match_lineup_batting_order").on(
      t.matchId,
      t.teamId,
      t.battingOrder
    ),
    index("match_lineup_match_idx").on(t.matchId),
    index("match_lineup_team_idx").on(t.teamId),
  ]
);

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
    status: text().notNull().default("not_started"),
    totalScore: integer().notNull().default(0),
    wickets: integer().notNull().default(0),
    ballsBowled: integer().notNull().default(0),
    wides: integer().notNull().default(0),
    noBalls: integer().notNull().default(0),
    byes: integer().notNull().default(0),
    legByes: integer().notNull().default(0),
    penaltyRuns: integer().notNull().default(0),
    others: integer().notNull().default(0),
    targetRuns: integer(),
    isCompleted: booleanFlag(),
    ...timestampCols,
  },
  (t) => [
    index("innings_match_idx").on(t.matchId),
    uniqueIndex("unique_match_innings_number").on(t.matchId, t.inningsNumber),
  ]
);

export const deliveries = sqliteTable(
  "deliveries",
  {
    id: integer().primaryKey().notNull(),
    inningsId: integer()
      .notNull()
      .references(() => innings.id),
    sequenceNo: integer().notNull(),
    overNumber: integer().notNull(),
    ballInOver: integer().notNull(),
    isLegalDelivery: integer({ mode: "boolean" }).notNull().default(true),
    strikerId: integer()
      .notNull()
      .references(() => players.id),
    nonStrikerId: integer()
      .notNull()
      .references(() => players.id),
    bowlerId: integer()
      .notNull()
      .references(() => players.id),
    batterRuns: integer().notNull().default(0),
    wideRuns: integer().notNull().default(0),
    noBallRuns: integer().notNull().default(0),
    byeRuns: integer().notNull().default(0),
    legByeRuns: integer().notNull().default(0),
    penaltyRuns: integer().notNull().default(0),
    totalRuns: integer().notNull().default(0),
    isWicket: integer({ mode: "boolean" }).notNull().default(false),
    wicketType: text(),
    dismissedPlayerId: integer().references(() => players.id),
    dismissedById: integer().references(() => players.id),
    assistedById: integer().references(() => players.id),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("unique_innings_sequence").on(t.inningsId, t.sequenceNo),
    index("delivery_over_idx").on(t.inningsId, t.overNumber, t.ballInOver),
    index("delivery_bowler_idx").on(t.inningsId, t.bowlerId),
    index("delivery_striker_idx").on(t.inningsId, t.strikerId),
    index("delivery_innings_idx").on(t.inningsId),
  ]
);

export const playerInningsStats = sqliteTable(
  "player_innings_stats",
  {
    id: integer().primaryKey().notNull(),
    inningsId: integer()
      .notNull()
      .references(() => innings.id),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    playerId: integer()
      .notNull()
      .references(() => players.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    battingOrder: integer(),
    runsScored: integer().notNull().default(0),
    ballsFaced: integer().notNull().default(0),
    fours: integer().notNull().default(0),
    sixes: integer().notNull().default(0),
    isDismissed: integer({ mode: "boolean" }).notNull().default(false),
    dismissalType: text(),
    dismissedById: integer().references(() => players.id),
    assistedById: integer().references(() => players.id),
    ballsBowled: integer().notNull().default(0),
    maidens: integer().notNull().default(0),
    runsConceded: integer().notNull().default(0),
    wicketsTaken: integer().notNull().default(0),
    wides: integer().notNull().default(0),
    noBalls: integer().notNull().default(0),
    dotBalls: integer().notNull().default(0),
    catches: integer().notNull().default(0),
    runOuts: integer().notNull().default(0),
    stumpings: integer().notNull().default(0),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("unique_player_innings_stats").on(t.inningsId, t.playerId),
    index("player_innings_stats_match_idx").on(t.matchId),
    index("player_innings_stats_team_idx").on(t.teamId),
    index("player_innings_stats_player_idx").on(t.playerId),
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
  format: text().notNull(),
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
