import "dotenv/config";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stringify as toYaml } from "yaml";
import { corsConfig } from "./config/cors";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { errorHandler } from "./middleware";
import {
  generateOpenApiSpec,
  OPENAPI_DOCS_PATH,
  OPENAPI_INFO,
  OPENAPI_SPEC_PATH,
} from "./openapi";
import { appRouter } from "./routers/index";
import routes from "./routes";
import { getCurrentIsoTimestamp } from "./utils";

export const app = new Hono();

// Global middleware
app.use(logger());
app.use("/*", cors(corsConfig));
app.use("*", errorHandler);

// Health check endpoint
app.get("/", (c) =>
  c.json({
    status: "ok",
    message: "Cricket247 API",
    version: "1.0.0",
    timestamp: getCurrentIsoTimestamp(),
  })
);

// Auth routes (Better Auth)
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/openapi.yaml", async (c) => {
  const spec = await generateOpenApiSpec(new URL("/api", c.req.url).toString());

  return c.text(toYaml(spec), 200, {
    "content-type": "application/yaml; charset=utf-8",
  });
});

// ORPC handlers for type-safe RPC calls
export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      docsPath: OPENAPI_DOCS_PATH,
      docsProvider: "swagger",
      docsTitle: OPENAPI_INFO.title,
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: OPENAPI_INFO,
      },
      specPath: OPENAPI_SPEC_PATH,
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("ORPC Error:", error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("RPC Error:", error);
    }),
  ],
});

// ORPC middleware
app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

// REST API routes
app.route("/", routes);

// 404 handler
app.notFound((c) =>
  c.json(
    {
      success: false,
      error: "Route not found",
      timestamp: getCurrentIsoTimestamp(),
    },
    404
  )
);

export default app;
