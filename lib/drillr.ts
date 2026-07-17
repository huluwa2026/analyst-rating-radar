import "server-only";

import { buildRadarSession } from "@/lib/aggregate";
import type { RadarSession, RawRow } from "@/lib/types";

const DEFAULT_BASE_URL = "https://gateway.drillr.ai";

interface RunSqlResponse {
  data?: { columns?: string[]; rows?: unknown[][]; rowCount?: number };
  error?: { message?: string; code?: string } | string;
}

export interface DrillrCallGate {
  beforeCall(label: string): Promise<void>;
}

export interface SessionCalendarEntry {
  date: string;
  events: number;
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

export function tabularRowsToObjects(columns: string[], rows: unknown[][]): RawRow[] {
  return rows.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])));
}

async function runSql(sql: string, gate: DrillrCallGate, label: string): Promise<RawRow[]> {
  const apiKey = process.env.DRILLR_API_KEY;
  if (!apiKey) throw new DrillrConfigurationError();
  await gate.beforeCall(label);

  const baseUrl = (process.env.DRILLR_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${baseUrl}/api/v1/data/run_sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Drillr-Via": "analyst-rating-radar",
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

async function runSqlPaged(
  baseSql: string,
  expectedRows: number,
  gate: DrillrCallGate,
): Promise<RawRow[]> {
  const pageSize = 100;
  const rows: RawRow[] = [];
  for (let offset = 0; offset < expectedRows; offset += pageSize) {
    const page = await runSql(
      `${baseSql} LIMIT ${pageSize} OFFSET ${offset}`,
      gate,
      `session-page:${offset / pageSize + 1}`,
    );
    rows.push(...page);
  }
  if (rows.length !== expectedRows) {
    throw new DrillrRequestError("The session changed while its snapshot was being generated.");
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

export async function fetchSessionCalendarFromDrillr(gate: DrillrCallGate): Promise<SessionCalendarEntry[]> {
  const rows = await runSql(
    "SELECT date, COUNT(*) AS event_count FROM analyst_ratings WHERE date >= '2026-01-01' GROUP BY date ORDER BY date DESC LIMIT 24",
    gate,
    "session-calendar",
  );
  return rows
    .map((row) => ({ date: String(row.date), events: Number.parseInt(String(row.event_count), 10) }))
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && Number.isFinite(entry.events) && entry.events > 0);
}

export async function fetchRadarSessionFromDrillr(
  date: string,
  expectedEvents: number,
  gate: DrillrCallGate,
): Promise<RadarSession> {
  const sql = `SELECT ${joinedColumns}
    FROM analyst_ratings r
    LEFT JOIN company_snapshot c ON c.ticker = r.ticker
    ${consensusJoin(date)}
    WHERE r.date = '${date}'
    ORDER BY r.importance DESC, r.updated_at DESC, r.ticker, r.id`;
  return buildRadarSession(date, await runSqlPaged(sql, expectedEvents, gate), "live");
}
