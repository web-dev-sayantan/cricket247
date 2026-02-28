import { defineRelations } from "drizzle-orm";
import {
  deliveries,
  fixtureChangeLog,
  fixtureConstraints,
  fixtureRounds,
  fixtureVersionMatches,
  fixtureVersions,
  innings,
  matches,
  matchFormats,
  matchLineup,
  matchParticipantSources,
  organizations,
  playerCareerStats,
  playerInningsStats,
  players,
  playerTournamentStats,
  swissRoundStandings,
  teamCareerStats,
  teamPlayers,
  teams,
  teamTournamentStats,
  tournamentStageAdvancements,
  tournamentStageGroups,
  tournamentStages,
  tournamentStageTeamEntries,
  tournaments,
  tournamentTeams,
  venues,
} from "../schema";

export const relations = defineRelations(
  {
    deliveries,
    fixtureChangeLog,
    fixtureConstraints,
    fixtureRounds,
    fixtureVersionMatches,
    fixtureVersions,
    innings,
    matchLineup,
    matchParticipantSources,
    matches,
    matchFormats,
    organizations,
    teamCareerStats,
    playerCareerStats,
    playerInningsStats,
    players,
    playerTournamentStats,
    teamPlayers,
    teams,
    teamTournamentStats,
    tournaments,
    tournamentStageAdvancements,
    tournamentStageGroups,
    tournamentStageTeamEntries,
    tournamentStages,
    tournamentTeams,
    venues,
    swissRoundStandings,
  },
  (r) => ({
    organizations: {
      tournaments: r.many.tournaments(),
      parentOrganization: r.one.organizations({
        from: r.organizations.parentOrganizationId,
        to: r.organizations.id,
        alias: "parentOrganization",
      }),
      childOrganizations: r.many.organizations({
        from: r.organizations.id,
        to: r.organizations.parentOrganizationId,
        alias: "childOrganizations",
      }),
    },
    tournaments: {
      organization: r.one.organizations({
        from: r.tournaments.organizationId,
        to: r.organizations.id,
        optional: false,
      }),
      stages: r.many.tournamentStages(),
      stageTeamEntries: r.many.tournamentStageTeamEntries(),
      matches: r.many.matches(),
      tournamentTeams: r.many.tournamentTeams(),
      teamPlayers: r.many.teamPlayers(),
      championTeam: r.one.teams({
        from: r.tournaments.championTeamId,
        to: r.teams.id,
      }),
      defaultMatchFormat: r.one.matchFormats({
        from: r.tournaments.defaultMatchFormatId,
        to: r.matchFormats.id,
      }),
      teamTournamentStats: r.many.teamTournamentStats(),
      fixtureVersions: r.many.fixtureVersions(),
      fixtureRounds: r.many.fixtureRounds(),
      fixtureChangeLog: r.many.fixtureChangeLog(),
      fixtureConstraints: r.many.fixtureConstraints(),
      swissRoundStandings: r.many.swissRoundStandings(),
    },
    teams: {
      tournamentTeams: r.many.tournamentTeams(),
      teamPlayers: r.many.teamPlayers(),
      wonTournaments: r.many.tournaments({
        from: r.teams.id,
        to: r.tournaments.championTeamId,
        alias: "championTeam",
      }),
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
      careerStats: r.many.teamCareerStats(),
      tournamentStats: r.many.teamTournamentStats(),
      fixtureConstraints: r.many.fixtureConstraints(),
      swissRoundStandings: r.many.swissRoundStandings(),
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
      matchFormat: r.one.matchFormats({
        from: r.matches.matchFormatId,
        to: r.matchFormats.id,
      }),
      stage: r.one.tournamentStages({
        from: r.matches.stageId,
        to: r.tournamentStages.id,
      }),
      stageGroup: r.one.tournamentStageGroups({
        from: r.matches.stageGroupId,
        to: r.tournamentStageGroups.id,
      }),
      fixtureRound: r.one.fixtureRounds({
        from: r.matches.fixtureRoundId,
        to: r.fixtureRounds.id,
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
      venue: r.one.venues({
        from: r.matches.venueId,
        to: r.venues.id,
      }),
      previousScheduleMatch: r.one.matches({
        from: r.matches.previousScheduleMatchId,
        to: r.matches.id,
        alias: "previousScheduleMatch",
      }),
      rescheduledMatches: r.many.matches({
        from: r.matches.id,
        to: r.matches.previousScheduleMatchId,
        alias: "previousScheduleMatch",
      }),
      innings: r.many.innings(),
      lineup: r.many.matchLineup(),
      participantSources: r.many.matchParticipantSources({
        from: r.matches.id,
        to: r.matchParticipantSources.matchId,
        alias: "match",
      }),
      asSourceMatch: r.many.matchParticipantSources({
        from: r.matches.id,
        to: r.matchParticipantSources.sourceMatchId,
        alias: "sourceMatch",
      }),
      fixtureVersionEntries: r.many.fixtureVersionMatches(),
      fixtureChangeLog: r.many.fixtureChangeLog(),
      playerInningsStats: r.many.playerInningsStats(),
    },
    matchFormats: {
      tournaments: r.many.tournaments({
        from: r.matchFormats.id,
        to: r.tournaments.defaultMatchFormatId,
        alias: "defaultMatchFormat",
      }),
      stages: r.many.tournamentStages(),
      matches: r.many.matches(),
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
      tournament: r.one.tournaments({
        from: r.teamPlayers.tournamentId,
        to: r.tournaments.id,
      }),
      team: r.one.teams({
        from: r.teamPlayers.teamId,
        to: r.teams.id,
      }),
      player: r.one.players({
        from: r.teamPlayers.playerId,
        to: r.players.id,
      }),
    },
    tournamentStages: {
      tournament: r.one.tournaments({
        from: r.tournamentStages.tournamentId,
        to: r.tournaments.id,
      }),
      matchFormat: r.one.matchFormats({
        from: r.tournamentStages.matchFormatId,
        to: r.matchFormats.id,
      }),
      parentStage: r.one.tournamentStages({
        from: r.tournamentStages.parentStageId,
        to: r.tournamentStages.id,
        alias: "parentStage",
      }),
      childStages: r.many.tournamentStages({
        from: r.tournamentStages.id,
        to: r.tournamentStages.parentStageId,
        alias: "childStages",
      }),
      groups: r.many.tournamentStageGroups(),
      teamEntries: r.many.tournamentStageTeamEntries(),
      sourceAdvancements: r.many.tournamentStageAdvancements({
        from: r.tournamentStages.id,
        to: r.tournamentStageAdvancements.fromStageId,
        alias: "fromStage",
      }),
      targetAdvancements: r.many.tournamentStageAdvancements({
        from: r.tournamentStages.id,
        to: r.tournamentStageAdvancements.toStageId,
        alias: "toStage",
      }),
      matches: r.many.matches(),
      participantSources: r.many.matchParticipantSources({
        from: r.tournamentStages.id,
        to: r.matchParticipantSources.sourceStageId,
        alias: "sourceStage",
      }),
      fixtureVersions: r.many.fixtureVersions(),
      fixtureRounds: r.many.fixtureRounds(),
      fixtureChangeLog: r.many.fixtureChangeLog(),
      fixtureConstraints: r.many.fixtureConstraints(),
      swissRoundStandings: r.many.swissRoundStandings(),
    },
    tournamentStageGroups: {
      stage: r.one.tournamentStages({
        from: r.tournamentStageGroups.stageId,
        to: r.tournamentStages.id,
      }),
      teamEntries: r.many.tournamentStageTeamEntries(),
      sourceAdvancements: r.many.tournamentStageAdvancements(),
      matches: r.many.matches(),
      participantSources: r.many.matchParticipantSources({
        from: r.tournamentStageGroups.id,
        to: r.matchParticipantSources.sourceStageGroupId,
        alias: "sourceStageGroup",
      }),
      fixtureRounds: r.many.fixtureRounds(),
    },
    tournamentStageTeamEntries: {
      tournament: r.one.tournaments({
        from: r.tournamentStageTeamEntries.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.tournamentStageTeamEntries.stageId,
        to: r.tournamentStages.id,
      }),
      stageGroup: r.one.tournamentStageGroups({
        from: r.tournamentStageTeamEntries.stageGroupId,
        to: r.tournamentStageGroups.id,
      }),
      team: r.one.teams({
        from: r.tournamentStageTeamEntries.teamId,
        to: r.teams.id,
      }),
    },
    tournamentStageAdvancements: {
      fromStage: r.one.tournamentStages({
        from: r.tournamentStageAdvancements.fromStageId,
        to: r.tournamentStages.id,
        alias: "fromStage",
      }),
      fromStageGroup: r.one.tournamentStageGroups({
        from: r.tournamentStageAdvancements.fromStageGroupId,
        to: r.tournamentStageGroups.id,
      }),
      toStage: r.one.tournamentStages({
        from: r.tournamentStageAdvancements.toStageId,
        to: r.tournamentStages.id,
        alias: "toStage",
      }),
    },
    matchParticipantSources: {
      match: r.one.matches({
        from: r.matchParticipantSources.matchId,
        to: r.matches.id,
        alias: "match",
      }),
      sourceTeam: r.one.teams({
        from: r.matchParticipantSources.sourceTeamId,
        to: r.teams.id,
      }),
      sourceMatch: r.one.matches({
        from: r.matchParticipantSources.sourceMatchId,
        to: r.matches.id,
        alias: "sourceMatch",
      }),
      sourceStage: r.one.tournamentStages({
        from: r.matchParticipantSources.sourceStageId,
        to: r.tournamentStages.id,
        alias: "sourceStage",
      }),
      sourceStageGroup: r.one.tournamentStageGroups({
        from: r.matchParticipantSources.sourceStageGroupId,
        to: r.tournamentStageGroups.id,
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
    teamCareerStats: {
      team: r.one.teams({
        from: r.teamCareerStats.teamId,
        to: r.teams.id,
      }),
    },
    teamTournamentStats: {
      team: r.one.teams({
        from: r.teamTournamentStats.teamId,
        to: r.teams.id,
      }),
      tournament: r.one.tournaments({
        from: r.teamTournamentStats.tournamentId,
        to: r.tournaments.id,
      }),
    },
    venues: {
      matches: r.many.matches(),
      fixtureConstraints: r.many.fixtureConstraints(),
    },
    fixtureVersions: {
      tournament: r.one.tournaments({
        from: r.fixtureVersions.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.fixtureVersions.stageId,
        to: r.tournamentStages.id,
      }),
      rounds: r.many.fixtureRounds(),
      matches: r.many.fixtureVersionMatches(),
      changeLog: r.many.fixtureChangeLog(),
    },
    fixtureRounds: {
      tournament: r.one.tournaments({
        from: r.fixtureRounds.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.fixtureRounds.stageId,
        to: r.tournamentStages.id,
      }),
      stageGroup: r.one.tournamentStageGroups({
        from: r.fixtureRounds.stageGroupId,
        to: r.tournamentStageGroups.id,
      }),
      fixtureVersion: r.one.fixtureVersions({
        from: r.fixtureRounds.fixtureVersionId,
        to: r.fixtureVersions.id,
      }),
      matches: r.many.matches(),
      changeLog: r.many.fixtureChangeLog(),
      swissStandings: r.many.swissRoundStandings(),
    },
    fixtureVersionMatches: {
      fixtureVersion: r.one.fixtureVersions({
        from: r.fixtureVersionMatches.fixtureVersionId,
        to: r.fixtureVersions.id,
      }),
      match: r.one.matches({
        from: r.fixtureVersionMatches.matchId,
        to: r.matches.id,
      }),
    },
    fixtureChangeLog: {
      tournament: r.one.tournaments({
        from: r.fixtureChangeLog.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.fixtureChangeLog.stageId,
        to: r.tournamentStages.id,
      }),
      fixtureVersion: r.one.fixtureVersions({
        from: r.fixtureChangeLog.fixtureVersionId,
        to: r.fixtureVersions.id,
      }),
      fixtureRound: r.one.fixtureRounds({
        from: r.fixtureChangeLog.fixtureRoundId,
        to: r.fixtureRounds.id,
      }),
      match: r.one.matches({
        from: r.fixtureChangeLog.matchId,
        to: r.matches.id,
      }),
    },
    fixtureConstraints: {
      tournament: r.one.tournaments({
        from: r.fixtureConstraints.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.fixtureConstraints.stageId,
        to: r.tournamentStages.id,
      }),
      team: r.one.teams({
        from: r.fixtureConstraints.teamId,
        to: r.teams.id,
      }),
      venue: r.one.venues({
        from: r.fixtureConstraints.venueId,
        to: r.venues.id,
      }),
    },
    swissRoundStandings: {
      tournament: r.one.tournaments({
        from: r.swissRoundStandings.tournamentId,
        to: r.tournaments.id,
      }),
      stage: r.one.tournamentStages({
        from: r.swissRoundStandings.stageId,
        to: r.tournamentStages.id,
      }),
      fixtureRound: r.one.fixtureRounds({
        from: r.swissRoundStandings.fixtureRoundId,
        to: r.fixtureRounds.id,
      }),
      team: r.one.teams({
        from: r.swissRoundStandings.teamId,
        to: r.teams.id,
      }),
    },
  })
);
