import { RadarApp } from "@/components/radar-app";
import { fetchRadarSession, fetchSessionDates, fetchTickerDetail } from "@/lib/drillr";

interface PageProps {
  searchParams: Promise<{ date?: string; ticker?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessions = await fetchSessionDates();
  const requestedDate = params.date;
  const date = requestedDate && sessions.includes(requestedDate) ? requestedDate : sessions[0];

  if (!date) {
    throw new Error("No complete analyst-rating session is available yet.");
  }

  const ticker = params.ticker?.toUpperCase();
  const [session, detail] = await Promise.all([
    fetchRadarSession(date),
    ticker ? fetchTickerDetail(ticker, date) : Promise.resolve(null),
  ]);

  return <RadarApp session={session} sessions={sessions} detail={detail} />;
}
