import { db } from "@/db";
import {
  matchFormats,
  organizations,
  teams,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournamentStageTeamEntries,
  tournaments,
  tournamentTeams,
  tournamentVenues,
} from "@/db/schema";

const MATCH_FORMAT_ID = 91_001;
const ORGANIZATION_ID = 91_001;
const TOURNAMENT_ID = 91_001;

const GROUP_STAGE_ID = 91_001;
const QUARTER_FINAL_STAGE_ID = 91_002;
const SEMI_FINAL_STAGE_ID = 91_003;
const FINAL_STAGE_ID = 91_004;

const GROUP_A_ID = 91_001;
const GROUP_B_ID = 91_002;

const TEAM_SEEDS = [
  {
    country: "India",
    id: 91_101,
    name: "Mumbai Mariners",
    shortName: "MMR",
  },
  {
    country: "India",
    id: 91_102,
    name: "Delhi Dynamos",
    shortName: "DDY",
  },
  {
    country: "India",
    id: 91_103,
    name: "Bengaluru Blazers",
    shortName: "BBZ",
  },
  {
    country: "India",
    id: 91_104,
    name: "Chennai Chargers",
    shortName: "CHG",
  },
  {
    country: "India",
    id: 91_105,
    name: "Pune Panthers",
    shortName: "PPT",
  },
  {
    country: "India",
    id: 91_106,
    name: "Hyderabad Hawks",
    shortName: "HHK",
  },
  {
    country: "India",
    id: 91_107,
    name: "Kolkata Kings",
    shortName: "KKS",
  },
  {
    country: "India",
    id: 91_108,
    name: "Jaipur Jaguars",
    shortName: "JJR",
  },
  {
    country: "India",
    id: 91_109,
    name: "Lucknow Leopards",
    shortName: "LLP",
  },
  {
    country: "India",
    id: 91_110,
    name: "Ahmedabad Aces",
    shortName: "AAC",
  },
  {
    country: "India",
    id: 91_111,
    name: "Goa Guardians",
    shortName: "GGD",
  },
  {
    country: "India",
    id: 91_112,
    name: "Kochi Knights",
    shortName: "KKN",
  },
] as const;

const GROUP_A_TEAM_IDS = [
  91_101, 91_102, 91_103, 91_104, 91_105, 91_106,
] as const;
const GROUP_B_TEAM_IDS = [
  91_107, 91_108, 91_109, 91_110, 91_111, 91_112,
] as const;

const GROUP_A_QUALIFIER_IDS = [91_101, 91_102, 91_103, 91_104] as const;
const GROUP_B_QUALIFIER_IDS = [91_107, 91_108, 91_109, 91_110] as const;
const TOURNAMENT_VENUE_IDS = [92_001, 92_002, 92_003] as const;

const seedTournamentVenues = async () => {
  await db.transaction(async (tx) => {
    for (const [index, venueId] of TOURNAMENT_VENUE_IDS.entries()) {
      const venue = await tx.query.venues.findFirst({
        where: {
          id: venueId,
        },
      });

      if (!venue) {
        continue;
      }

      await tx
        .insert(tournamentVenues)
        .values({
          id: 92_101 + index,
          tournamentId: TOURNAMENT_ID,
          venueId,
        })
        .onConflictDoUpdate({
          target: tournamentVenues.id,
          set: {
            tournamentId: TOURNAMENT_ID,
            venueId,
          },
        });
    }
  });
};

