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

export const user = sqliteTable("user", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  username: text().unique(),
  displayUsername: text().unique(),
  email: text().notNull().unique(),
  emailVerified: booleanFlag(),
  onboardingSeenAt: integer({ mode: "timestamp_ms" }),
  onboardingCompletedAt: integer({ mode: "timestamp_ms" }),
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
    userId: integer()
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
  userId: integer().references(() => user.id),
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

const DEFAULT_OPENING_TIME_MINUTES = 8 * 60;
const DEFAULT_CLOSING_TIME_MINUTES = 18 * 60;

export const venues = sqliteTable('venues', {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  location: text(),
  street: text(),
  city: text(),
  state: text(),
  country: text(),
  pincode: text(),
  capacity: integer().default(0),
  lights: booleanFlag(),
  openingTime: integer().default(DEFAULT_OPENING_TIME_MINUTES).notNull(),
  closingTime: integer().default(DEFAULT_CLOSING_TIME_MINUTES).notNull(),
  ...timestampCols,
});

export const teams = sqliteTable("teams", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  shortName: text().notNull(),
  baseLocation: text(),
  country: text().notNull().default("Unknown"),
  logo: text(),
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

export const organizationVenues = sqliteTable("organization_venues", {
  id: integer().primaryKey().notNull(),
  organizationId: integer()
    .notNull()
    .references(() => organizations.id),
  venueId: integer()
    .notNull()
    .references(() => venues.id),
  ...timestampCols,
});

export const matchFormats = sqliteTable("match_formats", {
  id: integer().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  noOfInnings: integer().notNull().default(2),
  noOfOvers: integer().notNull().default(20),
  ballsPerOver: integer().notNull().default(6),
  maxLegalBallsPerInnings: integer(),
  maxOversPerBowler: integer().notNull().default(4),
  playersPerSide: integer().notNull().default(11),
  isDrawAllowed: booleanFlag().default(false),
  isSuperOverAllowed: booleanFlag().default(false),
  minutesPerInnings: integer(),
  inningsBreakMinutes: integer(),
  ...timestampCols,
});

export const tournaments = sqliteTable(
  "tournaments",
  {
    id: integer().primaryKey().notNull(),
    name: text().notNull(),
    category: text().notNull().default("competitive"),
    season: text(),
    type: text().notNull().default("league"), // "league", "knockout", "round_robin", "swiss", "custom"
    genderAllowed: text().notNull().default("open"), // "male", "female", "open"
    ageLimit: integer().default(100),
    organizationId: integer()
      .notNull()
      .references(() => organizations.id),
    startDate: integer({ mode: "timestamp" }).notNull(),
    endDate: integer({ mode: "timestamp" }).notNull(),
    defaultMatchFormatId: integer()
      .notNull()
      .references(() => matchFormats.id),
    championTeamId: integer().references(() => teams.id),
    fixturePublishedAt: integer({ mode: "timestamp_ms" }),
    activeFixtureVersion: integer(),
    ...timestampCols,
  },
  (t) => [index("tournament_organization_idx").on(t.organizationId)]
);

export const tournamentVenues = sqliteTable("tournament_venues", {
  id: integer().primaryKey().notNull(),
  tournamentId: integer()
    .notNull()
    .references(() => tournaments.id),
  venueId: integer()
    .notNull()
    .references(() => venues.id),
  ...timestampCols,
});

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

export const tournamentStages = sqliteTable(
  "tournament_stages",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    name: text().notNull(),
    code: text(),
    stageType: text().notNull().default("league"),
    format: text().notNull().default("single_round_robin"),
    sequence: integer().notNull().default(1),
    status: text().notNull().default("upcoming"),
    fixtureStatus: text().notNull().default("draft"),
    parentStageId: integer(),
    qualificationSlots: integer().notNull().default(0),
    scheduledStartAt: integer({ mode: "timestamp_ms" }),
    scheduledEndAt: integer({ mode: "timestamp_ms" }),
    lockAt: integer({ mode: "timestamp_ms" }),
    publishedAt: integer({ mode: "timestamp_ms" }),
    fixtureVersion: integer().notNull().default(1),
    matchFormatId: integer()
      .notNull()
      .references(() => matchFormats.id),
    metadata: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    index("tournament_stages_tournament_idx").on(t.tournamentId),
    index("tournament_stages_sequence_idx").on(t.tournamentId, t.sequence),
    uniqueIndex("tournament_stages_tournament_sequence_unique").on(
      t.tournamentId,
      t.sequence
    ),
    foreignKey({
      columns: [t.parentStageId],
      foreignColumns: [t.id],
      name: "fk_tournament_stages_parent_stage",
    }),
  ]
);

export const tournamentStageGroups = sqliteTable(
  "tournament_stage_groups",
  {
    id: integer().primaryKey().notNull(),
    stageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    name: text().notNull(),
    code: text(),
    sequence: integer().notNull().default(1),
    advancingSlots: integer().notNull().default(0),
    metadata: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    index("tournament_stage_groups_stage_idx").on(t.stageId),
    uniqueIndex("tournament_stage_groups_stage_sequence_unique").on(
      t.stageId,
      t.sequence
    ),
  ]
);

export const tournamentStageTeamEntries = sqliteTable(
  "tournament_stage_team_entries",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    stageGroupId: integer().references(() => tournamentStageGroups.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    seed: integer(),
    entrySource: text().notNull().default("direct"),
    isQualified: booleanFlag(),
    isEliminated: booleanFlag(),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("tournament_stage_team_entries_stage_team_unique").on(
      t.stageId,
      t.teamId
    ),
    index("tournament_stage_team_entries_tournament_idx").on(t.tournamentId),
    index("tournament_stage_team_entries_group_idx").on(t.stageGroupId),
  ]
);

export const tournamentStageAdvancements = sqliteTable(
  "tournament_stage_advancements",
  {
    id: integer().primaryKey().notNull(),
    fromStageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    fromStageGroupId: integer().references(() => tournamentStageGroups.id),
    positionFrom: integer().notNull(),
    toStageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    toSlot: integer().notNull(),
    qualificationType: text().notNull().default("position"),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("tournament_stage_advancements_from_position_unique").on(
      t.fromStageId,
      t.fromStageGroupId,
      t.positionFrom
    ),
    index("tournament_stage_advancements_to_stage_idx").on(t.toStageId),
  ]
);

export const fixtureVersions = sqliteTable(
  "fixture_versions",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer().references(() => tournamentStages.id),
    versionNumber: integer().notNull().default(1),
    status: text().notNull().default("draft"),
    label: text(),
    publishedAt: integer({ mode: "timestamp_ms" }),
    archivedAt: integer({ mode: "timestamp_ms" }),
    checksum: text(),
    metadata: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("fixture_versions_tournament_version_unique").on(
      t.tournamentId,
      t.versionNumber
    ),
    index("fixture_versions_tournament_idx").on(t.tournamentId),
    index("fixture_versions_stage_idx").on(t.stageId),
    index("fixture_versions_status_idx").on(t.status),
  ]
);

