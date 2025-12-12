import type { z } from "zod";

// Type helper to extract Zod schema type
export type InferSchema<T extends z.ZodType> = z.infer<T>;

// Re-export all validation schemas
export * from "./validation.schemas";
