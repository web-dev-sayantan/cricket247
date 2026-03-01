import { ORPCError, type RouterClient } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { players, teamPlayers, tournamentTeams, user } from "@/db/schema";
import { getBallsOfSameOver } from "@/services/ball.service";
import {
  CrudServiceError,
  matchFormatCrudService,
  organizationCrudService,
  playerCrudService,
  teamCrudService,
  tournamentCrudService,
  tournamentStageAdvancementCrudService,
  tournamentStageCrudService,
  tournamentStageGroupCrudService,
  tournamentStageTeamEntryCrudService,
  tournamentTeamCrudService,
} from "@/services/crud.service";
import {
  createFixtureDraft,
  createFixtureRound,
  FixtureWorkflowError,
  publishFixtureVersion,
  validateFixtureConflicts,
} from "@/services/fixture.service";
import {
  createMatchAction,
  getCompletedMatches,
  getLiveMatches,
  getMatchById,
  getMatchScorecard,
} from "@/services/match.service";
import {
  createOwnPlayerProfileByEmail,
  getAllPlayers,
  getOnboardingStatusByEmail,
  getPlayersWithCurrentTeams,
  listClaimablePlayers,
  markOnboardingSeenByEmail,
  sendClaimOtpByEmail,
  verifyClaimOtpAndLinkByEmail,
} from "@/services/player.service";
import {
  getSavedMatchLineup,
  replaceMatchLineupForMatch,
  setMatchLiveStatus,
} from "@/services/scoring.service";
import {
  getAllTeams,
  getTeamById,
  getTeamsByName,
  getTeamTournaments,
  getTournamentTeamRoster,
  reassignPlayerInTournament,
  registerPlayerForTournamentTeam,
  TeamPlayerRegistrationError,
  TeamRosterManagementError,
  unassignPlayerFromTournamentTeam,
} from "@/services/team.service";
import {
  getTeamStatsById,
  getTeamTournamentStats,
  listTeamStats,
} from "@/services/team-stats.service";
import {
  getAllTournaments,
  getLiveTournaments,
  getTournamentStructure,
} from "@/services/tournament.service";
import {
  createTournamentFromScratch,
  TournamentCreateServiceError,
  updateTournamentFromScratch,
} from "@/services/tournament-create.service";
import {
  autoGenerateFixtures,
  autoGenerateNextSwissRound,
  createDraftFixtureMatch,
  deleteDraftFixtureMatch,
  getTournamentFixtures,
  getTournamentStandings,
  getTournamentView,
  publishFixtureMatches,
  setStagePointsConfig,
  TournamentFixtureBuilderError,
  updateDraftFixtureMatch,
} from "@/services/tournament-fixture-builder.service";
import {
  SeedTournamentTemplateError,
  seedTournamentTemplate,
} from "@/services/tournament-template.service";
import {
  protectedProcedure,
  publicProcedure,
  sensitiveProcedure,
} from "../lib/orpc";
import {
  bulkImportPlayersBodySchema,
  claimPlayerOtpRequestSchema,
  claimPlayerVerifySchema,
  createMatchFormatBodySchema,
  createOrganizationBodySchema,
  createOwnPlayerBodySchema,
  createPlayerBodySchema,
  createTeamBodySchema,
  createTournamentBodySchema,
  createTournamentStageAdvancementBodySchema,
  createTournamentStageBodySchema,
  createTournamentStageGroupBodySchema,
  createTournamentStageTeamEntryBodySchema,
  createTournamentTeamBodySchema,
  listClaimablePlayersQuerySchema,
  updateTournamentBodySchema,
  updateTournamentStageAdvancementBodySchema,
  updateTournamentStageBodySchema,
  updateTournamentStageGroupBodySchema,
  updateTournamentStageTeamEntryBodySchema,
  updateTournamentTeamBodySchema,
} from "../schemas/crud.schemas";
import {
  createTournamentFromScratchInputSchema,
  updateTournamentFromScratchInputSchema,
} from "../schemas/tournament-create.schemas";
import { calculateAgeFromDob } from "../utils";

// Match creation schema matching the frontend MatchFormSchema
const CreateMatchInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  matchDate: z.coerce.date(),
  tossWinnerId: z.number(),
  tossDecision: z.string(),
  team1Id: z.number(),
  team2Id: z.number(),
  matchFormatId: z.number().int().positive().optional(),
  oversPerSide: z.number().min(1),
  maxOverPerBowler: z.number().min(1),
  winnerId: z.number().optional(),
  result: z.string().optional(),
  hasLBW: z.boolean().optional(),
  hasBye: z.boolean().optional(),
  hasLegBye: z.boolean().optional(),
  hasBoundaryOut: z.boolean().optional(),
  hasSuperOver: z.boolean().optional(),
  venueId: z.number().optional(),
  format: z.string().optional(),
  notes: z.string().optional(),
  ranked: z.boolean().optional(),
  isLive: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isAbandoned: z.boolean().optional(),
  isTied: z.boolean().optional(),
  margin: z.string().optional(),
  playerOfTheMatchId: z.number().optional(),
  stageId: z.number().int().positive().optional(),
  stageGroupId: z.number().int().positive().optional(),
  stageRound: z.number().int().positive().optional(),
  stageSequence: z.number().int().positive().optional(),
  knockoutLeg: z.number().int().positive().optional(),
});

const RegisterTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  isCaptain: z.boolean().optional(),
  isViceCaptain: z.boolean().optional(),
});

const TeamTournamentsInputSchema = z.object({
  teamId: z.number().int().positive(),
});

const TournamentTeamRosterInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
});

const UnassignTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
});

const ReassignTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  toTeamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  confirmReassign: z.boolean(),
  expectedFromTeamId: z.number().int().positive().optional(),
});

const TeamTournamentStatsInputSchema = z.object({
  teamId: z.number().int().positive(),
  tournamentId: z.number().int().positive(),
});

const TournamentStructureInputSchema = z.object({
  tournamentId: z.number().int().positive(),
});

const SeedTournamentTemplateInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  template: z.enum([
    "straight_league",
    "grouped_league_with_playoffs",
    "straight_knockout",
  ]),
  teamIds: z.array(z.number().int().positive()).min(2).optional(),
  resetExisting: z.boolean().optional(),
  groupCount: z.number().int().min(1).max(8).optional(),
  advancingPerGroup: z.number().int().min(1).max(8).optional(),
});

const FixtureMetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

const CreateFixtureDraftInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive().optional(),
  label: z.string().trim().max(120).optional(),
  includeCurrentMatches: z.boolean().optional(),
  metadata: FixtureMetadataSchema,
});

const CreateFixtureRoundInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  stageGroupId: z.number().int().positive().optional(),
  fixtureVersionId: z.number().int().positive().optional(),
  roundNumber: z.number().int().positive(),
  roundName: z.string().trim().max(120).optional(),
  pairingMethod: z.string().trim().min(1).max(50).optional(),
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  lockAt: z.coerce.date().optional(),
  publishedAt: z.coerce.date().optional(),
  metadata: FixtureMetadataSchema,
});

const PublishFixtureVersionInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  fixtureVersionId: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

const ValidateFixtureConflictsInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive().optional(),
  teamIds: z.array(z.number().int().positive()).min(1).max(2),
  venueId: z.number().int().positive().optional(),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.coerce.date().optional(),
  excludeMatchId: z.number().int().positive().optional(),
});

const TournamentFixturesInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive().optional(),
  includeDraft: z.boolean().optional(),
  status: z.enum(["all", "live", "upcoming", "past"]).optional(),
});

const MatchScoringSetupInputSchema = z.object({
  matchId: z.number().int().positive(),
});

const StartMatchScoringInputSchema = MatchScoringSetupInputSchema;

const MatchTeamLineupInputSchema = z.object({
  playerIds: z.array(z.number().int().positive()).min(1),
  captainPlayerId: z.number().int().positive().optional(),
  viceCaptainPlayerId: z.number().int().positive().optional(),
  wicketKeeperPlayerId: z.number().int().positive().optional(),
});

const SaveMatchLineupInputSchema = z.object({
  matchId: z.number().int().positive(),
  team1: MatchTeamLineupInputSchema,
  team2: MatchTeamLineupInputSchema,
});

const TournamentStandingsInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive().optional(),
  stageGroupId: z.number().int().positive().optional(),
  includeDraft: z.boolean().optional(),
});

const StagePointsConfigSchema = z.object({
  winPoints: z.number().min(0),
  tiePoints: z.number().min(0),
  drawPoints: z.number().min(0),
  abandonedPoints: z.number().min(0),
  tieBreakerOrder: z
    .array(z.enum(["points", "net_run_rate", "wins", "head_to_head", "seed"]))
    .min(1),
});

const SetStagePointsConfigInputSchema = z.object({
  stageId: z.number().int().positive(),
  config: StagePointsConfigSchema,
});

const DraftParticipantSourceInputSchema = z.object({
  teamSlot: z.union([z.literal(1), z.literal(2)]),
  sourceType: z.enum(["team", "match", "position"]),
  sourceTeamId: z.number().int().positive().optional(),
  sourceMatchId: z.number().int().positive().optional(),
  sourceStageId: z.number().int().positive().optional(),
  sourceStageGroupId: z.number().int().positive().optional(),
  sourcePosition: z.number().int().positive().optional(),
});

const CreateDraftFixtureMatchInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  stageGroupId: z.number().int().positive().optional(),
  fixtureRoundId: z.number().int().positive().optional(),
  participantMode: z.enum(["concrete", "source"]),
  team1Id: z.number().int().positive().optional(),
  team2Id: z.number().int().positive().optional(),
  participantSources: z.array(DraftParticipantSourceInputSchema).optional(),
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  venueId: z.number().int().positive().optional(),
  notes: z.string().trim().max(500).optional(),
});

const UpdateDraftFixtureMatchInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  matchId: z.number().int().positive(),
  participantMode: z.enum(["concrete", "source"]).optional(),
  team1Id: z.number().int().positive().optional(),
  team2Id: z.number().int().positive().optional(),
  participantSources: z.array(DraftParticipantSourceInputSchema).optional(),
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  venueId: z.number().int().positive().optional(),
  notes: z.string().trim().max(500).optional(),
});

const DeleteDraftFixtureMatchInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  matchId: z.number().int().positive(),
});

const PublishFixtureMatchesInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  matchIds: z.array(z.number().int().positive()).min(1),
  note: z.string().trim().max(500).optional(),
});

const AutoGenerateFixturesInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  scope: z.literal("stage"),
  stageId: z.number().int().positive(),
  stageGroupId: z.number().int().positive().optional(),
  assignSchedule: z.literal(true),
  venueIds: z.array(z.number().int().positive()).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  timeZone: z.string().trim().min(1).max(80).optional(),
  respectExistingDrafts: z.boolean().optional(),
  overwriteDrafts: z.boolean().optional(),
});

const AutoGenerateNextSwissRoundInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  stageId: z.number().int().positive(),
});

const UpdateTournamentStageInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentStageBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTournamentStageGroupInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentStageGroupBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdatePlayerInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createPlayerBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTeamInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createTeamBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTournamentInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTournamentTeamInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentTeamBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTournamentStageTeamEntryInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentStageTeamEntryBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

const UpdateTournamentStageAdvancementInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: updateTournamentStageAdvancementBodySchema,
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

async function getUserRoleByEmail(email: string) {
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return rows[0]?.role ?? null;
}

async function getUserSummaryByEmail(email: string) {
  const rows = await db
    .select({
      id: user.id,
      role: user.role,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return rows[0] ?? null;
}

async function getLinkedPlayerIdByUserId(userId: number) {
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.userId, userId))
    .limit(1);

  return rows[0]?.id ?? null;
}

interface TournamentScoringPermissionContext {
  canScoreAnyMatch: boolean;
  eligibleTeamIds: Set<number>;
}

async function getTournamentScoringPermissionContext(params: {
  email?: string;
  tournamentId: number;
}): Promise<TournamentScoringPermissionContext> {
  if (!params.email) {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const userRecord = await getUserSummaryByEmail(params.email);
  if (!userRecord) {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  if (userRecord.role === "admin") {
    return {
      canScoreAnyMatch: true,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const linkedPlayerId = await getLinkedPlayerIdByUserId(userRecord.id);
  if (typeof linkedPlayerId !== "number") {
    return {
      canScoreAnyMatch: false,
      eligibleTeamIds: new Set<number>(),
    };
  }

  const rows = await db
    .select({ teamId: teamPlayers.teamId })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, params.tournamentId),
        eq(teamPlayers.playerId, linkedPlayerId)
      )
    );

  return {
    canScoreAnyMatch: false,
    eligibleTeamIds: new Set(rows.map((row) => row.teamId)),
  };
}

function canCurrentUserScoreFixtureMatch(
  match: {
    team1Id: null | number;
    team2Id: null | number;
  },
  scoringPermission: TournamentScoringPermissionContext
) {
  if (typeof match.team1Id !== "number" || typeof match.team2Id !== "number") {
    return false;
  }

  if (scoringPermission.canScoreAnyMatch) {
    return true;
  }

  return (
    scoringPermission.eligibleTeamIds.has(match.team1Id) ||
    scoringPermission.eligibleTeamIds.has(match.team2Id)
  );
}

async function canUserScoreMatchByEmail(params: {
  email?: string;
  match: {
    team1Id: null | number;
    team2Id: null | number;
    tournamentId: number;
  };
}) {
  if (!params.email) {
    return false;
  }

  const userRecord = await getUserSummaryByEmail(params.email);
  if (!userRecord) {
    return false;
  }

  if (
    typeof params.match.team1Id !== "number" ||
    typeof params.match.team2Id !== "number"
  ) {
    return false;
  }

  if (userRecord.role === "admin") {
    return true;
  }

  const linkedPlayerId = await getLinkedPlayerIdByUserId(userRecord.id);
  if (typeof linkedPlayerId !== "number") {
    return false;
  }

  const rows = await db
    .select({ id: teamPlayers.id })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, params.match.tournamentId),
        eq(teamPlayers.playerId, linkedPlayerId),
        inArray(teamPlayers.teamId, [
          params.match.team1Id,
          params.match.team2Id,
        ])
      )
    )
    .limit(1);

  return rows.length > 0;
}

async function requireScoreAccessByEmail(params: {
  email: string;
  match: {
    team1Id: null | number;
    team2Id: null | number;
    tournamentId: number;
  };
}) {
  const canScore = await canUserScoreMatchByEmail(params);
  if (!canScore) {
    throw new ORPCError("FORBIDDEN");
  }
}

function hasUniquePlayerIds(playerIds: number[]) {
  return new Set(playerIds).size === playerIds.length;
}

function ensureOptionalSelectionBelongsToTeam(
  playerIds: number[],
  selectedPlayerId: number | undefined
) {
  if (typeof selectedPlayerId !== "number") {
    return;
  }

  if (!playerIds.includes(selectedPlayerId)) {
    throw new ORPCError("BAD_REQUEST");
  }
}

