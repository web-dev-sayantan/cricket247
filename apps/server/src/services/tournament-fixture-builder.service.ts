import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  fixtureChangeLog,
  fixtureRounds,
  fixtureVersionMatches,
  fixtureVersions,
  innings,
  matches,
  matchFormats,
  matchParticipantSources,
  swissRoundStandings,
  teams,
  tournamentStages,
  tournamentStageTeamEntries,
  tournaments,
  tournamentVenues,
  venues,
} from "@/db/schema";
import { getCurrentDate } from "@/utils";

const DEFAULT_MATCH_DURATION_MINUTES = 180;
const DEFAULT_TIE_BREAKER_ORDER = [
  "points",
  "net_run_rate",
  "wins",
  "head_to_head",
  "seed",
] as const;

type FixtureStatusFilter = "all" | "live" | "past" | "upcoming";
type ParticipantMode = "concrete" | "source";
type StageTieBreaker = (typeof DEFAULT_TIE_BREAKER_ORDER)[number];

interface VenueSlot {
  closingTime: number;
  id: number;
  openingTime: number;
}

export interface StagePointsConfig {
  abandonedPoints: number;
  drawPoints: number;
  tieBreakerOrder: StageTieBreaker[];
  tiePoints: number;
  winPoints: number;
}

export interface CreateDraftFixtureParticipantSourceInput {
  sourceMatchId?: number;
  sourcePosition?: number;
  sourceStageGroupId?: number;
  sourceStageId?: number;
  sourceTeamId?: number;
  sourceType: "match" | "position" | "team";
  teamSlot: 1 | 2;
}

export interface CreateDraftFixtureMatchInput {
  fixtureRoundId?: number;
  notes?: string;
  participantMode: ParticipantMode;
  participantSources?: CreateDraftFixtureParticipantSourceInput[];
  scheduledEndAt?: Date;
  scheduledStartAt?: Date;
  stageGroupId?: number;
  stageId: number;
  team1Id?: number;
  team2Id?: number;
  tournamentId: number;
  venueId?: number;
}

export interface UpdateDraftFixtureMatchInput {
  matchId: number;
  notes?: string;
  participantMode?: ParticipantMode;
  participantSources?: CreateDraftFixtureParticipantSourceInput[];
  scheduledEndAt?: Date;
  scheduledStartAt?: Date;
  team1Id?: number;
  team2Id?: number;
  tournamentId: number;
  venueId?: number;
}

export interface AutoGenerateFixturesInput {
  assignSchedule: true;
  endDate?: Date;
  overwriteDrafts?: boolean;
  respectExistingDrafts?: boolean;
  scope: "stage";
  stageGroupId?: number;
  stageId: number;
  startDate?: Date;
  timeZone?: string;
  tournamentId: number;
  venueIds?: number[];
}

export interface TournamentFixturesInput {
  includeDraft?: boolean;
  stageId?: number;
  status?: FixtureStatusFilter;
  tournamentId: number;
}

export interface TournamentStandingsInput {
  includeDraft?: boolean;
  stageGroupId?: number;
  stageId?: number;
  tournamentId: number;
}

type BuilderErrorCode =
  | "FIXTURE_MATCH_NOT_DRAFT"
  | "FIXTURE_MATCH_NOT_FOUND"
  | "INSUFFICIENT_TEAMS"
  | "INVALID_PARTICIPANT_MODE"
  | "INVALID_PARTICIPANT_SOURCES"
  | "INVALID_POINTS_CONFIG"
  | "INVALID_STAGE_GROUP"
  | "INVALID_TEAM_SELECTION"
  | "NO_FIXTURE_MATCHES_TO_PUBLISH"
  | "NO_VENUES_AVAILABLE"
  | "STAGE_NOT_FOUND"
  | "SWISS_ROUND_NOT_READY"
  | "TOURNAMENT_NOT_FOUND";

export class TournamentFixtureBuilderError extends Error {
  code: BuilderErrorCode;

