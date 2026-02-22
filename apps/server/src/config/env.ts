import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),

  // CORS
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),

  // Email
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // Storage
  PROFILE_IMAGES_PUBLIC_BASE_URL: z
    .string()
    .url("PROFILE_IMAGES_PUBLIC_BASE_URL must be a valid URL")
    .optional(),
  PROFILE_IMAGES_BUCKET_NAME: z
    .string()
    .trim()
    .min(1, "PROFILE_IMAGES_BUCKET_NAME is required")
    .optional(),
  R2_ACCOUNT_ID: z
    .string()
    .trim()
    .min(1, "R2_ACCOUNT_ID is required")
    .optional(),
  R2_ACCESS_KEY_ID: z
    .string()
    .trim()
    .min(1, "R2_ACCESS_KEY_ID is required")
    .optional(),
  R2_SECRET_ACCESS_KEY: z
    .string()
    .trim()
    .min(1, "R2_SECRET_ACCESS_KEY is required")
    .optional(),
  PROFILE_IMAGE_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5_242_880),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  FACEBOOK_CLIENT_ID: z.string().min(1, "FACEBOOK_CLIENT_ID is required"),
  FACEBOOK_CLIENT_SECRET: z
    .string()
    .min(1, "FACEBOOK_CLIENT_SECRET is required"),
  FACEBOOK_CLIENT_TOKEN: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();