export const fixtureRounds = sqliteTable(
  "fixture_rounds",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    stageGroupId: integer().references(() => tournamentStageGroups.id),
    fixtureVersionId: integer().references(() => fixtureVersions.id),
    roundNumber: integer().notNull(),
    roundName: text(),
    pairingMethod: text().notNull().default("manual"),
    status: text().notNull().default("draft"),
    scheduledStartAt: integer({ mode: "timestamp_ms" }),
    scheduledEndAt: integer({ mode: "timestamp_ms" }),
    lockAt: integer({ mode: "timestamp_ms" }),
    publishedAt: integer({ mode: "timestamp_ms" }),
    metadata: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("fixture_rounds_stage_group_round_unique").on(
      t.stageId,
      t.stageGroupId,
      t.roundNumber
    ),
    index("fixture_rounds_tournament_idx").on(t.tournamentId),
    index("fixture_rounds_stage_idx").on(t.stageId),
    index("fixture_rounds_fixture_version_idx").on(t.fixtureVersionId),
  ]
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

export const matches = sqliteTable(
  "matches",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    matchFormatId: integer().references(() => matchFormats.id),
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
    ballsPerOverSnapshot: integer().notNull().default(6),
    maxLegalBallsPerInningsSnapshot: integer(),
    maxOversPerBowlerSnapshot: integer(),
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
    stageId: integer().references(() => tournamentStages.id),
    stageGroupId: integer().references(() => tournamentStageGroups.id),
    fixtureRoundId: integer().references(() => fixtureRounds.id),
    stageRound: integer(),
    stageSequence: integer(),
    knockoutLeg: integer().notNull().default(1),
    fixtureStatus: text().notNull().default("draft"),
    scheduledStartAt: integer({ mode: "timestamp_ms" }),
    scheduledEndAt: integer({ mode: "timestamp_ms" }),
    timeZone: text().notNull().default("UTC"),
    publishedAt: integer({ mode: "timestamp_ms" }),
    fixtureVersion: integer().notNull().default(1),
    previousScheduleMatchId: integer(),
    rescheduleReason: text(),
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
  (t) => [
    index("rank_idx").on(t.winnerId),
    index("matches_format_idx").on(t.matchFormatId),
    index("matches_tournament_date_idx").on(t.tournamentId, t.matchDate),
    index("matches_stage_round_sequence_idx").on(
      t.stageId,
      t.stageRound,
      t.stageSequence
    ),
    index("matches_venue_schedule_idx").on(t.venueId, t.scheduledStartAt),
    index("matches_team1_schedule_idx").on(t.team1Id, t.scheduledStartAt),
    index("matches_team2_schedule_idx").on(t.team2Id, t.scheduledStartAt),
    index("matches_fixture_round_idx").on(t.fixtureRoundId),
    foreignKey({
      columns: [t.previousScheduleMatchId],
      foreignColumns: [t.id],
      name: "fk_matches_previous_schedule_match",
    }),
  ]
);