  constructor(code: BuilderErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

interface ParticipantRef {
  sourceMatchRef?: { round: number; slot: number };
  sourcePosition?: number;
  sourceStageGroupId?: number;
  sourceStageId?: number;
  sourceTeamId?: number;
  sourceType: "match" | "position" | "team";
  teamId?: number;
}

interface GeneratedMatchPlan {
  participants: [ParticipantRef, ParticipantRef];
  roundNumber: number;
}

interface TeamStandingAccum {
  ballsBowled: number;
  ballsFaced: number;
  matchesAbandoned: number;
  matchesDrawn: number;
  matchesLost: number;
  matchesPlayed: number;
  matchesTied: number;
  matchesWon: number;
  points: number;
  recentForm: Array<"A" | "D" | "L" | "T" | "W">;
  runsConceded: number;
  runsScored: number;
  teamId: number;
}

function roundToTwo(value: number) {
  return Number(value.toFixed(2));
}

function toOvers(balls: number, ballsPerOver: number) {
  if (balls <= 0 || ballsPerOver <= 0) {
    return 0;
  }

  return balls / ballsPerOver;
}

function computeNetRunRate(stats: TeamStandingAccum) {
  const oversFaced = toOvers(stats.ballsFaced, 6);
  const oversBowled = toOvers(stats.ballsBowled, 6);
  if (oversFaced <= 0 || oversBowled <= 0) {
    return 0;
  }

  return roundToTwo(
    stats.runsScored / oversFaced - stats.runsConceded / oversBowled
  );
}

function normalizeStageMetadataInput(
  rawMetadata: unknown
): null | object | string {
  if (typeof rawMetadata === "string") {
    return rawMetadata;
  }
  if (typeof rawMetadata === "object" && rawMetadata !== null) {
    return rawMetadata;
  }
  return null;
}

function parseStagePointsConfig(
  rawMetadata: null | object | string
): StagePointsConfig {
  const fallback: StagePointsConfig = {
    winPoints: 2,
    tiePoints: 1,
    drawPoints: 1,
    abandonedPoints: 1,
    tieBreakerOrder: [...DEFAULT_TIE_BREAKER_ORDER],
  };

  if (!rawMetadata) {
    return fallback;
  }

  try {
    const parsed =
      typeof rawMetadata === "string"
        ? (JSON.parse(rawMetadata) as {
            pointsConfig?: Partial<StagePointsConfig>;
          })
        : (rawMetadata as {
            pointsConfig?: Partial<StagePointsConfig>;
          });
    const config = parsed.pointsConfig;
    if (!config) {
      return fallback;
    }

    return {
      winPoints: config.winPoints ?? fallback.winPoints,
      tiePoints: config.tiePoints ?? fallback.tiePoints,
      drawPoints: config.drawPoints ?? fallback.drawPoints,
      abandonedPoints: config.abandonedPoints ?? fallback.abandonedPoints,
      tieBreakerOrder:
        config.tieBreakerOrder && config.tieBreakerOrder.length > 0
          ? config.tieBreakerOrder
          : fallback.tieBreakerOrder,
    };
  } catch {
    return fallback;
  }
}

function parseStageMetadata(rawMetadata: null | object | string): {
  [key: string]:
    | StagePointsConfig
    | boolean
    | null
    | number
    | string
    | undefined;
  pointsConfig?: StagePointsConfig;
} {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === "string") {
    try {
      return JSON.parse(rawMetadata) as {
        [key: string]:
          | StagePointsConfig
          | boolean
          | null
          | number
          | string
          | undefined;
        pointsConfig?: StagePointsConfig;
      };
    } catch {
      return {};
    }
  }

  return rawMetadata as {
    [key: string]:
      | StagePointsConfig
      | boolean
      | null
      | number
      | string
      | undefined;
    pointsConfig?: StagePointsConfig;
  };
}

function validatePointsConfig(config: StagePointsConfig) {
  const isNonNegative =
    config.winPoints >= 0 &&
    config.tiePoints >= 0 &&
    config.drawPoints >= 0 &&
    config.abandonedPoints >= 0;
  const isTieBreakerValid = config.tieBreakerOrder.every((item) =>
    DEFAULT_TIE_BREAKER_ORDER.includes(item)
  );
  if (!(isNonNegative && isTieBreakerValid)) {
    throw new TournamentFixtureBuilderError("INVALID_POINTS_CONFIG");
  }
}

async function requireTournament(tournamentId: number) {
  const tournament = await db.query.tournaments.findFirst({
    where: {
      id: tournamentId,
    },
  });
  if (!tournament) {
    throw new TournamentFixtureBuilderError("TOURNAMENT_NOT_FOUND");
  }

  return tournament;
}

async function requireStage(stageId: number, tournamentId: number) {
  const stage = await db.query.tournamentStages.findFirst({
    where: {
      id: stageId,
      tournamentId,
    },
  });
  if (!stage) {
    throw new TournamentFixtureBuilderError("STAGE_NOT_FOUND");
  }

  return stage;
}

function classifyMatchStatus(
  match: {
    isAbandoned: boolean;
    isCompleted: boolean;
    isLive: boolean;
    isTied: boolean;
    matchDate: Date;
    result: null | string;
    scheduledStartAt: Date | null;
    winnerId: null | number;
  },
  now: Date
): Exclude<FixtureStatusFilter, "all"> {
  if (match.isLive) {
    return "live";
  }

  if (
    match.isCompleted ||
    match.isAbandoned ||
    match.isTied ||
    typeof match.winnerId === "number" ||
    (typeof match.result === "string" && match.result.trim().length > 0)
  ) {
    return "past";
  }

  const startTime = match.scheduledStartAt ?? match.matchDate;
  if (startTime.getTime() > now.getTime()) {
    return "upcoming";
  }

  return "live";
}

function buildRoundRobinPairs(teamIds: number[]): GeneratedMatchPlan[] {
  const players = [...teamIds];
  if (players.length % 2 === 1) {
    players.push(-1);
  }

  const rounds: GeneratedMatchPlan[] = [];
  const totalRounds = players.length - 1;
  const half = players.length / 2;
  let rotating = [...players];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = rotating[i];
      const b = rotating.at(-(i + 1));
      if (a === -1 || typeof b !== "number" || b === -1) {
        continue;
      }
      rounds.push({
        roundNumber: roundIndex + 1,
        participants: [
          { sourceType: "team", teamId: a },
          { sourceType: "team", teamId: b },
        ],
      });
    }

    const [first, ...rest] = rotating;
    const last = rest.pop();
    rotating = [first, ...(last ? [last] : []), ...rest];
  }

  return rounds;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: bracket construction has intentionally explicit flow for readability and deterministic slot mapping.
function buildSingleEliminationPairs(
  seedTeamIds: number[]
): GeneratedMatchPlan[] {
  const rounds: GeneratedMatchPlan[] = [];
  let current = [...seedTeamIds];
  let roundNumber = 1;
  const roundMatchKeys = new Map<number, { slot: number }[]>();

  while (current.length > 1) {
    const nextRoundSources: ParticipantRef[] = [];
    const roundEntries: { slot: number }[] = [];
    let slot = 0;

    for (let index = 0; index < current.length; index += 2) {
      const teamA = current[index];
      const teamB = current[index + 1];
      if (typeof teamA !== "number") {
        continue;
      }

      if (typeof teamB !== "number") {
        nextRoundSources.push({ sourceType: "team", teamId: teamA });
        continue;
      }

      rounds.push({
        roundNumber,
        participants: [
          { sourceType: "team", teamId: teamA },
          { sourceType: "team", teamId: teamB },
        ],
      });
      roundEntries.push({ slot });
      nextRoundSources.push({
        sourceType: "match",
        sourceMatchRef: {
          round: roundNumber,
          slot,
        },
      });
      slot += 1;
    }

    roundMatchKeys.set(roundNumber, roundEntries);
    if (nextRoundSources.length <= 1) {
      break;
    }

    const next: number[] = [];
    for (const entry of nextRoundSources) {
      next.push(entry.teamId ?? -1);
    }
    current = next;
    roundNumber += 1;
  }

  if (roundMatchKeys.size <= 1) {
    return rounds;
  }

  const sourceRoundToMatches = new Map<number, number>();
  for (const plan of rounds) {
    const existing = sourceRoundToMatches.get(plan.roundNumber) ?? 0;
    sourceRoundToMatches.set(plan.roundNumber, existing + 1);
  }

  if (sourceRoundToMatches.size <= 1) {
    return rounds;
  }

  const knockoutRounds: GeneratedMatchPlan[] = [];
  const groupedByRound = new Map<number, GeneratedMatchPlan[]>();
  for (const round of rounds) {
    const existing = groupedByRound.get(round.roundNumber) ?? [];
    existing.push(round);
    groupedByRound.set(round.roundNumber, existing);
  }

  const maxRound = Math.max(...Array.from(groupedByRound.keys()));
  for (let round = 1; round <= maxRound; round += 1) {
    for (const plan of groupedByRound.get(round) ?? []) {
      knockoutRounds.push(plan);
    }

    const currentRoundMatches = groupedByRound.get(round) ?? [];
    if (round === maxRound || currentRoundMatches.length <= 1) {
      continue;
    }

    const nextRoundMatches = Math.floor(currentRoundMatches.length / 2);
    for (let slot = 0; slot < nextRoundMatches; slot += 1) {
      const left = {
        sourceType: "match" as const,
        sourceMatchRef: { round, slot: slot * 2 },
      };
      const right = {
        sourceType: "match" as const,
        sourceMatchRef: { round, slot: slot * 2 + 1 },
      };
      knockoutRounds.push({
        roundNumber: round + 1,
        participants: [left, right],
      });
    }
  }

  return knockoutRounds;
}

