import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  deliveries,
  innings,
  matches,
  matchLineup,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
  venues,
} from "@/db/schema";
import type {
  Delivery,
  Innings,
  Match,
  MatchLineup,
  NewDelivery,
  NewInnings,
  NewMatch,
  NewMatchLineup,
  NewPlayer,
  NewPlayerCareerStats,
  NewPlayerInningsStats,
  NewPlayerTournamentStats,
  NewTeam,
  NewTeamPlayer,
  NewTournament,
  NewTournamentTeam,
  NewVenue,
  Player,
  PlayerCareerStats,
  PlayerInningsStats,
  PlayerTournamentStats,
  Team,
  TeamPlayer,
  Tournament,
  TournamentTeam,
  Venue,
} from "@/db/types";

type CreatePlayerInput = Omit<NewPlayer, "id">;
type UpdatePlayerInput = Partial<CreatePlayerInput>;

type CreateTeamInput = Omit<NewTeam, "id">;
type UpdateTeamInput = Partial<CreateTeamInput>;

type CreateMatchInput = Omit<NewMatch, "id">;
type UpdateMatchInput = Partial<CreateMatchInput>;

type CreateTournamentInput = Omit<NewTournament, "id">;
type UpdateTournamentInput = Partial<CreateTournamentInput>;

type CreateVenueInput = Omit<NewVenue, "id">;
type UpdateVenueInput = Partial<CreateVenueInput>;

type CreateTeamPlayerInput = Omit<NewTeamPlayer, "id">;
type UpdateTeamPlayerInput = Partial<CreateTeamPlayerInput>;

type CreateTournamentTeamInput = Omit<NewTournamentTeam, "id">;
type UpdateTournamentTeamInput = Partial<CreateTournamentTeamInput>;

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
    const rows = await db.insert(tournaments).values(payload).returning();
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
