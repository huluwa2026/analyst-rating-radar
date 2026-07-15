import "server-only";

import { unstable_cache } from "next/cache";
import { buildRadarSession, rowToEvent } from "@/lib/aggregate";
import { isIsoDate, isSafeTicker, subtractDays } from "@/lib/date";
import { FIXTURE_DATE, FIXTURE_SESSIONS, fixtureHistoryRows, fixtureRows } from "@/lib/fixture";
import type { RadarSession, RawRow, TickerDetail } from "@/lib/types";

const DEFAULT_BASE_URL = "https://gateway.drillr.ai";

interface RunSqlResponse {
  data?: { columns?: string[]; rows?: unknown[][]; rowCount?: number };
  error?: { message?: string; code?: string } | string;
}

export class DrillrConfigurationError extends Error {
  constructor() {
    super("Live data is not configured on the server.");
    this.name = "DrillrConfigurationError";
  }
}

export class DrillrRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "DrillrRequestError";
  }
}

export function isFixtureMode(): boolean {
  return process.env.RADAR_DATA_MODE === "fixture";
}

export function tabularRowsToObjects(columns: string[], rows: unknown[][]): RawRow[] {
  return rows.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])));
}

async function runSql(sql: string): Promise<RawRow[]> {
  const apiKey = process.env.DRILLR_API_KEY;
  if (!apiKey) throw new DrillrConfigurationError();
  const baseUrl = (process.env.DRILLR_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${baseUrl}/api/v1/data/run_sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sql }),
      cache: "no-store",
      signal: controller.signal,
    });
    let payload: RunSqlResponse;
    try {
      payload = (await response.json()) as RunSqlResponse;
    } catch {
      throw new DrillrRequestError("The data provider returned an unreadable response.", response.status);
    }
    if (!response.ok || payload.error) {
      const code = typeof payload.error === "object" ? payload.error?.code : undefined;
      throw new DrillrRequestError(`The data provider rejected the request${code ? ` (${code})` : ""}.`, response.status);
    }
    const columns = payload.data?.columns;
    const rows = payload.data?.rows;
    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      throw new DrillrRequestError("The data provider response was missing tabular data.");
    }
    return tabularRowsToObjects(columns, rows);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DrillrRequestError("The data provider did not respond within 20 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runSqlPaged(baseSql: string, maximumRows = 1000): Promise<RawRow[]> {
  const pageSize = 100;
  const rows: RawRow[] = [];
  for (let offset = 0; offset < maximumRows; offset += pageSize) {
    const page = await runSql(`${baseSql} LIMIT ${pageSize} OFFSET ${offset}`);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

const joinedColumns = `r.id, r.ticker, r.date, r.time_period, r.rating_action, r.price_target_action,
  r.rating_current, r.rating_prior, r.price_target, r.price_target_prior, r.analyst_name,
  r.analyst_firm, r.importance, r.updated_at, c.company_name, c.price_current,
  c.price_return_1d, c.market_capitalization, a.snapshot_date, a.consensus, a.total_analysts,
  a.strong_buy_count, a.buy_count, a.hold_count, a.sell_count, a.strong_sell_count, a.pt_consensus`;

function consensusJoin(date: string): string {
  return `LEFT JOIN (
    SELECT DISTINCT ON (ticker) ticker, snapshot_date, consensus, total_analysts, strong_buy_count,
      buy_count, hold_count, sell_count, strong_sell_count, pt_consensus
    FROM analyst_ratings_consensus
    WHERE snapshot_date <= '${date}'
    ORDER BY ticker, snapshot_date DESC
  ) a ON a.ticker = r.ticker`;
}

async function fetchSessionDatesLive(): Promise<string[]> {
  const rows = await runSql(
    "SELECT date, COUNT(*) AS event_count FROM analyst_ratings WHERE date >= '2026-01-01' GROUP BY date ORDER BY date DESC LIMIT 24",
  );
  return rows.map((row) => String(row.date)).filter(isIsoDate);
}

export async function fetchSessionDates(): Promise<string[]> {
  if (isFixtureMode()) return FIXTURE_SESSIONS;
  return unstable_cache(fetchSessionDatesLive, ["rating-session-dates-v1"], { revalidate: 900 })();
}

async function fetchSessionLive(date: string): Promise<RadarSession> {
  const sql = `SELECT ${joinedColumns}
    FROM analyst_ratings r
    LEFT JOIN company_snapshot c ON c.ticker = r.ticker
    ${consensusJoin(date)}
    WHERE r.date = '${date}'
    ORDER BY r.importance DESC, r.updated_at DESC, r.ticker, r.id`;
  return buildRadarSession(date, await runSqlPaged(sql), "live");
}

export async function fetchRadarSession(date: string): Promise<RadarSession> {
  if (!isIsoDate(date)) throw new DrillrRequestError("Invalid session date.", 400);
  if (isFixtureMode()) return buildRadarSession(FIXTURE_DATE, fixtureRows, "fixture");
  return unstable_cache(() => fetchSessionLive(date), ["rating-session-v3", date], { revalidate: 3600 })();
}

async function fetchTickerDetailLive(ticker: string, date: string): Promise<TickerDetail | null> {
  const fromDate = subtractDays(date, 120);
  const sql = `SELECT ${joinedColumns}
    FROM analyst_ratings r
    LEFT JOIN company_snapshot c ON c.ticker = r.ticker
    ${consensusJoin(date)}
    WHERE r.ticker = '${ticker}' AND r.date BETWEEN '${fromDate}' AND '${date}'
    ORDER BY r.date DESC, r.updated_at DESC
    LIMIT 100`;
  const events = (await runSql(sql)).map(rowToEvent);
  if (!events.length) return null;
  const first = events[0];
  return {
    ticker,
    companyName: first.companyName,
    currentPrice: first.currentPrice,
    priceReturn1d: first.priceReturn1d,
    marketCap: first.marketCap,
    consensus: first.consensus,
    events,
    targetAnomaly: events.some((event) => event.targetAnomaly),
  };
}

export async function fetchTickerDetail(tickerInput: string, date: string): Promise<TickerDetail | null> {
  const ticker = tickerInput.toUpperCase();
  if (!isSafeTicker(ticker) || !isIsoDate(date)) return null;
  if (isFixtureMode()) {
    const events = fixtureHistoryRows.filter((row) => row.ticker === ticker).map(rowToEvent);
    if (!events.length) return null;
    const first = events[0];
    return {
      ticker,
      companyName: first.companyName,
      currentPrice: first.currentPrice,
      priceReturn1d: first.priceReturn1d,
      marketCap: first.marketCap,
      consensus: first.consensus,
      events,
      targetAnomaly: events.some((event) => event.targetAnomaly),
    };
  }
  return unstable_cache(() => fetchTickerDetailLive(ticker, date), ["rating-ticker-v1", ticker, date], {
    revalidate: 3600,
  })();
}
