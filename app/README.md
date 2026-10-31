# SyncSpace 2.1 React application

This is the original React interface, now using the local Node API for login,
room discovery, messaging, presence and Call Studio signaling. Keep the original
room ID and its invite-derived encryption information intact. Do not create a
replacement room to work around missing restoration data.

## Development

Use Node 22.12+ or Node 24 and `npm ci`, then `npm run dev` from `app/`.
The Vite server listens on port 3003 and forwards `/api` and `/rt` to port 4000.
Start the repository's `api/` with PostgreSQL and apply migrations 001–008 in
order to an isolated development database. No Base44 login or remote project is
needed. Do not use `base44 dev --remote` for this migration.

`npm run build` builds the original interface. `npm run lint` checks components.
`npm run typecheck` currently reports existing upload-era type errors (baseline
175; this integration 171, no new diagnostics). It is not a passing check.
`package-lock.json` pins dependencies. On intentional dependency refresh use
npm's supported `--before=<UTC-date-seven-days-ago>` option: npm 11 ignores the
uploaded min-release-age settings in `.npmrc`.

See [development progress](../docs/DEVELOPMENT.md) for database-backed and browser
tests, read-only diagnostics, the restoration boundary, and deployment limitations.
No cloud test changes or deploys the owner's Windows installation.
