import "server-only";

import { randomUUID } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { buildRadarSession } from "@/lib/aggregate";
import { readBlobJson, overwriteJson, putImmutableJson } from "@/lib/blob-json";
import { FIXTURE_DATE, FIXTURE_SESSIONS, fixtureRows } from "@/lib/fixture";
import {
  buildTickerDetail,
  isTickerInSession,
  mergeSessionIntoDetailIndex,
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotDetailIndex,
  type SnapshotManifest,
} from "@/lib/snapshot";
import type { RadarSession, TickerDetail } from "@/lib/types";

const MANIFEST_PATH = "radar/manifest.json";
const MANIFEST_CACHE_TAG = "published-rating-manifest-v1";

export class SnapshotUnavailableError extends Error {
  constructor(message = "No published rating snapshot is available.") {
    super(message);
    this.name = "SnapshotUnavailableError";
  }
}

function fixtureSession(): RadarSession {
  return buildRadarSession(FIXTURE_DATE, fixtureRows, "fixture");
}

function fixtureManifest(): SnapshotManifest {
  const session = fixtureSession();
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: session.generatedAt,
    latestDate: FIXTURE_DATE,
    dates: FIXTURE_SESSIONS,
    sessions: Object.fromEntries(
      FIXTURE_SESSIONS.map((date) => [date, {
        pathname: `fixture:${date}`,
        generatedAt: session.generatedAt,
        events: session.stats.events,
        tickers: session.stats.tickers,
      }]),
    ),
    detailIndexPathname: "fixture:details",
  };
}

export function isFixtureMode(): boolean {
  return process.env.RADAR_DATA_MODE === "fixture";
}

async function readManifestFromBlob(): Promise<SnapshotManifest> {
  const stored = await readBlobJson<SnapshotManifest>(MANIFEST_PATH, false);
  if (!stored || stored.value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new SnapshotUnavailableError();
  return stored.value;
}

export async function fetchPublishedManifest(): Promise<SnapshotManifest> {
  if (isFixtureMode()) return fixtureManifest();
  return unstable_cache(readManifestFromBlob, [MANIFEST_CACHE_TAG], {
    revalidate: 60,
    tags: [MANIFEST_CACHE_TAG],
  })();
}

async function readSessionFromBlob(pathname: string): Promise<RadarSession> {
  const stored = await readBlobJson<RadarSession>(pathname, true);
  if (!stored) throw new SnapshotUnavailableError("The requested rating session snapshot is unavailable.");
  return stored.value;
}

export async function fetchPublishedSession(manifest: SnapshotManifest, date: string): Promise<RadarSession> {
  if (isFixtureMode()) return { ...fixtureSession(), date };
  const reference = manifest.sessions[date];
  if (!reference) throw new SnapshotUnavailableError("The requested rating session is not published.");
  return unstable_cache(
    () => readSessionFromBlob(reference.pathname),
    ["published-rating-session-v1", reference.pathname],
    { revalidate: 86_400 },
  )();
}

async function readDetailIndexFromBlob(pathname: string): Promise<SnapshotDetailIndex> {
  const stored = await readBlobJson<SnapshotDetailIndex>(pathname, true);
  if (!stored) throw new SnapshotUnavailableError("The rating detail snapshot is unavailable.");
  return stored.value;
}

export async function fetchPublishedTickerDetail(
  manifest: SnapshotManifest,
  session: RadarSession,
  tickerInput: string,
): Promise<TickerDetail | null> {
  const ticker = tickerInput.toUpperCase();
  if (!isTickerInSession(session, ticker)) return null;
  const detailIndex = isFixtureMode()
    ? mergeSessionIntoDetailIndex(null, fixtureSession())
    : await unstable_cache(
        () => readDetailIndexFromBlob(manifest.detailIndexPathname),
        ["published-rating-details-v1", manifest.detailIndexPathname],
        { revalidate: 86_400 },
      )();
  return buildTickerDetail(ticker, session, detailIndex);
}

export async function publishSnapshot(sessionInput: RadarSession): Promise<SnapshotManifest> {
  const previousManifest = (await readBlobJson<SnapshotManifest>(MANIFEST_PATH, false))?.value ?? null;
  const previousDetailIndex = previousManifest
    ? (await readBlobJson<SnapshotDetailIndex>(previousManifest.detailIndexPathname, false))?.value ?? null
    : null;
  const publishedSession: RadarSession = { ...sessionInput, mode: "snapshot" };
  const detailIndex = mergeSessionIntoDetailIndex(previousDetailIndex, publishedSession);
  const version = `${Date.now()}-${randomUUID()}`;
  const sessionPathname = `radar/sessions/${publishedSession.date}/${version}.json`;
  const detailPathname = `radar/details/${version}.json`;

  await Promise.all([
    putImmutableJson(sessionPathname, publishedSession),
    putImmutableJson(detailPathname, detailIndex),
  ]);

  const sessions = {
    ...(previousManifest?.sessions ?? {}),
    [publishedSession.date]: {
      pathname: sessionPathname,
      generatedAt: publishedSession.generatedAt,
      events: publishedSession.stats.events,
      tickers: publishedSession.stats.tickers,
    },
  };
  const dates = Object.keys(sessions).sort((a, b) => b.localeCompare(a)).slice(0, 24);
  const trimmedSessions = Object.fromEntries(dates.map((date) => [date, sessions[date]]));
  const manifest: SnapshotManifest = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    latestDate: dates[0],
    dates,
    sessions: trimmedSessions,
    detailIndexPathname: detailPathname,
  };
  await overwriteJson(MANIFEST_PATH, manifest);
  revalidateTag(MANIFEST_CACHE_TAG, { expire: 0 });
  return manifest;
}
