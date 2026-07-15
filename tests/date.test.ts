import { describe, expect, it } from "vitest";
import { formatSessionDate, isIsoDate, isSafeTicker, subtractDays } from "@/lib/date";

describe("input boundaries", () => {
  it("validates session dates", () => {
    expect(isIsoDate("2026-07-14")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(subtractDays("2026-07-14", 120)).toBe("2026-03-16");
    expect(formatSessionDate("2026-07-14")).toContain("Jul 14");
  });

  it("allows ticker punctuation but rejects SQL characters", () => {
    expect(isSafeTicker("BRK.B")).toBe(true);
    expect(isSafeTicker("6758.T")).toBe(true);
    expect(isSafeTicker("AAPL' OR 1=1")).toBe(false);
  });
});
