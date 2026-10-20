import { describe, expect, it } from "bun:test";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { z } from "zod";

const SCHEMA_CONVERT_OPTIONS = { strategy: "input" } as const;

describe("OpenAPI schema conversion", () => {
  it("preserves numeric, string, and array constraints", () => {
    const converter = new ZodToJsonSchemaConverter();
    const [, jsonSchema] = converter.convert(
      z.object({
        height: z.number().int().min(1).max(300),
        image: z.url(),
        name: z.string().trim().min(2).max(100),
        rows: z.array(z.string()).min(1).max(1000),
      }),
      SCHEMA_CONVERT_OPTIONS
    );

    expect(jsonSchema).toMatchObject({
      properties: {
        height: {
          maximum: 300,
          minimum: 1,
          type: "integer",
        },
        image: {
          format: "uri",
          type: "string",
        },
        name: {
          maxLength: 100,
          minLength: 2,
          type: "string",
        },
        rows: {
          items: {
            type: "string",
          },
          maxItems: 1000,
          minItems: 1,
          type: "array",
        },
      },
      required: ["name", "height", "rows", "image"],
      type: "object",
    });
  });
});