function allocateScheduleTimes(params: {
  plans: GeneratedMatchPlan[];
  startDate: Date;
  venues: VenueSlot[];
}) {
  const { plans, startDate, venues: availableVenues } = params;
  const byRound = new Map<number, GeneratedMatchPlan[]>();
  for (const plan of plans) {
    const existing = byRound.get(plan.roundNumber) ?? [];
    existing.push(plan);
    byRound.set(plan.roundNumber, existing);
  }

  const result = new Map<
    GeneratedMatchPlan,
    { end: Date; start: Date; venueId: number }
  >();
  const sortedRounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (const [roundIndex, roundNo] of sortedRounds.entries()) {
    const matchesInRound = byRound.get(roundNo) ?? [];
    const roundDate = new Date(startDate.getTime());
    roundDate.setDate(roundDate.getDate() + roundIndex);

    for (const [index, matchPlan] of matchesInRound.entries()) {
      const venue = availableVenues[index % availableVenues.length];
      const slotIndex = Math.floor(index / availableVenues.length);
      const minutesFromMidnight =
        (venue.openingTime ?? 9 * 60) +
        slotIndex * DEFAULT_MATCH_DURATION_MINUTES;
      const start = new Date(roundDate.getTime());
      start.setHours(0, 0, 0, 0);
      start.setMinutes(minutesFromMidnight);
      const end = new Date(
        start.getTime() + DEFAULT_MATCH_DURATION_MINUTES * 60 * 1000
      );
      result.set(matchPlan, { start, end, venueId: venue.id });
    }
  }

  return result;
}

async function loadTournamentVenues(
  tournamentId: number,
  venueIds: number[] | undefined
): Promise<VenueSlot[]> {
  const linked = await db
    .select({
      closingTime: venues.closingTime,
      id: venues.id,
      openingTime: venues.openingTime,
    })
    .from(tournamentVenues)
    .innerJoin(venues, eq(venues.id, tournamentVenues.venueId))
    .where(eq(tournamentVenues.tournamentId, tournamentId));

  let result = linked;
  if (venueIds && venueIds.length > 0) {
    const allowed = new Set(venueIds);
    result = linked.filter((entry) => allowed.has(entry.id));
  }

  if (result.length > 0) {
    return result;
  }

  const allVenues = await db.select().from(venues);
  if (allVenues.length === 0) {
    throw new TournamentFixtureBuilderError("NO_VENUES_AVAILABLE");
  }

  if (venueIds && venueIds.length > 0) {
    return allVenues
      .filter((venue) => venueIds.includes(venue.id))
      .map((venue) => ({
        id: venue.id,
        openingTime: venue.openingTime,
        closingTime: venue.closingTime,
      }));
  }

  return allVenues.map((venue) => ({
    id: venue.id,
    openingTime: venue.openingTime,
    closingTime: venue.closingTime,
  }));
}

function normalizeStageFormat(stage: typeof tournamentStages.$inferSelect) {
  const format = stage.format.trim().toLowerCase();
  const stageType = stage.stageType.trim().toLowerCase();

  if (format === "double_round_robin") {
    return "double_round_robin";
  }

  if (
    format === "single_round_robin" ||
    format === "round_robin" ||
    stageType === "league" ||
    stageType === "group"
  ) {
    return "single_round_robin";
  }

  if (format === "double_elimination") {
    return "double_elimination";
  }

  if (
    format === "single_elimination" ||
    stageType === "knockout" ||
    stageType === "playoff"
  ) {
    return "single_elimination";
  }

  if (format === "swiss" || stageType === "swiss") {
    return "swiss";
  }

  if (format === "custom") {
    return stageType === "knockout"
      ? "single_elimination"
      : "single_round_robin";
  }

  return "single_round_robin";
}

async function nextFixtureVersionNumber(tournamentId: number) {
  const latestVersion = await db
    .select({ versionNumber: fixtureVersions.versionNumber })
    .from(fixtureVersions)
    .where(eq(fixtureVersions.tournamentId, tournamentId))
    .orderBy(desc(fixtureVersions.versionNumber))
    .limit(1);

  return (latestVersion[0]?.versionNumber ?? 0) + 1;
}

export async function getTournamentView(input: { tournamentId: number }) {
  const tournament = await requireTournament(input.tournamentId);
  const stages = await db.query.tournamentStages.findMany({
    where: {
      tournamentId: input.tournamentId,
    },
    orderBy: {
      sequence: "asc",
    },
    with: {
      groups: {
        orderBy: {
          sequence: "asc",
        },
      },
      teamEntries: {
        with: {
          team: true,
        },
      },
      sourceAdvancements: true,
      targetAdvancements: true,
    },
  });

  const tournamentTeamRows = await db.query.tournamentTeams.findMany({
    where: {
      tournamentId: input.tournamentId,
    },
    with: {
      team: true,
    },
  });

  const venueRows = await db
    .select({
      closingTime: venues.closingTime,
      id: venues.id,
      location: venues.location,
      name: venues.name,
      openingTime: venues.openingTime,
    })
    .from(tournamentVenues)
    .innerJoin(venues, eq(venues.id, tournamentVenues.venueId))
    .where(eq(tournamentVenues.tournamentId, input.tournamentId));

  const tournamentMatches = await db
    .select({
      fixtureStatus: matches.fixtureStatus,
      id: matches.id,
    })
    .from(matches)
    .where(eq(matches.tournamentId, input.tournamentId));

  const publishedMatchCount = tournamentMatches.filter(
    (entry) => entry.fixtureStatus === "published"
  ).length;
  const draftMatchCount = tournamentMatches.filter(
    (entry) => entry.fixtureStatus !== "published"
  ).length;

  return {
    tournament,
    stages,
    teams: tournamentTeamRows,
    venues: venueRows,
    counts: {
      totalMatchCount: tournamentMatches.length,
      publishedMatchCount,
      draftMatchCount,
    },
  };
}

export async function getTournamentFixtures(input: TournamentFixturesInput) {
  await requireTournament(input.tournamentId);

  const includeDraft = input.includeDraft ?? false;
  const whereObject: {
    fixtureStatus?: string;
    stageId?: number;
    tournamentId: number;
  } = {
    tournamentId: input.tournamentId,
  };
  if (typeof input.stageId === "number") {
    whereObject.stageId = input.stageId;
  }
  if (!includeDraft) {
    whereObject.fixtureStatus = "published";
  }

  const rows = await db.query.matches.findMany({
    where: whereObject,
    orderBy: {
      matchDate: "asc",
    },
    with: {
      participantSources: true,
      stage: true,
      stageGroup: true,
      team1: true,
      team2: true,
      venue: true,
    },
  });

  const now = getCurrentDate();
  const statusFilter = input.status ?? "all";
  const mapped = rows.map((match) => {
    const temporalStatus = classifyMatchStatus(
      {
        isAbandoned: match.isAbandoned,
        isCompleted: match.isCompleted,
        isLive: Boolean(match.isLive),
        isTied: match.isTied,
        matchDate: match.matchDate,
        result: match.result,
        scheduledStartAt: match.scheduledStartAt,
        winnerId: match.winnerId,
      },
      now
    );

    return {
      ...match,
      temporalStatus,
    };
  });

  return mapped.filter((entry) =>
    statusFilter === "all" ? true : entry.temporalStatus === statusFilter
  );
}

