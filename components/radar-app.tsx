"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GitCompareArrows,
  Info,
  Layers3,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatSessionDate } from "@/lib/date";
import type {
  NormalizedAction,
  RadarSession,
  RatingDirection,
  RatingEvent,
  TickerDetail,
  TickerGroup,
} from "@/lib/types";

type View = "key" | "agreement" | "disagreement" | "contradictions" | "all";

const viewMeta: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: "key", label: "Key Moves", icon: <Sparkles size={15} /> },
  { id: "agreement", label: "Agreement", icon: <Layers3 size={15} /> },
  { id: "disagreement", label: "Disagreement", icon: <GitCompareArrows size={15} /> },
  { id: "contradictions", label: "Contradictions", icon: <AlertTriangle size={15} /> },
  { id: "all", label: "All Activity", icon: <Activity size={15} /> },
];

const actionLabels: Record<NormalizedAction, string> = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  initiation: "Initiation",
  reiteration: "Reiterate",
  maintain: "Maintain",
  reinstatement: "Reinstate",
  assumption: "Assume",
  suspension: "Suspend",
  other: "Other",
};

function titleCase(value: string | null): string {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
}

function formatMarketCap(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return `$${(value / 1_000_000).toFixed(0)}M`;
}

function DirectionIcon({ direction }: { direction: RatingDirection }) {
  if (direction === "bullish") return <ArrowUpRight size={14} />;
  if (direction === "bearish") return <ArrowDownRight size={14} />;
  return <ArrowRight size={14} />;
}

function ActionBadge({ event }: { event: RatingEvent }) {
  return (
    <span className={`action-badge action-${event.action}`}>
      <DirectionIcon direction={event.action === "upgrade" ? "bullish" : event.action === "downgrade" ? "bearish" : event.direction} />
      {actionLabels[event.action]}
    </span>
  );
}

function RatingTransition({ event }: { event: RatingEvent }) {
  return (
    <span className="rating-transition">
      {event.ratingPrior ? <span>{titleCase(event.ratingPrior)}</span> : <span className="muted">New</span>}
      <ArrowRight size={12} />
      <strong className={`direction-${event.direction}`}>{titleCase(event.ratingCurrent)}</strong>
    </span>
  );
}

