import { and, desc, eq, gte, isNull, like, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  organizations,
  playerInningsStats,
  players,
  playerVerification,
  teamPlayers,
  teams,
  tournaments,
  user,
  verification,
} from "@/db/schema";
import type {
  CurrentTeamRegistration,
  NewPlayerInningsStats,
  Player,
  PlayerWithCurrentTeams,
} from "@/db/types";
import {
  calculateAgeFromDob,
  createFutureDateByMinutes,
  getCurrentDate,
  isDateExpired,
} from "@/utils";
import { sendEmailOtp } from "./email.service";

const CLAIM_OTP_LENGTH = 6;
const CLAIM_OTP_EXPIRY_MINUTES = 10;
const CLAIM_OTP_VERIFICATION_TYPE = "claim-email-otp";

const padOtp = (value: number) =>
  value.toString().padStart(CLAIM_OTP_LENGTH, "0");

function generateClaimOtp(): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const maxOtpValue = 10 ** CLAIM_OTP_LENGTH;
  return padOtp(randomValues[0] % maxOtpValue);
}

function getClaimOtpIdentifier(userId: number, playerId: number) {
  return `player-claim:${userId}:${playerId}`;
}

async function getUserByEmail(email: string) {
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingSeenAt: user.onboardingSeenAt,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return rows[0] ?? null;
}

async function getPlayerLinkedToUser(userId: number) {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
    })
    .from(players)
    .where(eq(players.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

async function requireUnclaimedPlayer(playerId: number) {
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      userId: players.userId,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  const playerRecord = rows[0] ?? null;
  if (!playerRecord) {
    throw new Error("Player not found");
  }

  if (typeof playerRecord.userId === "number") {
    throw new Error("Player is already claimed");
  }

  return playerRecord;
}

export async function getOnboardingStatusByEmail(email: string) {
  const userRecord = await getUserByEmail(email);
  if (!userRecord) {
    throw new Error("User not found");
  }

  const linkedPlayer = await getPlayerLinkedToUser(userRecord.id);

  return {
    email: userRecord.email,
    emailVerified: userRecord.emailVerified,
    hasLinkedPlayer: linkedPlayer !== null,
    linkedPlayer,
    onboardingCompletedAt: userRecord.onboardingCompletedAt,
    onboardingSeenAt: userRecord.onboardingSeenAt,
    shouldPrompt: userRecord.onboardingSeenAt === null,
  };
}

export async function markOnboardingSeenByEmail(email: string) {
  const currentDate = getCurrentDate();

  const updatedRows = await db
    .update(user)
    .set({ onboardingSeenAt: currentDate })
    .where(eq(user.email, email))
    .returning({
      id: user.id,
      onboardingSeenAt: user.onboardingSeenAt,
    });

  const updated = updatedRows[0] ?? null;
  if (!updated) {
    throw new Error("User not found");
  }

  return updated;
}

export async function createOwnPlayerProfileByEmail(
  email: string,
  input: {
    name: string;
    dob: Date;
    sex: string;
    nationality?: string;
    height?: number;
    weight?: number;
    image?: string;
    role: string;
    battingStance: string;
    bowlingStance?: string;
    isWicketKeeper?: boolean;
  }
) {
  const userRecord = await getUserByEmail(email);
  if (!userRecord) {
    throw new Error("User not found");
  }

  const existingLinkedPlayer = await getPlayerLinkedToUser(userRecord.id);
  if (existingLinkedPlayer) {
    throw new Error("User already linked to a player profile");
  }

  const [createdPlayer] = await db
    .insert(players)
    .values({
      userId: userRecord.id,
      age: calculateAgeFromDob(input.dob),
      battingStance: input.battingStance,
      bowlingStance: input.bowlingStance,
      dob: input.dob,
      height: input.height,
      image: input.image ?? userRecord.image ?? undefined,
      isWicketKeeper: input.isWicketKeeper ?? false,
      name: input.name,
      nationality: input.nationality,
      role: input.role,
      sex: input.sex,
      weight: input.weight,
    })
    .returning();

  if (!createdPlayer) {
    throw new Error("Failed to create player profile");
  }

  const currentDate = getCurrentDate();

  await db
    .update(user)
    .set({ onboardingCompletedAt: currentDate, onboardingSeenAt: currentDate })
    .where(eq(user.id, userRecord.id));

  return createdPlayer;
}

export async function listClaimablePlayers(query?: string) {
  const normalizedQuery = query?.trim() ?? "";

  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      role: players.role,
      nationality: players.nationality,
      image: players.image,
    })
    .from(players)
    .where(
      normalizedQuery.length > 0
        ? and(
            isNull(players.userId),
            like(players.name, `%${normalizedQuery}%`)
          )
        : isNull(players.userId)
    )
    .orderBy(players.name)
    .limit(25);

  return rows;
}

