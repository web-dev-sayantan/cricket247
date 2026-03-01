import { z } from "zod";
import {
  createMatchFormatBodySchema,
  createOrganizationBodySchema,
  createTeamBodySchema,
  tournamentCategorySchema,
} from "./crud.schemas";

export const tournamentTemplateSchema = z.enum([
  "straight_league",
  "grouped_league_with_playoffs",
  "straight_knockout",
]);

const genderAllowedSchema = z.enum(["male", "female", "open"]);

const stageEditSchema = z.object({
  sequence: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(50).optional(),
});

const groupEditSchema = z.object({
  stageSequence: z.number().int().positive(),
  sequence: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(50).optional(),
  advancingSlots: z.number().int().min(0).max(64).optional(),
});

const tournamentFromScratchBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  season: z.string().trim().max(50).optional(),
  category: tournamentCategorySchema.default("competitive"),
  genderAllowed: genderAllowedSchema.default("open"),
  ageLimit: z.number().int().min(1).max(120).default(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  timeZone: z.string().trim().min(1).max(80).optional(),
  championTeamId: z.number().int().positive().nullable().optional(),
  organization: z.object({
    existingId: z.number().int().positive().optional(),
    create: createOrganizationBodySchema.optional(),
  }),
  defaultMatchFormat: z.object({
    existingId: z.number().int().positive().optional(),
    create: createMatchFormatBodySchema.optional(),
  }),
  teams: z.object({
    existingTeamIds: z.array(z.number().int().positive()).default([]),
    createTeams: z.array(createTeamBodySchema).default([]),
  }),
  structure: z.object({
    template: tournamentTemplateSchema.default("straight_league"),
    groupCount: z.number().int().min(1).max(8).optional(),
    advancingPerGroup: z.number().int().min(1).max(8).optional(),
    stageEdits: z.array(stageEditSchema).default([]),
    groupEdits: z.array(groupEditSchema).default([]),
  }),
});

function addTournamentFromScratchCrossFieldValidation<T extends z.ZodTypeAny>(
  schema: T
) {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keep create/update cross-field validation in one place.
  return schema.superRefine((value, ctx) => {
    const parsed = value as z.infer<typeof tournamentFromScratchBodySchema>;
    if (parsed.endDate.getTime() < parsed.startDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }

    const hasExistingOrganization =
      typeof parsed.organization.existingId === "number";
    const hasNewOrganization = Boolean(parsed.organization.create);
    if (hasExistingOrganization === hasNewOrganization) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of organization.existingId or organization.create",
        path: ["organization"],
      });
    }

    const hasExistingMatchFormat =
      typeof parsed.defaultMatchFormat.existingId === "number";
    const hasNewMatchFormat = Boolean(parsed.defaultMatchFormat.create);
    if (hasExistingMatchFormat === hasNewMatchFormat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of defaultMatchFormat.existingId or defaultMatchFormat.create",
        path: ["defaultMatchFormat"],
      });
    }

    const uniqueExistingTeamIds = new Set(parsed.teams.existingTeamIds);
    if (uniqueExistingTeamIds.size !== parsed.teams.existingTeamIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate team IDs are not allowed",
        path: ["teams", "existingTeamIds"],
      });
    }

    const totalTeams =
      parsed.teams.existingTeamIds.length + parsed.teams.createTeams.length;
    if (totalTeams < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least two teams are required",
        path: ["teams"],
      });
    }

    const stageSequences = parsed.structure.stageEdits.map(
      (stage) => stage.sequence
    );
    if (new Set(stageSequences).size !== stageSequences.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stage edits cannot contain duplicate stage sequence values",
        path: ["structure", "stageEdits"],
      });
    }

    const groupKeys = parsed.structure.groupEdits.map(
      (group) => `${group.stageSequence}:${group.sequence}`
    );
    if (new Set(groupKeys).size !== groupKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Group edits cannot contain duplicate stage/group sequence pairs",
        path: ["structure", "groupEdits"],
      });
    }

    if (parsed.structure.template !== "grouped_league_with_playoffs") {
      if (parsed.structure.groupCount !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "groupCount can only be provided for grouped_league_with_playoffs",
          path: ["structure", "groupCount"],
        });
      }
      if (parsed.structure.advancingPerGroup !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "advancingPerGroup can only be provided for grouped_league_with_playoffs",
          path: ["structure", "advancingPerGroup"],
        });
      }
    }
  });
}

export const createTournamentFromScratchInputSchema =
  addTournamentFromScratchCrossFieldValidation(tournamentFromScratchBodySchema);

export const updateTournamentFromScratchInputSchema =
  addTournamentFromScratchCrossFieldValidation(
    z.object({
      tournamentId: z.number().int().positive(),
      ...tournamentFromScratchBodySchema.shape,
    })
  );

export type CreateTournamentFromScratchInput = z.infer<
  typeof createTournamentFromScratchInputSchema
>;

export type UpdateTournamentFromScratchInput = z.infer<
  typeof updateTournamentFromScratchInputSchema
>;
