import { describe, expect, it } from "bun:test";
import {
  buildCreateTournamentFromScratchPayload,
  buildTemplateDefaults,
  buildUpdateTournamentFromScratchPayload,
  deriveWizardValuesFromTournamentView,
  getDefaultWizardValues,
  inferTemplateFromTournamentView,
  mergeGroupEdits,
  mergeStageEdits,
} from "./-create-wizard";

describe("tournament wizard helpers", () => {
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

  it("builds create and update payloads with normalized values", () => {
    const values = getDefaultWizardValues(new Date("2026-01-01T00:00:00.000Z"));
    values.name = "City League";
    values.advanced.timeZone = "Asia/Kolkata";
    values.advanced.championTeamId = 11;
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

    const createPayload = buildCreateTournamentFromScratchPayload(values);
    const updatePayload = buildUpdateTournamentFromScratchPayload({
      tournamentId: 44,
      values,
    });

    expect(createPayload.teams.createTeams[0]?.shortName).toBe("IT");
    expect(createPayload.timeZone).toBe("Asia/Kolkata");
    expect(createPayload.championTeamId).toBe(11);
    expect(createPayload.structure.groupCount).toBeUndefined();
    expect(updatePayload.tournamentId).toBe(44);
  });

  it("infers supported grouped template and derives edit defaults from tournament view", () => {
    const view = {
      tournament: {
        ageLimit: 100,
        category: "competitive",
        championTeamId: 3,
        defaultMatchFormatId: 88,
        endDate: new Date("2026-06-30T00:00:00.000Z"),
        genderAllowed: "open",
        name: "Summer Cup",
        organizationId: 5,
        season: "2026",
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        timeZone: "Asia/Kolkata",
        type: "custom",
      },
      teams: [{ teamId: 1 }, { teamId: 2 }, { teamId: 3 }, { teamId: 4 }],
      stages: [
        {
          code: "GROUP_STAGE",
          format: "single_round_robin",
          groups: [
            {
              advancingSlots: 2,
              code: "G1",
              sequence: 1,
              name: "Group A",
            },
            {
              advancingSlots: 2,
              code: "G2",
              sequence: 2,
              name: "Group B",
            },
          ],
          name: "Group Stage",
          sequence: 1,
          stageType: "league",
        },
        {
          code: "PLAYOFFS",
          format: "single_elimination",
          groups: [],
          name: "Playoffs",
          sequence: 2,
          stageType: "knockout",
        },
      ],
    };

    const inference = inferTemplateFromTournamentView(view);
    const values = deriveWizardValuesFromTournamentView(view);

    expect(inference.supported).toBe(true);
    expect(inference.template).toBe("grouped_league_with_playoffs");
    expect(inference.groupCount).toBe(2);
    expect(values.structure.template).toBe("grouped_league_with_playoffs");
    expect(values.advanced.timeZone).toBe("Asia/Kolkata");
    expect(values.defaultMatchFormat.existingId).toBe(88);
  });
});
