import { env } from "./env";

const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const resolvedCorsOrigin =
  corsOrigins.length === 1 ? (corsOrigins[0] ?? "") : corsOrigins;

export const corsConfig = {
  origin: resolvedCorsOrigin,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86_400, // 24 hours
};
