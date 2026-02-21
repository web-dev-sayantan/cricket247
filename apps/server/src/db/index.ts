import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { relations } from "./relations";

const client = createClient({
  url: process.env.DATABASE_URL || "",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle({
  client,
  relations,
  logger: true,
  casing: "snake_case",
});
