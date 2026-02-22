import type { ZodType } from "zod";
import { z } from "zod";
import { buildBulkImportPreview } from "@/lib/bulk-import";

const PLAYER_MANDATORY_FIELDS = [
  "name",
  "dob",
  "sex",
  "role",
  "battingStance",
] as const;

export interface PlayerImportRow {
  battingStance: string;
  bowlingStance?: string;
  dob: Date;
  height?: number;
  image?: string;
  isWicketKeeper?: boolean;
  name: string;
  nationality?: string;
  role: string;
  sex: string;
  weight?: number;
}

const playerImportSchema: ZodType<PlayerImportRow> = z.object({
  name: z.string().trim().min(2).max(100),
  dob: z.coerce.date(),
  sex: z.string().trim().min(1).max(30),
  nationality: z.string().trim().min(1).max(100).optional(),
  height: z.coerce.number().int().min(1).max(300).optional(),
  weight: z.coerce.number().int().min(1).max(250).optional(),
  image: z.url().optional(),
  role: z.string().trim().min(1).max(50),
  battingStance: z.string().trim().min(1).max(50),
  bowlingStance: z.string().trim().min(1).max(100).optional(),
  isWicketKeeper: z.coerce.boolean().optional(),
});

type UnknownRecord = Record<string, unknown>;

function getStringValue(
  record: UnknownRecord,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const rawValue = record[key];
    if (typeof rawValue === "string") {
      const normalizedValue = rawValue.trim();
      if (normalizedValue.length > 0) {
        return normalizedValue;
      }
      continue;
    }

    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      return String(rawValue);
    }

    if (rawValue instanceof Date) {
      return rawValue.toISOString();
    }
  }

  return undefined;
}

function getOptionalNumber(record: UnknownRecord, ...keys: string[]) {
  const value = getStringValue(record, ...keys);
  if (!value) {
    return undefined;
  }

  return Number(value);
}

function getOptionalBoolean(record: UnknownRecord, ...keys: string[]) {
  const value = getStringValue(record, ...keys);
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return value;
}

function normalizePlayerRecord(record: UnknownRecord): unknown {
  return {
    name: getStringValue(record, "name"),
    dob: getStringValue(record, "dob", "dateofbirth", "birthdate"),
    sex: getStringValue(record, "sex", "gender"),
    nationality: getStringValue(record, "nationality", "country"),
    height: getOptionalNumber(record, "height"),
    weight: getOptionalNumber(record, "weight"),
    image: getStringValue(record, "image", "imageurl", "photo"),
    role: getStringValue(record, "role"),
    battingStance: getStringValue(record, "battingstance", "battingstyle"),
    bowlingStance: getStringValue(record, "bowlingstance", "bowlingstyle"),
    isWicketKeeper: getOptionalBoolean(
      record,
      "iswicketkeeper",
      "wicketkeeper"
    ),
  };
}

export function buildPlayerImportPreview(file: File) {
  return buildBulkImportPreview(file, {
    requiredFields: PLAYER_MANDATORY_FIELDS,
    schema: playerImportSchema,
    normalizeRecord: normalizePlayerRecord,
  });
}
