# SyncSpace 💜

**A private little universe for two people.**

SyncSpace is a self-hostable shared-space application for staying close, talking, creating, and spending time together. It combines encrypted messaging, a voice/video Call Studio, and cozy collaborative spaces in a dark-purple, animated interface.

> **Status: active development.** SyncSpace's React frontend has been decoupled from the hosted Base44 SDK, and the local Node/PostgreSQL backend is under active development. The frontend builds and automated integration checks pass; this is **not yet a production-security or real-world call-reliability certification**.

## ✨ What you can do

| Space | Experience |
| --- | --- |
| **Home** | A shared dashboard and entry point to your little universe. |
| **Messages** | Private conversations with timestamps, reactions, pins, search, and reconnect/retry behavior. |
| **Call Studio** | Voice and video calling, camera/microphone controls, device selection, and screen sharing. |
| **Call Health** | In-call diagnostics and connection-quality visibility, introduced with Call Quality 2.2. |
| **Canvas** | A place for shared creativity and drawing. |
| **Games** | Play together within your shared space. |
| **Watch Together** | A shared viewing area; synchronization and media support continue to evolve. |
| **Read Together** | A cozy place for shared reading. |
| **Sleep Zone** | A quieter space for winding down. |
| **Media Library** | A home for shared media; private-file storage and migration are still in progress. |
| **Vesperan** | A dedicated corner for the Vesperan language project. |

Some shared-space sections are works in progress or partially restored from the original application. Their presence in the interface does not imply every legacy workflow is complete.

## 📞 Call Studio & Call Quality 2.2

The calling experience is built around **WebRTC** with authenticated, room-scoped signaling through the local API.

- Voice and video call controls, incoming-call handling, and elapsed call time.
- Microphone, camera, and device selection controls.
- Screen sharing and in-call quality/health information.
- Connection-state handling, diagnostics, and ongoing audio-isolation improvements.
- STUN/TURN configuration through the backend for supported network environments.

**Real-world limitations:** reliable two-device media transport, TURN-backed recovery, mobile browsers, and system/tab-audio behavior still need thorough cross-device testing. Browser capture support varies. WebRTC protects media transport with DTLS-SRTP; SyncSpace does **not** claim independently audited application-level end-to-end encryption for calls.

## 🔐 Privacy by design

Privacy is a core design goal, not a claim that every feature has completed a security audit.

- Browser-side decryption supports the existing **PBKDF2-SHA256 / AES-256-GCM** message envelope.
- A ciphertext-only persistent message outbox supports retries without storing plaintext in that outbox.
- Authenticated API/WebSocket access checks shared-space membership.
- Legacy encrypted records and room mappings are preserved during migration rather than silently rewritten.
- Private exports, credentials, database dumps, and media must **never** be committed to Git.

Encrypted-message compatibility has automated tests. Full private-file encryption, key lifecycle review, secure remote deployment, and comprehensive security testing remain release work.

## 🛠 Technology

| Layer | Technology |
| --- | --- |
| Interface | React, Vite, Tailwind CSS, Framer Motion |
| API | Node.js |
| Data | PostgreSQL |
| Live communication | Authenticated WebSockets and WebRTC |
| Local infrastructure | Docker / Docker Compose |
| Validation | Node tests, browser integration tests, GitHub Actions |

The project is designed to be independently hosted rather than dependent on Base44's hosted runtime. Some source files retain compatibility-oriented names while routing to local services.

## 🚀 Local development

**Prerequisites:** Node.js 22.12+, npm, and PostgreSQL 16 (or an isolated Docker PostgreSQL instance).

1. Clone the repository and configure a **development-only** database and API environment.
2. Apply the SQL migrations in `database/` in filename order, using `psql -v ON_ERROR_STOP=1`.
3. Install and start the API:
   ```bash
   cd api
   npm ci
   npm start
   ```
4. In another terminal, install and start the frontend:
   ```bash
   cd app
   npm ci
   npm run dev
   ```

The development frontend is configured for port **3003**, with the local API on **4000**. Review environment variables and proxy/origin settings before using a different hostname or port. The root `compose.yaml` currently describes a frontend container only; it is **not** a complete, production-ready deployment.

### Checks

```bash
cd app && npm run build
cd ../api && npm test
```

Additional API/browser and PostgreSQL integration tests are described in [development notes](docs/DEVELOPMENT.md). GitHub Actions verifies automated workflows against isolated test resources; passing CI does not test your personal Windows database or a real two-person internet call.

## 🗂 Repository layout

```text
app/                  React application and Call Studio
api/                  Local API, WebSocket signaling, and tests
database/             SQL migrations
docs/                 Development notes and integration details
integration/          Historical migration/reference material
compose.yaml          Frontend container configuration
```

## 🧭 Roadmap

- [x] Restore the original React shared-space interface
- [x] Replace hosted Base44 SDK integration with local compatibility services
- [x] Implement persistent encrypted messaging flows, retries, and shared pins/reactions
- [x] Integrate Call Studio signaling and browser call controls
- [x] Add Call Quality 2.2 health monitoring and diagnostics
- [x] Restore passing Linux frontend builds in GitHub Actions
- [ ] Complete real-device voice/video, TURN, reconnection, and screen-sharing validation
- [ ] Finish private media storage, encrypted uploads, and legacy feature restoration
- [ ] Review dependency advisories, key management, and deployment hardening
- [ ] Verify backups/restores and secure HTTPS remote access
- [ ] Complete production-readiness review

## 💜 The idea behind SyncSpace

Not another public social network. **One shared place that feels like yours**—for conversations, quiet moments, creativity, and time together.

---

**Development note:** Never run migrations or replace containers against an existing restored deployment without an independent backup and explicit approval. Do not commit `.env` files, tokens, TURN secrets, private exports, user data, or database volumes.
