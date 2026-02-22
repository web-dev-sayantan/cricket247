import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { getCurrentIsoTimestamp } from "@/utils";
import type { ApiResponse } from "./response";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      const status = error.status;
      return c.json<ApiResponse>(
        {
          success: false,
          error: error.message,
          timestamp: getCurrentIsoTimestamp(),
        },
        status
      );
    }

    if (error instanceof ZodError) {
      const errors = error.issues.reduce(
        (acc: Record<string, string[]>, curr) => {
          const path = curr.path.join(".");
          if (!acc[path]) {
            acc[path] = [];
          }
          acc[path].push(curr.message);
          return acc;
        },
        {} as Record<string, string[]>
      );

      return c.json<ApiResponse>(
        {
          success: false,
          error: "Validation failed",
          data: errors,
          timestamp: getCurrentIsoTimestamp(),
        },
        400
      );
    }

    // Log unexpected errors
    console.error("Unhandled error:", error);

    return c.json<ApiResponse>(
      {
        success: false,
        error: "Internal server error",
        timestamp: getCurrentIsoTimestamp(),
      },
      500
    );
  }
}
