import { RadarApp } from "@/components/radar-app";
import {
  fetchPublishedManifest,
  fetchPublishedSession,
  fetchPublishedTickerDetail,
} from "@/lib/snapshot-store";

interface PageProps {
  searchParams: Promise<{ date?: string; ticker?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const manifest = await fetchPublishedManifest();
  const sessions = manifest.dates;
  const requestedDate = params.date;
  const date = requestedDate && sessions.includes(requestedDate) ? requestedDate : sessions[0];

  if (!date) {
    throw new Error("No complete analyst-rating session is available yet.");
  }

  const ticker = params.ticker?.toUpperCase();
  const session = await fetchPublishedSession(manifest, date);
  const detail = ticker
    ? await fetchPublishedTickerDetail(manifest, session, ticker)
    : null;

  return <RadarApp session={session} sessions={sessions} detail={detail} />;
}
