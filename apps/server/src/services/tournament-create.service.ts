import { eq, type InferSelectModel, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  matchFormats,
  organizations,
  teams,
  tournamentStageGroups,
  tournamentStages,
  tournaments,
  tournamentTeams,
} from "@/db/schema";
import type { CreateTournamentFromScratchInput } from "@/schemas/tournament-create.schemas";
import {
  SeedTournamentTemplateError,
  type SeedTournamentTemplateResult,
  seedTournamentTemplate,
  type TournamentTemplateKind,
} from "./tournament-template.service";

type Organization = InferSelectModel<typeof organizations>;
type MatchFormatRecord = InferSelectModel<typeof matchFormats>;
type Team = InferSelectModel<typeof teams>;
type Tournament = InferSelectModel<typeof tournaments>;

type TournamentCreateServiceErrorCode =
  | "DATE_RANGE_INVALID"
  | "DUPLICATE_TEAM_IDS"
  | "MATCH_FORMAT_NOT_FOUND"
  | "ORGANIZATION_NOT_FOUND"
  | "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE"
  | "GROUP_EDIT_TARGET_NOT_FOUND"
  | "INVALID_TEMPLATE_CONFIGURATION"
  | "STAGE_EDIT_TARGET_NOT_FOUND"
  | "TEAM_COUNT_TOO_LOW"
  | "TOURNAMENT_CREATE_FAILED";

export class TournamentCreateServiceError extends Error {
  code: TournamentCreateServiceErrorCode;

