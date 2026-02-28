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

export const generateOpenApiSpec = (serverUrl: string) => {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  return generator.generate(appRouter, {
    info: OPENAPI_INFO,
    servers: [{ url: serverUrl }],
  });
};
