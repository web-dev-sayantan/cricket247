import { describe, expect, it } from "bun:test";
import {
  getAbbreviatedName,
  getFirstName,
  getInitials,
  shortenName,
} from "./utils";

describe("lib/utils", () => {
  it("returns first name from full name and empty string for missing input", () => {
    expect(getFirstName("Virat Kohli")).toBe("Virat");
    expect(getFirstName()).toBe("");
  });

  it("abbreviates all name parts with periods", () => {
    expect(getAbbreviatedName("Mahendra Singh Dhoni")).toBe("M.S.D");
  });

  it("shortens multi-part names and preserves single-part names", () => {
    expect(shortenName("Rohit Gurunath Sharma")).toBe("Rohit S");
    expect(shortenName("Sachin")).toBe("Sachin");
  });

  it("computes initials for single and multi-part names", () => {
    expect(getInitials("ab")).toBe("AB");
    expect(getInitials("Hardik Pandya")).toBe("HP");
  });
});
