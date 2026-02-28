import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  matches,
  matchParticipantSources,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournamentStageTeamEntries,
  tournamentTeams,
} from "@/db/schema";

export type TournamentTemplateKind =
  | "straight_league"
  | "grouped_league_with_playoffs"
  | "straight_knockout";

export interface SeedTournamentTemplateInput {
  advancingPerGroup?: number;
  groupCount?: number;
  resetExisting?: boolean;
  teamIds?: number[];
  template: TournamentTemplateKind;
  tournamentId: number;
}

export interface SeedTournamentTemplateResult {
  advancementRuleCount: number;
  groupCount: number;
  stageCount: number;
  teamCount: number;
  template: TournamentTemplateKind;
  tournamentId: number;
}

type SeedTournamentTemplateErrorCode =
  | "TOURNAMENT_NOT_FOUND"
  | "NO_TOURNAMENT_TEAMS"
  | "INVALID_TEAM_SELECTION"
  | "INVALID_TEMPLATE_CONFIGURATION";

export class SeedTournamentTemplateError extends Error {
  code: SeedTournamentTemplateErrorCode;

  constructor(code: SeedTournamentTemplateErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function getGroupName(index: number) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

function buildGroupAdvancementSlots(params: {
  advancingPerGroup: number;
  groupCount: number;
}) {
  const { advancingPerGroup, groupCount } = params;

  if (groupCount === 2 && advancingPerGroup === 2) {
    return [
      { groupIndex: 0, position: 1, slot: 1 },
      { groupIndex: 1, position: 2, slot: 2 },
      { groupIndex: 1, position: 1, slot: 3 },
      { groupIndex: 0, position: 2, slot: 4 },
    ];
  }

  const slots: Array<{ groupIndex: number; position: number; slot: number }> =
    [];
  let slot = 1;

  for (let position = 1; position <= advancingPerGroup; position += 1) {
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      slots.push({
        groupIndex,
        position,
        slot,
      });
      slot += 1;
    }
  }

  return slots;
}

async function resetTournamentStructure(tournamentId: number) {
  const stageRows = await db
    .select({ id: tournamentStages.id })
    .from(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tournamentId));

  if (stageRows.length === 0) {
    return;
  }

  const stageIds = stageRows.map((stage) => stage.id);

  const groupRows = await db
    .select({ id: tournamentStageGroups.id })
    .from(tournamentStageGroups)
    .where(inArray(tournamentStageGroups.stageId, stageIds));

  const groupIds = groupRows.map((group) => group.id);

  await db
    .update(matches)
    .set({
      stageId: null,
      stageGroupId: null,
      stageRound: null,
      stageSequence: null,
    })
    .where(eq(matches.tournamentId, tournamentId));

  if (groupIds.length > 0) {
    await db
      .delete(matchParticipantSources)
      .where(inArray(matchParticipantSources.sourceStageGroupId, groupIds));
  }

  await db
    .delete(matchParticipantSources)
    .where(inArray(matchParticipantSources.sourceStageId, stageIds));

  await db
    .delete(tournamentStageAdvancements)
    .where(inArray(tournamentStageAdvancements.fromStageId, stageIds));

  await db
    .delete(tournamentStageAdvancements)
    .where(inArray(tournamentStageAdvancements.toStageId, stageIds));

  await db
    .delete(tournamentStageTeamEntries)
    .where(eq(tournamentStageTeamEntries.tournamentId, tournamentId));

  if (groupIds.length > 0) {
    await db
      .delete(tournamentStageGroups)
      .where(inArray(tournamentStageGroups.id, groupIds));
  }

  await db
    .delete(tournamentStages)
    .where(eq(tournamentStages.tournamentId, tournamentId));
}

