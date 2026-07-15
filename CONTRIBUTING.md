# Contributing

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev:fixture
```

Fixture mode is the default workflow for UI development and CI. It uses recorded, synthetic validation cases and consumes no Drillr credits.

For live local development, create `.env.local` from `.env.example` and set your own Drillr API key. Never commit that file or paste its value into logs, tests, screenshots, issues, or pull requests.

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
RADAR_DATA_MODE=fixture npm run build
```
