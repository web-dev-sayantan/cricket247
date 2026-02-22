import type { Context } from "hono";
import { getCurrentIsoTimestamp } from "@/utils";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
  timestamp: string;
}

export function successResponse<T>(
  c: Context,
  data: T,
  message?: string,
  status = 200
) {
  return c.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
      timestamp: getCurrentIsoTimestamp(),
    },
    status as 200
  );
}

export function errorResponse(c: Context, error: string, status = 400) {
  return c.json<ApiResponse>(
    {
      success: false,
      error,
      timestamp: getCurrentIsoTimestamp(),
    },
    status as 400
  );
}

export function validationErrorResponse(
  c: Context,
  errors: Record<string, string[]>
) {
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
