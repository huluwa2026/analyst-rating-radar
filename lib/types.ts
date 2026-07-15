export type RatingDirection = "bullish" | "neutral" | "bearish" | "unknown";

export type NormalizedAction =
  | "upgrade"
  | "downgrade"
  | "initiation"
  | "reiteration"
  | "maintain"
  | "reinstatement"
  | "assumption"
  | "suspension"
  | "other";

export type PriceTargetAction = "raise" | "lower" | "maintain" | "announce" | "adjust" | "none" | "other";

export interface Consensus {
  snapshotDate: string | null;
  label: string | null;
  totalAnalysts: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  priceTarget: number | null;
}

export interface RatingEvent {
  id: string;
  ticker: string;
  date: string;
  timePeriod: string | null;
  rawAction: string;
  action: NormalizedAction;
  rawPriceTargetAction: string | null;
  priceTargetAction: PriceTargetAction;
  ratingCurrent: string | null;
  ratingPrior: string | null;
  direction: RatingDirection;
  priorDirection: RatingDirection;
  priceTarget: number | null;
  priceTargetPrior: number | null;
  analystName: string | null;
  analystFirm: string;
  importance: number;
  updatedAt: number | null;
  companyName: string;
  currentPrice: number | null;
  priceReturn1d: number | null;
  marketCap: number | null;
  consensus: Consensus | null;
  contradiction: boolean;
  targetAnomaly: boolean;
}

export interface ScoreReason {
  label: string;
  points: number;
}

export interface TickerGroup {
  ticker: string;
  companyName: string;
  currentPrice: number | null;
  priceReturn1d: number | null;
  marketCap: number | null;
  consensus: Consensus | null;
  events: RatingEvent[];
  firms: string[];
  score: number;
  scoreReasons: ScoreReason[];
  hasAgreement: boolean;
  hasDisagreement: boolean;
  hasContradiction: boolean;
  hasTargetAnomaly: boolean;
  keyMove: boolean;
  summary: string;
}

export interface SessionStats {
  events: number;
  tickers: number;
  upgrades: number;
  downgrades: number;
  initiations: number;
}

export interface RadarSession {
  date: string;
  groups: TickerGroup[];
  stats: SessionStats;
  generatedAt: string;
  mode: "snapshot" | "fixture" | "live";
}

export interface TickerDetail {
  ticker: string;
  companyName: string;
  currentPrice: number | null;
  priceReturn1d: number | null;
  marketCap: number | null;
  consensus: Consensus | null;
  events: RatingEvent[];
  targetAnomaly: boolean;
}

export type RawRow = Record<string, unknown>;
