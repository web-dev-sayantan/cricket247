import { env } from "./env";

export const corsConfig = {
  origin: env.CORS_ORIGIN,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86_400, // 24 hours
};
