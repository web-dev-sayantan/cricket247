import { describe, expect, it } from "bun:test";
import { calculateAgeFromDob, parseDateInput, resolveDateLike } from "./date";

describe("lib/date", () => {
  it("parses valid date input and rejects invalid input", () => {
    const parsedDate = parseDateInput("2024-01-15");

    expect(parsedDate).not.toBeNull();
    expect(parsedDate?.getFullYear()).toBe(2024);
    expect(parsedDate?.getMonth()).toBe(0);
    expect(parsedDate?.getDate()).toBe(15);
    expect(parseDateInput("not-a-date")).toBeNull();
    expect(parseDateInput("2024/01/15")).toBeNull();
  });

  it("never returns a negative age", () => {
    const dob = new Date("2030-01-01T00:00:00.000Z");
    const referenceDate = new Date("2026-01-01T00:00:00.000Z");

    expect(calculateAgeFromDob(dob, referenceDate)).toBe(0);
  });

  it("resolves numeric date-like values for seconds and milliseconds", () => {
    const unixSeconds = 1_704_067_200;
    const unixMilliseconds = 1_704_067_200_000;

    expect(resolveDateLike(unixSeconds).getTime()).toBe(unixMilliseconds);
    expect(resolveDateLike(unixMilliseconds).getTime()).toBe(unixMilliseconds);
  });
});