export async function setStagePointsConfig(input: {
  config: StagePointsConfig;
  stageId: number;
}) {
  validatePointsConfig(input.config);

  const stage = await db.query.tournamentStages.findFirst({
    where: {
      id: input.stageId,
    },
  });
  if (!stage) {
    throw new TournamentFixtureBuilderError("STAGE_NOT_FOUND");
  }

  const metadata = parseStageMetadata(
    normalizeStageMetadataInput(stage.metadata)
  );

  metadata.pointsConfig = input.config;

  const [updated] = await db
    .update(tournamentStages)
    .set({
      metadata: JSON.stringify(metadata),
    })
    .where(eq(tournamentStages.id, input.stageId))
    .returning();

  return {
    stage: updated,
    config: input.config,
  };
}

function ensureParticipantSources(
  mode: ParticipantMode,
  participantSources: CreateDraftFixtureParticipantSourceInput[] | undefined,
  team1Id: number | undefined,
  team2Id: number | undefined
) {
  if (mode === "concrete") {
    if (
      typeof team1Id !== "number" ||
      typeof team2Id !== "number" ||
      team1Id === team2Id
    ) {
      throw new TournamentFixtureBuilderError("INVALID_TEAM_SELECTION");
    }
    return;
  }

  if (!participantSources || participantSources.length !== 2) {
    throw new TournamentFixtureBuilderError("INVALID_PARTICIPANT_SOURCES");
  }

  const slots = new Set(participantSources.map((source) => source.teamSlot));
  if (!(slots.has(1) && slots.has(2))) {
    throw new TournamentFixtureBuilderError("INVALID_PARTICIPANT_SOURCES");
  }
}

async function insertParticipantSourceRows(params: {
  matchId: number;
  participantSources: CreateDraftFixtureParticipantSourceInput[];
}) {
  await db.insert(matchParticipantSources).values(
    params.participantSources.map((source) => ({
      matchId: params.matchId,
      teamSlot: source.teamSlot,
      sourceType: source.sourceType,
      sourceMatchId: source.sourceMatchId ?? null,
      sourceStageId: source.sourceStageId ?? null,
      sourceStageGroupId: source.sourceStageGroupId ?? null,
      sourcePosition: source.sourcePosition ?? null,
      sourceTeamId: source.sourceTeamId ?? null,
    }))
  );
}

async function findMatchFormatById(matchFormatId: number | null) {
  if (typeof matchFormatId !== "number") {
    return null;
  }

  const [format] = await db
    .select({
      id: matchFormats.id,
      name: matchFormats.name,
      noOfOvers: matchFormats.noOfOvers,
      ballsPerOver: matchFormats.ballsPerOver,
      maxLegalBallsPerInnings: matchFormats.maxLegalBallsPerInnings,
      maxOversPerBowler: matchFormats.maxOversPerBowler,
      playersPerSide: matchFormats.playersPerSide,
    })
    .from(matchFormats)
    .where(eq(matchFormats.id, matchFormatId))
    .limit(1);

  return format ?? null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validates multiple optional inputs and persists draft + participant source links in one transaction-safe flow.
export async function createDraftFixtureMatch(
  input: CreateDraftFixtureMatchInput
) {
  const tournament = await requireTournament(input.tournamentId);
  const stage = await requireStage(input.stageId, input.tournamentId);

  if (typeof input.stageGroupId === "number") {
    const group = await db.query.tournamentStageGroups.findFirst({
      where: {
        id: input.stageGroupId,
        stageId: input.stageId,
      },
    });
    if (!group) {
      throw new TournamentFixtureBuilderError("INVALID_STAGE_GROUP");
    }
  }

  ensureParticipantSources(
    input.participantMode,
    input.participantSources,
    input.team1Id,
    input.team2Id
  );

  const format = await findMatchFormatById(stage.matchFormatId);

  const matchDate = input.scheduledStartAt ?? tournament.startDate;

  const [created] = await db
    .insert(matches)
    .values({
      tournamentId: input.tournamentId,
      stageId: input.stageId,
      stageGroupId: input.stageGroupId ?? null,
      fixtureRoundId: input.fixtureRoundId ?? null,
      matchFormatId: stage.matchFormatId,
      matchDate,
      tossWinnerId: null,
      tossDecision: null,
      team1Id:
        input.participantMode === "concrete" ? (input.team1Id ?? null) : null,
      team2Id:
        input.participantMode === "concrete" ? (input.team2Id ?? null) : null,
      oversPerSide: format?.noOfOvers ?? 20,
      maxOverPerBowler: format?.maxOversPerBowler ?? 4,
      ballsPerOverSnapshot: format?.ballsPerOver ?? 6,
      maxLegalBallsPerInningsSnapshot:
        format?.maxLegalBallsPerInnings ??
        (format?.noOfOvers ?? 20) * (format?.ballsPerOver ?? 6),
      maxOversPerBowlerSnapshot: format?.maxOversPerBowler ?? 4,
      playersPerSide: format?.playersPerSide ?? 11,
      format: format?.name ?? "Custom",
      fixtureStatus: "draft",
      scheduledStartAt: input.scheduledStartAt ?? null,
      scheduledEndAt: input.scheduledEndAt ?? null,
      timeZone: tournament.timeZone,
      notes: input.notes ?? null,
      isLive: false,
    })
    .returning();

  if (!created) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_FOUND");
  }

  if (input.participantMode === "source" && input.participantSources) {
    await insertParticipantSourceRows({
      matchId: created.id,
      participantSources: input.participantSources,
    });
  }

  await db.insert(fixtureChangeLog).values({
    tournamentId: input.tournamentId,
    stageId: input.stageId,
    matchId: created.id,
    fixtureRoundId: input.fixtureRoundId ?? null,
    action: "fixture_match_created",
    payload: JSON.stringify({
      participantMode: input.participantMode,
    }),
  });

  return created;
}

export async function updateDraftFixtureMatch(
  input: UpdateDraftFixtureMatchInput
) {
  const existing = await db.query.matches.findFirst({
    where: {
      id: input.matchId,
      tournamentId: input.tournamentId,
    },
  });
  if (!existing) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_FOUND");
  }

  if (existing.fixtureStatus !== "draft") {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_DRAFT");
  }

  if (input.participantMode) {
    ensureParticipantSources(
      input.participantMode,
      input.participantSources,
      input.team1Id,
      input.team2Id
    );
  }

  const updatePayload: Partial<typeof matches.$inferInsert> = {};
  if (typeof input.team1Id === "number") {
    updatePayload.team1Id = input.team1Id;
  }
  if (typeof input.team2Id === "number") {
    updatePayload.team2Id = input.team2Id;
  }
  if (typeof input.venueId === "number") {
    updatePayload.venueId = input.venueId;
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }
  if (input.scheduledStartAt !== undefined) {
    updatePayload.scheduledStartAt = input.scheduledStartAt;
    updatePayload.matchDate = input.scheduledStartAt;
  }
  if (input.scheduledEndAt !== undefined) {
    updatePayload.scheduledEndAt = input.scheduledEndAt;
  }

  const [updated] = await db
    .update(matches)
    .set(updatePayload)
    .where(eq(matches.id, input.matchId))
    .returning();

  if (!updated) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_FOUND");
  }

  if (input.participantMode) {
    await db
      .delete(matchParticipantSources)
      .where(eq(matchParticipantSources.matchId, input.matchId));
    if (input.participantMode === "source" && input.participantSources) {
      await insertParticipantSourceRows({
        matchId: input.matchId,
        participantSources: input.participantSources,
      });
      await db
        .update(matches)
        .set({
          team1Id: null,
          team2Id: null,
          tossWinnerId: null,
          tossDecision: null,
        })
        .where(eq(matches.id, input.matchId));
    }
  }

  await db.insert(fixtureChangeLog).values({
    tournamentId: input.tournamentId,
    stageId: existing.stageId,
    matchId: input.matchId,
    fixtureRoundId: existing.fixtureRoundId,
    action: "fixture_match_updated",
  });

  return updated;
}

