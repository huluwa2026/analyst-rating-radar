import type { NormalizedAction, PriceTargetAction, RatingDirection } from "@/lib/types";

const ratingDirections: Record<string, RatingDirection> = {
  "strong buy": "bullish",
  buy: "bullish",
  overweight: "bullish",
  outperform: "bullish",
  positive: "bullish",
  "market outperform": "bullish",
  "sector outperform": "bullish",
  "speculative buy": "bullish",
  hold: "neutral",
  neutral: "neutral",
  "equal-weight": "neutral",
  "market perform": "neutral",
  "in-line": "neutral",
  "sector perform": "neutral",
  "peer perform": "neutral",
  "sector weight": "neutral",
  perform: "neutral",
  underweight: "bearish",
  underperform: "bearish",
  "sector underperform": "bearish",
  sell: "bearish",
  negative: "bearish",
  reduce: "bearish",
};

const actions: Record<string, NormalizedAction> = {
  upgrades: "upgrade",
  upgrade: "upgrade",
  downgrades: "downgrade",
  downgrade: "downgrade",
  initiates: "initiation",
  initiates_coverage_on: "initiation",
  initiates_coverage: "initiation",
  reiterates: "reiteration",
  reiterate: "reiteration",
  maintains: "maintain",
  maintain: "maintain",
  reinstates: "reinstatement",
  reinstates_coverage_on: "reinstatement",
  assumes: "assumption",
  assumes_coverage_on: "assumption",
  suspends: "suspension",
};

const targetActions: Record<string, PriceTargetAction> = {
  raises: "raise",
  raise: "raise",
  lowers: "lower",
  lower: "lower",
  maintains: "maintain",
  maintain: "maintain",
  announces: "announce",
  announce: "announce",
  adjusts: "adjust",
  adjust: "adjust",
};

function key(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeRating(value: unknown): RatingDirection {
  return ratingDirections[key(value)] ?? "unknown";
}

export function normalizeAction(value: unknown): NormalizedAction {
  return actions[key(value)] ?? "other";
}

export function normalizePriceTargetAction(value: unknown): PriceTargetAction {
  const normalized = key(value);
  if (!normalized) return "none";
  return targetActions[normalized] ?? "other";
}

export function knownRatingLabels(): string[] {
  return Object.keys(ratingDirections);
}
