import { relations } from "drizzle-orm";
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
} from "../schema";

// Tournament relations
export const tournamentRelations = relations(tournaments, ({ many }) => ({
  matches: many(matches),
  tournamentTeams: many(tournamentTeams),
}));

// Team relations
export const teamRelations = relations(teams, ({ many }) => ({
  tournamentTeams: many(tournamentTeams),
  teamPlayers: many(teamPlayers),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  tossWins: many(matches, { relationName: "tossWinner" }),
  matchWins: many(matches, { relationName: "winner" }),
  innings: many(innings, { relationName: "battingTeam" }),
}));

// Player relations
export const playerRelations = relations(players, ({ many }) => ({
  teamPlayers: many(teamPlayers),
  strikerBalls: many(balls, { relationName: "striker" }),
  nonStrikerBalls: many(balls, { relationName: "nonStriker" }),
  bowlerBalls: many(balls, { relationName: "bowler" }),
  dismissedBalls: many(balls, { relationName: "dismissedPlayer" }),
  assistBalls: many(balls, { relationName: "assistPlayer" }),
  matchPerformances: many(playerMatchPerformance),
  tournamentStats: many(playerTournamentStats),
  careerStats: many(playerCareerStats),
}));

// Match relations
export const matchRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  tossWinner: one(teams, {
    fields: [matches.tossWinnerId],
    references: [teams.id],
  }),
  team1: one(teams, {
    fields: [matches.team1Id],
    references: [teams.id],
  }),
  team2: one(teams, {
    fields: [matches.team2Id],
    references: [teams.id],
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
  }),
  innings: many(innings),
  playerPerformances: many(playerMatchPerformance),
}));

// Innings relations
export const inningsRelations = relations(innings, ({ one, many }) => ({
  match: one(matches, {
    fields: [innings.matchId],
    references: [matches.id],
  }),
  battingTeam: one(teams, {
    fields: [innings.battingTeamId],
    references: [teams.id],
  }),
  bowlingTeam: one(teams, {
    fields: [innings.bowlingTeamId],
    references: [teams.id],
  }),
  balls: many(balls),
}));

// Ball relations
export const ballRelations = relations(balls, ({ one }) => ({
  innings: one(innings, {
    fields: [balls.inningsId],
    references: [innings.id],
  }),
  striker: one(players, {
    fields: [balls.strikerId],
    references: [players.id],
  }),
  nonStriker: one(players, {
    fields: [balls.nonStrikerId],
    references: [players.id],
  }),
  bowler: one(players, {
    fields: [balls.bowlerId],
    references: [players.id],
  }),
  dismissedPlayer: one(players, {
    fields: [balls.dismissedPlayerId],
    references: [players.id],
  }),
  assistPlayer: one(players, {
    fields: [balls.assistPlayerId],
    references: [players.id],
  }),
}));

// TournamentTeam relations
export const tournamentTeamRelations = relations(
  tournamentTeams,
  ({ one }) => ({
    tournament: one(tournaments, {
      fields: [tournamentTeams.tournamentId],
      references: [tournaments.id],
    }),
    team: one(teams, {
      fields: [tournamentTeams.teamId],
      references: [teams.id],
    }),
  })
);

// TeamPlayer relations
export const teamPlayerRelations = relations(teamPlayers, ({ one }) => ({
  team: one(teams, {
    fields: [teamPlayers.teamId],
    references: [teams.id],
  }),
  player: one(players, {
    fields: [teamPlayers.playerId],
    references: [players.id],
  }),
}));

// PlayerMatchPerformance relations
export const playerMatchPerformanceRelations = relations(
  playerMatchPerformance,
  ({ one }) => ({
    match: one(matches, {
      fields: [playerMatchPerformance.matchId],
      references: [matches.id],
    }),
    player: one(players, {
      fields: [playerMatchPerformance.playerId],
      references: [players.id],
    }),
    team: one(teams, {
      fields: [playerMatchPerformance.teamId],
      references: [teams.id],
    }),
    dismissedBy: one(players, {
      fields: [playerMatchPerformance.dismissedBy],
      references: [players.id],
    }),
  })
);

// PlayerTournamentStats relations
export const playerTournamentStatsRelations = relations(
  playerTournamentStats,
  ({ one }) => ({
    player: one(players, {
      fields: [playerTournamentStats.playerId],
      references: [players.id],
    }),
    tournament: one(tournaments, {
      fields: [playerTournamentStats.tournamentId],
      references: [tournaments.id],
    }),
    team: one(teams, {
      fields: [playerTournamentStats.teamId],
      references: [teams.id],
    }),
  })
);

// PlayerCareerStats relations
export const playerCareerStatsRelations = relations(
  playerCareerStats,
  ({ one }) => ({
    player: one(players, {
      fields: [playerCareerStats.playerId],
      references: [players.id],
    }),
  })
);
