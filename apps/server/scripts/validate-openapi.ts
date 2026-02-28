import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as toYaml } from "yaml";
import { generateOpenApiSpec, OPENAPI_FILE_SERVER_URL } from "../src/openapi";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const openApiJsonPath = resolve(currentDir, "../openapi.json");
const openApiYamlPath = resolve(currentDir, "../openapi.yaml");

const spec = await generateOpenApiSpec(OPENAPI_FILE_SERVER_URL);
const expectedJson = `${JSON.stringify(spec, null, 2)}\n`;
const expectedYaml = toYaml(spec);

const [actualJson, actualYaml] = await Promise.all([
  readFile(openApiJsonPath, "utf8").catch(() => null),
  readFile(openApiYamlPath, "utf8").catch(() => null),
]);

if (actualJson === null || actualYaml === null) {
  throw new Error(
    'OpenAPI spec files are missing. Run "bun run openapi:generate" in apps/server.'
  );
}

if (actualJson !== expectedJson || actualYaml !== expectedYaml) {
  throw new Error(
    'OpenAPI spec files are out of date. Run "bun run openapi:generate" in apps/server and commit the changes.'
  );
}
