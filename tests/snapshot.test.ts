import { describe, expect, it } from "vitest";
import { buildRadarSession } from "@/lib/aggregate";
import { FIXTURE_DATE, fixtureRows } from "@/lib/fixture";
import { buildTickerDetail, isTickerInSession, mergeSessionIntoDetailIndex } from "@/lib/snapshot";

function sessionFor(date: string, rows = fixtureRows) {
  return buildRadarSession(date, rows.map((row) => ({ ...row, date })), "snapshot");
}

describe("published snapshot boundaries", () => {
  const session = sessionFor(FIXTURE_DATE);

  it("only permits ticker detail for companies in the selected session", () => {
    const index = mergeSessionIntoDetailIndex(null, session);
    expect(isTickerInSession(session, "aapl")).toBe(true);
    expect(isTickerInSession(session, "FREE-RIDE")).toBe(false);
    expect(buildTickerDetail("AAPL", session, index)?.ticker).toBe("AAPL");
    expect(buildTickerDetail("FREE-RIDE", session, index)).toBeNull();
  });

  it("replaces a republished date instead of retaining obsolete events", () => {
    const original = mergeSessionIntoDetailIndex(null, session);
    const replacement = sessionFor(FIXTURE_DATE, [fixtureRows[0]]);
    const merged = mergeSessionIntoDetailIndex(original, replacement);
    expect(merged.tickers.AAPL).toHaveLength(1);
    expect(merged.tickers.IBM).toBeUndefined();
  });

  it("keeps at most 120 days and does not regress on a backfill", () => {
    const old = mergeSessionIntoDetailIndex(null, sessionFor("2026-03-01", [fixtureRows[0]]));
    const current = mergeSessionIntoDetailIndex(old, sessionFor("2026-07-15", [fixtureRows[1]]));
    const backfilled = mergeSessionIntoDetailIndex(current, sessionFor("2026-07-01", [fixtureRows[2]]));
    expect(backfilled.throughDate).toBe("2026-07-15");
    expect(backfilled.tickers.AAPL).toBeUndefined();
    expect(backfilled.tickers.IBM?.map((event) => event.date)).toEqual(["2026-07-15", "2026-07-01"]);
  });
});
