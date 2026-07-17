# Analyst Rating Radar — Wall Street Analyst Ratings Dashboard

Analyst Rating Radar is an open-source stock research dashboard for tracking Wall Street analyst upgrades, downgrades, rating changes, price-target moves, consensus, and multi-firm signals across U.S. equities.

[English](README.md) | [简体中文](README.zh-CN.md)

**[Open the live analyst ratings dashboard](https://analyst-rating-radar.vercel.app)** · [Architecture](docs/architecture.md) · [Security](SECURITY.md) · [Build with Drillr](https://drillr.ai/l/analyst-radar-gh)

[![CI](https://github.com/huluwa2026/analyst-rating-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/huluwa2026/analyst-rating-radar/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-101b17?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-16734a.svg)](LICENSE)

![Wall Street analyst ratings dashboard showing stock upgrades, downgrades, price-target changes, and multi-firm signals](docs/analyst-rating-radar.png)

## Why Analyst Rating Radar?

Analyst Rating Radar answers one focused question: **what did Wall Street analysts change?** It turns a daily stream of individual analyst ratings into a transparent, searchable view without hiding original firm calls behind a black-box prediction.

Use it to review:

- stock upgrades, downgrades, initiations, reiterations, and maintained ratings;
- analyst price-target raises, cuts, and rating/target contradictions;
- multi-firm agreement and disagreement on the same company;
- current analyst consensus and up to 120 days of published rating history;
- the original analyst, firm, rating labels, targets, and source importance.

It does not predict returns, explain price moves, or provide investment advice.

## Features

- **Key Moves** — upgrades, downgrades, and coverage initiations prioritized for review.
- **Multi-firm Agreement** — independent research firms changing ratings in the same direction.
- **Analyst Disagreement** — firms sending opposing rating or price-target signals.
- **Contradictions** — an upgrade paired with a lower target, or a downgrade paired with a higher target.
- **All Activity** — a complete market session grouped by stock ticker without losing individual calls.
- **Ticker Detail** — company context, analyst consensus, and published historical rating events.
- **Research Filters** — search by ticker, company, firm, or analyst; filter by action, direction, importance, and firm count.

The newest complete U.S. trading session is selected automatically. Signal strength is a browsing priority, not a forecast, and every contributing factor remains visible in the interface.

## Quick start

Requirements: Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/huluwa2026/analyst-rating-radar.git
cd analyst-rating-radar
npm ci
npm run dev:fixture
```

Open [http://localhost:3000](http://localhost:3000). Fixture mode uses synthetic validation cases and needs no credential.

Run the complete local verification suite:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
RADAR_DATA_MODE=fixture npm run build
```

Production refreshes additionally require a private Vercel Blob store, a server-only `DRILLR_API_KEY`, and a long random `CRON_SECRET`. Never commit a populated environment file.

Create a [Drillr API key](https://drillr.ai/l/analyst-radar-gh) for live refreshes. Drillr requests include the stable project header `X-Drillr-Via: analyst-rating-radar`; it identifies aggregate project usage without adding tracking parameters to public URLs.

## Tech stack

| Layer | Technology |
|---|---|
| Web application | Next.js 16 App Router, React 19, TypeScript |
| Snapshot storage | Private Vercel Blob objects with atomic manifest publishing |
| Data source | [Drillr structured analyst-rating data](https://drillr.ai/l/analyst-radar-gh) |
| Testing | Vitest and Playwright |
| Deployment | Vercel Cron, Functions, and Firewall |

## Data architecture

```text
Public browser request
  → Next.js server render
  → private, published Vercel Blob snapshot
  → interactive analyst ratings dashboard

Vercel Cron / authenticated operator
  → daily Drillr call budget + circuit breaker
  → application-owned read-only SQL
  → normalization / grouping / transparent scoring
  → immutable session + ticker-detail blobs
  → atomic manifest publish
```

Only the protected refresh job reads the upstream analyst-rating tables:

| Table | Purpose |
|---|---|
| `analyst_ratings` | Individual analyst rating and price-target events |
| `analyst_ratings_consensus` | Rating distribution and consensus price target |
| `company_snapshot` | Company name, current price, return, and market capitalization |

Public requests never call Drillr. They can only read dates and tickers already present in the private published snapshot. Each upstream call reserves capacity against a Blob-backed daily budget, provider failures open a circuit breaker, and the public manifest changes only after a complete refresh.

Read the [architecture documentation](docs/architecture.md) for the request boundary, snapshot lifecycle, normalization rules, and anti-abuse controls.

## Transparent signal strength

The on-screen explanation lists every scoring factor:

- rating action type;
- the source `importance` value;
- additional material calls from independent firms;
- agreement, disagreement, or rating/target contradiction;
- a small browsing weight for widely followed companies.

Unverified target-price percentage changes never contribute. Large discontinuities that may cross a split or adjustment boundary are flagged and shown only as context.

## Security and data safety

`DRILLR_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are server-only. They never enter browser code, HTML, React Server Component payloads, public JSON, fixtures, logs, or committed environment files. Snapshot files remain in a private Blob store and are not part of this open-source repository.

Public traffic is isolated from the upstream provider, ticker details are restricted to members of the selected snapshot, refreshes have a global daily call limit and circuit breaker, and Vercel Firewall rate-limits public requests by IP.

See [SECURITY.md](SECURITY.md) for the complete boundary and [GitHub private vulnerability reporting](https://github.com/huluwa2026/analyst-rating-radar/security/advisories/new) for security reports.

## Privacy

The hosted site uses Vercel Web Analytics for anonymous aggregate page views and referrers. It does not add analytics cookies or custom interaction events. Query strings and fragments are removed before events are sent, so dates, searches, and selected tickers are not included. Outbound Drillr calls use readable branded short links and land on a clean URL without visible UTM parameters.

## Contributing

Bug reports, focused feature proposals, documentation improvements, and pull requests are welcome. Start with [open issues](https://github.com/huluwa2026/analyst-rating-radar/issues) or open a new issue with a reproducible example. Never attach credentials or proprietary source data.

## License

Released under the [MIT License](LICENSE).
