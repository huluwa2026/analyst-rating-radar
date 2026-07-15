import { normalizeAction, normalizePriceTargetAction, normalizeRating } from "@/lib/normalize";
import type {
  Consensus,
  NormalizedAction,
  RadarSession,
  RatingEvent,
  RawRow,
  ScoreReason,
  TickerGroup,
} from "@/lib/types";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function integer(value: unknown, fallback = 0): number {
  const parsed = number(value);
  return parsed === null ? fallback : Math.trunc(parsed);
}

function consensusFromRow(row: RawRow): Consensus | null {
  const label = text(row.consensus);
  const snapshotDate = text(row.snapshot_date);
  if (!label && !snapshotDate && row.total_analysts == null) return null;
  return {
    snapshotDate,
    label,
    totalAnalysts: integer(row.total_analysts),
    strongBuy: integer(row.strong_buy_count),
    buy: integer(row.buy_count),
    hold: integer(row.hold_count),
    sell: integer(row.sell_count),
    strongSell: integer(row.strong_sell_count),
    priceTarget: number(row.pt_consensus),
  };
}

export function isTargetAnomaly(current: number | null, prior: number | null): boolean {
  if (current === null || prior === null) return false;
  if (current <= 0 || prior <= 0) return true;
  return Math.max(current, prior) / Math.min(current, prior) >= 3.5;
}

export function rowToEvent(row: RawRow): RatingEvent {
  const rawAction = text(row.rating_action) ?? "unknown";
  const action = normalizeAction(rawAction);
  const rawTargetAction = text(row.price_target_action);
  const priceTargetAction = normalizePriceTargetAction(rawTargetAction);
  const priceTarget = number(row.price_target);
  const priceTargetPrior = number(row.price_target_prior);
  const contradiction =
    (action === "upgrade" && priceTargetAction === "lower") ||
    (action === "downgrade" && priceTargetAction === "raise");

  return {
    id: text(row.id) ?? `${text(row.ticker) ?? "UNKNOWN"}-${text(row.date) ?? "undated"}`,
    ticker: (text(row.ticker) ?? "UNKNOWN").toUpperCase(),
    date: text(row.date) ?? "",
    timePeriod: text(row.time_period),
    rawAction,
    action,
    rawPriceTargetAction: rawTargetAction,
    priceTargetAction,
    ratingCurrent: text(row.rating_current),
    ratingPrior: text(row.rating_prior),
    direction: normalizeRating(row.rating_current),
    priorDirection: normalizeRating(row.rating_prior),
    priceTarget,
    priceTargetPrior,
    analystName: text(row.analyst_name),
    analystFirm: text(row.analyst_firm) ?? "Unknown firm",
    importance: integer(row.importance),
    updatedAt: number(row.updated_at),
    companyName: text(row.company_name) ?? (text(row.ticker) ?? "Unknown company"),
    currentPrice: number(row.price_current),
    priceReturn1d: number(row.price_return_1d),
    marketCap: number(row.market_capitalization),
    consensus: consensusFromRow(row),
    contradiction,
    targetAnomaly: isTargetAnomaly(priceTarget, priceTargetPrior),
  };
}

const actionPoints: Record<NormalizedAction, number> = {
  upgrade: 42,
  downgrade: 42,
  initiation: 32,
  suspension: 30,
  reinstatement: 26,
  assumption: 24,
  reiteration: 10,
  maintain: 8,
  other: 6,
};

function significantAction(action: NormalizedAction): boolean {
  return ["upgrade", "downgrade", "initiation", "suspension", "reinstatement", "assumption"].includes(action);
}

function describeGroup(events: RatingEvent[], agreement: boolean, disagreement: boolean, contradiction: boolean): string {
  const firms = new Set(events.map((event) => event.analystFirm)).size;
  if (disagreement) return `${firms} firms sent opposing rating or target-price signals`;
  if (agreement) {
    const action = events.filter((event) => event.action === "upgrade" || event.action === "downgrade")[0]?.action;
    return `${firms} firms aligned on ${action === "downgrade" ? "rating downgrades" : "rating upgrades"}`;
  }
  if (contradiction) return "Rating and target-price directions diverged";
  const lead = [...events].sort((a, b) => actionPoints[b.action] - actionPoints[a.action])[0];
  const labels: Record<NormalizedAction, string> = {
    upgrade: "Rating upgraded",
    downgrade: "Rating downgraded",
    initiation: "New analyst coverage",
    reiteration: "Rating reiterated",
    maintain: "Rating maintained",
    reinstatement: "Coverage reinstated",
    assumption: "Coverage assumed",
    suspension: "Coverage suspended",
    other: "Analyst activity",
  };
  return firms > 1 ? `${firms} firms published analyst updates` : labels[lead.action];
}

