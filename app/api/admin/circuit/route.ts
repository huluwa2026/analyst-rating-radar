import { NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getDailyBudgetStatus, readCircuitState, setCircuitState } from "@/lib/upstream-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) return json({ error: "Unauthorized." }, 401);
  const [circuit, budget] = await Promise.all([readCircuitState(), getDailyBudgetStatus()]);
  return json({ circuit, budget }, 200);
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) return json({ error: "Unauthorized." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const input = body as { open?: unknown; reason?: unknown };
  if (typeof input.open !== "boolean" || typeof input.reason !== "string") {
    return json({ error: "Expected open (boolean) and reason (string)." }, 400);
  }
  return json({ circuit: await setCircuitState(input.open, input.reason) }, 200);
}
