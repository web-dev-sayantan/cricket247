import { ORPCError, type RouterClient } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { players, tournamentTeams, user } from "@/db/schema";
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
} from "@/services/tournament-create.service";
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
import { createTournamentFromScratchInputSchema } from "../schemas/tournament-create.schemas";
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
  groupCount: z.number().int().min(2).max(8).optional(),
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
    case "DATE_RANGE_INVALID":
    case "DUPLICATE_TEAM_IDS":
    case "MATCH_FORMAT_NOT_FOUND":
    case "ORGANIZATION_NOT_FOUND":
    case "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE":
    case "GROUP_EDIT_TARGET_NOT_FOUND":
    case "INVALID_TEMPLATE_CONFIGURATION":
    case "STAGE_EDIT_TARGET_NOT_FOUND":
    case "TEAM_COUNT_TOO_LOW":
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