export async function deleteDraftFixtureMatch(input: {
  matchId: number;
  tournamentId: number;
}) {
  const match = await db.query.matches.findFirst({
    where: {
      id: input.matchId,
      tournamentId: input.tournamentId,
    },
  });
  if (!match) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_FOUND");
  }
  if (match.fixtureStatus !== "draft") {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_DRAFT");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(matchParticipantSources)
      .where(eq(matchParticipantSources.matchId, input.matchId));
    await tx
      .delete(fixtureVersionMatches)
      .where(eq(fixtureVersionMatches.matchId, input.matchId));
    await tx
      .update(fixtureChangeLog)
      .set({
        matchId: null,
      })
      .where(eq(fixtureChangeLog.matchId, input.matchId));
    await tx.delete(matches).where(eq(matches.id, input.matchId));
    await tx.insert(fixtureChangeLog).values({
      tournamentId: input.tournamentId,
      stageId: match.stageId,
      fixtureRoundId: match.fixtureRoundId,
      action: "fixture_match_deleted",
      payload: JSON.stringify({
        deletedMatchId: input.matchId,
      }),
    });
  });

  return { id: input.matchId };
}

export async function publishFixtureMatches(input: {
  matchIds: number[];
  note?: string;
  tournamentId: number;
}) {
  await requireTournament(input.tournamentId);

  const uniqueMatchIds = Array.from(new Set(input.matchIds));
  if (uniqueMatchIds.length === 0) {
    throw new TournamentFixtureBuilderError("NO_FIXTURE_MATCHES_TO_PUBLISH");
  }

  const toPublish = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, input.tournamentId),
        inArray(matches.id, uniqueMatchIds)
      )
    );

  if (toPublish.length !== uniqueMatchIds.length) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_FOUND");
  }

  if (toPublish.some((match) => match.fixtureStatus !== "draft")) {
    throw new TournamentFixtureBuilderError("FIXTURE_MATCH_NOT_DRAFT");
  }

  const now = getCurrentDate();
  const nextVersion = await nextFixtureVersionNumber(input.tournamentId);

  await db.transaction(async (tx) => {
    await tx
      .update(fixtureVersions)
      .set({
        status: "archived",
        archivedAt: now,
      })
      .where(
        and(
          eq(fixtureVersions.tournamentId, input.tournamentId),
          eq(fixtureVersions.status, "published")
        )
      );

    const [newVersion] = await tx
      .insert(fixtureVersions)
      .values({
        tournamentId: input.tournamentId,
        versionNumber: nextVersion,
        status: "published",
        publishedAt: now,
        label: "Incremental publish",
      })
      .returning();

    await tx
      .update(matches)
      .set({
        fixtureStatus: "published",
        publishedAt: now,
        fixtureVersion: nextVersion,
      })
      .where(inArray(matches.id, uniqueMatchIds));

    await tx.insert(fixtureVersionMatches).values(
      toPublish.map((match, index) => ({
        fixtureVersionId: newVersion.id,
        matchId: match.id,
        sequence: index + 1,
        snapshot: JSON.stringify(match),
      }))
    );

    await tx
      .update(tournaments)
      .set({
        fixturePublishedAt: now,
        activeFixtureVersion: nextVersion,
      })
      .where(eq(tournaments.id, input.tournamentId));

    await tx.insert(fixtureChangeLog).values({
      tournamentId: input.tournamentId,
      fixtureVersionId: newVersion.id,
      action: "fixture_matches_published",
      reason: input.note,
      payload: JSON.stringify({
        matchIds: uniqueMatchIds,
      }),
    });
  });

  return {
    publishedMatchCount: uniqueMatchIds.length,
    versionNumber: nextVersion,
    publishedAt: now,
  };
}