const seedTournamentData = async () => {
  const tournamentStartDate = new Date("2026-04-01T00:00:00.000Z");
  const tournamentEndDate = new Date("2026-05-20T00:00:00.000Z");

  await db.transaction(async (tx) => {
    await tx
      .insert(matchFormats)
      .values({
        ballsPerOver: 6,
        description: "Standard T20 format for seeded organization tournament.",
        id: MATCH_FORMAT_ID,
        isDrawAllowed: false,
        isSuperOverAllowed: true,
        maxLegalBallsPerInnings: 120,
        maxOversPerBowler: 4,
        name: "T20 Seed Format",
        noOfInnings: 2,
        noOfOvers: 20,
        playersPerSide: 11,
      })
      .onConflictDoUpdate({
        set: {
          ballsPerOver: 6,
          description:
            "Standard T20 format for seeded organization tournament.",
          isDrawAllowed: false,
          isSuperOverAllowed: true,
          maxLegalBallsPerInnings: 120,
          maxOversPerBowler: 4,
          name: "T20 Seed Format",
          noOfInnings: 2,
          noOfOvers: 20,
          playersPerSide: 11,
        },
        target: matchFormats.id,
      });

    await tx
      .insert(organizations)
      .values({
        code: "C247A",
        country: "India",
        description: "Seeded organization for tournament structure testing.",
        id: ORGANIZATION_ID,
        name: "Cricket247 Association",
        scope: "regional",
        shortName: "C247A",
        slug: "cricket247-association",
        type: "association",
        website: "https://cricket247.local/association",
      })
      .onConflictDoUpdate({
        set: {
          code: "C247A",
          country: "India",
          description: "Seeded organization for tournament structure testing.",
          name: "Cricket247 Association",
          scope: "regional",
          shortName: "C247A",
          slug: "cricket247-association",
          type: "association",
          website: "https://cricket247.local/association",
        },
        target: organizations.id,
      });

    for (const team of TEAM_SEEDS) {
      await tx
        .insert(teams)
        .values(team)
        .onConflictDoUpdate({
          set: {
            country: team.country,
            name: team.name,
            shortName: team.shortName,
          },
          target: teams.id,
        });
    }

    await tx
      .insert(tournaments)
      .values({
        ageLimit: 100,
        category: "competitive",
        defaultMatchFormatId: MATCH_FORMAT_ID,
        endDate: tournamentEndDate,
        genderAllowed: "open",
        id: TOURNAMENT_ID,
        name: "Cricket247 Champions Cup 2026",
        organizationId: ORGANIZATION_ID,
        season: "2026",
        startDate: tournamentStartDate,
        type: "custom",
      })
      .onConflictDoUpdate({
        set: {
          ageLimit: 100,
          category: "competitive",
          defaultMatchFormatId: MATCH_FORMAT_ID,
          endDate: tournamentEndDate,
          genderAllowed: "open",
          name: "Cricket247 Champions Cup 2026",
          organizationId: ORGANIZATION_ID,
          season: "2026",
          startDate: tournamentStartDate,
          type: "custom",
        },
        target: tournaments.id,
      });

    for (const [index, team] of TEAM_SEEDS.entries()) {
      await tx
        .insert(tournamentTeams)
        .values({
          id: 91_201 + index,
          teamId: team.id,
          tournamentId: TOURNAMENT_ID,
        })
        .onConflictDoUpdate({
          set: {
            teamId: team.id,
            tournamentId: TOURNAMENT_ID,
          },
          target: tournamentTeams.id,
        });
    }

    const stageSeeds = [
      {
        code: "GROUP",
        format: "single_round_robin",
        id: GROUP_STAGE_ID,
        matchFormatId: MATCH_FORMAT_ID,
        name: "Group Stage",
        qualificationSlots: 8,
        sequence: 1,
        stageType: "group",
        status: "upcoming",
        tournamentId: TOURNAMENT_ID,
      },
      {
        code: "QF",
        format: "single_elimination",
        id: QUARTER_FINAL_STAGE_ID,
        matchFormatId: MATCH_FORMAT_ID,
        name: "Quarter Finals",
        qualificationSlots: 4,
        sequence: 2,
        stageType: "knockout",
        status: "upcoming",
        tournamentId: TOURNAMENT_ID,
      },
      {
        code: "SF",
        format: "single_elimination",
        id: SEMI_FINAL_STAGE_ID,
        matchFormatId: MATCH_FORMAT_ID,
        name: "Semi Finals",
        qualificationSlots: 2,
        sequence: 3,
        stageType: "knockout",
        status: "upcoming",
        tournamentId: TOURNAMENT_ID,
      },
      {
        code: "F",
        format: "single_elimination",
        id: FINAL_STAGE_ID,
        matchFormatId: MATCH_FORMAT_ID,
        name: "Final",
        qualificationSlots: 1,
        sequence: 4,
        stageType: "knockout",
        status: "upcoming",
        tournamentId: TOURNAMENT_ID,
      },
    ] as const;

    for (const stage of stageSeeds) {
      await tx
        .insert(tournamentStages)
        .values(stage)
        .onConflictDoUpdate({
          set: {
            code: stage.code,
            format: stage.format,
            matchFormatId: stage.matchFormatId,
            name: stage.name,
            qualificationSlots: stage.qualificationSlots,
            sequence: stage.sequence,
            stageType: stage.stageType,
            status: stage.status,
            tournamentId: stage.tournamentId,
          },
          target: tournamentStages.id,
        });
    }

    await tx
      .insert(tournamentStageGroups)
      .values([
        {
          advancingSlots: 4,
          code: "A",
          id: GROUP_A_ID,
          name: "Group A",
          sequence: 1,
          stageId: GROUP_STAGE_ID,
        },
        {
          advancingSlots: 4,
          code: "B",
          id: GROUP_B_ID,
          name: "Group B",
          sequence: 2,
          stageId: GROUP_STAGE_ID,
        },
      ])
      .onConflictDoUpdate({
        set: {
          advancingSlots: 4,
        },
        target: tournamentStageGroups.id,
      });

    for (const [index, teamId] of GROUP_A_TEAM_IDS.entries()) {
      await tx
        .insert(tournamentStageTeamEntries)
        .values({
          entrySource: "direct",
          id: 91_301 + index,
          isEliminated: false,
          isQualified: false,
          seed: index + 1,
          stageGroupId: GROUP_A_ID,
          stageId: GROUP_STAGE_ID,
          teamId,
          tournamentId: TOURNAMENT_ID,
        })
        .onConflictDoUpdate({
          set: {
            entrySource: "direct",
            isEliminated: false,
            isQualified: false,
            seed: index + 1,
            stageGroupId: GROUP_A_ID,
            stageId: GROUP_STAGE_ID,
            teamId,
            tournamentId: TOURNAMENT_ID,
          },
          target: tournamentStageTeamEntries.id,
        });
    }

    for (const [index, teamId] of GROUP_B_TEAM_IDS.entries()) {
      await tx
        .insert(tournamentStageTeamEntries)
        .values({
          entrySource: "direct",
          id: 91_311 + index,
          isEliminated: false,
          isQualified: false,
          seed: index + 1,
          stageGroupId: GROUP_B_ID,
          stageId: GROUP_STAGE_ID,
          teamId,
          tournamentId: TOURNAMENT_ID,
        })
        .onConflictDoUpdate({
          set: {
            entrySource: "direct",
            isEliminated: false,
            isQualified: false,
            seed: index + 1,
            stageGroupId: GROUP_B_ID,
            stageId: GROUP_STAGE_ID,
            teamId,
            tournamentId: TOURNAMENT_ID,
          },
          target: tournamentStageTeamEntries.id,
        });
    }

    for (const [index, teamId] of GROUP_A_QUALIFIER_IDS.entries()) {
      await tx
        .insert(tournamentStageTeamEntries)
        .values({
          entrySource: "qualified",
          id: 91_321 + index,
          isEliminated: false,
          isQualified: true,
          seed: index + 1,
          stageId: QUARTER_FINAL_STAGE_ID,
          teamId,
          tournamentId: TOURNAMENT_ID,
        })
        .onConflictDoUpdate({
          set: {
            entrySource: "qualified",
            isEliminated: false,
            isQualified: true,
            seed: index + 1,
            stageId: QUARTER_FINAL_STAGE_ID,
            teamId,
            tournamentId: TOURNAMENT_ID,
          },
          target: tournamentStageTeamEntries.id,
        });
    }

    for (const [index, teamId] of GROUP_B_QUALIFIER_IDS.entries()) {
      await tx
        .insert(tournamentStageTeamEntries)
        .values({
          entrySource: "qualified",
          id: 91_325 + index,
          isEliminated: false,
          isQualified: true,
          seed: index + 5,
          stageId: QUARTER_FINAL_STAGE_ID,
          teamId,
          tournamentId: TOURNAMENT_ID,
        })
        .onConflictDoUpdate({
          set: {
            entrySource: "qualified",
            isEliminated: false,
            isQualified: true,
            seed: index + 5,
            stageId: QUARTER_FINAL_STAGE_ID,
            teamId,
            tournamentId: TOURNAMENT_ID,
          },
          target: tournamentStageTeamEntries.id,
        });
    }

    const advancementSeeds = [
      {
        fromStageGroupId: GROUP_A_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_401,
        positionFrom: 1,
        qualificationType: "position",
        toSlot: 1,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_A_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_402,
        positionFrom: 2,
        qualificationType: "position",
        toSlot: 2,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_A_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_403,
        positionFrom: 3,
        qualificationType: "position",
        toSlot: 3,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_A_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_404,
        positionFrom: 4,
        qualificationType: "position",
        toSlot: 4,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_B_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_405,
        positionFrom: 1,
        qualificationType: "position",
        toSlot: 5,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_B_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_406,
        positionFrom: 2,
        qualificationType: "position",
        toSlot: 6,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_B_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_407,
        positionFrom: 3,
        qualificationType: "position",
        toSlot: 7,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageGroupId: GROUP_B_ID,
        fromStageId: GROUP_STAGE_ID,
        id: 91_408,
        positionFrom: 4,
        qualificationType: "position",
        toSlot: 8,
        toStageId: QUARTER_FINAL_STAGE_ID,
      },
      {
        fromStageId: QUARTER_FINAL_STAGE_ID,
        id: 91_409,
        positionFrom: 1,
        qualificationType: "knockout_winner",
        toSlot: 1,
        toStageId: SEMI_FINAL_STAGE_ID,
      },
      {
        fromStageId: QUARTER_FINAL_STAGE_ID,
        id: 91_410,
        positionFrom: 2,
        qualificationType: "knockout_winner",
        toSlot: 2,
        toStageId: SEMI_FINAL_STAGE_ID,
      },
      {
        fromStageId: QUARTER_FINAL_STAGE_ID,
        id: 91_411,
        positionFrom: 3,
        qualificationType: "knockout_winner",
        toSlot: 3,
        toStageId: SEMI_FINAL_STAGE_ID,
      },
      {
        fromStageId: QUARTER_FINAL_STAGE_ID,
        id: 91_412,
        positionFrom: 4,
        qualificationType: "knockout_winner",
        toSlot: 4,
        toStageId: SEMI_FINAL_STAGE_ID,
      },
      {
        fromStageId: SEMI_FINAL_STAGE_ID,
        id: 91_413,
        positionFrom: 1,
        qualificationType: "knockout_winner",
        toSlot: 1,
        toStageId: FINAL_STAGE_ID,
      },
      {
        fromStageId: SEMI_FINAL_STAGE_ID,
        id: 91_414,
        positionFrom: 2,
        qualificationType: "knockout_winner",
        toSlot: 2,
        toStageId: FINAL_STAGE_ID,
      },
    ] as const;

    for (const advancement of advancementSeeds) {
      const fromStageGroupId =
        "fromStageGroupId" in advancement ? advancement.fromStageGroupId : null;

      await tx
        .insert(tournamentStageAdvancements)
        .values(advancement)
        .onConflictDoUpdate({
          set: {
            fromStageGroupId,
            fromStageId: advancement.fromStageId,
            positionFrom: advancement.positionFrom,
            qualificationType: advancement.qualificationType,
            toSlot: advancement.toSlot,
            toStageId: advancement.toStageId,
          },
          target: tournamentStageAdvancements.id,
        });
    }
  });
};

await seedTournamentData();
await seedTournamentVenues();
