# Analyst Rating Radar architecture

Analyst Rating Radar separates public stock-research traffic from upstream analyst-rating collection. A browser request can render only an already-published private snapshot; it cannot trigger Drillr, submit SQL, enumerate arbitrary ticker history, or consume the upstream API budget.

## Public request flow

1. The Next.js App Router page reads a small published manifest from private Vercel Blob storage.
2. The requested market date must exist in that manifest; otherwise the latest published session is selected.
3. The server reads the immutable daily session snapshot and sends display-ready public market data to the client component.
4. A ticker detail request is accepted only when the ticker belongs to the selected daily session.
5. The server builds that detail from the published 120-day snapshot index. No public route imports the Drillr client.

The health endpoint follows the same snapshot-only boundary and reports the latest published market date, generation time, and staleness without checking or exposing upstream credentials.

## Snapshot refresh flow

Only Vercel Cron or an authenticated operator can call the refresh route. The route uses a timing-safe comparison against the server-only `CRON_SECRET` and then:

1. checks the deployment kill switch and persistent circuit breaker;
2. atomically reserves one unit from the daily global Drillr budget before every provider request;
3. fetches the recent session calendar and the selected daily events in deterministic 100-row pages;
4. normalizes ratings, groups events by ticker, and computes transparent browsing signals;
5. writes immutable daily-session and ticker-detail blobs;
6. publishes the small mutable manifest last.

Writing the manifest last means a timeout or partial refresh cannot replace the previous complete public snapshot. Provider failures automatically open the circuit breaker, while operators can inspect, open, or close it through the authenticated control route.

## Upstream data model

The refresh service uses application-owned, read-only SQL against three structured tables:

| Table | Purpose |
|---|---|
| `analyst_ratings` | Individual Wall Street analyst rating and price-target events |
| `analyst_ratings_consensus` | Rating distribution, analyst count, and consensus price target |
| `company_snapshot` | Company name, current price, return, and market capitalization |

Users cannot submit SQL or alter query predicates. The session count is fetched first so pagination has a deterministic upper bound and a session that changes mid-refresh is rejected rather than partially published.

## Rating normalization and signal rules

`lib/normalize.ts` is the only rating/action normalization boundary. The validated rating vocabulary maps explicitly to `bullish`, `neutral`, or `bearish`; unfamiliar labels stay `unknown`. Original source strings remain attached to every event.

Agreement requires at least two independent firms upgrading or downgrading the same ticker. Disagreement requires cross-firm opposing signals. A single firm's downgrade combined with a higher price target is a contradiction, not institutional disagreement.

Signal strength prioritizes browsing. It is not a return forecast and never uses an unverified target-price percentage change. Large historical target discontinuities are flagged and excluded from scoring.

## Anti-abuse and security controls

- Public pages, ticker detail, and health checks read snapshots only.
- The public source tree has a regression test that rejects Drillr imports across the snapshot boundary.
- `DRILLR_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are server-only deployment secrets.
- Every provider request consumes one unit from a fail-closed, Blob-backed daily global budget.
- A deployment environment kill switch and an operable persistent circuit breaker can stop all upstream requests.
- Ticker detail is restricted to tickers already visible in the selected published session.
- Vercel Firewall applies an IP-based rate limit to the public dashboard.
- Private immutable blobs hold snapshots; no live snapshot or proprietary credential is committed to GitHub.
- Security response headers, including CSP and frame protection, are configured globally.
- Fixture mode is explicit and synthetic; production never falls back to fixtures.

See the repository [security policy](../SECURITY.md) for reporting and credential-handling requirements.
