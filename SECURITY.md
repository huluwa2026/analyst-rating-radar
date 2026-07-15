# Security policy

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/huluwa2026/analyst-rating-radar/security/advisories/new). Do not include live credentials, unredacted request headers, or proprietary data in an issue, screenshot, or pull request.

## Sensitive-data boundary

`DRILLR_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are server-only deployment secrets. They must never appear in:

- browser code or a `NEXT_PUBLIC_*` variable;
- HTML, React Server Component payloads, or public JSON responses;
- application logs, screenshots, fixtures, issues, or commits;
- local `.env*` files other than the redacted `.env.example` template.

The public application reads only private, precomputed Vercel Blob snapshots. Browser navigation, date switching, ticker detail, health checks, and arbitrary query strings never invoke Drillr. Only the authenticated cron/operator route can enter the upstream refresh module.

If a key may have been exposed, revoke it before investigating further and replace the Vercel environment variable with a newly issued key.

## Public-data safeguards

- SQL is application-owned; end users cannot submit SQL or reach an upstream proxy.
- Public session dates must exist in the published manifest.
- Ticker detail is returned only when that ticker exists in the selected published session.
- Every Drillr request atomically reserves one unit from a fail-closed daily budget.
- A deployment kill switch and a Blob-backed circuit breaker can stop all upstream calls; provider failures automatically open the circuit.
- The cron and circuit endpoints require a timing-safe Bearer-secret comparison.
- Session and detail blobs are immutable, private, and absent from the Git repository; the small mutable manifest is written only after a complete refresh.
- Vercel Firewall rate-limits public page requests by source IP at the edge.
- Provider errors are reduced to stable, non-sensitive messages.
- Production never falls back to fixtures. If refresh fails, the last explicitly published snapshot remains unchanged.
