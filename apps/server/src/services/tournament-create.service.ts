import { and, eq, type InferSelectModel, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  fixtureVersions,
  matches,
  matchFormats,
  organizations,
  teamPlayers,
  teams,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournaments,
  tournamentTeams,
} from "@/db/schema";
import type {
  CreateTournamentFromScratchInput,
  UpdateTournamentFromScratchInput,
} from "@/schemas/tournament-create.schemas";
import { getCurrentDate } from "@/utils";
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
  | "STRUCTURE_LOCKED"
  | "TEAM_COUNT_TOO_LOW"
  | "TEAM_MEMBERSHIP_LOCKED_AFTER_START"
  | "TEAM_REMOVAL_BLOCKED_BY_ASSIGNMENTS"
  | "TEAM_REMOVAL_BLOCKED_BY_MATCH_REFERENCES"
  | "TOURNAMENT_CREATE_FAILED"
  | "TOURNAMENT_NOT_FOUND"
  | "UNSUPPORTED_EXISTING_STRUCTURE";

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

export interface UpdateTournamentFromScratchResult {
  createdMatchFormat: MatchFormatRecord | null;
  createdOrganization: Organization | null;
  createdTeams: Team[];
  structureChanged: boolean;
  teamMembershipChanged: boolean;
  templateSummary: SeedTournamentTemplateResult | null;
  tournament: Tournament;
}

interface ExistingStructureConfig {
  advancingPerGroup?: number;
  groupKeys: string[];
  groupSequencesByStageSequence: Map<number, number[]>;
  stageSequences: number[];
  supported: boolean;
  template?: TournamentTemplateKind;
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

function normalizeSeason(value: string | undefined) {
  const normalized = normalizeOptionalText(value);
  return normalized === undefined ? null : normalized;
}

function normalizeTimeZone(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return "UTC";
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
  validateSharedInput(input);
}

function validateSharedInput(
  input: CreateTournamentFromScratchInput | UpdateTournamentFromScratchInput
) {
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
      season: normalizeSeason(input.season),
      category: input.category,
      type: resolveTournamentType(input.structure.template),
      genderAllowed: input.genderAllowed,
      ageLimit: input.ageLimit,
      organizationId,
      startDate: input.startDate,
      endDate: input.endDate,
      timeZone: normalizeTimeZone(input.timeZone),
      defaultMatchFormatId,
      championTeamId: input.championTeamId ?? null,
    })
    .returning();

  const tournament = insertedRows[0] ?? null;
  if (!tournament) {
    throw new TournamentCreateServiceError("TOURNAMENT_CREATE_FAILED");
  }

  return tournament;
}

