export type TournamentCategory =
  | "competitive"
  | "practice"
  | "recreational"
  | "one_off";
export type TournamentGenderAllowed = "male" | "female" | "open";
export type TournamentTemplateKind =
  | "straight_league"
  | "grouped_league_with_playoffs"
  | "straight_knockout";

export interface StageEditDraft {
  code?: string;
  name: string;
  sequence: number;
}

export interface GroupEditDraft {
  advancingSlots?: number;
  code?: string;
  name: string;
  sequence: number;
  stageSequence: number;
}

export interface OrganizationDraft {
  code?: string;
  country?: string;
  description?: string;
  logo?: string;
  name: string;
  scope?: string;
  shortName?: string;
  slug: string;
  type?: string;
  website?: string;
}

export interface MatchFormatDraft {
  ballsPerOver?: number;
  description?: string;
  isDrawAllowed?: boolean;
  isSuperOverAllowed?: boolean;
  maxLegalBallsPerInnings?: number;
  maxOversPerBowler?: number;
  name: string;
  noOfInnings?: number;
  noOfOvers?: number;
  playersPerSide?: number;
}

export interface TeamDraft {
  country?: string;
  name: string;
  shortName: string;
}

export interface TournamentWizardValues {
  advanced: {
    championTeamId: null | number;
    timeZone: string;
  };
  ageLimit: number;
  category: TournamentCategory;
  defaultMatchFormat: {
    create: MatchFormatDraft;
    existingId: null | number;
    mode: "create" | "existing";
  };
  endDate: Date;
  genderAllowed: TournamentGenderAllowed;
  name: string;
  organization: {
    create: OrganizationDraft;
    existingId: null | number;
    mode: "create" | "existing";
  };
  season: string;
  startDate: Date;
  structure: {
    advancingPerGroup: number;
    groupCount: number;
    groupEdits: GroupEditDraft[];
    stageEdits: StageEditDraft[];
    template: TournamentTemplateKind;
  };
  teams: {
    createTeams: TeamDraft[];
    existingTeamIds: number[];
  };
}

interface TournamentViewSnapshot {
  stages: Array<{
    code: null | string;
    format: string;
    groups: Array<{
      advancingSlots: number;
      code: null | string;
      sequence: number;
      name: string;
    }>;
    name: string;
    sequence: number;
    stageType: string;
  }>;
  teams: Array<{
    teamId: number;
  }>;
  tournament: {
    ageLimit: null | number;
    category: string;
    defaultMatchFormatId: number;
    endDate: Date;
    genderAllowed: string;
    name: string;
    organizationId: number;
    season: null | string;
    startDate: Date;
    timeZone: string;
    championTeamId: null | number;
    type: string;
  };
}

export interface TournamentStructureInference {
  advancingPerGroup: number;
  groupCount: number;
  groupEdits: GroupEditDraft[];
  stageEdits: StageEditDraft[];
  supported: boolean;
  template: TournamentTemplateKind;
}

function getGroupName(index: number) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

function normalizeDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeStageEdits(stages: TournamentViewSnapshot["stages"]) {
  return [...stages]
    .sort((first, second) => first.sequence - second.sequence)
    .map((stage) => ({
      sequence: stage.sequence,
      name: stage.name,
      code: stage.code ?? undefined,
    }));
}

function normalizeGroupEdits(stages: TournamentViewSnapshot["stages"]) {
  const sortedStages = [...stages].sort(
    (first, second) => first.sequence - second.sequence
  );
  const groupEdits: GroupEditDraft[] = [];

  for (const stage of sortedStages) {
    const sortedGroups = [...stage.groups].sort(
      (first, second) => first.sequence - second.sequence
    );
    for (const group of sortedGroups) {
      groupEdits.push({
        stageSequence: stage.sequence,
        sequence: group.sequence,
        name: group.name,
        code: group.code ?? undefined,
        advancingSlots: group.advancingSlots,
      });
    }
  }

  return groupEdits;
}

