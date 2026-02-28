import { describe, expect, it } from "bun:test";
import {
  buildCreateTournamentFromScratchPayload,
  buildTemplateDefaults,
  getDefaultWizardValues,
  mergeGroupEdits,
  mergeStageEdits,
} from "./-create-wizard";

describe("tournament create wizard helpers", () => {
  it("builds grouped template defaults with expected stages and groups", () => {
    const defaults = buildTemplateDefaults({
      template: "grouped_league_with_playoffs",
      groupCount: 3,
      advancingPerGroup: 2,
    });

    expect(defaults.stageEdits).toHaveLength(2);
    expect(defaults.groupEdits).toHaveLength(3);
    expect(defaults.groupEdits[0]?.name).toBe("Group A");
    expect(defaults.groupEdits[2]?.code).toBe("G3");
  });

  it("merges edits while keeping user overrides", () => {
    const defaults = buildTemplateDefaults({
      template: "grouped_league_with_playoffs",
      groupCount: 2,
      advancingPerGroup: 2,
    });

    const mergedStages = mergeStageEdits(defaults.stageEdits, [
      {
        sequence: 1,
        name: "Custom Group Phase",
        code: "GROUP_PHASE",
      },
    ]);

    const mergedGroups = mergeGroupEdits(defaults.groupEdits, [
      {
        stageSequence: 1,
        sequence: 2,
        name: "Custom Group B",
        code: "CB",
        advancingSlots: 3,
      },
    ]);

    expect(mergedStages[0]?.name).toBe("Custom Group Phase");
    expect(mergedGroups[1]?.name).toBe("Custom Group B");
    expect(mergedGroups[1]?.advancingSlots).toBe(3);
  });

  it("builds create payload with normalized team short names", () => {
    const values = getDefaultWizardValues(new Date("2026-01-01T00:00:00.000Z"));
    values.name = "City League";
    values.organization.mode = "create";
    values.organization.create.name = "City Org";
    values.organization.create.slug = "city-org";
    values.defaultMatchFormat.mode = "create";
    values.defaultMatchFormat.create.name = "T20";
    values.teams.existingTeamIds = [11, 12];
    values.teams.createTeams = [
      {
        name: "Inline Team",
        shortName: "it",
        country: "India",
      },
    ];
    values.structure.template = "straight_league";

    const payload = buildCreateTournamentFromScratchPayload(values);

    expect(payload.teams.createTeams[0]?.shortName).toBe("IT");
    expect(payload.structure.groupCount).toBeUndefined();
    expect(payload.structure.advancingPerGroup).toBeUndefined();
  });
});
