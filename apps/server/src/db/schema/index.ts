import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  username: text().unique(),
  displayUsername: text().unique(),
  email: text().notNull(),
  emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
  Image: text(),
  phoneNumber: text().unique(),
  phoneNumberVerified: integer({ mode: "boolean" }).default(false).notNull(),
  role: text().notNull().default("user"),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export const session = sqliteTable("session", {
  id: integer().primaryKey().notNull(),
  userId: integer()
    .notNull()
    .references(() => user.id),
  token: text().notNull(),
  expiresAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  ipAddress: text(),
  userAgent: text(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export const account = sqliteTable("account", {
  id: integer().primaryKey().notNull(),
  userId: integer()
    .notNull()
    .references(() => user.id),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: integer({ mode: "timestamp" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp" }),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export const verification = sqliteTable("verification", {
  id: integer().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export const passkey = sqliteTable("passkey", {
  id: integer().primaryKey().notNull(),
  name: text(),
  publicKey: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id),
  webauthnUserId: text().notNull(),
  counter: integer().notNull().default(0),
  deviceType: text().notNull(),
  backedUp: integer({ mode: "boolean" }).notNull().default(false),
  transports: text().notNull(),
  aaguid: text(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  battingStance: text("batting_stance").default("Right handed").notNull(),
  bowlingStance: text("bowling_stance"),
  isWicketKeeper: integer("is_wicket_keeper", { mode: "boolean" })
    .default(false)
    .notNull(),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
});

export const teamPlayers = sqliteTable(
  "team_players",
  {
    id: integer("id").primaryKey().notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    isCaptain: integer("is_captain", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (t) => [uniqueIndex("unique_team_player").on(t.teamId, t.playerId)]
);

export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  format: text("format").notNull(), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI"
});

export const tournamentTeams = sqliteTable("tournamentTeams", {
  id: integer("id").primaryKey(),
  tournamentId: integer("tournamentId")
    .notNull()
    .references(() => tournaments.id),
  teamId: integer("teamId")
    .notNull()
    .references(() => teams.id),
  points: integer("points").default(0),
  matchesPlayed: integer("matchesPlayed").default(0),
  matchesWon: integer("matchesWon").default(0),
  matchesLost: integer("matchesLost").default(0),
  matchesTied: integer("matchesTied").default(0),
  matchesDrawn: integer("matchesDrawn").default(0),
});

export const venues = sqliteTable("venues", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  location: text("location"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  capacity: integer("capacity").default(0),
});

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey().notNull(),
    tournamentId: integer("tournament_id").references(() => tournaments.id),
    matchDate: integer("match_date", { mode: "timestamp" }).notNull(),
    tossWinnerId: integer("toss_winner_id")
      .notNull()
      .references(() => teams.id),
    tossDecision: text("toss_decision").notNull(), // "bat" or "bowl"
    team1Id: integer("team1_id")
      .notNull()
      .references(() => teams.id),
    team2Id: integer("team2_id")
      .notNull()
      .references(() => teams.id),
    oversPerSide: integer("overs_per_side").notNull().default(20),
    maxOverPerBowler: integer("max_over_per_bowler").notNull().default(4),
    result: text("result"),
    winnerId: integer("winner_id").references(() => teams.id),
    ranked: integer("ranked", { mode: "boolean" }).default(false),
    isLive: integer("is_live", { mode: "boolean" }).default(true),
    isCompleted: integer("is_completed", { mode: "boolean" }).default(false),
    isAbandoned: integer("is_abandoned", { mode: "boolean" }).default(false),
    isTied: integer("is_tied", { mode: "boolean" }).default(false),
    margin: text("margin"), // e.g., "10 runs", "5 wickets"
    playerOfTheMatchId: integer("player_of_the_match_id").references(
      () => players.id
    ),
    hasLBW: integer("has_lbw", { mode: "boolean" }).default(false),
    hasBye: integer("has_bye", { mode: "boolean" }).default(false),
    hasLegBye: integer("has_leg_bye", { mode: "boolean" }).default(false),
    hasBoundaryOut: integer("has_boundary_out", { mode: "boolean" }).default(
      false
    ),
    hasSuperOver: integer("has_super_over", { mode: "boolean" }).default(false),
    venueId: integer("venue_id").references(() => venues.id),
    notes: text("notes"),
  },
  (t) => [index("rank_idx").on(t.winnerId)]
);

export const innings = sqliteTable(
  "innings",
  {
    id: integer("id").primaryKey().notNull(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    battingTeamId: integer("batting_team_id")
      .notNull()
      .references(() => teams.id),
    bowlingTeamId: integer("bowling_team_id")
      .notNull()
      .references(() => teams.id),
    totalScore: integer("total_runs").notNull().default(0),
    wickets: integer("wickets").notNull().default(0),
    ballsBowled: integer("balls_bowled").notNull().default(0),
    extras: integer("extras").notNull().default(0),
    isCompleted: integer("is_completed", { mode: "boolean" }).default(false),
  },
  (t) => [index("match_idx").on(t.matchId)]
);

export const balls = sqliteTable(
  "balls",
  {
    id: integer("id").primaryKey().notNull(),
    inningsId: integer("innings_id")
      .notNull()
      .references(() => innings.id),
    ballNumber: integer("ball_number").notNull(),
    strikerId: integer("striker_id")
      .notNull()
      .references(() => players.id),
    nonStrikerId: integer("non_striker_id")
      .notNull()
      .references(() => players.id),
    bowlerId: integer("bowler_id")
      .notNull()
      .references(() => players.id),
    runsScored: integer("runs_scored").notNull().default(0),
    isWicket: integer("is_wicket", { mode: "boolean" })
      .notNull()
      .default(false),
    wicketType: text("wicket_type"),
    dismissedPlayerId: integer("dismissed_player_id").references(
      () => players.id
    ),
    assistPlayerId: integer("assist_player_id").references(() => players.id),
    isWide: integer("is_wide", { mode: "boolean" }).notNull().default(false),
    isNoBall: integer("is_no_ball", { mode: "boolean" })
      .notNull()
      .default(false),
    isBye: integer("is_bye", { mode: "boolean" }).notNull().default(false),
    isLegBye: integer("is_leg_bye", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [
    index("over_idx").on(t.inningsId, t.bowlerId),
    index("innings_idx").on(t.inningsId),
  ]
);

export const playerMatchPerformance = sqliteTable(
  "player_match_performance",
  {
    id: integer("id").primaryKey().notNull(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    runsScored: integer("runs_scored").notNull().default(0),
    ballsFaced: integer("balls_faced").notNull().default(0),
    fours: integer("fours").notNull().default(0),
    sixes: integer("sixes").notNull().default(0),
    isDismissed: integer("is_dismissed", { mode: "boolean" })
      .notNull()
      .default(false),
    dismissalType: text("dismissal_type"),
    dismissedBy: integer("dismissed_by").references(() => players.id),
    ballsBowled: integer("balls_bowled").notNull().default(0),
    runsConceded: integer("runs_conceded").notNull().default(0),
    wicketsTaken: integer("wickets_taken").notNull().default(0),
    dotBalls: integer("dot_balls").notNull().default(0),
    catches: integer("catches").notNull().default(0),
    runOuts: integer("run_outs").notNull().default(0),
    stumpings: integer("stumpings").notNull().default(0),
  },
  (t) => [
    index("player_idx").on(t.playerId),
    uniqueIndex("player_match_performance_idx").on(t.playerId, t.matchId),
  ]
);

export const playerTournamentStats = sqliteTable("player_tournament_stats", {
  id: integer("id").primaryKey().notNull(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  matchesPlayed: integer("matches_played").notNull().default(0),
  runsScored: integer("runs_scored").notNull().default(0),
  ballsFaced: integer("balls_faced").notNull().default(0),
  fours: integer("fours").notNull().default(0),
  sixes: integer("sixes").notNull().default(0),
  avgStrikeRate: real("avg_strike_rate").notNull().default(0),
  highestScore: integer("highest_score").notNull().default(0),
  fifties: integer("fifties").notNull().default(0),
  hundreds: integer("hundreds").notNull().default(0),
  ballsBowled: integer("balls_bowled").notNull().default(0),
  runsConceded: integer("runs_conceded").notNull().default(0),
  wicketsTaken: integer("wickets_taken").notNull().default(0),
  avgEconomy: real("avg_economy").notNull().default(0),
  bestBowling: text("best_bowling"),
  fifers: integer("fifers").notNull().default(0),
  catches: integer("catches").notNull().default(0),
  runOuts: integer("run_outs").notNull().default(0),
  stumpings: integer("stumpings").notNull().default(0),
});

export const playerCareerStats = sqliteTable("player_career_stats", {
  id: integer("id").primaryKey().notNull(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
  format: text("format").notNull(), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI"
  matchesPlayed: integer("matches_played").notNull().default(0),
  runsScored: integer("runs_scored").notNull().default(0),
  ballsFaced: integer("balls_faced").notNull().default(0),
  fours: integer("fours").notNull().default(0),
  sixes: integer("sixes").notNull().default(0),
  avgStrikeRate: real("avg_strike_rate").notNull().default(0),
  highestScore: integer("highest_score").notNull().default(0),
  fifties: integer("fifties").notNull().default(0),
  hundreds: integer("hundreds").notNull().default(0),
  ballsBowled: integer("balls_bowled").notNull().default(0),
  runsConceded: integer("runs_conceded").notNull().default(0),
  wicketsTaken: integer("wickets_taken").notNull().default(0),
  avgEconomy: real("avg_economy").notNull().default(0),
  bestBowling: text("best_bowling"),
  fifers: integer("fifers").notNull().default(0),
  catches: integer("catches").notNull().default(0),
  runOuts: integer("run_outs").notNull().default(0),
  stumpings: integer("stumpings").notNull().default(0),
});
