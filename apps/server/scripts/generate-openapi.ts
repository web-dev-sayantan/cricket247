import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toDeterministicJson, toDeterministicYaml } from "./openapi-spec-utils";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:openapi-spec.db";
}

const { generateOpenApiSpec, OPENAPI_FILE_SERVER_URL } = await import(
  "../src/openapi"
);

const currentDir = dirname(fileURLToPath(import.meta.url));
const openApiJsonPath = resolve(currentDir, "../openapi.json");
const openApiYamlPath = resolve(currentDir, "../openapi.yaml");

const spec = await generateOpenApiSpec(OPENAPI_FILE_SERVER_URL);

await mkdir(dirname(openApiJsonPath), { recursive: true });
await writeFile(openApiJsonPath, toDeterministicJson(spec), "utf8");
await writeFile(openApiYamlPath, toDeterministicYaml(spec), "utf8");