async function createAutoFixtureVersion(params: {
  stageId: number;
  tournamentId: number;
}) {
  const nextVersion = await nextFixtureVersionNumber(params.tournamentId);
  const [version] = await db
    .insert(fixtureVersions)
    .values({
      tournamentId: params.tournamentId,
      stageId: params.stageId,
      versionNumber: nextVersion,
      status: "draft",
      label: "Auto-generated draft",
    })
    .returning();

  return version;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: creation requires sequential round/entity inserts and stable source-reference mapping.
async function createGeneratedMatches(params: {
  plans: GeneratedMatchPlan[];
  scheduleMap: Map<
    GeneratedMatchPlan,
    { end: Date; start: Date; venueId: number }
  >;
  stage: typeof tournamentStages.$inferSelect;
  tournament: typeof tournaments.$inferSelect;
  tournamentId: number;
  versionId: number;
}) {
  const { plans, scheduleMap, stage, tournament, tournamentId, versionId } =
    params;
  const format = await findMatchFormatById(stage.matchFormatId);

  const createdByRoundSlot = new Map<string, number>();
  const createdMatchIds: number[] = [];
  const roundIds = new Map<number, number>();
  const roundNumbers = Array.from(
    new Set(plans.map((plan) => plan.roundNumber))
  ).sort((a, b) => a - b);

  for (const roundNumber of roundNumbers) {
    const [round] = await db
      .insert(fixtureRounds)
      .values({
        tournamentId,
        stageId: stage.id,
        fixtureVersionId: versionId,
        roundNumber,
        roundName: `Round ${roundNumber}`,
        pairingMethod: "auto",
      })
      .returning();
    roundIds.set(roundNumber, round.id);
  }

  const plansWithSlot = plans
    .map((plan, index) => ({
      index,
      plan,
    }))
    .sort((a, b) =>
      a.plan.roundNumber === b.plan.roundNumber
        ? a.index - b.index
        : a.plan.roundNumber - b.plan.roundNumber
    );

  const slotCounterByRound = new Map<number, number>();

  for (const item of plansWithSlot) {
    const slot = slotCounterByRound.get(item.plan.roundNumber) ?? 0;
    slotCounterByRound.set(item.plan.roundNumber, slot + 1);
    const schedule = scheduleMap.get(item.plan);
    const team1 = item.plan.participants[0];
    const team2 = item.plan.participants[1];

    const resolveSourceMatchId = (entry: ParticipantRef) => {
      if (!entry.sourceMatchRef) {
        return null;
      }
      const key = `${entry.sourceMatchRef.round}:${entry.sourceMatchRef.slot}`;
      return createdByRoundSlot.get(key) ?? null;
    };

    const [created] = await db
      .insert(matches)
      .values({
        tournamentId,
        stageId: stage.id,
        stageGroupId: null,
        fixtureRoundId: roundIds.get(item.plan.roundNumber) ?? null,
        stageRound: item.plan.roundNumber,
        stageSequence: slot + 1,
        matchFormatId: stage.matchFormatId,
        matchDate: schedule?.start ?? tournament.startDate,
        tossWinnerId: null,
        tossDecision: null,
        team1Id: team1.teamId ?? null,
        team2Id: team2.teamId ?? null,
        oversPerSide: format?.noOfOvers ?? 20,
        maxOverPerBowler: format?.maxOversPerBowler ?? 4,
        ballsPerOverSnapshot: format?.ballsPerOver ?? 6,
        maxLegalBallsPerInningsSnapshot:
          format?.maxLegalBallsPerInnings ??
          (format?.noOfOvers ?? 20) * (format?.ballsPerOver ?? 6),
        maxOversPerBowlerSnapshot: format?.maxOversPerBowler ?? 4,
        playersPerSide: format?.playersPerSide ?? 11,
        format: format?.name ?? "Custom",
        fixtureStatus: "draft",
        scheduledStartAt: schedule?.start ?? null,
        scheduledEndAt: schedule?.end ?? null,
        timeZone: tournament.timeZone,
        venueId: schedule?.venueId ?? null,
        isLive: false,
      })
      .returning();

    const key = `${item.plan.roundNumber}:${slot}`;
    createdByRoundSlot.set(key, created.id);
    createdMatchIds.push(created.id);

    const sourceRows: CreateDraftFixtureParticipantSourceInput[] = [];
    const source1MatchId = resolveSourceMatchId(team1);
    if (team1.sourceType !== "team") {
      sourceRows.push({
        teamSlot: 1,
        sourceType: team1.sourceType,
        sourceMatchId: source1MatchId ?? undefined,
        sourceStageId: team1.sourceStageId,
        sourceStageGroupId: team1.sourceStageGroupId,
        sourcePosition: team1.sourcePosition,
        sourceTeamId: team1.sourceTeamId,
      });
    }
    const source2MatchId = resolveSourceMatchId(team2);
    if (team2.sourceType !== "team") {
      sourceRows.push({
        teamSlot: 2,
        sourceType: team2.sourceType,
        sourceMatchId: source2MatchId ?? undefined,
        sourceStageId: team2.sourceStageId,
        sourceStageGroupId: team2.sourceStageGroupId,
        sourcePosition: team2.sourcePosition,
        sourceTeamId: team2.sourceTeamId,
      });
    }
    if (sourceRows.length > 0) {
      await insertParticipantSourceRows({
        matchId: created.id,
        participantSources: sourceRows,
      });
    }
  }

  await db.insert(fixtureVersionMatches).values(
    createdMatchIds.map((matchId, index) => ({
      fixtureVersionId: versionId,
      matchId,
      sequence: index + 1,
      snapshot: "{}",
    }))
  );

  return {
    createdMatchIds,
    createdRoundCount: roundNumbers.length,
  };
}

export async function autoGenerateFixtures(input: AutoGenerateFixturesInput) {
  const tournament = await requireTournament(input.tournamentId);
  const stage = await requireStage(input.stageId, input.tournamentId);
  const stageEntryFilters = [
    eq(tournamentStageTeamEntries.stageId, input.stageId),
  ];
  if (typeof input.stageGroupId === "number") {
    stageEntryFilters.push(
      eq(tournamentStageTeamEntries.stageGroupId, input.stageGroupId)
    );
  }
  const stageEntries = await db
    .select()
    .from(tournamentStageTeamEntries)
    .where(and(...stageEntryFilters))
    .orderBy(asc(tournamentStageTeamEntries.seed));

  const teamIds = stageEntries.map((entry) => entry.teamId);
  if (teamIds.length < 2) {
    throw new TournamentFixtureBuilderError("INSUFFICIENT_TEAMS");
  }

  if (input.overwriteDrafts ?? false) {
    const stageDraftMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, input.tournamentId),
          eq(matches.stageId, input.stageId),
          eq(matches.fixtureStatus, "draft")
        )
      );
    for (const match of stageDraftMatches) {
      await deleteDraftFixtureMatch({
        matchId: match.id,
        tournamentId: input.tournamentId,
      });
    }
  } else if (input.respectExistingDrafts ?? true) {
    const existingDrafts = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, input.tournamentId),
          eq(matches.stageId, input.stageId),
          eq(matches.fixtureStatus, "draft")
        )
      );
    if (existingDrafts.length > 0) {
      return {
        createdMatchCount: 0,
        createdRoundCount: 0,
        fixtureVersionId: null,
        skippedReason: "draft_matches_exist",
      };
    }
  }

  const format = normalizeStageFormat(stage);
  let plans: GeneratedMatchPlan[] = [];
  if (format === "single_round_robin") {
    plans = buildRoundRobinPairs(teamIds);
  } else if (format === "double_round_robin") {
    const first = buildRoundRobinPairs(teamIds);
    const second = first.map((plan) => ({
      roundNumber: plan.roundNumber + teamIds.length - 1,
      participants: [plan.participants[1], plan.participants[0]] as [
        ParticipantRef,
        ParticipantRef,
      ],
    }));
    plans = [...first, ...second];
  } else if (
    format === "single_elimination" ||
    format === "double_elimination"
  ) {
    plans = buildSingleEliminationPairs(teamIds);
  } else if (format === "swiss") {
    plans = buildRoundRobinPairs(teamIds).filter(
      (entry) => entry.roundNumber === 1
    );
  } else {
    throw new TournamentFixtureBuilderError("INVALID_PARTICIPANT_MODE");
  }

  const venueRows = await loadTournamentVenues(
    input.tournamentId,
    input.venueIds
  );
  const scheduleMap = allocateScheduleTimes({
    plans,
    venues: venueRows,
    startDate: input.startDate ?? tournament.startDate,
  });

  const version = await createAutoFixtureVersion({
    tournamentId: input.tournamentId,
    stageId: input.stageId,
  });

  const created = await createGeneratedMatches({
    plans,
    scheduleMap,
    stage,
    tournament,
    tournamentId: input.tournamentId,
    versionId: version.id,
  });

  await db.insert(fixtureChangeLog).values({
    tournamentId: input.tournamentId,
    stageId: input.stageId,
    fixtureVersionId: version.id,
    action: "fixture_auto_generated",
    payload: JSON.stringify({
      format,
      createdMatchCount: created.createdMatchIds.length,
      createdRoundCount: created.createdRoundCount,
    }),
  });

  return {
    fixtureVersionId: version.id,
    createdMatchCount: created.createdMatchIds.length,
    createdRoundCount: created.createdRoundCount,
    timeZone: input.timeZone ?? tournament.timeZone,
  };
}

function hasPlayedAgainst(
  opponents: Map<number, Set<number>>,
  teamId: number,
  candidateId: number
) {
  return opponents.get(teamId)?.has(candidateId) ?? false;
}

