import { subtractDays } from "@/lib/date";
import type { RadarSession, RatingEvent, TickerDetail } from "@/lib/types";

export const SNAPSHOT_SCHEMA_VERSION = 1;

export interface SnapshotSessionRef {
  pathname: string;
  generatedAt: string;
  events: number;
  tickers: number;
}

export interface SnapshotManifest {
  schemaVersion: number;
  generatedAt: string;
  latestDate: string;
  dates: string[];
  sessions: Record<string, SnapshotSessionRef>;
  detailIndexPathname: string;
}

export interface SnapshotDetailIndex {
  schemaVersion: number;
  generatedAt: string;
  throughDate: string;
  tickers: Record<string, RatingEvent[]>;
}

export function isTickerInSession(session: RadarSession, ticker: string): boolean {
  return session.groups.some((group) => group.ticker === ticker.toUpperCase());
}

export function mergeSessionIntoDetailIndex(
  previous: SnapshotDetailIndex | null,
  session: RadarSession,
): SnapshotDetailIndex {
  const throughDate = [previous?.throughDate, session.date].filter(Boolean).sort().at(-1) ?? session.date;
  const cutoff = subtractDays(throughDate, 120);
  const tickers: Record<string, RatingEvent[]> = {};

  for (const [ticker, events] of Object.entries(previous?.tickers ?? {})) {
    const retained = events.filter((event) => event.date >= cutoff && event.date !== session.date);
    if (retained.length) tickers[ticker] = retained;
  }

  for (const group of session.groups) {
    const deduplicated = new Map<string, RatingEvent>();
    for (const event of [...(tickers[group.ticker] ?? []), ...group.events]) {
      if (event.date >= cutoff) deduplicated.set(event.id, event);
    }
    tickers[group.ticker] = [...deduplicated.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    );
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    throughDate,
    tickers,
  };
}

export function buildTickerDetail(
  tickerInput: string,
  session: RadarSession,
  detailIndex: SnapshotDetailIndex,
): TickerDetail | null {
  const ticker = tickerInput.toUpperCase();
  const group = session.groups.find((candidate) => candidate.ticker === ticker);
  if (!group) return null;

  return {
    ticker,
    companyName: group.companyName,
    currentPrice: group.currentPrice,
    priceReturn1d: group.priceReturn1d,
    marketCap: group.marketCap,
    consensus: group.consensus,
    events: detailIndex.tickers[ticker] ?? group.events,
    targetAnomaly: (detailIndex.tickers[ticker] ?? group.events).some((event) => event.targetAnomaly),
  };
}
