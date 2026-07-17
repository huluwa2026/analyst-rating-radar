import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsUrl } from "@/lib/analytics";

describe("privacy analytics", () => {
  it("removes search params and fragments before sending a page view", () => {
    expect(sanitizeAnalyticsUrl("https://example.test/?date=2026-07-16&ticker=NVDA#detail"))
      .toBe("https://example.test/");
  });
});

