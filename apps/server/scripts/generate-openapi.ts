import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as toYaml } from "yaml";
import { generateOpenApiSpec, OPENAPI_FILE_SERVER_URL } from "../src/openapi";

const currentDir = dirname(fileURLToPath(import.meta.url));
const openApiJsonPath = resolve(currentDir, "../openapi.json");
const openApiYamlPath = resolve(currentDir, "../openapi.yaml");

const spec = await generateOpenApiSpec(OPENAPI_FILE_SERVER_URL);

await mkdir(dirname(openApiJsonPath), { recursive: true });
await writeFile(openApiJsonPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
await writeFile(openApiYamlPath, toYaml(spec), "utf8");