function groupEvents(events: RatingEvent[]): TickerGroup[] {
  const buckets = new Map<string, RatingEvent[]>();
  for (const event of events) {
    const current = buckets.get(event.ticker) ?? [];
    current.push(event);
    buckets.set(event.ticker, current);
  }

  return [...buckets.entries()].map(([ticker, tickerEvents]) => {
    const sorted = [...tickerEvents].sort(
      (a, b) => actionPoints[b.action] - actionPoints[a.action] || b.importance - a.importance || (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    );
    const first = sorted[0];
    const firms = [...new Set(sorted.map((event) => event.analystFirm))];
    const upgradeFirms = new Set(sorted.filter((event) => event.action === "upgrade").map((event) => event.analystFirm));
    const downgradeFirms = new Set(sorted.filter((event) => event.action === "downgrade").map((event) => event.analystFirm));
    const hasAgreement = upgradeFirms.size >= 2 || downgradeFirms.size >= 2;
    const positiveFirms = new Set(
      sorted
        .filter((event) => event.action === "upgrade" || event.priceTargetAction === "raise")
        .map((event) => event.analystFirm),
    );
    const negativeFirms = new Set(
      sorted
        .filter((event) => event.action === "downgrade" || event.priceTargetAction === "lower")
        .map((event) => event.analystFirm),
    );
    const bullishFirms = new Set(sorted.filter((event) => event.direction === "bullish").map((event) => event.analystFirm));
    const bearishFirms = new Set(sorted.filter((event) => event.direction === "bearish").map((event) => event.analystFirm));
    const hasCrossFirmSignalSplit = [...positiveFirms].some((positiveFirm) =>
      [...negativeFirms].some((negativeFirm) => negativeFirm !== positiveFirm),
    );
    const hasCrossFirmRatingSplit = [...bullishFirms].some((bullishFirm) =>
      [...bearishFirms].some((bearishFirm) => bearishFirm !== bullishFirm),
    );
    const hasDisagreement = hasCrossFirmSignalSplit || hasCrossFirmRatingSplit;
    const hasContradiction = sorted.some((event) => event.contradiction);
    const hasTargetAnomaly = sorted.some((event) => event.targetAnomaly);
    const keyMove = sorted.some((event) => ["upgrade", "downgrade", "initiation"].includes(event.action));
    const scoreReasons: ScoreReason[] = [];
    const leadPoints = Math.max(...sorted.map((event) => actionPoints[event.action]));
    const leadAction = sorted.find((event) => actionPoints[event.action] === leadPoints)?.action ?? "other";
    scoreReasons.push({ label: `${leadAction.replace("ation", "ate")} action`, points: leadPoints });

    const maxImportance = Math.max(...sorted.map((event) => event.importance), 0);
    if (maxImportance > 0) scoreReasons.push({ label: `Importance ${maxImportance}/5`, points: maxImportance * 4 });
    const extraSignificant = Math.max(0, sorted.filter((event) => significantAction(event.action)).length - 1);
    if (extraSignificant > 0) scoreReasons.push({ label: "Additional material calls", points: Math.min(12, extraSignificant * 4) });
    if (hasAgreement) scoreReasons.push({ label: "Independent-firm agreement", points: 20 + Math.max(upgradeFirms.size, downgradeFirms.size) * 2 });
    if (hasDisagreement) scoreReasons.push({ label: "Opposing firm signals", points: 14 });
    if (hasContradiction) scoreReasons.push({ label: "Rating / target contradiction", points: 10 });
    if ((first.marketCap ?? 0) >= 10_000_000_000) scoreReasons.push({ label: "Widely followed company", points: 4 });
    const score = scoreReasons.reduce((total, reason) => total + reason.points, 0);

    return {
      ticker,
      companyName: first.companyName,
      currentPrice: first.currentPrice,
      priceReturn1d: first.priceReturn1d,
      marketCap: first.marketCap,
      consensus: first.consensus,
      events: sorted,
      firms,
      score,
      scoreReasons,
      hasAgreement,
      hasDisagreement,
      hasContradiction,
      hasTargetAnomaly,
      keyMove,
      summary: describeGroup(sorted, hasAgreement, hasDisagreement, hasContradiction),
    };
  });
}

export function buildRadarSession(date: string, rows: RawRow[], mode: "live" | "fixture" = "live"): RadarSession {
  const events = rows.map(rowToEvent);
  const groups = groupEvents(events).sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));
  return {
    date,
    groups,
    stats: {
      events: events.length,
      tickers: groups.length,
      upgrades: events.filter((event) => event.action === "upgrade").length,
      downgrades: events.filter((event) => event.action === "downgrade").length,
      initiations: events.filter((event) => event.action === "initiation").length,
    },
    generatedAt: new Date().toISOString(),
    mode,
  };
}
