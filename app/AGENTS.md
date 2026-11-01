# SyncSpace development guide

SyncSpace is an independently hosted private collaboration application. The frontend is React/Vite, and the application uses its own API, authentication, database, and WebRTC calling system.

## Development

- Read the repository README and use the documented local testing environment.
- Never change production Docker containers, databases, or volumes while testing frontend changes.
- Run `npm ci` and `npm run build` inside `app/` before merging.
- Preserve encrypted messages, shared-space content, authentication, calling, and the original collaboration tools.
- `src/api/base44Client.js` is a **local API compatibility facade** for legacy component imports; it does not connect to hosted Base44. Migrate its consumers gradually before renaming or deleting it.
- The former `app/base44/` hosted configuration, actors, functions, and entity definitions are no longer the source of truth; the local API and database are.
- Do not add Base44 SDKs, hosted endpoints, or Vite plugins back into this project.
