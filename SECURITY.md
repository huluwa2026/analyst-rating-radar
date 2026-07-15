# Security policy

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/huluwa2026/analyst-rating-radar/security/advisories/new). Do not include live credentials, unredacted request headers, or proprietary data in an issue, screenshot, or pull request.

## Sensitive-data boundary

`DRILLR_API_KEY` is a server-only deployment secret. It must never appear in:

- browser code or a `NEXT_PUBLIC_*` variable;
- HTML, React Server Component payloads, or public JSON responses;
- application logs, screenshots, fixtures, issues, or commits;
- local `.env*` files other than the redacted `.env.example` template.

The application calls Drillr only from server modules. Browser navigation invokes a server render; it does not receive an endpoint or credential that can call the Drillr gateway directly.

If a key may have been exposed, revoke it before investigating further and replace the Vercel environment variable with a newly issued key.

## Public-data safeguards

- SQL is application-owned; end users cannot submit SQL.
- Session dates must come from the server-provided session list.
- Tickers use a strict allowlist pattern before interpolation into read-only SQL.
- Historical detail and daily sessions are cached to limit upstream calls.
- Provider errors are reduced to stable, non-sensitive messages.
- Production never falls back to fixtures or stale data when a live request fails.
