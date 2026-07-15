import "server-only";

import {
  DrillrConfigurationError,
  DrillrRequestError,
  fetchRadarSessionFromDrillr,
  fetchSessionCalendarFromDrillr,
  type DrillrCallGate,
} from "@/lib/drillr";
import { publishSnapshot } from "@/lib/snapshot-store";
import {
  assertRefreshAllowed,
  reserveUpstreamCall,
  setCircuitState,
} from "@/lib/upstream-control";

export interface RefreshResult {
  date: string;
  events: number;
  tickers: number;
  upstreamCalls: number;
  publishedAt: string;
}

export class SnapshotRefreshInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotRefreshInputError";
  }
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function refreshPublishedSnapshot(requestedDate?: string): Promise<RefreshResult> {
  if (requestedDate && !isDate(requestedDate)) {
    throw new SnapshotRefreshInputError("The requested date must use YYYY-MM-DD format.");
  }
  await assertRefreshAllowed();
  let upstreamCalls = 0;
  const gate: DrillrCallGate = {
    async beforeCall(label) {
      await reserveUpstreamCall(label);
      upstreamCalls += 1;
    },
  };

  try {
    const calendar = await fetchSessionCalendarFromDrillr(gate);
    if (!calendar.length) throw new DrillrRequestError("The data provider returned no complete sessions.");

    const target = requestedDate
      ? calendar.find((entry) => entry.date === requestedDate)
      : calendar[0];
    if (!target) throw new SnapshotRefreshInputError("The requested session is not available.");

    const session = await fetchRadarSessionFromDrillr(target.date, target.events, gate);
    const manifest = await publishSnapshot(session);
    return {
      date: session.date,
      events: session.stats.events,
      tickers: session.stats.tickers,
      upstreamCalls,
      publishedAt: manifest.generatedAt,
    };
  } catch (error) {
    if (error instanceof DrillrRequestError || error instanceof DrillrConfigurationError) {
      await setCircuitState(true, error.message);
    }
    throw error;
  }
}