export async function sendClaimOtpByEmail(email: string, playerId: number) {
  const userRecord = await getUserByEmail(email);
  if (!userRecord) {
    throw new Error("User not found");
  }

  if (!userRecord.emailVerified) {
    throw new Error("Verify your email before claiming a player profile");
  }

  await requireUnclaimedPlayer(playerId);

  const existingLinkedPlayer = await getPlayerLinkedToUser(userRecord.id);
  if (existingLinkedPlayer) {
    throw new Error("User already linked to a player profile");
  }

  const otp = generateClaimOtp();
  const identifier = getClaimOtpIdentifier(userRecord.id, playerId);
  const expiresAt = createFutureDateByMinutes(CLAIM_OTP_EXPIRY_MINUTES);

  await db.delete(verification).where(eq(verification.identifier, identifier));
  await db.insert(verification).values({
    identifier,
    value: otp,
    expiresAt,
  });

  await sendEmailOtp({
    email,
    otp,
    subject: "is your OTP to claim your player profile",
  });

  return { success: true } as const;
}

export async function verifyClaimOtpAndLinkByEmail(params: {
  email: string;
  otp: string;
  playerId: number;
}) {
  const userRecord = await getUserByEmail(params.email);
  if (!userRecord) {
    throw new Error("User not found");
  }

  await requireUnclaimedPlayer(params.playerId);

  const existingLinkedPlayer = await getPlayerLinkedToUser(userRecord.id);
  if (existingLinkedPlayer) {
    throw new Error("User already linked to a player profile");
  }

  const identifier = getClaimOtpIdentifier(userRecord.id, params.playerId);

  const otpRows = await db
    .select({
      expiresAt: verification.expiresAt,
      id: verification.id,
    })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        eq(verification.value, params.otp)
      )
    )
    .orderBy(desc(verification.id))
    .limit(1);

  const otpRecord = otpRows[0] ?? null;
  if (!otpRecord) {
    throw new Error("Invalid OTP");
  }

  if (isDateExpired(otpRecord.expiresAt)) {
    throw new Error("OTP expired");
  }

  const linkedPlayer = await db.transaction(async (tx) => {
    const linked = await tx
      .update(players)
      .set({ userId: userRecord.id })
      .where(and(eq(players.id, params.playerId), isNull(players.userId)))
      .returning({
        id: players.id,
        name: players.name,
      });

    const claimedPlayer = linked[0] ?? null;
    if (!claimedPlayer) {
      throw new Error("Player is already claimed");
    }

    if (userRecord.image) {
      await tx
        .update(players)
        .set({ image: userRecord.image })
        .where(and(eq(players.id, claimedPlayer.id), isNull(players.image)));
    }

    await tx.insert(playerVerification).values({
      playerId: claimedPlayer.id,
      verificationId: String(otpRecord.id),
      verificationType: CLAIM_OTP_VERIFICATION_TYPE,
    });

    const currentDate = getCurrentDate();

    await tx
      .update(user)
      .set({
        onboardingCompletedAt: currentDate,
        onboardingSeenAt: currentDate,
      })
      .where(eq(user.id, userRecord.id));

    await tx
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    return claimedPlayer;
  });

  return linkedPlayer;
}

export const getAllPlayers: () => Promise<Player[]> = async () =>
  await db.select().from(players);

