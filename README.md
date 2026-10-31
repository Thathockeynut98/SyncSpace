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

## Local development (infrastructure)

The application source and Docker starter are being reviewed before committing to avoid exposing credentials embedded in the Base44 export.

Once the reviewed app source is added under `app/`, start the frontend:

```powershell
docker compose up --build -d
```

Then visit `http://localhost:3001`.

To start the optional PostgreSQL service as well, create a local `.env` with `SYNCSPACE_DB_PASSWORD` set to a strong random password and run:

```powershell
docker compose -f compose.yaml -f compose.database.yaml up --build -d
```

Database data persists in a Docker named volume. The database has no published host port.

**Note:** The database is provisioned but the schema, API, authentication, and data import are not implemented yet. The frontend is not yet independent of Base44.

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
