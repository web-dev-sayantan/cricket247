import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  deliveries,
  innings,
  matches,
  matchLineup,
  matchParticipantSources,
  organizations,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  teamPlayers,
  teams,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournamentStageTeamEntries,
  tournaments,
  tournamentTeams,
  venues,
} from "@/db/schema";
import type {
  Delivery,
  Innings,
  Match,
  MatchLineup,
  MatchParticipantSource,
  NewDelivery,
  NewInnings,
  NewMatch,
  NewMatchLineup,
  NewMatchParticipantSource,
  NewOrganization,
  NewPlayer,
  NewPlayerCareerStats,
  NewPlayerInningsStats,
  NewPlayerTournamentStats,
  NewTeam,
  NewTeamPlayer,
  NewTournament,
  NewTournamentStage,
  NewTournamentStageAdvancement,
  NewTournamentStageGroup,
  NewTournamentStageTeamEntry,
  NewTournamentTeam,
  NewVenue,
  Organization,
  Player,
  PlayerCareerStats,
  PlayerInningsStats,
  PlayerTournamentStats,
  Team,
  TeamPlayer,
  Tournament,
  TournamentStage,
  TournamentStageAdvancement,
  TournamentStageGroup,
  TournamentStageTeamEntry,
  TournamentTeam,
  Venue,
} from "@/db/types";

type CreatePlayerInput = Omit<NewPlayer, "id">;
type UpdatePlayerInput = Partial<CreatePlayerInput>;

type CreateTeamInput = Omit<NewTeam, "id">;
type UpdateTeamInput = Partial<CreateTeamInput>;

type CreateMatchInput = Omit<NewMatch, "id">;
type UpdateMatchInput = Partial<CreateMatchInput>;

type CreateOrganizationInput = Omit<NewOrganization, "id">;
type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

type CreateTournamentInput = Omit<NewTournament, "id" | "organizationId"> & {
  organizationId?: number;
};
type UpdateTournamentInput = Partial<CreateTournamentInput>;

type CreateVenueInput = Omit<NewVenue, "id">;
type UpdateVenueInput = Partial<CreateVenueInput>;

type CreateTeamPlayerInput = Omit<NewTeamPlayer, "id">;
type UpdateTeamPlayerInput = Partial<CreateTeamPlayerInput>;

type CreateTournamentTeamInput = Omit<NewTournamentTeam, "id">;
type UpdateTournamentTeamInput = Partial<CreateTournamentTeamInput>;

type CreateTournamentStageInput = Omit<NewTournamentStage, "id">;
type UpdateTournamentStageInput = Partial<CreateTournamentStageInput>;

type CreateTournamentStageGroupInput = Omit<NewTournamentStageGroup, "id">;
type UpdateTournamentStageGroupInput = Partial<CreateTournamentStageGroupInput>;

type CreateTournamentStageTeamEntryInput = Omit<
  NewTournamentStageTeamEntry,
  "id"
>;
type UpdateTournamentStageTeamEntryInput =
  Partial<CreateTournamentStageTeamEntryInput>;

type CreateTournamentStageAdvancementInput = Omit<
  NewTournamentStageAdvancement,
  "id"
>;
type UpdateTournamentStageAdvancementInput =
  Partial<CreateTournamentStageAdvancementInput>;

type CreateMatchParticipantSourceInput = Omit<NewMatchParticipantSource, "id">;
type UpdateMatchParticipantSourceInput =
  Partial<CreateMatchParticipantSourceInput>;

type CreateInningsInput = Omit<NewInnings, "id">;
type UpdateInningsInput = Partial<CreateInningsInput>;

type CreateDeliveryInput = Omit<NewDelivery, "id">;
type UpdateDeliveryInput = Partial<CreateDeliveryInput>;

type CreateMatchLineupInput = Omit<NewMatchLineup, "id">;
type UpdateMatchLineupInput = Partial<CreateMatchLineupInput>;

type CreatePlayerInningsStatsInput = Omit<NewPlayerInningsStats, "id">;
type UpdatePlayerInningsStatsInput = Partial<CreatePlayerInningsStatsInput>;

type CreatePlayerTournamentStatsInput = Omit<NewPlayerTournamentStats, "id">;
type UpdatePlayerTournamentStatsInput =
  Partial<CreatePlayerTournamentStatsInput>;