export const matchParticipantSources = sqliteTable(
  "match_participant_sources",
  {
    id: integer().primaryKey().notNull(),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    teamSlot: integer().notNull().default(1),
    sourceType: text().notNull().default("team"),
    sourceTeamId: integer().references(() => teams.id),
    sourceMatchId: integer().references(() => matches.id),
    sourceStageId: integer().references(() => tournamentStages.id),
    sourceStageGroupId: integer().references(() => tournamentStageGroups.id),
    sourcePosition: integer(),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("match_participant_sources_match_slot_unique").on(
      t.matchId,
      t.teamSlot
    ),
    index("match_participant_sources_source_match_idx").on(t.sourceMatchId),
    index("match_participant_sources_source_stage_idx").on(t.sourceStageId),
  ]
);

export const fixtureVersionMatches = sqliteTable(
  "fixture_version_matches",
  {
    id: integer().primaryKey().notNull(),
    fixtureVersionId: integer()
      .notNull()
      .references(() => fixtureVersions.id),
    matchId: integer()
      .notNull()
      .references(() => matches.id),
    sequence: integer().notNull().default(1),
    snapshot: text({ mode: "json" }).notNull().default("{}"),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("fixture_version_matches_unique").on(
      t.fixtureVersionId,
      t.matchId
    ),
    index("fixture_version_matches_fixture_version_idx").on(t.fixtureVersionId),
    index("fixture_version_matches_match_idx").on(t.matchId),
  ]
);

export const fixtureChangeLog = sqliteTable(
  "fixture_change_log",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer().references(() => tournamentStages.id),
    fixtureVersionId: integer().references(() => fixtureVersions.id),
    fixtureRoundId: integer().references(() => fixtureRounds.id),
    matchId: integer().references(() => matches.id),
    action: text().notNull().default("updated"),
    reason: text(),
    payload: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    index("fixture_change_log_tournament_idx").on(t.tournamentId),
    index("fixture_change_log_stage_idx").on(t.stageId),
    index("fixture_change_log_version_idx").on(t.fixtureVersionId),
    index("fixture_change_log_round_idx").on(t.fixtureRoundId),
    index("fixture_change_log_match_idx").on(t.matchId),
  ]
);

