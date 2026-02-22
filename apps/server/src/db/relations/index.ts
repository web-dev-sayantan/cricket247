import { defineRelations } from "drizzle-orm";
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
} from "../schema";

export const relations = defineRelations(
  {
    deliveries,
    innings,
    matchLineup,
    matches,
    playerCareerStats,
    playerInningsStats,
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
      battingInnings: r.many.innings({
        from: r.teams.id,
        to: r.innings.battingTeamId,
        alias: "battingTeam",
      }),
      bowlingInnings: r.many.innings({
        from: r.teams.id,
        to: r.innings.bowlingTeamId,
        alias: "bowlingTeam",
      }),
      lineup: r.many.matchLineup(),
      inningsStats: r.many.playerInningsStats(),
    },
    players: {
      teamPlayers: r.many.teamPlayers(),
      strikerDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.strikerId,
        alias: "striker",
      }),
      nonStrikerDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.nonStrikerId,
        alias: "nonStriker",
      }),
      bowlerDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.bowlerId,
        alias: "bowler",
      }),
      dismissedDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.dismissedPlayerId,
        alias: "dismissedPlayer",
      }),
      dismissingDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.dismissedById,
        alias: "dismissedBy",
      }),
      assistingDeliveries: r.many.deliveries({
        from: r.players.id,
        to: r.deliveries.assistedById,
        alias: "assistedBy",
      }),
      inningsStats: r.many.playerInningsStats({
        from: r.players.id,
        to: r.playerInningsStats.playerId,
        alias: "player",
      }),
      dismissedInningsStats: r.many.playerInningsStats({
        from: r.players.id,
        to: r.playerInningsStats.dismissedById,
        alias: "dismissedBy",
      }),
      assistedInningsStats: r.many.playerInningsStats({
        from: r.players.id,
        to: r.playerInningsStats.assistedById,
        alias: "assistedBy",
      }),
      tournamentStats: r.many.playerTournamentStats(),
      careerStats: r.many.playerCareerStats(),
      matchLineup: r.many.matchLineup(),
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
      lineup: r.many.matchLineup(),
      playerInningsStats: r.many.playerInningsStats(),
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
      deliveries: r.many.deliveries(),
      playerInningsStats: r.many.playerInningsStats(),
    },
    deliveries: {
      innings: r.one.innings({
        from: r.deliveries.inningsId,
        to: r.innings.id,
      }),
      striker: r.one.players({
        from: r.deliveries.strikerId,
        to: r.players.id,
        alias: "striker",
      }),
      nonStriker: r.one.players({
        from: r.deliveries.nonStrikerId,
        to: r.players.id,
        alias: "nonStriker",
      }),
      bowler: r.one.players({
        from: r.deliveries.bowlerId,
        to: r.players.id,
        alias: "bowler",
      }),
      dismissedPlayer: r.one.players({
        from: r.deliveries.dismissedPlayerId,
        to: r.players.id,
        alias: "dismissedPlayer",
      }),
      dismissedBy: r.one.players({
        from: r.deliveries.dismissedById,
        to: r.players.id,
        alias: "dismissedBy",
      }),
      assistedBy: r.one.players({
        from: r.deliveries.assistedById,
        to: r.players.id,
        alias: "assistedBy",
      }),
    },
    matchLineup: {
      match: r.one.matches({
        from: r.matchLineup.matchId,
        to: r.matches.id,
      }),
      team: r.one.teams({
        from: r.matchLineup.teamId,
        to: r.teams.id,
      }),
      player: r.one.players({
        from: r.matchLineup.playerId,
        to: r.players.id,
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
    playerInningsStats: {
      innings: r.one.innings({
        from: r.playerInningsStats.inningsId,
        to: r.innings.id,
      }),
      match: r.one.matches({
        from: r.playerInningsStats.matchId,
        to: r.matches.id,
      }),
      player: r.one.players({
        from: r.playerInningsStats.playerId,
        to: r.players.id,
        alias: "player",
      }),
      team: r.one.teams({
        from: r.playerInningsStats.teamId,
        to: r.teams.id,
      }),
      dismissedBy: r.one.players({
        from: r.playerInningsStats.dismissedById,
        to: r.players.id,
        alias: "dismissedBy",
      }),
      assistedBy: r.one.players({
        from: r.playerInningsStats.assistedById,
        to: r.players.id,
        alias: "assistedBy",
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