function TargetTransition({ event }: { event: RatingEvent }) {
  if (event.priceTarget === null && event.priceTargetPrior === null) return <span className="muted">—</span>;
  return (
    <span className="target-transition" title={event.targetAnomaly ? "Large historical discontinuity; excluded from signal strength" : undefined}>
      {event.priceTargetPrior !== null && <span>{formatMoney(event.priceTargetPrior)}</span>}
      {event.priceTargetPrior !== null && event.priceTarget !== null && <ArrowRight size={11} />}
      <strong>{formatMoney(event.priceTarget)}</strong>
      {event.targetAnomaly && <AlertTriangle className="warning-icon" size={13} />}
    </span>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const className = value > 0 ? "positive" : value < 0 ? "negative" : "muted";
  return <span className={`price-change ${className}`}>{value > 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

function GroupFlags({ group }: { group: TickerGroup }) {
  return (
    <span className="flag-list">
      {group.hasAgreement && <span className="flag flag-agreement">Aligned</span>}
      {group.hasDisagreement && <span className="flag flag-disagreement">Split</span>}
      {group.hasContradiction && <span className="flag flag-contradiction">Contradiction</span>}
      {group.hasTargetAnomaly && <span className="flag flag-caution">Target check</span>}
    </span>
  );
}

function Score({ group }: { group: TickerGroup }) {
  return (
    <details className="score-details">
      <summary aria-label={`Signal strength ${group.score}, show explanation`}>
        <span>{group.score}</span><Info size={12} />
      </summary>
      <div className="score-popover">
        <strong>Signal strength</strong>
        <p>Transparent browsing priority, not a forecast.</p>
        <ul>
          {group.scoreReasons.map((reason) => (
            <li key={reason.label}><span>{reason.label}</span><b>+{reason.points}</b></li>
          ))}
        </ul>
        {group.hasTargetAnomaly && <small>Target-price discontinuity excluded.</small>}
      </div>
    </details>
  );
}

function EventLine({ event }: { event: RatingEvent }) {
  return (
    <div className="event-line">
      <div><ActionBadge event={event} /></div>
      <div>
        <strong>{event.analystFirm}</strong>
        <span>{event.analystName ?? "Analyst not named"}</span>
      </div>
      <RatingTransition event={event} />
      <TargetTransition event={event} />
      <span className="importance">IMP {event.importance || "—"}</span>
    </div>
  );
}

function GroupRow({ group, date, expanded, onToggle }: { group: TickerGroup; date: string; expanded: boolean; onToggle: () => void }) {
  const lead = group.events[0];
  return (
    <article className={`group-row ${expanded ? "is-expanded" : ""}`}>
      <div className="group-main">
        <Link className="company-cell" href={`/?date=${date}&ticker=${encodeURIComponent(group.ticker)}`} scroll={false}>
          <span className="ticker-mark">{group.ticker.slice(0, 4)}</span>
          <span className="company-copy">
            <span><strong>{group.ticker}</strong><em>{group.companyName}</em></span>
            <small>{formatMoney(group.currentPrice)} <Change value={group.priceReturn1d} /> · {formatMarketCap(group.marketCap)}</small>
          </span>
        </Link>
        <div className="signal-cell">
          <strong>{group.summary}</strong>
          <GroupFlags group={group} />
        </div>
        <div className="action-cell"><ActionBadge event={lead} />{group.events.length > 1 && <small>+{group.events.length - 1} calls</small>}</div>
        <div className="firm-cell"><strong>{lead.analystFirm}</strong><span>{lead.analystName ?? "Analyst not named"}</span></div>
        <div className="rating-cell"><RatingTransition event={lead} /></div>
        <div className="target-cell"><TargetTransition event={lead} /></div>
        <div className="score-cell"><Score group={group} /></div>
        <button className="expand-button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${group.ticker} events`} type="button">
          <ChevronDown size={16} />
        </button>
      </div>
      {expanded && (
        <div className="event-stack">
          {group.events.map((event) => <EventLine event={event} key={event.id} />)}
          <Link className="detail-link" href={`/?date=${date}&ticker=${encodeURIComponent(group.ticker)}`} scroll={false}>
            Open snapshot history <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </article>
  );
}

function ConsensusPanel({ detail }: { detail: TickerDetail }) {
  const consensus = detail.consensus;
  if (!consensus) return <p className="empty-copy">No current consensus snapshot is available.</p>;
  const bullish = consensus.strongBuy + consensus.buy;
  const neutral = consensus.hold;
  const bearish = consensus.sell + consensus.strongSell;
  const total = Math.max(bullish + neutral + bearish, 1);
  return (
    <div className="consensus-panel">
      <div className="consensus-heading"><strong>{consensus.label ?? "No label"}</strong><span>{consensus.totalAnalysts} analysts · as of {consensus.snapshotDate ?? "latest"}</span></div>
      <div className="consensus-bar" aria-label={`${bullish} bullish, ${neutral} hold, ${bearish} bearish`}>
        <span className="bar-bullish" style={{ width: `${(bullish / total) * 100}%` }} />
        <span className="bar-neutral" style={{ width: `${(neutral / total) * 100}%` }} />
        <span className="bar-bearish" style={{ width: `${(bearish / total) * 100}%` }} />
      </div>
      <div className="consensus-legend"><span><i className="dot-bullish" /> Buy {bullish}</span><span><i className="dot-neutral" /> Hold {neutral}</span><span><i className="dot-bearish" /> Sell {bearish}</span></div>
      <dl className="detail-metrics"><div><dt>Consensus target</dt><dd>{formatMoney(consensus.priceTarget)}</dd></div><div><dt>Market cap</dt><dd>{formatMarketCap(detail.marketCap)}</dd></div></dl>
    </div>
  );
}

function DetailDrawer({ detail, date, onClose }: { detail: TickerDetail; date: string; onClose: () => void }) {
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close stock detail" type="button" />
      <aside className="detail-drawer" aria-label={`${detail.ticker} analyst detail`}>
        <header className="drawer-header">
          <div><span className="ticker-mark large">{detail.ticker.slice(0, 4)}</span></div>
          <div className="drawer-title"><p className="eyebrow">Up to 120 days of snapshots</p><h2>{detail.ticker}</h2><span>{detail.companyName}</span></div>
          <button className="icon-button" onClick={onClose} aria-label="Close detail" type="button"><X size={18} /></button>
        </header>
        <div className="drawer-price"><strong>{formatMoney(detail.currentPrice)}</strong><Change value={detail.priceReturn1d} /><span>Session {date}</span></div>
        {detail.targetAnomaly && (
          <div className="caution-note"><AlertTriangle size={16} /><span><strong>Target-price discontinuity detected.</strong> Large historical changes are shown for context and excluded from signal strength.</span></div>
        )}
        <section className="drawer-section"><h3>Current consensus</h3><ConsensusPanel detail={detail} /></section>
        <section className="drawer-section timeline-section">
          <div className="section-heading"><h3>Recent analyst activity</h3><span>{detail.events.length} calls</span></div>
          <div className="timeline">
            {detail.events.map((event) => (
              <article className="timeline-event" key={event.id}>
                <div className="timeline-date"><CircleDot size={14} /><span>{event.date}</span></div>
                <div className="timeline-card">
                  <div><ActionBadge event={event} /><span className="importance">IMP {event.importance || "—"}</span></div>
                  <h4>{event.analystFirm}</h4><p>{event.analystName ?? "Analyst not named"}</p>
                  <dl><div><dt>Rating</dt><dd><RatingTransition event={event} /></dd></div><div><dt>Target</dt><dd><TargetTransition event={event} /></dd></div></dl>
                </div>
              </article>
            ))}
          </div>
        </section>
        <footer className="drawer-footer">Source: Drillr structured analyst-rating data. No investment advice.</footer>
      </aside>
    </div>
  );
}

export function RadarApp({ session, sessions, detail }: { session: RadarSession; sessions: string[]; detail: TickerDetail | null }) {
  const router = useRouter();
  const [view, setView] = useState<View>("key");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [direction, setDirection] = useState("all");
  const [importance, setImportance] = useState("0");
  const [firmState, setFirmState] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const currentIndex = sessions.indexOf(session.date);
  const newer = currentIndex > 0 ? sessions[currentIndex - 1] : null;
  const older = currentIndex >= 0 && currentIndex < sessions.length - 1 ? sessions[currentIndex + 1] : null;

  const viewCounts = useMemo(() => ({
    key: session.groups.filter((group) => group.keyMove).length,
    agreement: session.groups.filter((group) => group.hasAgreement).length,
    disagreement: session.groups.filter((group) => group.hasDisagreement).length,
    contradictions: session.groups.filter((group) => group.hasContradiction).length,
    all: session.groups.length,
  }), [session.groups]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return session.groups.filter((group) => {
      if (view === "key" && !group.keyMove) return false;
      if (view === "agreement" && !group.hasAgreement) return false;
      if (view === "disagreement" && !group.hasDisagreement) return false;
      if (view === "contradictions" && !group.hasContradiction) return false;
      if (search && ![
        group.ticker,
        group.companyName,
        ...group.events.flatMap((event) => [event.analystFirm, event.analystName ?? ""]),
      ].some((value) => value.toLowerCase().includes(search))) return false;
      if (action !== "all" && !group.events.some((event) => event.action === action)) return false;
      if (direction !== "all" && !group.events.some((event) => event.direction === direction)) return false;
      if (group.events.every((event) => event.importance < Number(importance))) return false;
      if (firmState === "multi" && group.firms.length < 2) return false;
      if (firmState === "single" && group.firms.length !== 1) return false;
      return true;
    });
  }, [action, direction, firmState, importance, query, session.groups, view]);

  function toggleGroup(ticker: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      return next;
    });
  }

  function closeDetail() {
    router.replace(`/?date=${session.date}`, { scroll: false });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Radar size={19} /></span><div><strong>Analyst Rating Radar</strong><span>Wall Street changes, without the spin</span></div></div>
        <div className="session-control">
          <Link className={`icon-button ${!older ? "disabled" : ""}`} href={older ? `/?date=${older}` : "#"} aria-disabled={!older} aria-label="Previous trading session"><ChevronLeft size={17} /></Link>
          <div><span><CalendarDays size={13} /> Latest Session</span><strong>{formatSessionDate(session.date)}</strong></div>
          <Link className={`icon-button ${!newer ? "disabled" : ""}`} href={newer ? `/?date=${newer}` : "#"} aria-disabled={!newer} aria-label="Next trading session"><ChevronRight size={17} /></Link>
        </div>
        <div className="source-status"><i /><span>{session.mode === "fixture" ? "Recorded fixture" : "Published snapshot"}</span></div>
      </header>

      <section className="workspace-header">
        <div className="workspace-intro"><p className="eyebrow">Daily analyst intelligence</p><h1>What changed on Wall Street?</h1><p>Rating actions grouped by company, with agreement and disagreement made explicit.</p></div>
        <dl className="session-stats">
          <div><dt>Events</dt><dd>{session.stats.events}</dd></div>
          <div><dt>Stocks</dt><dd>{session.stats.tickers}</dd></div>
          <div className="stat-positive"><dt>Upgrades</dt><dd>{session.stats.upgrades}</dd></div>
          <div className="stat-negative"><dt>Downgrades</dt><dd>{session.stats.downgrades}</dd></div>
          <div><dt>Initiations</dt><dd>{session.stats.initiations}</dd></div>
        </dl>
      </section>

      <section className="radar-workspace">
        <nav className="view-tabs" aria-label="Radar views">
          {viewMeta.map((item) => (
            <button aria-label={item.label} className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)} type="button">
              {item.icon}<span>{item.label}</span><b>{viewCounts[item.id]}</b>
            </button>
          ))}
        </nav>
        <div className="filterbar">
          <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, company, firm, or analyst" aria-label="Search ratings" />{query && <button onClick={() => setQuery("")} type="button" aria-label="Clear search"><X size={14} /></button>}</label>
          <span className="filter-label"><SlidersHorizontal size={14} /> Filter</span>
          <label><span>Action</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All actions</option><option value="upgrade">Upgrades</option><option value="downgrade">Downgrades</option><option value="initiation">Initiations</option><option value="maintain">Maintains</option><option value="reiteration">Reiterations</option></select></label>
          <label><span>Direction</span><select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="all">All ratings</option><option value="bullish">Bullish</option><option value="neutral">Neutral</option><option value="bearish">Bearish</option><option value="unknown">Unmapped</option></select></label>
          <label><span>Importance</span><select value={importance} onChange={(event) => setImportance(event.target.value)}><option value="0">Any</option><option value="4">4+</option><option value="5">5 only</option></select></label>
          <label><span>Firms</span><select value={firmState} onChange={(event) => setFirmState(event.target.value)}><option value="all">Any</option><option value="multi">Multi-firm</option><option value="single">Single firm</option></select></label>
        </div>
        <div className="results-heading"><div><strong>{viewMeta.find((item) => item.id === view)?.label}</strong><span>{filtered.length} companies after filters</span></div><p><Info size={13} /> Signal strength prioritizes browsing; it is not a price forecast.</p></div>
        <div className="table-head" aria-hidden="true"><span>Company</span><span>Signal</span><span>Lead action</span><span>Firm / analyst</span><span>Rating</span><span>Target</span><span>Strength</span><span /></div>
        <div className="group-list">
          {filtered.map((group) => <GroupRow group={group} date={session.date} expanded={expanded.has(group.ticker)} onToggle={() => toggleGroup(group.ticker)} key={group.ticker} />)}
          {!filtered.length && <div className="empty-state"><Building2 size={22} /><strong>No companies match these filters.</strong><span>Try another view or loosen one of the filters.</span></div>}
        </div>
      </section>

      <footer className="app-footer"><span>Data source: Drillr · Session keyed to the U.S. market date</span><span>Transparent rules · No investment advice · No generated facts</span></footer>
      {detail && <DetailDrawer detail={detail} date={session.date} onClose={closeDetail} />}
    </main>
  );
}
