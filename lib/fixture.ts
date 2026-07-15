import type { RawRow } from "@/lib/types";

export const FIXTURE_DATE = "2026-07-14";
export const FIXTURE_SESSIONS = ["2026-07-14", "2026-07-13", "2026-07-10", "2026-07-09"];

const company: Record<string, [string, number, string, number]> = {
  AAPL: ["Apple Inc.", 248.8, "0.62%", 3_710_000_000_000],
  IBM: ["International Business Machines Corporation", 281.4, "-1.14%", 262_000_000_000],
  TSLA: ["Tesla, Inc.", 312.2, "1.78%", 1_010_000_000_000],
  TCBK: ["TriCo Bancshares", 42.1, "-0.84%", 1_370_000_000],
  ARM: ["Arm Holdings plc", 162.7, "2.12%", 171_000_000_000],
  CNI: ["Canadian National Railway Company", 102.3, "-0.42%", 64_000_000_000],
  CRWD: ["CrowdStrike Holdings, Inc.", 486.2, "0.31%", 121_000_000_000],
};

let id = 0;
function row(
  ticker: string,
  firm: string,
  action: string,
  current: string,
  prior: string | null,
  targetAction: string | null,
  target: number | null,
  targetPrior: number | null,
  importance: number,
): RawRow {
  const [companyName, price, change, marketCap] = company[ticker];
  id += 1;
  return {
    id: `fixture-${id}`,
    ticker,
    date: FIXTURE_DATE,
    time_period: "dmh",
    rating_action: action,
    price_target_action: targetAction,
    rating_current: current,
    rating_prior: prior,
    price_target: target,
    price_target_prior: targetPrior,
    analyst_name: `Analyst ${id}`,
    analyst_firm: firm,
    importance,
    updated_at: 1_783_900_000 + id,
    company_name: companyName,
    price_current: price,
    price_return_1d: change,
    market_capitalization: marketCap,
    snapshot_date: FIXTURE_DATE,
    consensus: ticker === "IBM" ? "Hold" : "Buy",
    total_analysts: ticker === "TSLA" ? 32 : 18,
    strong_buy_count: 2,
    buy_count: 10,
    hold_count: 5,
    sell_count: 1,
    strong_sell_count: 0,
    pt_consensus: target ?? price * 1.12,
  };
}

export const fixtureRows: RawRow[] = [
  row("AAPL", "KeyBanc", "downgrades", "underweight", "sector weight", "lowers", 220, 245, 5),
  row("IBM", "HSBC", "downgrades", "reduce", "hold", "lowers", 240, 265, 5),
  row("IBM", "Morgan Stanley", "maintains", "equal-weight", "equal-weight", "raises", 290, 280, 4),
  row("IBM", "Oppenheimer", "maintains", "outperform", "outperform", "raises", 320, 305, 4),
  row("TSLA", "Barclays", "maintains", "underweight", "underweight", "raises", 275, 250, 4),
  row("TSLA", "Morgan Stanley", "maintains", "equal-weight", "equal-weight", "raises", 310, 290, 4),
  row("TSLA", "Wells Fargo", "maintains", "underweight", "underweight", "raises", 190, 170, 3),
  row("TCBK", "DA Davidson", "downgrades", "neutral", "buy", "lowers", 40, 47, 4),
  row("TCBK", "Janney", "downgrades", "neutral", "buy", "maintains", 44, 44, 4),
  row("ARM", "Bernstein", "downgrades", "underperform", "market perform", "raises", 140, 125, 5),
  row("CNI", "BMO Capital", "downgrades", "market perform", "outperform", "raises", 115, 110, 4),
  row("CRWD", "RBC Capital", "maintains", "outperform", "outperform", "lowers", 172.5, 690, 5),
];

export const fixtureHistoryRows: RawRow[] = [
  ...fixtureRows,
  { ...fixtureRows[0], id: "fixture-history-aapl", date: "2026-06-18", rating_action: "maintains", rating_current: "sector weight", rating_prior: "sector weight", price_target: 245, price_target_prior: 245 },
  { ...fixtureRows[1], id: "fixture-history-ibm", date: "2026-05-22", rating_action: "maintains", rating_current: "hold", rating_prior: "hold", price_target: 265, price_target_prior: 260 },
];
