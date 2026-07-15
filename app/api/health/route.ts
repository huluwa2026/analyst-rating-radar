import { NextResponse } from "next/server";
import { fetchPublishedManifest, isFixtureMode } from "@/lib/snapshot-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = await fetchPublishedManifest();
    const age = Date.now() - new Date(manifest.generatedAt).getTime();
    const stale = age > 72 * 60 * 60 * 1000;
    return NextResponse.json(
      {
        status: stale ? "degraded" : "ok",
        mode: isFixtureMode() ? "fixture" : "snapshot",
        latestDate: manifest.latestDate,
        generatedAt: manifest.generatedAt,
        stale,
        checkedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", mode: "snapshot", checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