export async function autoGenerateNextSwissRound(input: {
  stageId: number;
  tournamentId: number;
}) {
  const tournament = await requireTournament(input.tournamentId);
  const stage = await requireStage(input.stageId, input.tournamentId);
  const normalizedFormat = normalizeStageFormat(stage);
  if (normalizedFormat !== "swiss") {
    throw new TournamentFixtureBuilderError("SWISS_ROUND_NOT_READY");
  }

  const latestRound = await db
    .select({
      fixtureRoundId: swissRoundStandings.fixtureRoundId,
      points: swissRoundStandings.points,
      teamId: swissRoundStandings.teamId,
      tieBreak1: swissRoundStandings.tieBreak1,
      tieBreak2: swissRoundStandings.tieBreak2,
      tieBreak3: swissRoundStandings.tieBreak3,
      opponentTeamIds: swissRoundStandings.opponentTeamIds,
    })
    .from(swissRoundStandings)
    .where(
      and(
        eq(swissRoundStandings.tournamentId, input.tournamentId),
        eq(swissRoundStandings.stageId, input.stageId)
      )
    );

  let teamsForPairing: Array<{
    opponentTeamIds: number[];
    points: number;
    teamId: number;
    tieBreak1: number;
    tieBreak2: number;
    tieBreak3: number;
  }> = [];

  if (latestRound.length > 0) {
    teamsForPairing = latestRound.map((row) => ({
      teamId: row.teamId,
      points: row.points,
      tieBreak1: row.tieBreak1,
      tieBreak2: row.tieBreak2,
      tieBreak3: row.tieBreak3,
      opponentTeamIds: (() => {
        try {
          const parsed =
            typeof row.opponentTeamIds === "string"
              ? (JSON.parse(row.opponentTeamIds) as number[])
              : (row.opponentTeamIds as number[]);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
    }));
  } else {
    const stageTeams = await db.query.tournamentStageTeamEntries.findMany({
      where: {
        stageId: input.stageId,
      },
      orderBy: {
        seed: "asc",
      },
    });
    teamsForPairing = stageTeams.map((entry) => ({
      teamId: entry.teamId,
      points: 0,
      tieBreak1: 0,
      tieBreak2: 0,
      tieBreak3: 0,
      opponentTeamIds: [],
    }));
  }

  if (teamsForPairing.length < 2) {
    throw new TournamentFixtureBuilderError("INSUFFICIENT_TEAMS");
  }

  teamsForPairing.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.tieBreak1 !== a.tieBreak1) {
      return b.tieBreak1 - a.tieBreak1;
    }
    if (b.tieBreak2 !== a.tieBreak2) {
      return b.tieBreak2 - a.tieBreak2;
    }
    if (b.tieBreak3 !== a.tieBreak3) {
      return b.tieBreak3 - a.tieBreak3;
    }
    return a.teamId - b.teamId;
  });

  const opponentMap = new Map<number, Set<number>>();
  for (const entry of teamsForPairing) {
    opponentMap.set(entry.teamId, new Set(entry.opponentTeamIds));
  }

  const pool = [...teamsForPairing.map((entry) => entry.teamId)];
  const pairings: GeneratedMatchPlan[] = [];
  while (pool.length > 1) {
    const first = pool.shift();
    if (typeof first !== "number") {
      continue;
    }

    let opponentIndex = pool.findIndex(
      (candidate) => !hasPlayedAgainst(opponentMap, first, candidate)
    );
    if (opponentIndex === -1) {
      opponentIndex = 0;
    }
    const opponent = pool.splice(opponentIndex, 1)[0];
    if (typeof opponent !== "number") {
      continue;
    }

    pairings.push({
      roundNumber: 1,
      participants: [
        { sourceType: "team", teamId: first },
        { sourceType: "team", teamId: opponent },
      ],
    });
  }

  if (pairings.length === 0) {
    throw new TournamentFixtureBuilderError("SWISS_ROUND_NOT_READY");
  }

  const venueRows = await loadTournamentVenues(input.tournamentId, undefined);
  const scheduleMap = allocateScheduleTimes({
    plans: pairings,
    venues: venueRows,
    startDate: tournament.startDate,
  });
  const version = await createAutoFixtureVersion({
    tournamentId: input.tournamentId,
    stageId: input.stageId,
  });
  const created = await createGeneratedMatches({
    plans: pairings,
    scheduleMap,
    stage,
    tournament,
    tournamentId: input.tournamentId,
    versionId: version.id,
  });

  await db.insert(fixtureChangeLog).values({
    tournamentId: input.tournamentId,
    stageId: input.stageId,
    fixtureVersionId: version.id,
    action: "fixture_auto_generated_swiss_round",
    payload: JSON.stringify({
      createdMatchCount: created.createdMatchIds.length,
    }),
  });

  return {
    fixtureVersionId: version.id,
    createdMatchCount: created.createdMatchIds.length,
  };
}

function createStandingSeedMap(
  entries: (typeof tournamentStageTeamEntries.$inferSelect)[]
) {
  const seedMap = new Map<number, number>();
  for (const entry of entries) {
    seedMap.set(entry.teamId, entry.seed ?? 9999);
  }
  return seedMap;
}

function initStanding(teamId: number): TeamStandingAccum {
  return {
    teamId,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesTied: 0,
    matchesDrawn: 0,
    matchesAbandoned: 0,
    points: 0,
    runsScored: 0,
    runsConceded: 0,
    ballsFaced: 0,
    ballsBowled: 0,
    recentForm: [],
  };
}

function classifyOutcomeForTeam(
  match: typeof matches.$inferSelect,
  teamId: number
): "A" | "D" | "L" | "T" | "W" {
  if (match.isAbandoned) {
    return "A";
  }
  if (match.isTied) {
    return "T";
  }
  if (
    typeof match.result === "string" &&
    match.result.toLowerCase().includes("draw")
  ) {
    return "D";
  }
  if (typeof match.winnerId === "number") {
    return match.winnerId === teamId ? "W" : "L";
  }
  return "A";
}