function inferTemplateFromSingleStage(
  stage: TournamentViewSnapshot["stages"][number]
): null | TournamentTemplateKind {
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

function inferTemplateFromTournamentType(type: string): TournamentTemplateKind {
  if (type === "knockout") {
    return "straight_knockout";
  }

  if (type === "custom") {
    return "grouped_league_with_playoffs";
  }

  return "straight_league";
}

export function inferTemplateFromTournamentView(
  view: TournamentViewSnapshot
): TournamentStructureInference {
  const stageEdits = normalizeStageEdits(view.stages);
  const groupEdits = normalizeGroupEdits(view.stages);
  const sortedStages = [...view.stages].sort(
    (first, second) => first.sequence - second.sequence
  );

  if (sortedStages.length === 1) {
    const template = inferTemplateFromSingleStage(sortedStages[0]);
    if (template && sortedStages[0]?.groups.length === 0) {
      return {
        template,
        supported: true,
        stageEdits,
        groupEdits: [],
        groupCount: 2,
        advancingPerGroup: 2,
      };
    }
  }

  if (sortedStages.length === 2) {
    const firstStage = sortedStages[0];
    const secondStage = sortedStages[1];
    const firstStageGroups = [...(firstStage?.groups ?? [])].sort(
      (first, second) => first.sequence - second.sequence
    );
    const secondStageGroups = secondStage?.groups ?? [];

    const firstLooksLeague =
      firstStage?.stageType === "league" ||
      firstStage?.format === "single_round_robin";
    const secondLooksKnockout =
      secondStage?.stageType === "knockout" ||
      secondStage?.stageType === "playoff" ||
      secondStage?.format === "single_elimination";
    const advancingSlots = firstStageGroups
      .map((group) => group.advancingSlots)
      .filter((slot) => slot > 0);
    const uniqueAdvancingSlots = new Set(advancingSlots);

    if (
      firstStage?.sequence === 1 &&
      secondStage?.sequence === 2 &&
      firstLooksLeague &&
      secondLooksKnockout &&
      secondStageGroups.length === 0 &&
      firstStageGroups.length >= 2 &&
      uniqueAdvancingSlots.size === 1
    ) {
      return {
        template: "grouped_league_with_playoffs",
        supported: true,
        stageEdits,
        groupEdits,
        groupCount: firstStageGroups.length,
        advancingPerGroup: advancingSlots[0] ?? 2,
      };
    }
  }

  return {
    template: inferTemplateFromTournamentType(view.tournament.type),
    supported: false,
    stageEdits,
    groupEdits,
    groupCount: 2,
    advancingPerGroup: 2,
  };
}

export function getTournamentTypeForTemplate(template: TournamentTemplateKind) {
  if (template === "straight_knockout") {
    return "knockout";
  }

  if (template === "grouped_league_with_playoffs") {
    return "custom";
  }

  return "league";
}

export function buildTemplateDefaults(params: {
  advancingPerGroup: number;
  groupCount: number;
  template: TournamentTemplateKind;
}): {
  groupEdits: GroupEditDraft[];
  stageEdits: StageEditDraft[];
} {
  const { advancingPerGroup, groupCount, template } = params;

  if (template === "straight_league") {
    return {
      stageEdits: [
        {
          sequence: 1,
          name: "League Stage",
          code: "LEAGUE",
        },
      ],
      groupEdits: [],
    };
  }

  if (template === "straight_knockout") {
    return {
      stageEdits: [
        {
          sequence: 1,
          name: "Knockout Stage",
          code: "KNOCKOUT",
        },
      ],
      groupEdits: [],
    };
  }

  const groupEdits: GroupEditDraft[] = [];
  for (let index = 0; index < groupCount; index += 1) {
    groupEdits.push({
      stageSequence: 1,
      sequence: index + 1,
      name: getGroupName(index),
      code: `G${index + 1}`,
      advancingSlots: advancingPerGroup,
    });
  }

  return {
    stageEdits: [
      {
        sequence: 1,
        name: "Group Stage",
        code: "GROUP_STAGE",
      },
      {
        sequence: 2,
        name: "Playoffs",
        code: "PLAYOFFS",
      },
    ],
    groupEdits,
  };
}

export function mergeStageEdits(
  defaults: StageEditDraft[],
  current: StageEditDraft[]
) {
  const currentBySequence = new Map(
    current.map((stage) => [stage.sequence, stage])
  );

  return defaults.map((stage) => {
    const existing = currentBySequence.get(stage.sequence);
    if (!existing) {
      return stage;
    }

    return {
      sequence: stage.sequence,
      name: existing.name,
      code: existing.code,
    };
  });
}

export function mergeGroupEdits(
  defaults: GroupEditDraft[],
  current: GroupEditDraft[]
) {
  const currentByKey = new Map(
    current.map((group) => [`${group.stageSequence}:${group.sequence}`, group])
  );

  return defaults.map((group) => {
    const existing = currentByKey.get(
      `${group.stageSequence}:${group.sequence}`
    );
    if (!existing) {
      return group;
    }

    return {
      stageSequence: group.stageSequence,
      sequence: group.sequence,
      name: existing.name,
      code: existing.code,
      advancingSlots: existing.advancingSlots,
    };
  });
}

function buildBaseTournamentPayload(values: TournamentWizardValues) {
  return {
    name: values.name.trim(),
    season: values.season.trim() || undefined,
    category: values.category,
    genderAllowed: values.genderAllowed,
    ageLimit: values.ageLimit,
    startDate: values.startDate,
    endDate: values.endDate,
    timeZone: values.advanced.timeZone.trim() || undefined,
    championTeamId: values.advanced.championTeamId,
    organization:
      values.organization.mode === "existing"
        ? {
            existingId: values.organization.existingId ?? undefined,
          }
        : {
            create: values.organization.create,
          },
    defaultMatchFormat:
      values.defaultMatchFormat.mode === "existing"
        ? {
            existingId: values.defaultMatchFormat.existingId ?? undefined,
          }
        : {
            create: values.defaultMatchFormat.create,
          },
    teams: {
      existingTeamIds: values.teams.existingTeamIds,
      createTeams: values.teams.createTeams.map((team) => ({
        ...team,
        shortName: team.shortName.trim().toUpperCase(),
      })),
    },
    structure: {
      template: values.structure.template,
      groupCount:
        values.structure.template === "grouped_league_with_playoffs"
          ? values.structure.groupCount
          : undefined,
      advancingPerGroup:
        values.structure.template === "grouped_league_with_playoffs"
          ? values.structure.advancingPerGroup
          : undefined,
      stageEdits: values.structure.stageEdits.map((stage) => ({
        sequence: stage.sequence,
        name: stage.name.trim(),
        code: stage.code?.trim() || undefined,
      })),
      groupEdits: values.structure.groupEdits.map((group) => ({
        stageSequence: group.stageSequence,
        sequence: group.sequence,
        name: group.name.trim(),
        code: group.code?.trim() || undefined,
        advancingSlots: group.advancingSlots,
      })),
    },
  };
}

export function buildCreateTournamentFromScratchPayload(
  values: TournamentWizardValues
) {
  return buildBaseTournamentPayload(values);
}

export function buildUpdateTournamentFromScratchPayload(params: {
  tournamentId: number;
  values: TournamentWizardValues;
}) {
  return {
    tournamentId: params.tournamentId,
    ...buildBaseTournamentPayload(params.values),
  };
}

export function getDefaultWizardValues(today: Date): TournamentWizardValues {
  const defaults = buildTemplateDefaults({
    template: "straight_league",
    groupCount: 2,
    advancingPerGroup: 2,
  });

  return {
    name: "",
    season: "",
    category: "competitive",
    genderAllowed: "open",
    ageLimit: 100,
    startDate: today,
    endDate: today,
    advanced: {
      timeZone: "UTC",
      championTeamId: null,
    },
    organization: {
      mode: "existing",
      existingId: null,
      create: {
        name: "",
        slug: "",
        shortName: "",
        type: "association",
        scope: "local",
        country: "",
      },
    },
    defaultMatchFormat: {
      mode: "existing",
      existingId: null,
      create: {
        name: "",
        description: "",
        noOfInnings: 2,
        noOfOvers: 20,
        ballsPerOver: 6,
        maxOversPerBowler: 4,
        playersPerSide: 11,
        isDrawAllowed: false,
        isSuperOverAllowed: false,
      },
    },
    teams: {
      existingTeamIds: [],
      createTeams: [],
    },
    structure: {
      template: "straight_league",
      groupCount: 2,
      advancingPerGroup: 2,
      stageEdits: defaults.stageEdits,
      groupEdits: defaults.groupEdits,
    },
  };
}

export function deriveWizardValuesFromTournamentView(
  view: TournamentViewSnapshot
): TournamentWizardValues {
  const base = getDefaultWizardValues(normalizeDate(view.tournament.startDate));
  const inferred = inferTemplateFromTournamentView(view);

  return {
    ...base,
    name: view.tournament.name,
    season: view.tournament.season ?? "",
    category: view.tournament.category as TournamentCategory,
    genderAllowed: view.tournament.genderAllowed as TournamentGenderAllowed,
    ageLimit: view.tournament.ageLimit ?? 100,
    startDate: normalizeDate(view.tournament.startDate),
    endDate: normalizeDate(view.tournament.endDate),
    advanced: {
      timeZone: view.tournament.timeZone,
      championTeamId: view.tournament.championTeamId,
    },
    organization: {
      ...base.organization,
      mode: "existing",
      existingId: view.tournament.organizationId,
    },
    defaultMatchFormat: {
      ...base.defaultMatchFormat,
      mode: "existing",
      existingId: view.tournament.defaultMatchFormatId,
    },
    teams: {
      existingTeamIds: view.teams.map((entry) => entry.teamId),
      createTeams: [],
    },
    structure: {
      template: inferred.template,
      groupCount: inferred.groupCount,
      advancingPerGroup: inferred.advancingPerGroup,
      stageEdits: inferred.stageEdits,
      groupEdits: inferred.groupEdits,
    },
  };
}
