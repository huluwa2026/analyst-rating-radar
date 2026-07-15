import { describe, expect, it } from "vitest";
import { buildRadarSession, isTargetAnomaly } from "@/lib/aggregate";
import { FIXTURE_DATE, fixtureRows } from "@/lib/fixture";

const session = buildRadarSession(FIXTURE_DATE, fixtureRows, "fixture");
const group = (ticker: string) => session.groups.find((item) => item.ticker === ticker);

describe("radar aggregation", () => {
  it("preserves events while grouping by ticker", () => {
    expect(session.groups.flatMap((item) => item.events)).toHaveLength(fixtureRows.length);
    expect(session.groups).toHaveLength(new Set(fixtureRows.map((row) => row.ticker)).size);
    expect(group("IBM")?.events).toHaveLength(3);
  });

  it("recognizes the validated downgrade and agreement cases", () => {
    expect(group("AAPL")?.events[0].action).toBe("downgrade");
    expect(group("TCBK")?.hasAgreement).toBe(true);
  });

  it("recognizes IBM disagreement across rating and target signals", () => {
    expect(group("IBM")?.hasDisagreement).toBe(true);
  });

  it("does not call TSLA target raises rating agreement", () => {
    expect(group("TSLA")?.events.every((event) => event.priceTargetAction === "raise")).toBe(true);
    expect(group("TSLA")?.hasAgreement).toBe(false);
  });

  it("finds rating and target contradictions", () => {
    expect(group("ARM")?.hasContradiction).toBe(true);
    expect(group("CNI")?.hasContradiction).toBe(true);
    expect(group("ARM")?.hasDisagreement).toBe(false);
    expect(group("CNI")?.hasDisagreement).toBe(false);
  });

  it("flags historical target discontinuities without scoring them", () => {
    expect(isTargetAnomaly(172.5, 690)).toBe(true);
    expect(isTargetAnomaly(40, 2)).toBe(true);
    expect(group("CRWD")?.hasTargetAnomaly).toBe(true);
    expect(group("CRWD")?.scoreReasons.some((reason) => reason.label.toLowerCase().includes("target"))).toBe(false);
  });
});