async function requireAdminByEmail(email: string) {
  const role = await getUserRoleByEmail(email);
  if (role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
}

function getPlayerDuplicateKey(params: { name: string; dob: Date }) {
  const normalizedName = params.name.trim().toLowerCase();
  return `${normalizedName}|${params.dob.toISOString()}`;
}

function buildSavedTeamLineup(
  rows: Awaited<ReturnType<typeof getSavedMatchLineup>>,
  teamId: number
) {
  const teamRows = rows.filter((row) => row.teamId === teamId);

  return {
    playerIds: teamRows.map((row) => row.playerId),
    captainPlayerId: teamRows.find((row) => row.isCaptain)?.playerId,
    viceCaptainPlayerId: teamRows.find((row) => row.isViceCaptain)?.playerId,
    wicketKeeperPlayerId: teamRows.find((row) => row.isWicketKeeper)?.playerId,
  };
}

function mapTournamentCrudServiceError(error: unknown) {
  if (
    error instanceof CrudServiceError &&
    (error.code === "TOURNAMENT_ORGANIZATION_REQUIRED" ||
      error.code === "SYSTEM_ORGANIZATION_NOT_FOUND")
  ) {
    return new ORPCError("BAD_REQUEST");
  }

  return new ORPCError("INTERNAL_SERVER_ERROR");
}

function mapTournamentCreateServiceError(error: unknown) {
  if (!(error instanceof TournamentCreateServiceError)) {
    return new ORPCError("INTERNAL_SERVER_ERROR");
  }

  switch (error.code) {
    case "TOURNAMENT_NOT_FOUND":
      return new ORPCError("NOT_FOUND");
    case "DATE_RANGE_INVALID":
    case "DUPLICATE_TEAM_IDS":
    case "MATCH_FORMAT_NOT_FOUND":
    case "ORGANIZATION_NOT_FOUND":
    case "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE":
    case "GROUP_EDIT_TARGET_NOT_FOUND":
    case "INVALID_TEMPLATE_CONFIGURATION":
    case "STAGE_EDIT_TARGET_NOT_FOUND":
    case "STRUCTURE_LOCKED":
    case "TEAM_MEMBERSHIP_LOCKED_AFTER_START":
    case "TEAM_REMOVAL_BLOCKED_BY_ASSIGNMENTS":
    case "TEAM_REMOVAL_BLOCKED_BY_MATCH_REFERENCES":
    case "TEAM_COUNT_TOO_LOW":
    case "UNSUPPORTED_EXISTING_STRUCTURE":
      return new ORPCError("BAD_REQUEST");
    default:
      return new ORPCError("INTERNAL_SERVER_ERROR");
  }
}

function mapFixtureWorkflowError(error: unknown) {
  if (!(error instanceof FixtureWorkflowError)) {
    return new ORPCError("INTERNAL_SERVER_ERROR");
  }

  switch (error.code) {
    case "TOURNAMENT_NOT_FOUND":
    case "STAGE_NOT_FOUND":
    case "FIXTURE_VERSION_NOT_FOUND":
      return new ORPCError("NOT_FOUND");
    case "INVALID_SCHEDULE_WINDOW":
    case "FIXTURE_VERSION_NOT_DRAFT":
    case "FIXTURE_VERSION_EMPTY":
    case "FIXTURE_VERSION_TOURNAMENT_MISMATCH":
    case "ROUND_ALREADY_EXISTS":
      return new ORPCError("BAD_REQUEST");
    default:
      return new ORPCError("INTERNAL_SERVER_ERROR");
  }
}

function mapTournamentFixtureBuilderError(error: unknown) {
  if (!(error instanceof TournamentFixtureBuilderError)) {
    return new ORPCError("INTERNAL_SERVER_ERROR");
  }

  switch (error.code) {
    case "TOURNAMENT_NOT_FOUND":
    case "STAGE_NOT_FOUND":
    case "FIXTURE_MATCH_NOT_FOUND":
      return new ORPCError("NOT_FOUND", {
        message: error.code,
      });
    case "FIXTURE_MATCH_NOT_DRAFT":
    case "INVALID_PARTICIPANT_MODE":
    case "INVALID_PARTICIPANT_SOURCES":
    case "INVALID_STAGE_GROUP":
    case "INVALID_TEAM_SELECTION":
    case "NO_FIXTURE_MATCHES_TO_PUBLISH":
    case "NO_VENUES_AVAILABLE":
    case "INSUFFICIENT_TEAMS":
    case "SWISS_ROUND_NOT_READY":
    case "INVALID_POINTS_CONFIG":
      return new ORPCError("BAD_REQUEST", {
        message: error.code,
      });
    default:
      return new ORPCError("INTERNAL_SERVER_ERROR");
  }
}

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  liveMatches: publicProcedure.handler(() => getLiveMatches()),
  currentUserRole: protectedProcedure.handler(async ({ context }) =>
    getUserRoleByEmail(context.session.user.email)
  ),
  organizations: publicProcedure.handler(() => organizationCrudService.list()),
  matchFormats: publicProcedure.handler(() => matchFormatCrudService.list()),
  liveTournaments: publicProcedure.handler(() => getLiveTournaments()),
  tournaments: publicProcedure.handler(() => getAllTournaments()),
  managementTournaments: publicProcedure.handler(() =>
    tournamentCrudService.list()
  ),
  managementTournamentById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const tournament = await tournamentCrudService.getById(input);
      if (!tournament) {
        throw new ORPCError("NOT_FOUND");
      }

      return tournament;
    }),
  createTournament: sensitiveProcedure
    .input(createTournamentBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        const tournament = await tournamentCrudService.create(input);
        if (!tournament) {
          throw new ORPCError("INTERNAL_SERVER_ERROR");
        }

        return tournament;
      } catch (error) {
        throw mapTournamentCrudServiceError(error);
      }
    }),
  createTournamentFromScratch: sensitiveProcedure
    .input(createTournamentFromScratchInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await createTournamentFromScratch(input);
      } catch (error) {
        throw mapTournamentCreateServiceError(error);
      }
    }),
  updateTournamentFromScratch: sensitiveProcedure
    .input(updateTournamentFromScratchInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await updateTournamentFromScratch(input);
      } catch (error) {
        throw mapTournamentCreateServiceError(error);
      }
    }),
  updateTournament: sensitiveProcedure
    .input(UpdateTournamentInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        const tournament = await tournamentCrudService.update(
          input.id,
          input.data
        );
        if (!tournament) {
          throw new ORPCError("NOT_FOUND");
        }

        return tournament;
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw mapTournamentCrudServiceError(error);
      }
    }),
  deleteTournament: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        const deleted = await tournamentCrudService.remove(input);
        if (!deleted) {
          throw new ORPCError("NOT_FOUND");
        }

        return { id: input };
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        throw mapTournamentCrudServiceError(error);
      }
    }),
  createOrganization: sensitiveProcedure
    .input(createOrganizationBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        const organization = await organizationCrudService.create(input);
        if (!organization) {
          throw new ORPCError("INTERNAL_SERVER_ERROR");
        }

        return organization;
      } catch (error) {
        if (
          error instanceof CrudServiceError &&
          (error.code === "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE" ||
            error.code === "ORGANIZATION_SYSTEM_IDENTITY_IMMUTABLE" ||
            error.code === "ORGANIZATION_DEACTIVATE_SYSTEM_FORBIDDEN" ||
            error.code === "ORGANIZATION_DELETE_SYSTEM_FORBIDDEN")
        ) {
          throw new ORPCError("BAD_REQUEST");
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  createMatchFormat: sensitiveProcedure
    .input(createMatchFormatBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const format = await matchFormatCrudService.create(input);
      if (!format) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return format;
    }),
  tournamentTeams: publicProcedure.handler(() =>
    tournamentTeamCrudService.list()
  ),
  tournamentTeamById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const tournamentTeam = await tournamentTeamCrudService.getById(input);
      if (!tournamentTeam) {
        throw new ORPCError("NOT_FOUND");
      }

      return tournamentTeam;
    }),
  createTournamentTeam: sensitiveProcedure
    .input(createTournamentTeamBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const tournamentTeam = await tournamentTeamCrudService.create(input);
      if (!tournamentTeam) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return tournamentTeam;
    }),
  updateTournamentTeam: sensitiveProcedure
    .input(UpdateTournamentTeamInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const tournamentTeam = await tournamentTeamCrudService.update(
        input.id,
        input.data
      );
      if (!tournamentTeam) {
        throw new ORPCError("NOT_FOUND");
      }

      return tournamentTeam;
    }),
  deleteTournamentTeam: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await tournamentTeamCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  tournamentStages: publicProcedure.handler(() =>
    tournamentStageCrudService.list()
  ),
  tournamentStageById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const stage = await tournamentStageCrudService.getById(input);
      if (!stage) {
        throw new ORPCError("NOT_FOUND");
      }

      return stage;
    }),
  tournamentStageGroups: publicProcedure.handler(() =>
    tournamentStageGroupCrudService.list()
  ),
  tournamentStageGroupById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const group = await tournamentStageGroupCrudService.getById(input);
      if (!group) {
        throw new ORPCError("NOT_FOUND");
      }

      return group;
    }),
  tournamentStageTeamEntries: publicProcedure.handler(() =>
    tournamentStageTeamEntryCrudService.list()
  ),
  tournamentStageTeamEntryById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const stageTeamEntry =
        await tournamentStageTeamEntryCrudService.getById(input);
      if (!stageTeamEntry) {
        throw new ORPCError("NOT_FOUND");
      }

      return stageTeamEntry;
    }),
  createTournamentStageTeamEntry: sensitiveProcedure
    .input(createTournamentStageTeamEntryBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stageTeamEntry =
        await tournamentStageTeamEntryCrudService.create(input);
      if (!stageTeamEntry) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return stageTeamEntry;
    }),
  updateTournamentStageTeamEntry: sensitiveProcedure
    .input(UpdateTournamentStageTeamEntryInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stageTeamEntry = await tournamentStageTeamEntryCrudService.update(
        input.id,
        input.data
      );
      if (!stageTeamEntry) {
        throw new ORPCError("NOT_FOUND");
      }

      return stageTeamEntry;
    }),
  deleteTournamentStageTeamEntry: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await tournamentStageTeamEntryCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  tournamentStageAdvancements: publicProcedure.handler(() =>
    tournamentStageAdvancementCrudService.list()
  ),
  tournamentStageAdvancementById: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const stageAdvancement =
        await tournamentStageAdvancementCrudService.getById(input);
      if (!stageAdvancement) {
        throw new ORPCError("NOT_FOUND");
      }

      return stageAdvancement;
    }),
  createTournamentStageAdvancement: sensitiveProcedure
    .input(createTournamentStageAdvancementBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stageAdvancement =
        await tournamentStageAdvancementCrudService.create(input);
      if (!stageAdvancement) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return stageAdvancement;
    }),
  updateTournamentStageAdvancement: sensitiveProcedure
    .input(UpdateTournamentStageAdvancementInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stageAdvancement =
        await tournamentStageAdvancementCrudService.update(
          input.id,
          input.data
        );
      if (!stageAdvancement) {
        throw new ORPCError("NOT_FOUND");
      }

      return stageAdvancement;
    }),
  deleteTournamentStageAdvancement: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await tournamentStageAdvancementCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  tournamentStructure: publicProcedure
    .input(TournamentStructureInputSchema)
    .handler(({ input }) => getTournamentStructure(input.tournamentId)),
  tournamentView: publicProcedure
    .input(z.object({ tournamentId: z.number().int().positive() }))
    .handler(async ({ input }) => {
      try {
        return await getTournamentView({
          tournamentId: input.tournamentId,
        });
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  tournamentFixtures: publicProcedure
    .input(TournamentFixturesInputSchema)
    .handler(async ({ context, input }) => {
      if (input.includeDraft) {
        const email = context.session?.user.email;
        if (!email) {
          throw new ORPCError("UNAUTHORIZED");
        }
        await requireAdminByEmail(email);
      }

      try {
        const fixtures = await getTournamentFixtures(input);
        const scoringPermission = await getTournamentScoringPermissionContext({
          email: context.session?.user.email,
          tournamentId: input.tournamentId,
        });

        return fixtures.map((match) => ({
          ...match,
          canCurrentUserScore: canCurrentUserScoreFixtureMatch(
            match,
            scoringPermission
          ),
        }));
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  tournamentStandings: publicProcedure
    .input(TournamentStandingsInputSchema)
    .handler(async ({ context, input }) => {
      if (input.includeDraft) {
        const email = context.session?.user.email;
        if (!email) {
          throw new ORPCError("UNAUTHORIZED");
        }
        await requireAdminByEmail(email);
      }

      try {
        return await getTournamentStandings(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  setStagePointsConfig: sensitiveProcedure
    .input(SetStagePointsConfigInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await setStagePointsConfig(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  createDraftFixtureMatch: sensitiveProcedure
    .input(CreateDraftFixtureMatchInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await createDraftFixtureMatch(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  updateDraftFixtureMatch: sensitiveProcedure
    .input(UpdateDraftFixtureMatchInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await updateDraftFixtureMatch(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  deleteDraftFixtureMatch: sensitiveProcedure
    .input(DeleteDraftFixtureMatchInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await deleteDraftFixtureMatch(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  autoGenerateFixtures: sensitiveProcedure
    .input(AutoGenerateFixturesInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await autoGenerateFixtures(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  autoGenerateNextSwissRound: sensitiveProcedure
    .input(AutoGenerateNextSwissRoundInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await autoGenerateNextSwissRound(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  publishFixtureMatches: sensitiveProcedure
    .input(PublishFixtureMatchesInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);
      try {
        return await publishFixtureMatches(input);
      } catch (error) {
        throw mapTournamentFixtureBuilderError(error);
      }
    }),
  seedTournamentTemplate: sensitiveProcedure
    .input(SeedTournamentTemplateInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await seedTournamentTemplate(input);
      } catch (error) {
        if (error instanceof SeedTournamentTemplateError) {
          if (error.code === "TOURNAMENT_NOT_FOUND") {
            throw new ORPCError("NOT_FOUND");
          }

          throw new ORPCError("BAD_REQUEST");
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  createFixtureDraft: sensitiveProcedure
    .input(CreateFixtureDraftInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await createFixtureDraft(input);
      } catch (error) {
        throw mapFixtureWorkflowError(error);
      }
    }),
  createFixtureRound: sensitiveProcedure
    .input(CreateFixtureRoundInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await createFixtureRound(input);
      } catch (error) {
        throw mapFixtureWorkflowError(error);
      }
    }),
  publishFixtureVersion: sensitiveProcedure
    .input(PublishFixtureVersionInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await publishFixtureVersion(input);
      } catch (error) {
        throw mapFixtureWorkflowError(error);
      }
    }),
  validateFixtureConflicts: sensitiveProcedure
    .input(ValidateFixtureConflictsInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await validateFixtureConflicts(input);
      } catch (error) {
        throw mapFixtureWorkflowError(error);
      }
    }),
  completedMatches: publicProcedure.handler(() => getCompletedMatches()),
  players: publicProcedure.handler(() => getAllPlayers()),
  playersWithCurrentTeams: publicProcedure.handler(() =>
    getPlayersWithCurrentTeams()
  ),
  onboardingStatus: protectedProcedure.handler(async ({ context }) =>
    getOnboardingStatusByEmail(context.session.user.email)
  ),
  markOnboardingSeen: protectedProcedure.handler(async ({ context }) =>
    markOnboardingSeenByEmail(context.session.user.email)
  ),
  createOwnPlayerProfile: protectedProcedure
    .input(createOwnPlayerBodySchema)
    .handler(async ({ context, input }) =>
      createOwnPlayerProfileByEmail(context.session.user.email, input)
    ),
  claimablePlayers: protectedProcedure
    .input(listClaimablePlayersQuerySchema.optional())
    .handler(({ input }) => listClaimablePlayers(input?.query)),
  sendClaimOtp: protectedProcedure
    .input(claimPlayerOtpRequestSchema)
    .handler(({ context, input }) =>
      sendClaimOtpByEmail(context.session.user.email, input.playerId)
    ),
  verifyClaimOtpAndLink: protectedProcedure
    .input(claimPlayerVerifySchema)
    .handler(({ context, input }) =>
      verifyClaimOtpAndLinkByEmail({
        email: context.session.user.email,
        otp: input.otp,
        playerId: input.playerId,
      })
    ),
  teams: publicProcedure.handler(() => getAllTeams()),
  searchTeamsByName: publicProcedure
    .input(z.string())
    .handler(({ input }) => getTeamsByName(input)),
  getTeamById: publicProcedure
    .input(z.number().int().positive())
    .handler(({ input }) => getTeamById(input)),
  teamTournaments: publicProcedure
    .input(TeamTournamentsInputSchema)
    .handler(({ input }) => getTeamTournaments(input.teamId)),
  getTournamentTeamRoster: sensitiveProcedure
    .input(TournamentTeamRosterInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await getTournamentTeamRoster(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (error.code === "TOURNAMENT_NOT_FOUND") {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  listTeamStats: publicProcedure.handler(() => listTeamStats()),
  getTeamStatsById: publicProcedure
    .input(z.number().int().positive())
    .handler(({ input }) => getTeamStatsById(input)),
  getTeamTournamentStats: publicProcedure
    .input(TeamTournamentStatsInputSchema)
    .handler(({ input }) =>
      getTeamTournamentStats(input.teamId, input.tournamentId)
    ),
  createPlayer: sensitiveProcedure
    .input(createPlayerBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.create(input);
      if (!player) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return player;
    }),
  bulkImportPlayers: sensitiveProcedure
    .input(bulkImportPlayersBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const existingPlayers = await db
        .select({
          name: players.name,
          dob: players.dob,
        })
        .from(players);

      const existingDuplicateKeys = new Set(
        existingPlayers.map((player) =>
          getPlayerDuplicateKey({
            name: player.name,
            dob: player.dob,
          })
        )
      );

      const batchDuplicateKeys = new Set<string>();
      const failedRows: Array<{ index: number; reason: string }> = [];
      let importedCount = 0;
      let skippedDuplicateCount = 0;

      for (const [index, row] of input.rows.entries()) {
        const duplicateKey = getPlayerDuplicateKey({
          name: row.name,
          dob: row.dob,
        });

        if (
          existingDuplicateKeys.has(duplicateKey) ||
          batchDuplicateKeys.has(duplicateKey)
        ) {
          skippedDuplicateCount += 1;
          continue;
        }

        const created = await playerCrudService.create({
          ...row,
          age: calculateAgeFromDob(row.dob),
        });

        if (!created) {
          failedRows.push({
            index,
            reason: "Failed to create player",
          });
          continue;
        }

        batchDuplicateKeys.add(duplicateKey);
        importedCount += 1;
      }

      return {
        importedCount,
        skippedDuplicateCount,
        failedRows,
      };
    }),
  createTeam: sensitiveProcedure
    .input(createTeamBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.create(input);
      if (!team) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return team;
    }),
  createMatch: sensitiveProcedure
    .input(CreateMatchInputSchema)
    .handler(async ({ input }) => {
      const registeredTeams = await db
        .select({ teamId: tournamentTeams.teamId })
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.tournamentId, input.tournamentId),
            inArray(tournamentTeams.teamId, [input.team1Id, input.team2Id])
          )
        );

      if (registeredTeams.length !== 2) {
        throw new ORPCError("BAD_REQUEST");
      }

      const result = await createMatchAction(input);
      return result;
    }),
  createTournamentStage: sensitiveProcedure
    .input(createTournamentStageBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stage = await tournamentStageCrudService.create(input);
      if (!stage) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return stage;
    }),
  updateTournamentStage: sensitiveProcedure
    .input(UpdateTournamentStageInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stage = await tournamentStageCrudService.update(
        input.id,
        input.data
      );
      if (!stage) {
        throw new ORPCError("NOT_FOUND");
      }

      return stage;
    }),
  deleteTournamentStage: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await tournamentStageCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  createTournamentStageGroup: sensitiveProcedure
    .input(createTournamentStageGroupBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const stageExists = await db.query.tournamentStages.findFirst({
        where: {
          id: input.stageId,
        },
      });

      if (!stageExists) {
        throw new ORPCError("BAD_REQUEST");
      }

      const group = await tournamentStageGroupCrudService.create(input);
      if (!group) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return group;
    }),
  updateTournamentStageGroup: sensitiveProcedure
    .input(UpdateTournamentStageGroupInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const group = await tournamentStageGroupCrudService.update(
        input.id,
        input.data
      );
      if (!group) {
        throw new ORPCError("NOT_FOUND");
      }

      return group;
    }),
  deleteTournamentStageGroup: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await tournamentStageGroupCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  stageGroupsByStage: publicProcedure
    .input(z.number().int().positive())
    .handler(({ input }) =>
      db.query.tournamentStageGroups.findMany({
        where: {
          stageId: input,
        },
        orderBy: {
          sequence: "asc",
        },
      })
    ),
  registerTournamentTeamPlayer: sensitiveProcedure
    .input(RegisterTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await registerPlayerForTournamentTeam(input);
      } catch (error) {
        if (error instanceof TeamPlayerRegistrationError) {
          if (error.code === "PLAYER_ALREADY_REGISTERED_IN_TOURNAMENT") {
            throw new ORPCError("CONFLICT");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  unassignTournamentTeamPlayer: sensitiveProcedure
    .input(UnassignTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await unassignPlayerFromTournamentTeam(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (error.code === "ASSIGNMENT_NOT_FOUND") {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  reassignTournamentTeamPlayer: sensitiveProcedure
    .input(ReassignTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await reassignPlayerInTournament(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (
            error.code === "PLAYER_NOT_REGISTERED_IN_TOURNAMENT" ||
            error.code === "TOURNAMENT_NOT_FOUND"
          ) {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "ASSIGNMENT_CHANGED") {
            throw new ORPCError("CONFLICT");
          }

          if (
            error.code === "TEAM_NOT_IN_TOURNAMENT" ||
            error.code === "REASSIGN_CONFIRMATION_REQUIRED" ||
            error.code === "REASSIGN_NOT_ALLOWED_AFTER_START"
          ) {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  getMatchById: publicProcedure.input(z.number()).handler(async ({ input }) => {
    return await getMatchById(input);
  }),
  getMatchScoringSetup: publicProcedure
    .input(MatchScoringSetupInputSchema)
    .handler(async ({ context, input }) => {
      const match = await getMatchById(input.matchId);
      if (!match) {
        return null;
      }

      const canCurrentUserScore = await canUserScoreMatchByEmail({
        email: context.session?.user.email,
        match: {
          tournamentId: match.tournamentId,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        },
      });

      const team1Id = match.team1Id;
      const team2Id = match.team2Id;

      const rosterRows =
        typeof team1Id === "number" && typeof team2Id === "number"
          ? await db
              .select({
                teamId: teamPlayers.teamId,
                playerId: players.id,
                name: players.name,
                role: players.role,
                isCaptain: teamPlayers.isCaptain,
                isViceCaptain: teamPlayers.isViceCaptain,
              })
              .from(teamPlayers)
              .innerJoin(players, eq(players.id, teamPlayers.playerId))
              .where(
                and(
                  eq(teamPlayers.tournamentId, match.tournamentId),
                  inArray(teamPlayers.teamId, [team1Id, team2Id])
                )
              )
          : [];

      const team1Roster = rosterRows
        .filter((row) => row.teamId === team1Id)
        .sort((a, b) => a.name.localeCompare(b.name));
      const team2Roster = rosterRows
        .filter((row) => row.teamId === team2Id)
        .sort((a, b) => a.name.localeCompare(b.name));

      const savedLineupRows = await getSavedMatchLineup(match.id);
      const emptySelection = { playerIds: [] as number[] };
      const savedLineup = {
        team1:
          typeof team1Id === "number"
            ? buildSavedTeamLineup(savedLineupRows, team1Id)
            : emptySelection,
        team2:
          typeof team2Id === "number"
            ? buildSavedTeamLineup(savedLineupRows, team2Id)
            : emptySelection,
      };

      return {
        match,
        canCurrentUserScore,
        playersPerSide: match.playersPerSide,
        team1Roster,
        team2Roster,
        savedLineup,
      };
    }),
  startMatchScoring: sensitiveProcedure
    .input(StartMatchScoringInputSchema)
    .handler(async ({ context, input }) => {
      const match = await db.query.matches.findFirst({
        where: {
          id: input.matchId,
        },
        columns: {
          id: true,
          tournamentId: true,
          team1Id: true,
          team2Id: true,
        },
      });

      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      await requireScoreAccessByEmail({
        email: context.session.user.email,
        match,
      });

      await setMatchLiveStatus({ matchId: match.id, isLive: true });

      return {
        matchId: match.id,
        isLive: true,
      };
    }),
  saveMatchLineup: sensitiveProcedure
    .input(SaveMatchLineupInputSchema)
    .handler(async ({ context, input }) => {
      const match = await db.query.matches.findFirst({
        where: {
          id: input.matchId,
        },
        columns: {
          id: true,
          tournamentId: true,
          team1Id: true,
          team2Id: true,
          playersPerSide: true,
        },
      });

      if (!match) {
        throw new ORPCError("NOT_FOUND");
      }

      if (
        typeof match.team1Id !== "number" ||
        typeof match.team2Id !== "number"
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      await requireScoreAccessByEmail({
        email: context.session.user.email,
        match,
      });

      if (
        input.team1.playerIds.length !== match.playersPerSide ||
        input.team2.playerIds.length !== match.playersPerSide
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      if (
        !(
          hasUniquePlayerIds(input.team1.playerIds) &&
          hasUniquePlayerIds(input.team2.playerIds)
        )
      ) {
        throw new ORPCError("BAD_REQUEST");
      }

      const overlappingPlayers = input.team1.playerIds.filter((playerId) =>
        input.team2.playerIds.includes(playerId)
      );
      if (overlappingPlayers.length > 0) {
        throw new ORPCError("BAD_REQUEST");
      }

      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.captainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.viceCaptainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team1.playerIds,
        input.team1.wicketKeeperPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.captainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.viceCaptainPlayerId
      );
      ensureOptionalSelectionBelongsToTeam(
        input.team2.playerIds,
        input.team2.wicketKeeperPlayerId
      );

      const selectedPlayerIds = [
        ...input.team1.playerIds,
        ...input.team2.playerIds,
      ];

      const rosterRows = await db
        .select({
          teamId: teamPlayers.teamId,
          playerId: teamPlayers.playerId,
        })
        .from(teamPlayers)
        .where(
          and(
            eq(teamPlayers.tournamentId, match.tournamentId),
            inArray(teamPlayers.teamId, [match.team1Id, match.team2Id]),
            inArray(teamPlayers.playerId, selectedPlayerIds)
          )
        );

      const team1RosterIds = new Set(
        rosterRows
          .filter((row) => row.teamId === match.team1Id)
          .map((row) => row.playerId)
      );
      const team2RosterIds = new Set(
        rosterRows
          .filter((row) => row.teamId === match.team2Id)
          .map((row) => row.playerId)
      );

      const isTeam1RosterValid = input.team1.playerIds.every((playerId) =>
        team1RosterIds.has(playerId)
      );
      const isTeam2RosterValid = input.team2.playerIds.every((playerId) =>
        team2RosterIds.has(playerId)
      );

      if (!(isTeam1RosterValid && isTeam2RosterValid)) {
        throw new ORPCError("BAD_REQUEST");
      }

      const savedLineupRows = await replaceMatchLineupForMatch({
        matchId: match.id,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1: input.team1,
        team2: input.team2,
      });

      return {
        matchId: match.id,
        savedLineup: {
          team1: buildSavedTeamLineup(savedLineupRows, match.team1Id),
          team2: buildSavedTeamLineup(savedLineupRows, match.team2Id),
        },
      };
    }),
  getMatchScorecard: publicProcedure
    .input(
      z.object({
        matchId: z.number(),
        inningsNumber: z.number().optional(),
        includeBallByBall: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      return await getMatchScorecard(input.matchId, {
        inningsNumber: input.inningsNumber,
        includeBallByBall: input.includeBallByBall,
      });
    }),
  getBallsOfSameOver: protectedProcedure
    .input(
      z.object({
        inningsId: z.number(),
        ballNumber: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const balls = await getBallsOfSameOver(input.inningsId, input.ballNumber);
      return balls;
    }),
  updatePlayer: sensitiveProcedure
    .input(UpdatePlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.update(input.id, input.data);
      if (!player) {
        throw new ORPCError("NOT_FOUND");
      }

      return player;
    }),
  deletePlayer: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await playerCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
  updateTeam: sensitiveProcedure
    .input(UpdateTeamInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.update(input.id, input.data);
      if (!team) {
        throw new ORPCError("NOT_FOUND");
      }

      return team;
    }),
  deleteTeam: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await teamCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
