import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@/db";
import { players } from "@/db/schema";
import {
  protectedProcedure,
  publicProcedure,
  sensitiveProcedure,
} from "@/lib/orpc";
import { requireAdminByEmail } from "@/routers/helpers/admin";
import {
  bulkImportPlayersBodySchema,
  claimPlayerOtpRequestSchema,
  claimPlayerVerifySchema,
  createOwnPlayerBodySchema,
  createPlayerBodySchema,
  listClaimablePlayersQuerySchema,
} from "@/schemas/crud.schemas";
import { playerCrudService } from "@/services/crud.service";
import {
  createOwnPlayerProfileByEmail,
  getAllPlayers,
  getOnboardingStatusByEmail,
  getPlayersWithCurrentTeams,
  listClaimablePlayers,
  markOnboardingSeenByEmail,
  sendClaimOtpByEmail,
  verifyClaimOtpAndLinkByEmail,
} from "@/services/player.service";
import {
  getPlayerStatisticsById,
  getStatisticsLandingView,
} from "@/services/player-stats.service";
import { calculateAgeFromDob } from "@/utils";

const UpdatePlayerInputSchema = z
  .object({
    id: z.number().int().positive(),
    data: createPlayerBodySchema.partial(),
  })
  .refine(({ data }) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
    path: ["data"],
  });

function getPlayerDuplicateKey(params: { dob: Date; name: string }) {
  const normalizedName = params.name.trim().toLowerCase();
  return `${normalizedName}|${params.dob.toISOString()}`;
}

export const playerRouter = {
  players: publicProcedure.handler(() => getAllPlayers()),
  playersWithCurrentTeams: publicProcedure.handler(() =>
    getPlayersWithCurrentTeams()
  ),
  statisticsLanding: publicProcedure.handler(() => getStatisticsLandingView()),
  playerStatistics: publicProcedure
    .input(z.number().int().positive())
    .handler(async ({ input }) => {
      const stats = await getPlayerStatisticsById(input);
      if (!stats) {
        throw new ORPCError("NOT_FOUND");
      }

      return stats;
    }),
  onboardingStatus: protectedProcedure.handler(async ({ context }) =>
    getOnboardingStatusByEmail(context.session.user.email)
  ),
  markOnboardingSeen: protectedProcedure.handler(async ({ context }) =>
    markOnboardingSeenByEmail(context.session.user.email)
  ),
  createOwnPlayerProfile: protectedProcedure
    .input(createOwnPlayerBodySchema)
    .handler(({ context, input }) =>
      createOwnPlayerProfileByEmail(context.session.user.email, input)
    ),
  claimablePlayers: protectedProcedure
    .input(listClaimablePlayersQuerySchema.optional())
    .handler(({ input }) => listClaimablePlayers(input?.query)),
  sendClaimOtp: protectedProcedure
    .input(claimPlayerOtpRequestSchema)
    .handler(({ context, input }) =>
      sendClaimOtpByEmail(context.session.user.email, input.playerId)
    ),
  verifyClaimOtpAndLink: protectedProcedure
    .input(claimPlayerVerifySchema)
    .handler(({ context, input }) =>
      verifyClaimOtpAndLinkByEmail({
        email: context.session.user.email,
        otp: input.otp,
        playerId: input.playerId,
      })
    ),
  createPlayer: sensitiveProcedure
    .input(createPlayerBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.create(input);
      if (!player) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      return player;
    }),
  bulkImportPlayers: sensitiveProcedure
    .input(bulkImportPlayersBodySchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const existingPlayers = await db
        .select({
          name: players.name,
          dob: players.dob,
        })
        .from(players);

      const existingDuplicateKeys = new Set(
        existingPlayers.map((player) =>
          getPlayerDuplicateKey({
            name: player.name,
            dob: player.dob,
          })
        )
      );

      const batchDuplicateKeys = new Set<string>();
      const failedRows: Array<{ index: number; reason: string }> = [];
      let importedCount = 0;
      let skippedDuplicateCount = 0;

      for (const [index, row] of input.rows.entries()) {
        const duplicateKey = getPlayerDuplicateKey({
          name: row.name,
          dob: row.dob,
        });

        if (
          existingDuplicateKeys.has(duplicateKey) ||
          batchDuplicateKeys.has(duplicateKey)
        ) {
          skippedDuplicateCount += 1;
          continue;
        }

        const created = await playerCrudService.create({
          ...row,
          age: calculateAgeFromDob(row.dob),
        });

        if (!created) {
          failedRows.push({
            index,
            reason: "Failed to create player",
          });
          continue;
        }

        batchDuplicateKeys.add(duplicateKey);
        importedCount += 1;
      }

      return {
        importedCount,
        skippedDuplicateCount,
        failedRows,
      };
    }),
  updatePlayer: sensitiveProcedure
    .input(UpdatePlayerInputSchema)
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const player = await playerCrudService.update(input.id, input.data);
      if (!player) {
        throw new ORPCError("NOT_FOUND");
      }

      return player;
    }),
  deletePlayer: sensitiveProcedure
    .input(z.number().int().positive())
    .handler(async ({ context, input }) => {
      await requireAdminByEmail(context.session.user.email);

      const deleted = await playerCrudService.remove(input);
      if (!deleted) {
        throw new ORPCError("NOT_FOUND");
      }

      return { id: input };
    }),
};