export const getPlayersWithCurrentTeams: () => Promise<
  PlayerWithCurrentTeams[]
> = async () => {
  const now = getCurrentDate();
  const [allPlayers, liveTournamentMemberships] = await Promise.all([
    db.select().from(players),
    db
      .select({
        isCaptain: teamPlayers.isCaptain,
        isViceCaptain: teamPlayers.isViceCaptain,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        playerId: teamPlayers.playerId,
        teamId: teams.id,
        teamName: teams.name,
        teamShortName: teams.shortName,
        tournamentCategory: tournaments.category,
        tournamentId: tournaments.id,
        tournamentName: tournaments.name,
      })
      .from(teamPlayers)
      .innerJoin(teams, eq(teamPlayers.teamId, teams.id))
      .innerJoin(tournaments, eq(teamPlayers.tournamentId, tournaments.id))
      .innerJoin(
        organizations,
        eq(tournaments.organizationId, organizations.id)
      )
      .where(
        and(lte(tournaments.startDate, now), gte(tournaments.endDate, now))
      ),
  ]);

  const currentTeamsByPlayerId = new Map<number, CurrentTeamRegistration[]>();

  for (const row of liveTournamentMemberships) {
    const current = currentTeamsByPlayerId.get(row.playerId) ?? [];
    current.push({
      isCaptain: row.isCaptain,
      isViceCaptain: row.isViceCaptain,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortName: row.teamShortName,
      tournamentCategory: row.tournamentCategory,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
    });
    currentTeamsByPlayerId.set(row.playerId, current);
  }

  return allPlayers.map((player) => ({
    ...player,
    currentTeams: currentTeamsByPlayerId.get(player.id) ?? [],
  }));
};

export async function getPlayerById(id: number) {
  return await db.select().from(players).where(eq(players.id, id)).limit(1);
}

export async function getPlayerMatchPerformance(
  playerId: number,
  matchId: number,
  inningsId?: number
) {
  return await db
    .select()
    .from(playerInningsStats)
    .where(
      inningsId
        ? and(
            eq(playerInningsStats.playerId, playerId),
            eq(playerInningsStats.matchId, matchId),
            eq(playerInningsStats.inningsId, inningsId)
          )
        : and(
            eq(playerInningsStats.playerId, playerId),
            eq(playerInningsStats.matchId, matchId)
          )
    )
    .orderBy(desc(playerInningsStats.id))
    .limit(1);
}

export async function createPlayerAction({
  name,
  dob,
  sex,
  role,
  battingStance,
  bowlingStance,
  isWicketKeeper,
  nationality,
  image,
}: {
  name: string;
  dob: Date;
  sex: string;
  role: string;
  battingStance: string;
  bowlingStance?: string;
  isWicketKeeper?: boolean;
  nationality?: string;
  image?: string;
}) {
  const result = await db.insert(players).values({
    name,
    dob,
    sex,
    role,
    battingStance,
    bowlingStance,
    isWicketKeeper: !!isWicketKeeper,
    nationality,
    image,
  });

  return result ?? null;
}

export async function createPlayerPerformanceAction({
  inningsId,
  matchId,
  playerId,
  teamId,
  battingOrder,
}: Pick<
  NewPlayerInningsStats,
  "inningsId" | "matchId" | "playerId" | "teamId" | "battingOrder"
>) {
  await db
    .insert(playerInningsStats)
    .values({
      inningsId,
      matchId,
      playerId,
      teamId,
      battingOrder,
    })
    .onConflictDoNothing({
      target: [playerInningsStats.inningsId, playerInningsStats.playerId],
    });
}

export async function updatePlayerPerformanceAction(
  playerStats: NewPlayerInningsStats
) {
  if (!(playerStats.inningsId && playerStats.playerId)) {
    throw new Error("inningsId and playerId are required to update stats");
  }

  await db
    .update(playerInningsStats)
    .set(playerStats)
    .where(
      and(
        eq(playerInningsStats.inningsId, playerStats.inningsId),
        eq(playerInningsStats.playerId, playerStats.playerId)
      )
    );
}
