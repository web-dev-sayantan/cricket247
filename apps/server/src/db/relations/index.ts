import { defineRelations } from "drizzle-orm";
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

export const relations = defineRelations(
  {
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
  },
  (r) => ({
    tournaments: {
      matches: r.many.matches(),
      tournamentTeams: r.many.tournamentTeams(),
    },
    teams: {
      tournamentTeams: r.many.tournamentTeams(),
      teamPlayers: r.many.teamPlayers(),
      homeMatches: r.many.matches({
        from: r.teams.id,
        to: r.matches.team1Id,
        alias: "homeTeam",
      }),
      awayMatches: r.many.matches({
        from: r.teams.id,
        to: r.matches.team2Id,
        alias: "awayTeam",
      }),
      tossWins: r.many.matches({
        from: r.teams.id,
        to: r.matches.tossWinnerId,
        alias: "tossWinner",
      }),
      matchWins: r.many.matches({
        from: r.teams.id,
        to: r.matches.winnerId,
        alias: "winner",
      }),
      innings: r.many.innings({
        from: r.teams.id,
        to: r.innings.battingTeamId,
        alias: "battingTeam",
      }),
    },
    players: {
      teamPlayers: r.many.teamPlayers(),
      strikerBalls: r.many.balls({
        from: r.players.id,
        to: r.balls.strikerId,
        alias: "striker",
      }),
      nonStrikerBalls: r.many.balls({
        from: r.players.id,
        to: r.balls.nonStrikerId,
        alias: "nonStriker",
      }),
      bowlerBalls: r.many.balls({
        from: r.players.id,
        to: r.balls.bowlerId,
        alias: "bowler",
      }),
      dismissedBalls: r.many.balls({
        from: r.players.id,
        to: r.balls.dismissedPlayerId,
        alias: "dismissedPlayer",
      }),
      assistBalls: r.many.balls({
        from: r.players.id,
        to: r.balls.assistPlayerId,
        alias: "assistPlayer",
      }),
      matchPerformances: r.many.playerMatchPerformance(),
      tournamentStats: r.many.playerTournamentStats(),
      careerStats: r.many.playerCareerStats(),
    },
    matches: {
      tournament: r.one.tournaments({
        from: r.matches.tournamentId,
        to: r.tournaments.id,
      }),
      tossWinner: r.one.teams({
        from: r.matches.tossWinnerId,
        to: r.teams.id,
        alias: "tossWinner",
        optional: false,
      }),
      team1: r.one.teams({
        from: r.matches.team1Id,
        to: r.teams.id,
        alias: "homeTeam",
        optional: false,
      }),
      team2: r.one.teams({
        from: r.matches.team2Id,
        to: r.teams.id,
        alias: "awayTeam",
        optional: false,
      }),
      winner: r.one.teams({
        from: r.matches.winnerId,
        to: r.teams.id,
        alias: "winner",
      }),
      innings: r.many.innings(),
      playerPerformances: r.many.playerMatchPerformance(),
    },
    innings: {
      match: r.one.matches({
        from: r.innings.matchId,
        to: r.matches.id,
      }),
      battingTeam: r.one.teams({
        from: r.innings.battingTeamId,
        to: r.teams.id,
        alias: "battingTeam",
      }),
      bowlingTeam: r.one.teams({
        from: r.innings.bowlingTeamId,
        to: r.teams.id,
      }),
      balls: r.many.balls(),
    },
    balls: {
      innings: r.one.innings({
        from: r.balls.inningsId,
        to: r.innings.id,
      }),
      striker: r.one.players({
        from: r.balls.strikerId,
        to: r.players.id,
        alias: "striker",
      }),
      nonStriker: r.one.players({
        from: r.balls.nonStrikerId,
        to: r.players.id,
        alias: "nonStriker",
      }),
      bowler: r.one.players({
        from: r.balls.bowlerId,
        to: r.players.id,
        alias: "bowler",
      }),
      dismissedPlayer: r.one.players({
        from: r.balls.dismissedPlayerId,
        to: r.players.id,
        alias: "dismissedPlayer",
      }),
      assistPlayer: r.one.players({
        from: r.balls.assistPlayerId,
        to: r.players.id,
        alias: "assistPlayer",
      }),
    },
    tournamentTeams: {
      tournament: r.one.tournaments({
        from: r.tournamentTeams.tournamentId,
        to: r.tournaments.id,
      }),
      team: r.one.teams({
        from: r.tournamentTeams.teamId,
        to: r.teams.id,
      }),
    },
    teamPlayers: {
      team: r.one.teams({
        from: r.teamPlayers.teamId,
        to: r.teams.id,
      }),
      player: r.one.players({
        from: r.teamPlayers.playerId,
        to: r.players.id,
      }),
    },
    playerMatchPerformance: {
      match: r.one.matches({
        from: r.playerMatchPerformance.matchId,
        to: r.matches.id,
      }),
      player: r.one.players({
        from: r.playerMatchPerformance.playerId,
        to: r.players.id,
      }),
      team: r.one.teams({
        from: r.playerMatchPerformance.teamId,
        to: r.teams.id,
      }),
      dismissedBy: r.one.players({
        from: r.playerMatchPerformance.dismissedById,
        to: r.players.id,
      }),
    },
    playerTournamentStats: {
      player: r.one.players({
        from: r.playerTournamentStats.playerId,
        to: r.players.id,
      }),
      tournament: r.one.tournaments({
        from: r.playerTournamentStats.tournamentId,
        to: r.tournaments.id,
      }),
      team: r.one.teams({
        from: r.playerTournamentStats.teamId,
        to: r.teams.id,
      }),
    },
    playerCareerStats: {
      player: r.one.players({
        from: r.playerCareerStats.playerId,
        to: r.players.id,
      }),
    },
  })
);
