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
  ageLimit: number;
  category: TournamentCategory;
  defaultMatchFormat: {
    create: MatchFormatDraft;
    existingId: number | null;
    mode: "create" | "existing";
  };
  endDate: Date;
  genderAllowed: TournamentGenderAllowed;
  name: string;
  organization: {
    create: OrganizationDraft;
    existingId: number | null;
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

function getGroupName(index: number) {
  return `Group ${String.fromCharCode(65 + index)}`;
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

export function buildCreateTournamentFromScratchPayload(
  values: TournamentWizardValues
) {
  return {
    name: values.name.trim(),
    season: values.season.trim() || undefined,
    category: values.category,
    genderAllowed: values.genderAllowed,
    ageLimit: values.ageLimit,
    startDate: values.startDate,
    endDate: values.endDate,
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
