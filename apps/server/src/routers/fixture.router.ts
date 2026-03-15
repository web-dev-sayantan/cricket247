import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure, sensitiveProcedure } from "@/lib/orpc";
import { requireAdminByEmail } from "@/routers/helpers/admin";
import {
  canCurrentUserScoreFixtureMatch,
  getTournamentScoringPermissionContext,
} from "@/routers/helpers/scoring-access";
import {
  createFixtureDraft,
  createFixtureRound,
  FixtureWorkflowError,
  publishFixtureVersion,
  validateFixtureConflicts,
} from "@/services/fixture.service";
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

export const fixtureRouter = {
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
};