async function updateTournamentRecord(params: {
  defaultMatchFormatId: number;
  input: UpdateTournamentFromScratchInput;
  organizationId: number;
  tournamentType: Tournament["type"];
  tx: TransactionClient;
}) {
  const { defaultMatchFormatId, input, organizationId, tournamentType, tx } =
    params;
  const updatedRows = await tx
    .update(tournaments)
    .set({
      name: input.name.trim(),
      season: normalizeSeason(input.season),
      category: input.category,
      type: tournamentType,
      genderAllowed: input.genderAllowed,
      ageLimit: input.ageLimit,
      organizationId,
      startDate: input.startDate,
      endDate: input.endDate,
      timeZone: normalizeTimeZone(input.timeZone),
      defaultMatchFormatId,
      championTeamId: input.championTeamId ?? null,
    })
    .where(eq(tournaments.id, input.tournamentId))
    .returning();

  const tournament = updatedRows[0] ?? null;
  if (!tournament) {
    throw new TournamentCreateServiceError("TOURNAMENT_NOT_FOUND");
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

async function replaceTournamentTeams(
  tx: TransactionClient,
  tournamentId: number,
  teamIds: number[]
) {
  await tx
    .delete(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));
  await attachTeamsToTournament(tx, tournamentId, teamIds);
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

async function reseedTemplateForTournamentUpdate(params: {
  input: UpdateTournamentFromScratchInput;
  teamIds: number[];
  tx: TransactionClient;
}) {
  const { input, teamIds, tx } = params;
  try {
    return await seedTournamentTemplate(
      {
        tournamentId: input.tournamentId,
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

function areNumberArraysEqual(first: number[], second: number[]) {
  if (first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }

  return true;
}

async function getTournamentByIdOrThrow(
  tx: TransactionClient,
  tournamentId: number
) {
  const rows = await tx
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  const tournament = rows[0] ?? null;
  if (!tournament) {
    throw new TournamentCreateServiceError("TOURNAMENT_NOT_FOUND");
  }

  return tournament;
}

async function getTournamentTeamIds(
  tx: TransactionClient,
  tournamentId: number
) {
  const rows = await tx
    .select({ teamId: tournamentTeams.teamId })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(tournamentTeams.id);

  return rows.map((row) => row.teamId);
}

async function hasFixtureOrMatchData(
  tx: TransactionClient,
  tournamentId: number
) {
  const matchRows = await tx
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .limit(1);
  if (matchRows.length > 0) {
    return true;
  }

  const fixtureVersionRows = await tx
    .select({ id: fixtureVersions.id })
    .from(fixtureVersions)
    .where(eq(fixtureVersions.tournamentId, tournamentId))
    .limit(1);
  return fixtureVersionRows.length > 0;
}

async function assertTeamMembershipChangeAllowed(params: {
  removedTeamIds: number[];
  tournament: Tournament;
  tournamentId: number;
  tx: TransactionClient;
}) {
  const { removedTeamIds, tournament, tournamentId, tx } = params;

  if (tournament.startDate <= getCurrentDate()) {
    throw new TournamentCreateServiceError(
      "TEAM_MEMBERSHIP_LOCKED_AFTER_START"
    );
  }

  if (removedTeamIds.length === 0) {
    return;
  }

  const assignments = await tx
    .select({ id: teamPlayers.id })
    .from(teamPlayers)
    .where(
      and(
        eq(teamPlayers.tournamentId, tournamentId),
        inArray(teamPlayers.teamId, removedTeamIds)
      )
    )
    .limit(1);
  if (assignments.length > 0) {
    throw new TournamentCreateServiceError(
      "TEAM_REMOVAL_BLOCKED_BY_ASSIGNMENTS"
    );
  }

  const matchReferences = await tx
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        or(
          inArray(matches.team1Id, removedTeamIds),
          inArray(matches.team2Id, removedTeamIds),
          inArray(matches.tossWinnerId, removedTeamIds),
          inArray(matches.winnerId, removedTeamIds)
        )
      )
    )
    .limit(1);
  if (matchReferences.length > 0) {
    throw new TournamentCreateServiceError(
      "TEAM_REMOVAL_BLOCKED_BY_MATCH_REFERENCES"
    );
  }
}

function inferSingleStageTemplate(stage: {
  format: string;
  stageType: string;
}): TournamentTemplateKind | null {
  const isLeague =
    stage.stageType === "league" && stage.format === "single_round_robin";
  if (isLeague) {
    return "straight_league";
  }

  const isKnockout =
    stage.format === "single_elimination" ||
    stage.stageType === "knockout" ||
    stage.stageType === "playoff";
  if (isKnockout) {
    return "straight_knockout";
  }

  return null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Structure-shape inference intentionally evaluates several template heuristics.
async function getExistingStructureConfig(
  tx: TransactionClient,
  tournamentId: number
): Promise<ExistingStructureConfig> {
  const stageRows = await tx
    .select({
      format: tournamentStages.format,
      id: tournamentStages.id,
      sequence: tournamentStages.sequence,
      stageType: tournamentStages.stageType,
    })
    .from(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tournamentId))
    .orderBy(tournamentStages.sequence);

  const stageIds = stageRows.map((stage) => stage.id);
  const stageIdToSequence = new Map(
    stageRows.map((stage) => [stage.id, stage.sequence])
  );

  const groupRows =
    stageIds.length === 0
      ? []
      : await tx
          .select({
            advancingSlots: tournamentStageGroups.advancingSlots,
            sequence: tournamentStageGroups.sequence,
            stageId: tournamentStageGroups.stageId,
          })
          .from(tournamentStageGroups)
          .where(inArray(tournamentStageGroups.stageId, stageIds))
          .orderBy(
            tournamentStageGroups.stageId,
            tournamentStageGroups.sequence
          );

  const groupKeys = groupRows
    .map((group) => {
      const stageSequence = stageIdToSequence.get(group.stageId);
      if (typeof stageSequence !== "number") {
        return null;
      }

      return `${stageSequence}:${group.sequence}`;
    })
    .filter((key): key is string => typeof key === "string");

  const groupSequencesByStageSequence = new Map<number, number[]>();
  for (const groupRow of groupRows) {
    const stageSequence = stageIdToSequence.get(groupRow.stageId);
    if (typeof stageSequence !== "number") {
      continue;
    }

    const existing = groupSequencesByStageSequence.get(stageSequence) ?? [];
    existing.push(groupRow.sequence);
    groupSequencesByStageSequence.set(stageSequence, existing);
  }

  const stageSequences = stageRows.map((stage) => stage.sequence);

  if (stageRows.length === 1) {
    const stage = stageRows[0];
    const template = inferSingleStageTemplate(stage);
    if (!template) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    if (groupRows.length > 0) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    return {
      template,
      stageSequences,
      groupKeys,
      groupSequencesByStageSequence,
      supported: true,
    };
  }

  if (stageRows.length === 2) {
    const stageOne = stageRows[0];
    const stageTwo = stageRows[1];
    if (stageOne?.sequence !== 1 || stageTwo?.sequence !== 2) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const stageOneGroups = groupRows.filter(
      (group) => group.stageId === stageOne.id
    );
    if (stageOneGroups.length < 1) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const stageTwoGroups = groupRows.filter(
      (group) => group.stageId === stageTwo.id
    );
    if (stageTwoGroups.length > 0) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const stageOneLooksLeague =
      stageOne.stageType === "league" ||
      stageOne.format === "single_round_robin";
    const stageTwoLooksKnockout =
      stageTwo.stageType === "knockout" ||
      stageTwo.stageType === "playoff" ||
      stageTwo.format === "single_elimination";
    if (!(stageOneLooksLeague && stageTwoLooksKnockout)) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const advancementRows = await tx
      .select({
        fromStageGroupId: tournamentStageAdvancements.fromStageGroupId,
        id: tournamentStageAdvancements.id,
      })
      .from(tournamentStageAdvancements)
      .where(
        and(
          eq(tournamentStageAdvancements.fromStageId, stageOne.id),
          eq(tournamentStageAdvancements.toStageId, stageTwo.id)
        )
      );

    if (advancementRows.length === 0) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const advancingSlotsSet = new Set(
      stageOneGroups.map((group) => group.advancingSlots)
    );
    if (advancingSlotsSet.size !== 1) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const advancingPerGroup = stageOneGroups[0]?.advancingSlots;
    if (typeof advancingPerGroup !== "number" || advancingPerGroup < 1) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    const expectedAdvancementCount = stageOneGroups.length * advancingPerGroup;
    if (advancementRows.length !== expectedAdvancementCount) {
      return {
        stageSequences,
        groupKeys,
        groupSequencesByStageSequence,
        supported: false,
      };
    }

    return {
      template: "grouped_league_with_playoffs",
      advancingPerGroup,
      stageSequences,
      groupKeys,
      groupSequencesByStageSequence,
      supported: true,
    };
  }

  return {
    stageSequences,
    groupKeys,
    groupSequencesByStageSequence,
    supported: false,
  };
}

function getInputGroupKeys(
  groups: UpdateTournamentFromScratchInput["structure"]["groupEdits"]
) {
  return groups
    .map((group) => `${group.stageSequence}:${group.sequence}`)
    .sort((first, second) => first.localeCompare(second));
}

function getExistingGroupKeys(existing: ExistingStructureConfig) {
  return [...existing.groupKeys].sort((first, second) =>
    first.localeCompare(second)
  );
}

function isSameTopology(params: {
  existing: ExistingStructureConfig;
  input: UpdateTournamentFromScratchInput;
}) {
  const { existing, input } = params;
  const inputStageSequences = input.structure.stageEdits
    .map((stage) => stage.sequence)
    .sort((first, second) => first - second);
  const existingStageSequences = [...existing.stageSequences].sort(
    (first, second) => first - second
  );
  if (!areNumberArraysEqual(inputStageSequences, existingStageSequences)) {
    return false;
  }

  const inputGroupKeys = getInputGroupKeys(input.structure.groupEdits);
  const existingGroupKeys = getExistingGroupKeys(existing);
  if (inputGroupKeys.length !== existingGroupKeys.length) {
    return false;
  }

  for (let index = 0; index < inputGroupKeys.length; index += 1) {
    if (inputGroupKeys[index] !== existingGroupKeys[index]) {
      return false;
    }
  }

  return true;
}

function isTemplateConfigChanged(params: {
  existing: ExistingStructureConfig;
  input: UpdateTournamentFromScratchInput;
}) {
  const { existing, input } = params;
  if (!existing.supported) {
    return false;
  }

  if (input.structure.template !== existing.template) {
    return true;
  }

  if (input.structure.template !== "grouped_league_with_playoffs") {
    return false;
  }

  const existingGroupCount =
    existing.groupSequencesByStageSequence.get(1)?.length ?? 0;
  const inputGroupCount = input.structure.groupCount ?? 0;
  if (inputGroupCount !== existingGroupCount) {
    return true;
  }

  return input.structure.advancingPerGroup !== existing.advancingPerGroup;
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

export async function updateTournamentFromScratch(
  input: UpdateTournamentFromScratchInput
): Promise<UpdateTournamentFromScratchResult> {
  validateSharedInput(input);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Transaction coordinates validations, lock checks, and atomic writes.
  return await db.transaction(async (tx) => {
    const tournament = await getTournamentByIdOrThrow(tx, input.tournamentId);
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
    const existingTeamIds = await getTournamentTeamIds(tx, input.tournamentId);
    const teamMembershipChanged = !areNumberArraysEqual(
      existingTeamIds,
      selectedTeamIds
    );
    const removedTeamIds = existingTeamIds.filter(
      (teamId) => !selectedTeamIds.includes(teamId)
    );

    if (teamMembershipChanged) {
      await assertTeamMembershipChangeAllowed({
        tx,
        tournament,
        tournamentId: input.tournamentId,
        removedTeamIds,
      });
    }

    const existingStructure = await getExistingStructureConfig(
      tx,
      input.tournamentId
    );

    if (
      !existingStructure.supported &&
      (input.structure.stageEdits.length > 0 ||
        input.structure.groupEdits.length > 0)
    ) {
      throw new TournamentCreateServiceError("UNSUPPORTED_EXISTING_STRUCTURE");
    }

    const templateConfigChanged = isTemplateConfigChanged({
      existing: existingStructure,
      input,
    });
    const topologyChanged = existingStructure.supported
      ? !isSameTopology({
          existing: existingStructure,
          input,
        })
      : false;
    const structureChanged = templateConfigChanged || topologyChanged;

    const structureLocked = await hasFixtureOrMatchData(tx, input.tournamentId);
    if (structureLocked && (structureChanged || teamMembershipChanged)) {
      throw new TournamentCreateServiceError("STRUCTURE_LOCKED");
    }

    if (teamMembershipChanged) {
      await replaceTournamentTeams(tx, input.tournamentId, selectedTeamIds);
    }

    const templateSupported = existingStructure.supported;
    const tournamentType = templateSupported
      ? resolveTournamentType(input.structure.template)
      : tournament.type;

    const updatedTournament = await updateTournamentRecord({
      tx,
      input,
      organizationId: organizationResult.organizationId,
      defaultMatchFormatId: matchFormatResult.defaultMatchFormatId,
      tournamentType,
    });

    const shouldReseed =
      templateSupported && (structureChanged || teamMembershipChanged);
    let templateSummary: SeedTournamentTemplateResult | null = null;
    if (shouldReseed) {
      templateSummary = await reseedTemplateForTournamentUpdate({
        tx,
        input,
        teamIds: selectedTeamIds,
      });
    }

    if (templateSupported && input.structure.stageEdits.length > 0) {
      await applyStructureEdits({
        tx,
        tournamentId: input.tournamentId,
        structure: input.structure,
      });
    }

    return {
      tournament: updatedTournament,
      createdOrganization: organizationResult.createdOrganization,
      createdMatchFormat: matchFormatResult.createdMatchFormat,
      createdTeams,
      templateSummary,
      structureChanged,
      teamMembershipChanged,
    };
  });
}
