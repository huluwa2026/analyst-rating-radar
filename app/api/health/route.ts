import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const mode = process.env.RADAR_DATA_MODE === "fixture" ? "fixture" : "live";
  const configured = mode === "fixture" || Boolean(process.env.DRILLR_API_KEY);
  return NextResponse.json(
    { status: configured ? "ok" : "misconfigured", mode, checkedAt: new Date().toISOString() },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