type CreatePlayerCareerStatsInput = Omit<NewPlayerCareerStats, "id">;
type UpdatePlayerCareerStatsInput = Partial<CreatePlayerCareerStatsInput>;

const SYSTEM_ORGANIZATION_SLUG = "system";
const SYSTEM_TOURNAMENT_CATEGORIES = new Set([
  "practice",
  "recreational",
  "one_off",
]);

type CrudServiceErrorCode =
  | "SYSTEM_ORGANIZATION_NOT_FOUND"
  | "TOURNAMENT_ORGANIZATION_REQUIRED"
  | "ORGANIZATION_HAS_TOURNAMENTS"
  | "ORGANIZATION_DELETE_SYSTEM_FORBIDDEN"
  | "ORGANIZATION_DEACTIVATE_SYSTEM_FORBIDDEN"
  | "ORGANIZATION_SYSTEM_IDENTITY_IMMUTABLE"
  | "ORGANIZATION_SYSTEM_FLAG_IMMUTABLE";

export class CrudServiceError extends Error {
  code: CrudServiceErrorCode;

  constructor(code: CrudServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function getSystemOrganization(): Promise<Organization | null> {
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, SYSTEM_ORGANIZATION_SLUG))
    .limit(1);
  return rows[0] ?? null;
}