  constructor(code: TournamentCreateServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface CreateTournamentFromScratchResult {
  createdMatchFormat: MatchFormatRecord | null;
  createdOrganization: Organization | null;
  createdTeams: Team[];
  templateSummary: SeedTournamentTemplateResult;
  tournament: Tournament;
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

function resolveTournamentType(template: TournamentTemplateKind) {
  if (template === "straight_knockout") {
    return "knockout";
  }

  if (template === "grouped_league_with_playoffs") {
    return "custom";
  }

  return "league";
}

function mapTemplateError(error: SeedTournamentTemplateError) {
  if (error.code === "INVALID_TEMPLATE_CONFIGURATION") {
    return new TournamentCreateServiceError("INVALID_TEMPLATE_CONFIGURATION");
  }

  return new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
}

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

function validateCreateInput(input: CreateTournamentFromScratchInput) {
  if (input.endDate.getTime() < input.startDate.getTime()) {
    throw new TournamentCreateServiceError("DATE_RANGE_INVALID");
  }

  const uniqueExistingTeamIds = new Set(input.teams.existingTeamIds);
  if (uniqueExistingTeamIds.size !== input.teams.existingTeamIds.length) {
    throw new TournamentCreateServiceError("DUPLICATE_TEAM_IDS");
  }

  const totalTeamCount =
    input.teams.existingTeamIds.length + input.teams.createTeams.length;
  if (totalTeamCount < 2) {
    throw new TournamentCreateServiceError("TEAM_COUNT_TOO_LOW");
  }
}

async function resolveOrganization(
  tx: TransactionClient,
  organizationInput: CreateTournamentFromScratchInput["organization"]
) {
  if (typeof organizationInput.existingId === "number") {
    const rows = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationInput.existingId))
      .limit(1);
    if (rows.length === 0) {
      throw new TournamentCreateServiceError("ORGANIZATION_NOT_FOUND");
    }

    return {
      organizationId: organizationInput.existingId,
      createdOrganization: null,
    };
  }

  if (!organizationInput.create) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  if (organizationInput.create.isSystem === true) {
    throw new TournamentCreateServiceError(
      "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE"
    );
  }

  const insertedRows = await tx
    .insert(organizations)
    .values(organizationInput.create)
    .returning();
  const createdOrganization = insertedRows[0] ?? null;
  if (!createdOrganization) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  return {
    organizationId: createdOrganization.id,
    createdOrganization,
  };
}

async function resolveMatchFormat(
  tx: TransactionClient,
  matchFormatInput: CreateTournamentFromScratchInput["defaultMatchFormat"]
) {
  if (typeof matchFormatInput.existingId === "number") {
    const rows = await tx
      .select()
      .from(matchFormats)
      .where(eq(matchFormats.id, matchFormatInput.existingId))
      .limit(1);
    if (rows.length === 0) {
      throw new TournamentCreateServiceError("MATCH_FORMAT_NOT_FOUND");
    }

    return {
      defaultMatchFormatId: matchFormatInput.existingId,
      createdMatchFormat: null,
    };
  }

  if (!matchFormatInput.create) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  const insertedRows = await tx
    .insert(matchFormats)
    .values(matchFormatInput.create)
    .returning();
  const createdMatchFormat = insertedRows[0] ?? null;
  if (!createdMatchFormat) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  return {
    defaultMatchFormatId: createdMatchFormat.id,
    createdMatchFormat,
  };
}

async function createInlineTeams(
  tx: TransactionClient,
  teamInputs: CreateTournamentFromScratchInput["teams"]["createTeams"]
) {
  const createdTeams: Team[] = [];
  for (const teamPayload of teamInputs) {
    const insertedRows = await tx
      .insert(teams)
      .values({
        ...teamPayload,
        shortName: teamPayload.shortName.trim().toUpperCase(),
      })
      .returning();
    const createdTeam = insertedRows[0] ?? null;
    if (!createdTeam) {
      throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
    }

    createdTeams.push(createdTeam);
  }

  return createdTeams;
}

async function createTournamentRecord(params: {
  defaultMatchFormatId: number;
  input: CreateTournamentFromScratchInput;
  organizationId: number;
  tx: TransactionClient;
}) {
  const { defaultMatchFormatId, input, organizationId, tx } = params;
  const insertedRows = await tx
    .insert(tournaments)
    .values({
      name: input.name.trim(),
      season: input.season?.trim() ?? null,
      category: input.category,
      type: resolveTournamentType(input.structure.template),
      genderAllowed: input.genderAllowed,
      ageLimit: input.ageLimit,
      organizationId,
      startDate: input.startDate,
      endDate: input.endDate,
      defaultMatchFormatId,
    })
    .returning();

  const tournament = insertedRows[0] ?? null;
  if (!tournament) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  return tournament;
}

async function attachTeamsToTournament(
  tx: TransactionClient,
  tournamentId: number,
  teamIds: number[]
) {
  await tx.insert(tournamentTeams).values(
    teamIds.map((teamId) => ({
      tournamentId,
      teamId,
    }))
  );
}

async function createTemplateForTournament(params: {
  input: CreateTournamentFromScratchInput;
  teamIds: number[];
  tournamentId: number;
  tx: TransactionClient;
}) {
  const { input, teamIds, tournamentId, tx } = params;
  try {
    return await seedTournamentTemplate(
      {
        tournamentId,
        template: input.structure.template,
        teamIds,
        groupCount: input.structure.groupCount,
        advancingPerGroup: input.structure.advancingPerGroup,
        resetExisting: true,
      },
      {
        dbClient: tx,
      }
    );
  } catch (error) {
    if (error instanceof SeedTournamentTemplateError) {
      throw mapTemplateError(error);
    }

    throw error;
  }
}

async function fetchStageMappings(tx: TransactionClient, tournamentId: number) {
  const stageRows = await tx
    .select({
      id: tournamentStages.id,
      sequence: tournamentStages.sequence,
    })
    .from(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tournamentId));

  const stageIdBySequence = new Map(
    stageRows.map((stage) => [stage.sequence, stage.id])
  );

  return {
    stageRows,
    stageIdBySequence,
  };
}

async function applyStageEdits(params: {
  stageEdits: CreateTournamentFromScratchInput["structure"]["stageEdits"];
  stageIdBySequence: Map<number, number>;
  tx: TransactionClient;
}) {
  const { stageEdits, stageIdBySequence, tx } = params;
  for (const stageEdit of stageEdits) {
    const stageId = stageIdBySequence.get(stageEdit.sequence);
    if (typeof stageId !== "number") {
      throw new TournamentCreateServiceError("STAGE_EDIT_TARGET_NOT_FOUND");
    }

    await tx
      .update(tournamentStages)
      .set({
        name: stageEdit.name.trim(),
        code: normalizeOptionalText(stageEdit.code),
      })
      .where(eq(tournamentStages.id, stageId));
  }
}

