# Architecture

## Request flow

The App Router page is server-rendered. It resolves the newest complete `analyst_ratings.date`, loads the selected daily session, normalizes every event, aggregates by ticker, and sends only display-ready public market data to the client component.

Ticker detail uses another server render keyed by validated `ticker` and `date` query parameters. There is no public SQL proxy and no browser-to-Drillr request.

## Upstream queries

Drillr `run_sql` responses are paged in deterministic 100-row chunks because a complete trading session can contain several hundred events. Daily results are cached for one hour; the session calendar refreshes every 15 minutes. Ticker history is limited to the preceding 120 calendar days and 100 calls.

## Normalization

`lib/normalize.ts` is the only rating/action normalization boundary. The 23 validated rating labels are mapped explicitly to `bullish`, `neutral`, or `bearish`; unfamiliar labels stay `unknown`. Original source strings are preserved on every event.

Agreement requires at least two independent firms upgrading or downgrading the same ticker. Disagreement also requires cross-firm opposing signals. A single firm's downgrade combined with a higher price target is a contradiction, not institutional disagreement.

## Security boundary

- `lib/drillr.ts` imports `server-only` and is the only Drillr client.
- `DRILLR_API_KEY` never enters component props or stable error text.
- The application accepts no user SQL.
- Date input uses an ISO validator and is constrained to the returned session calendar.
- Ticker input uses a short uppercase allowlist before SQL interpolation.
- Security response headers are configured globally.
- Fixture mode must be set explicitly and is never an error fallback.
