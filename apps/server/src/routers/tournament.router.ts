import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@/db";
import { publicProcedure, sensitiveProcedure } from "@/lib/orpc";
import { requireAdminByEmail } from "@/routers/helpers/admin";
import {
  createMatchFormatBodySchema,
  createOrganizationBodySchema,
  createTournamentBodySchema,
  createTournamentStageAdvancementBodySchema,
  createTournamentStageBodySchema,
  createTournamentStageGroupBodySchema,
  createTournamentStageTeamEntryBodySchema,
  createTournamentTeamBodySchema,
  updateTournamentBodySchema,
  updateTournamentStageAdvancementBodySchema,
  updateTournamentStageBodySchema,
  updateTournamentStageGroupBodySchema,
  updateTournamentStageTeamEntryBodySchema,
  updateTournamentTeamBodySchema,
} from "@/schemas/crud.schemas";
import {
  createTournamentFromScratchInputSchema,
  updateTournamentFromScratchInputSchema,
} from "@/schemas/tournament-create.schemas";
import {
  CrudServiceError,
  matchFormatCrudService,
  organizationCrudService,
  tournamentCrudService,
  tournamentStageAdvancementCrudService,
  tournamentStageCrudService,
  tournamentStageGroupCrudService,
  tournamentStageTeamEntryCrudService,
  tournamentTeamCrudService,
} from "@/services/crud.service";
import {
  getAllTournaments,
  getLiveTournaments,
  getTournamentPlayers,
  getTournamentStructure,
} from "@/services/tournament.service";
import {
  createTournamentFromScratch,
  TournamentCreateServiceError,
  updateTournamentFromScratch,
} from "@/services/tournament-create.service";

const TournamentStructureInputSchema = z.object({
  tournamentId: z.number().int().positive(),
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
    case "PLAYER_OF_TOURNAMENT_NOT_IN_TOURNAMENT":
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

export const tournamentRouter = {
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
  tournamentPlayers: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      return getTournamentPlayers(input);
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
};
