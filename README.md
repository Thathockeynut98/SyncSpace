# SyncSpace 💜

A private shared space for two people. SyncSpace is being migrated from Base44 to a portable, self-hosted application.

> **Migration in progress.** The current React/Vite frontend still depends on Base44 services. Do not treat this repository as a fully independent or production-ready deployment.

## Goals

- Preserve the existing SyncSpace interface and shared-space experience.
- Migrate accounts, messages, memories, and other records without losing encrypted data.
- Run locally on Windows with Docker Desktop, with a path to Linux hosting.
- Repair microphone, screen, and computer-audio sharing.
- Keep administration private while allowing both users to access the site securely.

## Planned stack

React + Vite (frontend), Node.js (API), PostgreSQL (database), Socket.IO (real-time signaling), WebRTC (calls), Docker Compose (deployment).

## Current development workflow

The original React app is now under `app/`; `api/` is the maintained local backend.
The corrected Windows source is retained under `integration/windows-api/` for
reference. Development progress and validation are tracked in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Use Node 22.12+ and PostgreSQL 16. Install with `npm ci` in both `api/` and `app/`.
Apply the additive database migrations in filename order to an isolated development
database, configure the API's PG variables, then run `npm start` from `api/` and
`npm run dev` from `app/`. Vite serves port 3003 and proxies API/WebSocket requests
to port 4000. The default frontend Compose build still needs packaging work;
use this Node development workflow for the original React interface.

Messaging, local session authentication, room mapping, persistent reactions/pins,
and Call Studio signaling use the local backend. Remaining migration work includes
private-file storage, full collection editing, real-device/TURN call validation,
and diagnosis of the four private legacy messages. No cloud check is a validation
of the owner's Windows data or a Windows deployment.

Never replace restored mappings, invite-derived encryption information, imported
messages or database volumes. Back up real data privately before applying changes
to any existing deployment; Windows deployment requires explicit approval.

## Migration roadmap

- [x] Export original application source
- [x] Export 14 entity collections and user records (stored privately, **not in Git**)
- [x] Test initial local frontend container
- [x] Prepare PostgreSQL Compose service
- [ ] Review and sanitize exported source code before publishing
- [ ] Design database schema and import tooling
- [ ] Implement independent authentication and authorization
- [ ] Replace Base44 SDK calls and room signaling
- [ ] Validate encrypted-content compatibility and media downloads
- [ ] Fix and test WebRTC audio and screen sharing
- [ ] Configure HTTPS, free hostname, and secure remote access
- [ ] Perform backup/restore and end-to-end migration tests

## Security and privacy

Never commit `.env`, database dumps, CSV exports, user lists, private media, tokens, TURN credentials, or other secrets. Any credentials embedded in the exported application should be rotated before deployment. Keep the existing Base44 project intact until data and functionality are verified.

## Repository structure

```text
compose.yaml             # Local frontend container
compose.database.yaml    # Optional internal PostgreSQL service
.env.example             # Variable names only; no secrets
.gitignore               # Excludes private data and generated files
app/                     # Frontend source (to be added after review)
```

## Project status

**Phase 2: infrastructure foundation.** This repository documents the migration; production deployment is not yet ready.

## Migration verification checkpoint (2026-10-30)

The initial CSV staging import completed successfully on the local Windows Docker deployment. PostgreSQL contains **948 staged records** across 14 nonempty entity types (17 CSV exports processed, including three empty collections). This confirms staging only; the original application is not yet connected to PostgreSQL. Media files, encrypted payload usability, authentication, and Base44 independence remain unverified.

Before further migrations, create a **private** PostgreSQL backup outside the Git checkout and compare CSV source row counts with staged record counts. Never commit backup files or private exports.

## Remote browser connection (not yet enabled)

The GitHub Pages deployment can read repository Actions variables `SYNCSPACE_API_URL` (HTTPS API origin) and `SYNCSPACE_WS_URL` (optional WSS signaling endpoint). The frontend derives `wss://<api-host>/rt` from the HTTPS API origin if the separate WebSocket variable is unset. These values are public build-time configuration, **not secrets**.

Before enabling remote access, set the backend environment variable:

```text
SYNCSPACE_ALLOWED_ORIGINS=https://thathockeynut98.github.io
```

The API permits listed origins for CORS and the realtime server independently checks WebSocket origins. The local development origins remain permitted for API requests. Never use `*` for the origin allowlist or expose a database port. A tunnel only provides transport; it does not substitute for authentication, rate limits, TURN configuration, backups, or a security review. The local Docker API will not automatically pick up repository changes until deliberately rebuilt and restarted; avoid doing so against the existing database without a backup.
