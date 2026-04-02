import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure, sensitiveProcedure } from "@/lib/orpc";
import { requireAdminByEmail } from "@/routers/helpers/admin";
import { createTeamBodySchema } from "@/schemas/crud.schemas";
import { teamCrudService } from "@/services/crud.service";
import {
  getAllTeams,
  getTeamById,
  getTeamsByName,
  getTeamTournaments,
  getTournamentTeamRoster,
  reassignPlayerInTournament,
  registerPlayerForTournamentTeam,
  TeamPlayerRegistrationError,
  TeamRosterManagementError,
  unassignPlayerFromTournamentTeam,
} from "@/services/team.service";
import {
  getTeamStatsById,
  getTeamTournamentStats,
  listTeamStats,
} from "@/services/team-stats.service";

const TeamTournamentsInputSchema = z.object({
  teamId: z.number().int().positive(),
});

const TournamentTeamRosterInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
});

const RegisterTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  isCaptain: z.boolean().optional(),
  isViceCaptain: z.boolean().optional(),
});

const UnassignTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
});

const ReassignTournamentTeamPlayerInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  toTeamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  confirmReassign: z.boolean(),
  expectedFromTeamId: z.number().int().positive().optional(),
});

const TeamTournamentStatsInputSchema = z.object({
  teamId: z.number().int().positive(),
  tournamentId: z.number().int().positive(),
});

const UpdateTeamInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createTeamBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

export const teamRouter = {
  teams: publicProcedure.handler(() => getAllTeams()),
  searchTeamsByName: publicProcedure
    .input(z.string())
    .handler(({ input }) => getTeamsByName(input)),
  getTeamById: publicProcedure
    .input(z.number().int().positive())
    .handler(({ input }) => getTeamById(input)),
  teamTournaments: publicProcedure
    .input(TeamTournamentsInputSchema)
    .handler(({ input }) => getTeamTournaments(input.teamId)),
  getTournamentTeamRoster: sensitiveProcedure
    .input(TournamentTeamRosterInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await getTournamentTeamRoster(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (error.code === "TOURNAMENT_NOT_FOUND") {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  listTeamStats: publicProcedure.handler(() => listTeamStats()),
  getTeamStatsById: publicProcedure
    .input(z.number().int().positive())
    .handler(({ input }) => getTeamStatsById(input)),
  getTeamTournamentStats: publicProcedure
    .input(TeamTournamentStatsInputSchema)
    .handler(({ input }) =>
      getTeamTournamentStats(input.teamId, input.tournamentId)
    ),
  createTeam: sensitiveProcedure
    .input(createTeamBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.create(input);
      if (!team) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return team;
    }),
  registerTournamentTeamPlayer: sensitiveProcedure
    .input(RegisterTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await registerPlayerForTournamentTeam(input);
      } catch (error) {
        if (error instanceof TeamPlayerRegistrationError) {
          if (error.code === "PLAYER_ALREADY_REGISTERED_IN_TOURNAMENT") {
            throw new ORPCError("CONFLICT");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  unassignTournamentTeamPlayer: sensitiveProcedure
    .input(UnassignTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await unassignPlayerFromTournamentTeam(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (error.code === "ASSIGNMENT_NOT_FOUND") {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "TEAM_NOT_IN_TOURNAMENT") {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  reassignTournamentTeamPlayer: sensitiveProcedure
    .input(ReassignTournamentTeamPlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      try {
        return await reassignPlayerInTournament(input);
      } catch (error) {
        if (error instanceof TeamRosterManagementError) {
          if (
            error.code === "PLAYER_NOT_REGISTERED_IN_TOURNAMENT" ||
            error.code === "TOURNAMENT_NOT_FOUND"
          ) {
            throw new ORPCError("NOT_FOUND");
          }

          if (error.code === "ASSIGNMENT_CHANGED") {
            throw new ORPCError("CONFLICT");
          }

          if (
            error.code === "TEAM_NOT_IN_TOURNAMENT" ||
            error.code === "REASSIGN_CONFIRMATION_REQUIRED" ||
            error.code === "REASSIGN_NOT_ALLOWED_AFTER_START"
          ) {
            throw new ORPCError("BAD_REQUEST");
          }
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }
    }),
  updateTeam: sensitiveProcedure
    .input(UpdateTeamInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const team = await teamCrudService.update(input.id, input.data);
      if (!team) {
        throw new ORPCError("NOT_FOUND");
      }

      return team;
    }),
  deleteTeam: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await teamCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
};
