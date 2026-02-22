import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import {
  account,
  passkey as passkeyTable,
  session,
  user,
  verification,
} from "@/db/schema";
import { sendEmailOtp } from "@/services/email.service";
import { db } from "../db";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

const SESSION_COOKIE_CACHE_MAX_AGE = 15 * SECONDS_PER_MINUTE;
const SESSION_UPDATE_AGE =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const SESSION_EXPIRES_IN =
  DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const auth = betterAuth<BetterAuthOptions>({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user,
      account,
      session,
      verification,
      passkey: passkeyTable,
    },
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
    database: { generateId: false },
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN,
    updateAge: SESSION_UPDATE_AGE,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_COOKIE_CACHE_MAX_AGE,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
      onboardingSeenAt: {
        type: "number",
        required: false,
        defaultValue: null,
        input: false,
      },
      onboardingCompletedAt: {
        type: "number",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
    facebook: {
      clientId: getRequiredEnv("FACEBOOK_CLIENT_ID"),
      clientSecret: getRequiredEnv("FACEBOOK_CLIENT_SECRET"),
    },
  },
  plugins: [
    passkey(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        switch (type) {
          case "email-verification":
            await sendEmailOtp({
              email,
              otp,
              subject: "is your code to verify your Email",
            });
            break;
          case "sign-in":
            await sendEmailOtp({ email, otp });
            break;
          case "forget-password":
            await sendEmailOtp({
              email,
              otp,
              subject: "is your verification code to reset your password",
            });
            break;
          default:
            throw new Error("Invalid type");
        }
      },
      sendVerificationOnSignUp: true,
    }),
  ],
});
