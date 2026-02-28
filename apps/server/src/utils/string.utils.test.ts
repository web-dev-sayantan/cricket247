import { describe, expect, it } from "bun:test";

import {
  capitalizeFirstLetter,
  capitalizeWords,
  sanitizeString,
  slugify,
  truncate,
} from "./string.utils";

describe("string.utils", () => {
  it("sanitizes strings by trimming and collapsing spaces", () => {
    expect(sanitizeString("  Virat   Kohli  ")).toBe("Virat Kohli");
  });

  it("slugifies text consistently", () => {
    expect(slugify("  IPL 2026: Final Match!  ")).toBe("ipl-2026-final-match");
  });

  it("truncates text with default and custom suffix", () => {
    expect(truncate("Scoreboard", 7)).toBe("Scor...");
    expect(truncate("Powerplay", 7, "..")).toBe("Power..");
    expect(truncate("Over", 10)).toBe("Over");
  });

  it("capitalizes first letter and words", () => {
    expect(capitalizeFirstLetter("aRCHITECT")).toBe("Architect");
    expect(capitalizeFirstLetter("")).toBe("");
    expect(capitalizeWords("rohit sharma")).toBe("Rohit Sharma");
  });
});
