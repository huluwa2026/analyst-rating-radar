import "server-only";

import { BlobPreconditionFailedError } from "@vercel/blob";
import { overwriteJson, putMutableJson, readBlobJson } from "@/lib/blob-json";

const CIRCUIT_PATH = "radar/control/circuit.json";

export interface CircuitState {
  open: boolean;
  reason: string;
  updatedAt: string;
}

interface DailyBudgetState {
  date: string;
  used: number;
  limit: number;
  updatedAt: string;
  recentCalls: Array<{ at: string; label: string }>;
}

export class RefreshDisabledError extends Error {
  constructor(message = "Snapshot refresh is disabled.") {
    super(message);
    this.name = "RefreshDisabledError";
  }
}

export class DailyBudgetExceededError extends Error {
  constructor() {
    super("The daily Drillr call budget is exhausted.");
    this.name = "DailyBudgetExceededError";
  }
}

function dailyLimit(): number {
  const parsed = Number.parseInt(process.env.RADAR_DAILY_DRILLR_CALL_LIMIT ?? "12", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 12;
}

function budgetPath(date: string): string {
  return `radar/control/budget-${date}.json`;
}

export async function readCircuitState(): Promise<CircuitState> {
  const stored = await readBlobJson<CircuitState>(CIRCUIT_PATH, false);
  return stored?.value ?? { open: false, reason: "", updatedAt: new Date(0).toISOString() };
}

export async function setCircuitState(open: boolean, reason: string): Promise<CircuitState> {
  const state: CircuitState = {
    open,
    reason: reason.slice(0, 240),
    updatedAt: new Date().toISOString(),
  };
  await overwriteJson(CIRCUIT_PATH, state);
  return state;
}

export async function assertRefreshAllowed(): Promise<void> {
  if (process.env.RADAR_UPSTREAM_DISABLED === "true") {
    throw new RefreshDisabledError("Snapshot refresh is disabled by the deployment kill switch.");
  }
  const circuit = await readCircuitState();
  if (circuit.open) throw new RefreshDisabledError("Snapshot refresh circuit is open.");
}

export async function reserveUpstreamCall(label: string): Promise<{ used: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const pathname = budgetPath(date);
  const limit = dailyLimit();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const stored = await readBlobJson<DailyBudgetState>(pathname, false);
    const current = stored?.value ?? {
      date,
      used: 0,
      limit,
      updatedAt: new Date(0).toISOString(),
      recentCalls: [],
    };
    if (current.used >= limit) throw new DailyBudgetExceededError();

    const next: DailyBudgetState = {
      date,
      used: current.used + 1,
      limit,
      updatedAt: new Date().toISOString(),
      recentCalls: [...current.recentCalls, { at: new Date().toISOString(), label: label.slice(0, 80) }].slice(-20),
    };

    try {
      await putMutableJson(pathname, next, stored?.etag);
      return { used: next.used, limit };
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || attempt < 5) continue;
      throw error;
    }
  }

  throw new Error("Unable to reserve the upstream budget atomically.");
}

export async function getDailyBudgetStatus(): Promise<{ used: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const stored = await readBlobJson<DailyBudgetState>(budgetPath(date), false);
  return { used: stored?.value.used ?? 0, limit: dailyLimit() };
}
