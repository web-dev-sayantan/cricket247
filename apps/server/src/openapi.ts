import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "./routers";

export const OPENAPI_SPEC_PATH = "/openapi.json";
export const OPENAPI_DOCS_PATH = "/docs";
export const OPENAPI_FILE_SERVER_URL = "http://localhost:3000/api";

export const OPENAPI_INFO = {
  title: "Cricket247 API",
  version: "1.0.0",
} as const;

interface OpenApiOperation {
  operationId?: string;
  responses?: Record<string, unknown>;
}

export interface GeneratedOpenApiSpec {
  paths?: Record<
    string,
    Record<string, OpenApiOperation | undefined> | undefined
  >;
  [key: string]: unknown;
}

const RATE_LIMIT_RESPONSE = {
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          code: {
            type: "string",
            enum: ["TOO_MANY_REQUESTS"],
          },
          data: {
            type: "object",
            properties: {
              retryAfter: {
                type: "integer",
                minimum: 0,
              },
            },
            required: ["retryAfter"],
          },
          message: {
            type: "string",
          },
          status: {
            type: "integer",
            enum: [429],
          },
        },
        required: ["code", "data", "message", "status"],
      },
    },
  },
  description: "Too Many Requests",
  headers: {
    "RateLimit-Limit": {
      schema: {
        type: "string",
      },
    },
    "RateLimit-Remaining": {
      schema: {
        type: "string",
      },
    },
    "RateLimit-Reset": {
      schema: {
        type: "string",
      },
    },
    "Retry-After": {
      schema: {
        type: "string",
      },
    },
  },
} as const;

function addRateLimitResponses<TSpec extends GeneratedOpenApiSpec>(
  spec: TSpec
) {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    if (!pathItem) {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== "object") {
        continue;
      }

      if (
        !("operationId" in operation) ||
        operation.operationId === "healthCheck"
      ) {
        continue;
      }

      const operationWithResponses = operation as {
        responses?: Record<string, unknown>;
      };

      operationWithResponses.responses ??= {};
      operationWithResponses.responses["429"] = RATE_LIMIT_RESPONSE;
    }
  }

  return spec;
}

export const generateOpenApiSpec = (
  serverUrl: string
): Promise<GeneratedOpenApiSpec> => {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  return generator
    .generate(appRouter, {
      info: OPENAPI_INFO,
      servers: [{ url: serverUrl }],
    })
    .then((spec) => addRateLimitResponses(spec as GeneratedOpenApiSpec));
};
