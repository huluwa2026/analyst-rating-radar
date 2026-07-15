# Analyst Rating Radar

An open-source financial workbench for exploring the latest Wall Street analyst rating changes, multi-firm agreement, and market disagreement.

**[Open the live radar](https://analyst-rating-radar.vercel.app)**

![Analyst Rating Radar showing a complete U.S. market session](docs/analyst-rating-radar.png)

Analyst Rating Radar answers one narrow question: **what did Wall Street analysts change?** It does not predict returns, explain price moves, or provide investment advice. Original firm labels and contradictory signals remain visible rather than being compressed into a black-box conviction score.

## What it surfaces

- **Key Moves** — upgrades, downgrades, and coverage initiations.
- **Multi-firm Agreement** — independent firms changing ratings in the same direction.
- **Disagreement** — different firms sending opposing rating or target-price signals.
- **Contradictions** — an upgrade paired with a lower target, or a downgrade paired with a higher target.
- **All Activity** — the complete session, grouped by ticker without losing individual calls.
- **Ticker detail** — current consensus and up to 120 days of published analyst-rating snapshots.

Search covers ticker, company, firm, and analyst. Filters cover action, mapped rating direction, importance, and single- versus multi-firm activity. The latest complete U.S. trading session is selected automatically.

## Transparent signal strength

Signal strength is a browsing priority, not a forecast. Its on-screen explanation lists every contributing factor:

- rating action type;
- the source `importance` value;
- additional material calls from independent firms;
- agreement, disagreement, or rating/target contradiction;
- a small browsing weight for widely followed companies.

Unverified target-price percentage changes never contribute. Large discontinuities, such as values that may cross a split or adjustment boundary, are flagged and shown only as context.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev:fixture
```

Fixture mode contains synthetic versions of the validation cases and needs no credential. Production refreshes also require a private Vercel Blob store, a server-only `DRILLR_API_KEY`, and a long random `CRON_SECRET`. Do not commit a populated environment file.

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
RADAR_DATA_MODE=fixture npm run build
```

## Data architecture

```text
Browser
  → Next.js server render
      → private, published Vercel Blob snapshot
  → interactive workbench

Vercel Cron / authenticated operator
  → daily call budget + circuit breaker
  → Drillr REST API / run_sql
  → normalization / grouping / scoring
  → immutable session + detail blobs
  → atomic manifest publish
```

Only the protected refresh job reads three Drillr tables:

| Table | Purpose |
|---|---|
| `analyst_ratings` | Individual rating and target-price events |
| `analyst_ratings_consensus` | Rating distribution and consensus target |
| `company_snapshot` | Company name, current price, return, and market capitalization |

Public requests never call Drillr. They can only read dates and tickers already present in the private published snapshot. A refresh reserves every upstream call against a Blob-backed daily budget (12 by default), and provider failures open an operable circuit breaker. The manifest is published last, so a partial refresh cannot replace the last complete public snapshot.

`vercel.json` schedules one weekday refresh. Vercel Firewall provides the production IP rate limit at the edge; it is intentionally deployment configuration rather than application code. The authenticated endpoints are:

- `GET /api/cron/refresh` — refresh the latest session; an optional `date=YYYY-MM-DD` performs a bounded backfill.
- `GET /api/admin/circuit` — inspect the circuit and current daily budget.
- `POST /api/admin/circuit` — open or close the circuit with `{ "open": boolean, "reason": string }`.

All three require `Authorization: Bearer <CRON_SECRET>`. Responses never include either credential.

## Security

`DRILLR_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are server-only. They are never placed in a `NEXT_PUBLIC_*` variable, browser request, HTML response, fixture, log, or committed environment file. Snapshot data is not committed to the open-source repository, and the Blob store remains private.

See [SECURITY.md](SECURITY.md) for the complete boundary and private vulnerability-reporting link.

## License

MIT
