import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  balls,
  innings,
  matches,
  playerCareerStats,
  playerMatchPerformance,
  players,
  playerTournamentStats,
  teamPlayers,
  teams,
  tournaments,
  tournamentTeams,
  venues,
} from '@/db/schema';
import type {
  Ball,
  Innings,
  Match,
  NewBall,
  NewInnings,
  NewMatch,
  NewPlayer,
  NewPlayerCareerStats,
  NewPlayerMatchPerformance,
  NewPlayerTournamentStats,
  NewTeam,
  NewTeamPlayer,
  NewTournament,
  NewTournamentTeam,
  NewVenue,
  Player,
  PlayerCareerStats,
  PlayerMatchPerformance,
  PlayerTournamentStats,
  Team,
  TeamPlayer,
  Tournament,
  TournamentTeam,
  Venue,
} from '@/db/types';

type CreatePlayerInput = Omit<NewPlayer, 'id'>;
type UpdatePlayerInput = Partial<CreatePlayerInput>;

type CreateTeamInput = Omit<NewTeam, 'id'>;
type UpdateTeamInput = Partial<CreateTeamInput>;

type CreateMatchInput = Omit<NewMatch, 'id'>;
type UpdateMatchInput = Partial<CreateMatchInput>;

type CreateTournamentInput = Omit<NewTournament, 'id'>;
type UpdateTournamentInput = Partial<CreateTournamentInput>;

type CreateVenueInput = Omit<NewVenue, 'id'>;
type UpdateVenueInput = Partial<CreateVenueInput>;

type CreateTeamPlayerInput = Omit<NewTeamPlayer, 'id'>;
type UpdateTeamPlayerInput = Partial<CreateTeamPlayerInput>;

type CreateTournamentTeamInput = Omit<NewTournamentTeam, 'id'>;
type UpdateTournamentTeamInput = Partial<CreateTournamentTeamInput>;

type CreateInningsInput = Omit<NewInnings, 'id'>;
type UpdateInningsInput = Partial<CreateInningsInput>;

type CreateBallInput = Omit<NewBall, 'id'>;
type UpdateBallInput = Partial<CreateBallInput>;

type CreatePlayerMatchPerformanceInput = Omit<NewPlayerMatchPerformance, 'id'>;
type UpdatePlayerMatchPerformanceInput = Partial<CreatePlayerMatchPerformanceInput>;

type CreatePlayerTournamentStatsInput = Omit<NewPlayerTournamentStats, 'id'>;
type UpdatePlayerTournamentStatsInput = Partial<CreatePlayerTournamentStatsInput>;

type CreatePlayerCareerStatsInput = Omit<NewPlayerCareerStats, 'id'>;
type UpdatePlayerCareerStatsInput = Partial<CreatePlayerCareerStatsInput>;

export const playerCrudService = {
  list: (): Promise<Player[]> => db.select().from(players),
  async getById(id: number): Promise<Player | null> {
    const rows = await db.select().from(players).where(eq(players.id, id)).limit(1);
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
    const rows = await db.update(teams).set(payload).where(eq(teams.id, id)).returning();
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
    const rows = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
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
  async update(id: number, payload: UpdateTournamentInput): Promise<Tournament | null> {
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
    const rows = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateVenueInput): Promise<Venue | null> {
    const rows = await db.insert(venues).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateVenueInput): Promise<Venue | null> {
    const rows = await db.update(venues).set(payload).where(eq(venues.id, id)).returning();
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
  async create(payload: CreateTournamentTeamInput): Promise<TournamentTeam | null> {
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
    const rows = await db.select().from(innings).where(eq(innings.id, id)).limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateInningsInput): Promise<Innings | null> {
    const rows = await db.insert(innings).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateInningsInput): Promise<Innings | null> {
    const rows = await db.update(innings).set(payload).where(eq(innings.id, id)).returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(innings).where(eq(innings.id, id)).returning({
      id: innings.id,
    });
    return rows.length > 0;
  },
};

export const ballCrudService = {
  list: (): Promise<Ball[]> => db.select().from(balls),
  async getById(id: number): Promise<Ball | null> {
    const rows = await db.select().from(balls).where(eq(balls.id, id)).limit(1);
    return rows[0] ?? null;
  },
  async create(payload: CreateBallInput): Promise<Ball | null> {
    const rows = await db.insert(balls).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(id: number, payload: UpdateBallInput): Promise<Ball | null> {
    const rows = await db.update(balls).set(payload).where(eq(balls.id, id)).returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db.delete(balls).where(eq(balls.id, id)).returning({
      id: balls.id,
    });
    return rows.length > 0;
  },
};

export const playerMatchPerformanceCrudService = {
  list: (): Promise<PlayerMatchPerformance[]> => db.select().from(playerMatchPerformance),
  async getById(id: number): Promise<PlayerMatchPerformance | null> {
    const rows = await db
      .select()
      .from(playerMatchPerformance)
      .where(eq(playerMatchPerformance.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
  async create(
    payload: CreatePlayerMatchPerformanceInput
  ): Promise<PlayerMatchPerformance | null> {
    const rows = await db.insert(playerMatchPerformance).values(payload).returning();
    return rows[0] ?? null;
  },
  async update(
    id: number,
    payload: UpdatePlayerMatchPerformanceInput
  ): Promise<PlayerMatchPerformance | null> {
    const rows = await db
      .update(playerMatchPerformance)
      .set(payload)
      .where(eq(playerMatchPerformance.id, id))
      .returning();
    return rows[0] ?? null;
  },
  async remove(id: number): Promise<boolean> {
    const rows = await db
      .delete(playerMatchPerformance)
      .where(eq(playerMatchPerformance.id, id))
      .returning({
        id: playerMatchPerformance.id,
      });
    return rows.length > 0;
  },
};

export const playerTournamentStatsCrudService = {
  list: (): Promise<PlayerTournamentStats[]> => db.select().from(playerTournamentStats),
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
    const rows = await db.insert(playerTournamentStats).values(payload).returning();
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
  async create(payload: CreatePlayerCareerStatsInput): Promise<PlayerCareerStats | null> {
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