async function applyGroupEdits(params: {
  groupEdits: CreateTournamentFromScratchInput["structure"]["groupEdits"];
  stageIdBySequence: Map<number, number>;
  stageRows: Array<{ id: number; sequence: number }>;
  tx: TransactionClient;
}) {
  const { groupEdits, stageIdBySequence, stageRows, tx } = params;
  if (groupEdits.length === 0) {
    return;
  }

  const stageIds = stageRows.map((stage) => stage.id);
  const groupRows =
    stageIds.length > 0
      ? await tx
          .select({
            id: tournamentStageGroups.id,
            stageId: tournamentStageGroups.stageId,
            sequence: tournamentStageGroups.sequence,
          })
          .from(tournamentStageGroups)
          .where(inArray(tournamentStageGroups.stageId, stageIds))
      : [];
  const groupIdByKey = new Map(
    groupRows.map((group) => [`${group.stageId}:${group.sequence}`, group.id])
  );

  for (const groupEdit of groupEdits) {
    const stageId = stageIdBySequence.get(groupEdit.stageSequence);
    if (typeof stageId !== "number") {
      throw new TournamentCreateServiceError("STAGE_EDIT_TARGET_NOT_FOUND");
    }

    const groupId = groupIdByKey.get(`${stageId}:${groupEdit.sequence}`);
    if (typeof groupId !== "number") {
      throw new TournamentCreateServiceError("GROUP_EDIT_TARGET_NOT_FOUND");
    }

    await tx
      .update(tournamentStageGroups)
      .set({
        name: groupEdit.name.trim(),
        code: normalizeOptionalText(groupEdit.code),
        advancingSlots: groupEdit.advancingSlots,
      })
      .where(eq(tournamentStageGroups.id, groupId));
  }
}

async function applyStructureEdits(params: {
  structure: CreateTournamentFromScratchInput["structure"];
  tournamentId: number;
  tx: TransactionClient;
}) {
  const { structure, tournamentId, tx } = params;
  const mappings = await fetchStageMappings(tx, tournamentId);

  await applyStageEdits({
    tx,
    stageEdits: structure.stageEdits,
    stageIdBySequence: mappings.stageIdBySequence,
  });

  await applyGroupEdits({
    tx,
    groupEdits: structure.groupEdits,
    stageIdBySequence: mappings.stageIdBySequence,
    stageRows: mappings.stageRows,
  });
}

export async function createTournamentFromScratch(
  input: CreateTournamentFromScratchInput
): Promise<CreateTournamentFromScratchResult> {
  validateCreateInput(input);

  return await db.transaction(async (tx) => {
    const organizationResult = await resolveOrganization(
      tx,
      input.organization
    );
    const matchFormatResult = await resolveMatchFormat(
      tx,
      input.defaultMatchFormat
    );
    const createdTeams = await createInlineTeams(tx, input.teams.createTeams);
    const selectedTeamIds = [
      ...input.teams.existingTeamIds,
      ...createdTeams.map((team) => team.id),
    ];

    const tournament = await createTournamentRecord({
      tx,
      input,
      organizationId: organizationResult.organizationId,
      defaultMatchFormatId: matchFormatResult.defaultMatchFormatId,
    });

    await attachTeamsToTournament(tx, tournament.id, selectedTeamIds);
    const templateSummary = await createTemplateForTournament({
      tx,
      tournamentId: tournament.id,
      teamIds: selectedTeamIds,
      input,
    });
    await applyStructureEdits({
      tx,
      tournamentId: tournament.id,
      structure: input.structure,
    });

    return {
      tournament,
      createdOrganization: organizationResult.createdOrganization,
      createdMatchFormat: matchFormatResult.createdMatchFormat,
      createdTeams,
      templateSummary,
    };
  });
}
