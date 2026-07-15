import { NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { DrillrConfigurationError, DrillrRequestError } from "@/lib/drillr";
import { refreshPublishedSnapshot, SnapshotRefreshInputError } from "@/lib/refresh";
import { DailyBudgetExceededError, RefreshDisabledError } from "@/lib/upstream-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) return json({ error: "Unauthorized." }, 401);

  try {
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    return json({ ok: true, ...(await refreshPublishedSnapshot(date)) }, 200);
  } catch (error) {
    if (error instanceof SnapshotRefreshInputError) return json({ error: error.message }, 400);
    if (error instanceof DailyBudgetExceededError) return json({ error: error.message }, 429);
    if (error instanceof RefreshDisabledError) return json({ error: error.message }, 503);
    if (error instanceof DrillrRequestError || error instanceof DrillrConfigurationError) {
      return json({ error: error.message }, 502);
    }
    console.error(
      "Snapshot refresh failed without publishing a manifest.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json({ error: "Snapshot refresh failed." }, 500);
  }
}