async function getOrganizationById(id: number): Promise<Organization | null> {
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export const playerCrudService = {
  list: (): Promise<Player[]> => db.select().from(players),
  async getById(id: number): Promise<Player | null> {
    const rows = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreatePlayerInput): Promise<Player | null> {
    const rows = await db.insert(players).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdatePlayerInput): Promise<Player | null> {
    const rows = await db
      .update(players)
      .set(payload)
      .where(eq(players.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(players).where(eq(players.id, id)).returning({
      id: players.id,
    });
    return rows.length > 0;
  },
};

export const teamCrudService = {
  list: (): Promise<Team[]> => db.select().from(teams),
  async getById(id: number): Promise<Team | null> {
    const rows = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateTeamInput): Promise<Team | null> {
    const rows = await db.insert(teams).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateTeamInput): Promise<Team | null> {
    const rows = await db
      .update(teams)
      .set(payload)
      .where(eq(teams.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(teams).where(eq(teams.id, id)).returning({
      id: teams.id,
    });
    return rows.length > 0;
  },
};

export const matchCrudService = {
  list: (): Promise<Match[]> => db.select().from(matches),
  async getById(id: number): Promise<Match | null> {
    const rows = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateMatchInput): Promise<Match | null> {
    const rows = await db.insert(matches).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateMatchInput): Promise<Match | null> {
    const rows = await db
      .update(matches)
      .set(payload)
      .where(eq(matches.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(matches).where(eq(matches.id, id)).returning({
      id: matches.id,
    });
    return rows.length > 0;
  },
};

export const organizationCrudService = {
  list: (): Promise<Organization[]> => db.select().from(organizations),
  getById: (id: number): Promise<Organization | null> =>
    getOrganizationById(id),
  async create(payload: CreateOrganizationInput): Promise<Organization | null> {
    if (payload.isSystem === true) {
      throw new CrudServiceError("ORGANIZATION_SYSTEM_FLAG_IMMUTABLE");
    }

    const rows = await db.insert(organizations).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateOrganizationInput
  ): Promise<Organization | null> {
    const existing = await getOrganizationById(id);
    if (!existing) {
      return null;
    }

    if (existing.isSystem) {
      if (payload.isActive === false) {
        throw new CrudServiceError("ORGANIZATION_DEACTIVATE_SYSTEM_FORBIDDEN");
      }

      if (
        (typeof payload.slug === "string" && payload.slug !== existing.slug) ||
        (payload.code !== undefined && payload.code !== existing.code) ||
        payload.isSystem === false
      ) {
        throw new CrudServiceError("ORGANIZATION_SYSTEM_IDENTITY_IMMUTABLE");
      }
    }

    if (!existing.isSystem && payload.isSystem === true) {
      throw new CrudServiceError("ORGANIZATION_SYSTEM_FLAG_IMMUTABLE");
    }

    const rows = await db
      .update(organizations)
      .set(payload)
      .where(eq(organizations.id, id))
      .returning();

    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const existing = await getOrganizationById(id);
    if (!existing) {
      return false;
    }

    if (existing.isSystem) {
      throw new CrudServiceError("ORGANIZATION_DELETE_SYSTEM_FORBIDDEN");
    }

    const linkedTournaments = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.organizationId, id))
      .limit(1);
    if (linkedTournaments.length > 0) {
      throw new CrudServiceError("ORGANIZATION_HAS_TOURNAMENTS");
    }

    const rows = await db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id });

    return rows.length > 0;
  },
};

export const tournamentCrudService = {
  list: (): Promise<Tournament[]> => db.select().from(tournaments),
  async getById(id: number): Promise<Tournament | null> {
    const rows = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateTournamentInput): Promise<Tournament | null> {
    const category = payload.category ?? "competitive";
    let organizationId = payload.organizationId;

    if (typeof organizationId !== "number") {
      if (!SYSTEM_TOURNAMENT_CATEGORIES.has(category)) {
        throw new CrudServiceError("TOURNAMENT_ORGANIZATION_REQUIRED");
      }

      const systemOrganization = await getSystemOrganization();
      if (!systemOrganization) {
        throw new CrudServiceError("SYSTEM_ORGANIZATION_NOT_FOUND");
      }

      organizationId = systemOrganization.id;
    }

    const rows = await db
      .insert(tournaments)
      .values({
        ...payload,
        organizationId,
      })
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentInput
  ): Promise<Tournament | null> {
    const rows = await db
      .update(tournaments)
      .set(payload)
      .where(eq(tournaments.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournaments)
      .where(eq(tournaments.id, id))
      .returning({
        id: tournaments.id,
      });
    return rows.length > 0;
  },
};

export const venueCrudService = {
  list: (): Promise<Venue[]> => db.select().from(venues),
  async getById(id: number): Promise<Venue | null> {
    const rows = await db
      .select()
      .from(venues)
      .where(eq(venues.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateVenueInput): Promise<Venue | null> {
    const rows = await db.insert(venues).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateVenueInput): Promise<Venue | null> {
    const rows = await db
      .update(venues)
      .set(payload)
      .where(eq(venues.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(venues).where(eq(venues.id, id)).returning({
      id: venues.id,
    });
    return rows.length > 0;
  },
};

export const teamPlayerCrudService = {
  list: (): Promise<TeamPlayer[]> => db.select().from(teamPlayers),
  async getById(id: number): Promise<TeamPlayer | null> {
    const rows = await db
      .select()
      .from(teamPlayers)
      .where(eq(teamPlayers.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateTeamPlayerInput): Promise<TeamPlayer | null> {
    const rows = await db.insert(teamPlayers).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTeamPlayerInput
  ): Promise<TeamPlayer | null> {
    const rows = await db
      .update(teamPlayers)
      .set(payload)
      .where(eq(teamPlayers.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(teamPlayers)
      .where(eq(teamPlayers.id, id))
      .returning({
        id: teamPlayers.id,
      });
    return rows.length > 0;
  },
};

export const tournamentTeamCrudService = {
  list: (): Promise<TournamentTeam[]> => db.select().from(tournamentTeams),
  async getById(id: number): Promise<TournamentTeam | null> {
    const rows = await db
      .select()
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateTournamentTeamInput
  ): Promise<TournamentTeam | null> {
    const rows = await db.insert(tournamentTeams).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentTeamInput
  ): Promise<TournamentTeam | null> {
    const rows = await db
      .update(tournamentTeams)
      .set(payload)
      .where(eq(tournamentTeams.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournamentTeams)
      .where(eq(tournamentTeams.id, id))
      .returning({
        id: tournamentTeams.id,
      });
    return rows.length > 0;
  },
};

export const tournamentStageCrudService = {
  list: (): Promise<TournamentStage[]> => db.select().from(tournamentStages),
  async getById(id: number): Promise<TournamentStage | null> {
    const rows = await db
      .select()
      .from(tournamentStages)
      .where(eq(tournamentStages.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateTournamentStageInput
  ): Promise<TournamentStage | null> {
    const rows = await db.insert(tournamentStages).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentStageInput
  ): Promise<TournamentStage | null> {
    const rows = await db
      .update(tournamentStages)
      .set(payload)
      .where(eq(tournamentStages.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournamentStages)
      .where(eq(tournamentStages.id, id))
      .returning({
        id: tournamentStages.id,
      });
    return rows.length > 0;
  },
};

export const tournamentStageGroupCrudService = {
  list: (): Promise<TournamentStageGroup[]> =>
    db.select().from(tournamentStageGroups),
  async getById(id: number): Promise<TournamentStageGroup | null> {
    const rows = await db
      .select()
      .from(tournamentStageGroups)
      .where(eq(tournamentStageGroups.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateTournamentStageGroupInput
  ): Promise<TournamentStageGroup | null> {
    const rows = await db
      .insert(tournamentStageGroups)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentStageGroupInput
  ): Promise<TournamentStageGroup | null> {
    const rows = await db
      .update(tournamentStageGroups)
      .set(payload)
      .where(eq(tournamentStageGroups.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournamentStageGroups)
      .where(eq(tournamentStageGroups.id, id))
      .returning({
        id: tournamentStageGroups.id,
      });
    return rows.length > 0;
  },
};

export const tournamentStageTeamEntryCrudService = {
  list: (): Promise<TournamentStageTeamEntry[]> =>
    db.select().from(tournamentStageTeamEntries),
  async getById(id: number): Promise<TournamentStageTeamEntry | null> {
    const rows = await db
      .select()
      .from(tournamentStageTeamEntries)
      .where(eq(tournamentStageTeamEntries.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateTournamentStageTeamEntryInput
  ): Promise<TournamentStageTeamEntry | null> {
    const rows = await db
      .insert(tournamentStageTeamEntries)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentStageTeamEntryInput
  ): Promise<TournamentStageTeamEntry | null> {
    const rows = await db
      .update(tournamentStageTeamEntries)
      .set(payload)
      .where(eq(tournamentStageTeamEntries.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournamentStageTeamEntries)
      .where(eq(tournamentStageTeamEntries.id, id))
      .returning({
        id: tournamentStageTeamEntries.id,
      });
    return rows.length > 0;
  },
};

export const tournamentStageAdvancementCrudService = {
  list: (): Promise<TournamentStageAdvancement[]> =>
    db.select().from(tournamentStageAdvancements),
  async getById(id: number): Promise<TournamentStageAdvancement | null> {
    const rows = await db
      .select()
      .from(tournamentStageAdvancements)
      .where(eq(tournamentStageAdvancements.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateTournamentStageAdvancementInput
  ): Promise<TournamentStageAdvancement | null> {
    const rows = await db
      .insert(tournamentStageAdvancements)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateTournamentStageAdvancementInput
  ): Promise<TournamentStageAdvancement | null> {
    const rows = await db
      .update(tournamentStageAdvancements)
      .set(payload)
      .where(eq(tournamentStageAdvancements.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(tournamentStageAdvancements)
      .where(eq(tournamentStageAdvancements.id, id))
      .returning({
        id: tournamentStageAdvancements.id,
      });
    return rows.length > 0;
  },
};

export const matchParticipantSourceCrudService = {
  list: (): Promise<MatchParticipantSource[]> =>
    db.select().from(matchParticipantSources),
  async getById(id: number): Promise<MatchParticipantSource | null> {
    const rows = await db
      .select()
      .from(matchParticipantSources)
      .where(eq(matchParticipantSources.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreateMatchParticipantSourceInput
  ): Promise<MatchParticipantSource | null> {
    const rows = await db
      .insert(matchParticipantSources)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateMatchParticipantSourceInput
  ): Promise<MatchParticipantSource | null> {
    const rows = await db
      .update(matchParticipantSources)
      .set(payload)
      .where(eq(matchParticipantSources.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(matchParticipantSources)
      .where(eq(matchParticipantSources.id, id))
      .returning({
        id: matchParticipantSources.id,
      });
    return rows.length > 0;
  },
};

export const inningsCrudService = {
  list: (): Promise<Innings[]> => db.select().from(innings),
  async getById(id: number): Promise<Innings | null> {
    const rows = await db
      .select()
      .from(innings)
      .where(eq(innings.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateInningsInput): Promise<Innings | null> {
    const rows = await db.insert(innings).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateInningsInput
  ): Promise<Innings | null> {
    const rows = await db
      .update(innings)
      .set(payload)
      .where(eq(innings.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(innings).where(eq(innings.id, id)).returning({
      id: innings.id,
    });
    return rows.length > 0;
  },
};

export const deliveryCrudService = {
  list: (): Promise<Delivery[]> => db.select().from(deliveries),
  async getById(id: number): Promise<Delivery | null> {
    const rows = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateDeliveryInput): Promise<Delivery | null> {
    const rows = await db.insert(deliveries).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateDeliveryInput
  ): Promise<Delivery | null> {
    const rows = await db
      .update(deliveries)
      .set(payload)
      .where(eq(deliveries.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(deliveries)
      .where(eq(deliveries.id, id))
      .returning({
        id: deliveries.id,
      });
    return rows.length > 0;
  },
};

export const matchLineupCrudService = {
  list: (): Promise<MatchLineup[]> => db.select().from(matchLineup),
  async getById(id: number): Promise<MatchLineup | null> {
    const rows = await db
      .select()
      .from(matchLineup)
      .where(eq(matchLineup.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateMatchLineupInput): Promise<MatchLineup | null> {
    const rows = await db.insert(matchLineup).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdateMatchLineupInput
  ): Promise<MatchLineup | null> {
    const rows = await db
      .update(matchLineup)
      .set(payload)
      .where(eq(matchLineup.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(matchLineup)
      .where(eq(matchLineup.id, id))
      .returning({
        id: matchLineup.id,
      });
    return rows.length > 0;
  },
};

export const playerInningsStatsCrudService = {
  list: (): Promise<PlayerInningsStats[]> =>
    db.select().from(playerInningsStats),
  async getById(id: number): Promise<PlayerInningsStats | null> {
    const rows = await db
      .select()
      .from(playerInningsStats)
      .where(eq(playerInningsStats.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreatePlayerInningsStatsInput
  ): Promise<PlayerInningsStats | null> {
    const rows = await db
      .insert(playerInningsStats)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdatePlayerInningsStatsInput
  ): Promise<PlayerInningsStats | null> {
    const rows = await db
      .update(playerInningsStats)
      .set(payload)
      .where(eq(playerInningsStats.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(playerInningsStats)
      .where(eq(playerInningsStats.id, id))
      .returning({
        id: playerInningsStats.id,
      });
    return rows.length > 0;
  },
};

export const playerTournamentStatsCrudService = {
  list: (): Promise<PlayerTournamentStats[]> =>
    db.select().from(playerTournamentStats),
  async getById(id: number): Promise<PlayerTournamentStats | null> {
    const rows = await db
      .select()
      .from(playerTournamentStats)
      .where(eq(playerTournamentStats.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreatePlayerTournamentStatsInput
  ): Promise<PlayerTournamentStats | null> {
    const rows = await db
      .insert(playerTournamentStats)
      .values(payload)
      .returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdatePlayerTournamentStatsInput
  ): Promise<PlayerTournamentStats | null> {
    const rows = await db
      .update(playerTournamentStats)
      .set(payload)
      .where(eq(playerTournamentStats.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(playerTournamentStats)
      .where(eq(playerTournamentStats.id, id))
      .returning({
        id: playerTournamentStats.id,
      });
    return rows.length > 0;
  },
};

export const playerCareerStatsCrudService = {
  list: (): Promise<PlayerCareerStats[]> => db.select().from(playerCareerStats),
  async getById(id: number): Promise<PlayerCareerStats | null> {
    const rows = await db
      .select()
      .from(playerCareerStats)
      .where(eq(playerCareerStats.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreatePlayerCareerStatsInput
  ): Promise<PlayerCareerStats | null> {
    const rows = await db.insert(playerCareerStats).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdatePlayerCareerStatsInput
  ): Promise<PlayerCareerStats | null> {
    const rows = await db
      .update(playerCareerStats)
      .set(payload)
      .where(eq(playerCareerStats.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(playerCareerStats)
      .where(eq(playerCareerStats.id, id))
      .returning({
        id: playerCareerStats.id,
      });
    return rows.length > 0;
  },
};

// Backward-compatible service aliases used by existing routes.
export const ballCrudService = deliveryCrudService;
export const playerMatchPerformanceCrudService = playerInningsStatsCrudService;
