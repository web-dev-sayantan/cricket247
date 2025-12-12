import { ZodError, type ZodSchema } from "zod";

export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new Error("Validation failed");
  }
}

export async function validateRequestAsync<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new Error("Validation failed");
  }
}