export const fixtureConstraints = sqliteTable(
  "fixture_constraints",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer().references(() => tournamentStages.id),
    teamId: integer().references(() => teams.id),
    venueId: integer().references(() => venues.id),
    constraintType: text().notNull(),
    rule: text({ mode: "json" }).notNull(),
    priority: integer().notNull().default(0),
    isActive: booleanFlag().default(true),
    ...timestampCols,
  },
  (t) => [
    index("fixture_constraints_tournament_idx").on(t.tournamentId),
    index("fixture_constraints_stage_idx").on(t.stageId),
    index("fixture_constraints_team_idx").on(t.teamId),
    index("fixture_constraints_venue_idx").on(t.venueId),
    index("fixture_constraints_type_idx").on(t.constraintType),
  ]
);

export const swissRoundStandings = sqliteTable(
  "swiss_round_standings",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    stageId: integer()
      .notNull()
      .references(() => tournamentStages.id),
    fixtureRoundId: integer()
      .notNull()
      .references(() => fixtureRounds.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    position: integer(),
    points: real().notNull().default(0),
    wins: integer().notNull().default(0),
    losses: integer().notNull().default(0),
    ties: integer().notNull().default(0),
    byes: integer().notNull().default(0),
    tieBreak1: real().notNull().default(0),
    tieBreak2: real().notNull().default(0),
    tieBreak3: real().notNull().default(0),
    opponentTeamIds: text({ mode: "json" }).notNull().default("[]"),
    metadata: text({ mode: "json" }),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("swiss_round_standings_round_team_unique").on(
      t.fixtureRoundId,
      t.teamId
    ),
    index("swiss_round_standings_stage_idx").on(t.stageId),
    index("swiss_round_standings_tournament_idx").on(t.tournamentId),
    index("swiss_round_standings_team_idx").on(t.teamId),
  ]
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

export const teamCareerStats = sqliteTable(
  "team_career_stats",
  {
    id: integer().primaryKey().notNull(),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    matchesPlayed: integer().notNull().default(0),
    matchesWon: integer().notNull().default(0),
    matchesLost: integer().notNull().default(0),
    matchesTied: integer().notNull().default(0),
    matchesDrawn: integer().notNull().default(0),
    matchesAbandoned: integer().notNull().default(0),
    points: integer().notNull().default(0),
    winPercentage: real().notNull().default(0),
    runsScored: integer().notNull().default(0),
    runsConceded: integer().notNull().default(0),
    ballsFaced: integer().notNull().default(0),
    ballsBowled: integer().notNull().default(0),
    netRunRate: real().notNull().default(0),
    trophiesWon: integer().notNull().default(0),
    recentForm: text().notNull().default("[]"),
    ...timestampCols,
  },
  (t) => [uniqueIndex("team_career_stats_team_unique").on(t.teamId)]
);

export const teamTournamentStats = sqliteTable(
  "team_tournament_stats",
  {
    id: integer().primaryKey().notNull(),
    tournamentId: integer()
      .notNull()
      .references(() => tournaments.id),
    teamId: integer()
      .notNull()
      .references(() => teams.id),
    matchesPlayed: integer().notNull().default(0),
    matchesWon: integer().notNull().default(0),
    matchesLost: integer().notNull().default(0),
    matchesTied: integer().notNull().default(0),
    matchesDrawn: integer().notNull().default(0),
    matchesAbandoned: integer().notNull().default(0),
    points: integer().notNull().default(0),
    winPercentage: real().notNull().default(0),
    runsScored: integer().notNull().default(0),
    runsConceded: integer().notNull().default(0),
    ballsFaced: integer().notNull().default(0),
    ballsBowled: integer().notNull().default(0),
    netRunRate: real().notNull().default(0),
    recentForm: text().notNull().default("[]"),
    ...timestampCols,
  },
  (t) => [
    uniqueIndex("team_tournament_stats_unique").on(t.tournamentId, t.teamId),
    index("team_tournament_stats_team_idx").on(t.teamId),
    index("team_tournament_stats_tournament_idx").on(t.tournamentId),
  ]
);