export async function seedTournamentTemplate(
  input: SeedTournamentTemplateInput
): Promise<SeedTournamentTemplateResult> {
  const tournament = await db.query.tournaments.findFirst({
    where: {
      id: input.tournamentId,
    },
  });

  if (!tournament) {
    throw new SeedTournamentTemplateError("TOURNAMENT_NOT_FOUND");
  }

  const tournamentTeamRows = await db
    .select({ teamId: tournamentTeams.teamId })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, input.tournamentId));

  if (tournamentTeamRows.length === 0) {
    throw new SeedTournamentTemplateError("NO_TOURNAMENT_TEAMS");
  }

  const registeredTeamIds = tournamentTeamRows.map((row) => row.teamId);
  const selectedTeamIds =
    input.teamIds && input.teamIds.length > 0
      ? input.teamIds
      : registeredTeamIds;

  const selectedTeamIdSet = new Set(selectedTeamIds);
  if (
    selectedTeamIdSet.size !== selectedTeamIds.length ||
    selectedTeamIds.some((teamId) => !registeredTeamIds.includes(teamId))
  ) {
    throw new SeedTournamentTemplateError("INVALID_TEAM_SELECTION");
  }

  const groupCount = input.groupCount ?? 2;
  const advancingPerGroup = input.advancingPerGroup ?? 2;

  if (input.template === "grouped_league_with_playoffs") {
    const totalAdvancers = groupCount * advancingPerGroup;
    if (
      groupCount < 2 ||
      advancingPerGroup < 1 ||
      totalAdvancers > selectedTeamIds.length
    ) {
      throw new SeedTournamentTemplateError("INVALID_TEMPLATE_CONFIGURATION");
    }
  }

  if (selectedTeamIds.length < 2) {
    throw new SeedTournamentTemplateError("INVALID_TEMPLATE_CONFIGURATION");
  }

  if (input.resetExisting ?? true) {
    await resetTournamentStructure(input.tournamentId);
  }

  let stageCount = 0;
  let createdGroupCount = 0;
  let advancementRuleCount = 0;

  if (input.template === "straight_league") {
    const [leagueStage] = await db
      .insert(tournamentStages)
      .values({
        tournamentId: input.tournamentId,
        name: "League Stage",
        code: "LEAGUE",
        stageType: "league",
        format: "single_round_robin",
        sequence: 1,
        status: "upcoming",
        qualificationSlots: 0,
        matchFormatId: tournament.defaultMatchFormatId,
      })
      .returning();

    await db.insert(tournamentStageTeamEntries).values(
      selectedTeamIds.map((teamId, index) => ({
        tournamentId: input.tournamentId,
        stageId: leagueStage.id,
        stageGroupId: null,
        teamId,
        seed: index + 1,
        entrySource: "direct",
      }))
    );

    stageCount = 1;
  }

  if (input.template === "straight_knockout") {
    const [knockoutStage] = await db
      .insert(tournamentStages)
      .values({
        tournamentId: input.tournamentId,
        name: "Knockout Stage",
        code: "KNOCKOUT",
        stageType: "knockout",
        format: "single_elimination",
        sequence: 1,
        status: "upcoming",
        qualificationSlots: 0,
        matchFormatId: tournament.defaultMatchFormatId,
      })
      .returning();

    await db.insert(tournamentStageTeamEntries).values(
      selectedTeamIds.map((teamId, index) => ({
        tournamentId: input.tournamentId,
        stageId: knockoutStage.id,
        stageGroupId: null,
        teamId,
        seed: index + 1,
        entrySource: "direct",
      }))
    );

    stageCount = 1;
  }

  if (input.template === "grouped_league_with_playoffs") {
    const [groupStage] = await db
      .insert(tournamentStages)
      .values({
        tournamentId: input.tournamentId,
        name: "Group Stage",
        code: "GROUP_STAGE",
        stageType: "league",
        format: "single_round_robin",
        sequence: 1,
        status: "upcoming",
        qualificationSlots: groupCount * advancingPerGroup,
        matchFormatId: tournament.defaultMatchFormatId,
      })
      .returning();

    const groups = await db
      .insert(tournamentStageGroups)
      .values(
        Array.from({ length: groupCount }, (_, index) => ({
          stageId: groupStage.id,
          name: getGroupName(index),
          code: `G${index + 1}`,
          sequence: index + 1,
          advancingSlots: advancingPerGroup,
        }))
      )
      .returning();

    await db.insert(tournamentStageTeamEntries).values(
      selectedTeamIds.map((teamId, index) => {
        const group = groups[index % groups.length];
        return {
          tournamentId: input.tournamentId,
          stageId: groupStage.id,
          stageGroupId: group.id,
          teamId,
          seed: index + 1,
          entrySource: "direct",
        };
      })
    );

    const [playoffStage] = await db
      .insert(tournamentStages)
      .values({
        tournamentId: input.tournamentId,
        name: "Playoffs",
        code: "PLAYOFFS",
        stageType: "knockout",
        format: "single_elimination",
        sequence: 2,
        status: "upcoming",
        parentStageId: groupStage.id,
        qualificationSlots: 0,
        matchFormatId: tournament.defaultMatchFormatId,
      })
      .returning();

    const advancementSlots = buildGroupAdvancementSlots({
      advancingPerGroup,
      groupCount,
    });

    await db.insert(tournamentStageAdvancements).values(
      advancementSlots.map((rule) => ({
        fromStageId: groupStage.id,
        fromStageGroupId: groups[rule.groupIndex]?.id ?? null,
        positionFrom: rule.position,
        toStageId: playoffStage.id,
        toSlot: rule.slot,
        qualificationType: "position",
      }))
    );

    stageCount = 2;
    createdGroupCount = groupCount;
    advancementRuleCount = advancementSlots.length;
  }

  return {
    tournamentId: input.tournamentId,
    template: input.template,
    teamCount: selectedTeamIds.length,
    stageCount,
    groupCount: createdGroupCount,
    advancementRuleCount,
  };
}
