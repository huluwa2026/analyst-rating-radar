import { describe, expect, it } from "vitest";
import { knownRatingLabels, normalizeAction, normalizePriceTargetAction, normalizeRating } from "@/lib/normalize";

describe("explicit rating normalization", () => {
  it("maps all 23 validated current-rating labels", () => {
    expect(knownRatingLabels()).toHaveLength(23);
    expect(normalizeRating("Sector Outperform")).toBe("bullish");
    expect(normalizeRating("Equal-Weight")).toBe("neutral");
    expect(normalizeRating("Reduce")).toBe("bearish");
  });

  it("does not guess unfamiliar labels", () => {
    expect(normalizeRating("Definitely Great")).toBe("unknown");
  });

  it("supports the real action vocabulary", () => {
    expect(normalizeAction("initiates_coverage_on")).toBe("initiation");
    expect(normalizeAction("reinstates")).toBe("reinstatement");
    expect(normalizeAction("assumes")).toBe("assumption");
    expect(normalizeAction("suspends")).toBe("suspension");
    expect(normalizePriceTargetAction("announces")).toBe("announce");
    expect(normalizePriceTargetAction("adjusts")).toBe("adjust");
  });
});