function applyOutcome(
  standing: TeamStandingAccum,
  outcome: "A" | "D" | "L" | "T" | "W",
  pointsConfig: StagePointsConfig
) {
  standing.matchesPlayed += 1;
  if (outcome === "W") {
    standing.matchesWon += 1;
    standing.points += pointsConfig.winPoints;
  } else if (outcome === "L") {
    standing.matchesLost += 1;
  } else if (outcome === "T") {
    standing.matchesTied += 1;
    standing.points += pointsConfig.tiePoints;
  } else if (outcome === "D") {
    standing.matchesDrawn += 1;
    standing.points += pointsConfig.drawPoints;
  } else {
    standing.matchesAbandoned += 1;
    standing.points += pointsConfig.abandonedPoints;
  }

  if (standing.recentForm.length < 5) {
    standing.recentForm.push(outcome);
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: standings compute pipeline intentionally keeps filters, outcome accumulation, and tie-break application explicit.
export async function getTournamentStandings(input: TournamentStandingsInput) {
  await requireTournament(input.tournamentId);
  const includeDraft = input.includeDraft ?? false;

  let seedEntries: (typeof tournamentStageTeamEntries.$inferSelect)[] = [];
  if (typeof input.stageId === "number") {
    const entryFilters = [
      eq(tournamentStageTeamEntries.stageId, input.stageId),
    ];
    if (typeof input.stageGroupId === "number") {
      entryFilters.push(
        eq(tournamentStageTeamEntries.stageGroupId, input.stageGroupId)
      );
    }
    seedEntries = await db
      .select()
      .from(tournamentStageTeamEntries)
      .where(and(...entryFilters));
  } else {
    const registeredTeams = await db.query.tournamentTeams.findMany({
      where: {
        tournamentId: input.tournamentId,
      },
    });
    seedEntries = registeredTeams.map((entry, index) => ({
      id: entry.id ?? index + 1,
      tournamentId: entry.tournamentId,
      stageId: 0,
      stageGroupId: null,
      teamId: entry.teamId,
      seed: index + 1,
      entrySource: "direct",
      isQualified: false,
      isEliminated: false,
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate(),
    }));
  }

  const teamIds = Array.from(new Set(seedEntries.map((entry) => entry.teamId)));
  if (teamIds.length === 0) {
    return {
      rows: [],
      matchCount: 0,
      stageId: input.stageId ?? null,
      stageGroupId: input.stageGroupId ?? null,
    };
  }

  const matchFilters = [eq(matches.tournamentId, input.tournamentId)];
  if (typeof input.stageId === "number") {
    matchFilters.push(eq(matches.stageId, input.stageId));
  }
  if (typeof input.stageGroupId === "number") {
    matchFilters.push(eq(matches.stageGroupId, input.stageGroupId));
  }
  if (!includeDraft) {
    matchFilters.push(eq(matches.fixtureStatus, "published"));
  }

  const relevantMatches = await db
    .select()
    .from(matches)
    .where(and(...matchFilters));

  const finalizedMatches = relevantMatches.filter(
    (match) =>
      match.isCompleted ||
      match.isAbandoned ||
      match.isTied ||
      typeof match.winnerId === "number" ||
      (typeof match.result === "string" && match.result.trim().length > 0)
  );

  const inningsRows =
    finalizedMatches.length > 0
      ? await db
          .select()
          .from(innings)
          .where(
            inArray(
              innings.matchId,
              finalizedMatches.map((match) => match.id)
            )
          )
      : [];

  const teamsByIdRows = await db
    .select({
      id: teams.id,
      name: teams.name,
      shortName: teams.shortName,
    })
    .from(teams)
    .where(inArray(teams.id, teamIds));
  const teamsById = new Map(teamsByIdRows.map((team) => [team.id, team]));
  const seedMap = createStandingSeedMap(seedEntries);
  const standingsMap = new Map<number, TeamStandingAccum>();
  for (const teamId of teamIds) {
    standingsMap.set(teamId, initStanding(teamId));
  }

  const stageIds = Array.from(
    new Set(
      finalizedMatches
        .map((match) => match.stageId)
        .filter((stageId): stageId is number => typeof stageId === "number")
    )
  );
  const stageRows =
    stageIds.length > 0
      ? await db
          .select({
            id: tournamentStages.id,
            metadata: tournamentStages.metadata,
          })
          .from(tournamentStages)
          .where(inArray(tournamentStages.id, stageIds))
      : [];
  const pointsConfigByStage = new Map(
    stageRows.map((stageRow) => [
      stageRow.id,
      parseStagePointsConfig(normalizeStageMetadataInput(stageRow.metadata)),
    ])
  );

  for (const match of finalizedMatches) {
    if (
      typeof match.team1Id !== "number" ||
      typeof match.team2Id !== "number"
    ) {
      continue;
    }
    if (!(standingsMap.has(match.team1Id) && standingsMap.has(match.team2Id))) {
      continue;
    }

    const stageConfig = (typeof match.stageId === "number"
      ? pointsConfigByStage.get(match.stageId)
      : undefined) ?? {
      winPoints: 2,
      tiePoints: 1,
      drawPoints: 1,
      abandonedPoints: 1,
      tieBreakerOrder: [...DEFAULT_TIE_BREAKER_ORDER],
    };
    const team1Standing = standingsMap.get(match.team1Id);
    const team2Standing = standingsMap.get(match.team2Id);
    if (!(team1Standing && team2Standing)) {
      continue;
    }

    applyOutcome(
      team1Standing,
      classifyOutcomeForTeam(match, match.team1Id),
      stageConfig
    );
    applyOutcome(
      team2Standing,
      classifyOutcomeForTeam(match, match.team2Id),
      stageConfig
    );
  }

  for (const inning of inningsRows) {
    const battingStanding = standingsMap.get(inning.battingTeamId);
    if (battingStanding) {
      battingStanding.runsScored += inning.totalScore;
      battingStanding.ballsFaced += inning.ballsBowled;
    }
    const bowlingStanding = standingsMap.get(inning.bowlingTeamId);
    if (bowlingStanding) {
      bowlingStanding.runsConceded += inning.totalScore;
      bowlingStanding.ballsBowled += inning.ballsBowled;
    }
  }

  const tieBreakerOrder =
    typeof input.stageId === "number"
      ? parseStagePointsConfig(
          normalizeStageMetadataInput(
            stageRows.find((stage) => stage.id === input.stageId)?.metadata ??
              null
          )
        ).tieBreakerOrder
      : [...DEFAULT_TIE_BREAKER_ORDER];

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ordered tie-break chain mirrors configurable business rules.
  const sorted = [...standingsMap.values()].sort((a, b) => {
    for (const tieBreaker of tieBreakerOrder) {
      if (tieBreaker === "points" && b.points !== a.points) {
        return b.points - a.points;
      }
      if (tieBreaker === "net_run_rate") {
        const nrrDiff = computeNetRunRate(b) - computeNetRunRate(a);
        if (Math.abs(nrrDiff) > 0.0001) {
          return nrrDiff;
        }
      }
      if (tieBreaker === "wins" && b.matchesWon !== a.matchesWon) {
        return b.matchesWon - a.matchesWon;
      }
      if (tieBreaker === "seed") {
        return (
          (seedMap.get(a.teamId) ?? 9999) - (seedMap.get(b.teamId) ?? 9999)
        );
      }
    }

    return (seedMap.get(a.teamId) ?? 9999) - (seedMap.get(b.teamId) ?? 9999);
  });

  const rows = sorted.map((standing, index) => ({
    rank: index + 1,
    teamId: standing.teamId,
    teamName:
      teamsById.get(standing.teamId)?.name ?? `Team #${standing.teamId}`,
    teamShortName:
      teamsById.get(standing.teamId)?.shortName ??
      `T${String(standing.teamId)}`,
    played: standing.matchesPlayed,
    won: standing.matchesWon,
    lost: standing.matchesLost,
    tied: standing.matchesTied,
    drawn: standing.matchesDrawn,
    abandoned: standing.matchesAbandoned,
    points: standing.points,
    netRunRate: computeNetRunRate(standing),
    recentForm: standing.recentForm,
    seed: seedMap.get(standing.teamId) ?? null,
  }));

  return {
    stageId: input.stageId ?? null,
    stageGroupId: input.stageGroupId ?? null,
    matchCount: finalizedMatches.length,
    rows,
  };
}
