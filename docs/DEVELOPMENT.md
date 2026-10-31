# SyncSpace 2.1 development progress

This branch continues the existing API, static preview and original React app.
The original React and corrected Windows API source arrived in commit a4edd51.
See the latest integration section below for current status; earlier checkpoints
are historical. No Windows deployment or restored private database was accessed.

## Implemented in this branch

- Paginated retrieval of both imported and local messages (no oldest-500 ceiling).
- Browser decryption compatible with the existing PBKDF2-SHA256 120,000-round,
  AES-256-GCM envelope; independent compatibility and tampering tests.
- Strict standard Base64 validation. Invalid records remain visible as placeholders;
  originals are never rewritten. Alternate encodings are not guessed.
- Idempotent sends using a client UUID; duplicate retries return the original row.
- Ciphertext-only persistent outbox, explicit retry, connection recovery, and
  five-second polling. Keys, codes, tokens and decrypted messages are not persisted.
- Conversation selection, timestamps, local unlocked-message search, persistent
  reactions and shared pins, scroll preservation, mobile layout fixes.
- Saved state means persisted by the server, not recipient delivery or read receipt.
- Member-authorized ephemeral call signaling, offer/answer and bounded ICE exchange,
  incoming accept/reject, voice/video controls, device selection, screen sharing
  during video calls, duration, notifications on opt-in, transient disconnect handling,
  and termination. Browser permission failures have visible states.

## Run locally

Back up the real database outside Git **before applying changes on Windows**.
Apply `database/001_staging.sql` through `database/005_messaging.sql` in order using
`psql -v ON_ERROR_STOP=1`. Migration 005 is additive/idempotent and does not alter
legacy ciphertext. Never replace the restored Windows API image with this older
API source until its corrected invite route has been integrated and tested.

`cd api && npm ci` installs pinned dependencies; `npm start` uses PGHOST, PGPORT,
PGDATABASE, PGUSER and PGPASSWORD. The existing Compose API and preview files also
work after schemas are applied. The default compose.yaml requires the absent app/;
select only the database/API/preview files to avoid that frontend build.

Cloud startup uses `/workspace/syncspace-cloud/compose.yaml` outside the checkout.
That helper and the cloud volume are separate from the Windows deployment.

## Validation

- `cd api && npm test`: crypto compatibility, wrong keys, tampering, malformed
  encodings, call expiry and signaling isolation. Database suite is explicitly
  skipped unless SYNCSPACE_INTEGRATION=1.
- Start the API against an isolated development database, then run
  `SYNCSPACE_INTEGRATION=1 npm test` with the same PG variables. The database suite
  creates unique synthetic accounts/records and removes only its own fixtures.
  It tests >500 records, send deduplication, authorization, durable persistence,
  reactions/pins, call authorization, offer/answer, candidates and termination.
- Start the preview, install Chromium with `npx playwright install chromium`, and
  set CHROMIUM_PATH to its executable (cloud uses /usr/bin/chromium).
  `npm run test:browser` and `npm run test:calls:browser` use synthetic API fixtures.
- `SYNCSPACE_TEST_MEDIA=1 npm run test:calls:browser` additionally requires an
  actual two-browser ICE/media connection. **Not passing in this cloud**: managed
  Chromium policy WebRtcIPHandling=disable_non_proxied_udp prevents host candidates.
  The default call browser test verifies UI/media-device controls and signaling,
  not remote audio/video transport. No policy is disabled to make tests pass.

## Calling configuration and limits

Set SYNCSPACE_STUN_URL, SYNCSPACE_TURN_URL and SYNCSPACE_TURN_SECRET on the API.
Use a TURN REST-compatible relay with the same secret and appropriate TLS/HTTPS
access. The permanent secret stays on the server. WebRTC browsers necessarily
receive short-lived (10 minute) TURN credentials through an authenticated endpoint;
no permanent relay credentials are bundled in frontend source. Refresh/restart a
call after expired credentials if ICE needs to be rebuilt.

Use HTTPS outside localhost for browser media permissions. Media is protected by
browser WebRTC DTLS-SRTP; no additional application-level call encryption is claimed.
Signaling is in memory and ends on API restart; one API instance is supported.
Transient disconnects get 15 seconds to recover before termination. Full ICE
renegotiation, relay-backed long-call recovery, real screen/audio capture, browser
permission denial UX and physical mobile browser behavior still need device tests.
Screen sharing currently replaces video only; system-audio sharing is not implemented.

## Remaining restoration work

1. Obtain sanitized React and corrected invite-API source from the owner's actual
   repository/branch (GitHub currently advertises only main).
2. Integrate these capabilities into the existing React components. Keep the
   restored invite encryption information and account behavior intact.
3. Diagnose the four Base64 failures against original exports locally, logging
   only record IDs/field lengths/format categories, never codes, ciphertext,
   decrypted content or credentials. No affected private record was available here.
4. Validate all 104 restored messages, encrypted sends and legacy key compatibility
   in the Windows integration deployment without overwriting imported records.
5. Configure TURN and run real two-device voice/video, screen-sharing, interruption,
   device-switch and mobile-browser tests before treating calling as production ready.

## Original React integration (after upload a4edd51)

The uploaded `app/` and `integration/windows-api/server.js` are now available.
The latter remains an archival source snapshot; the integrated, maintained server
is `api/server.js`. No Windows files, containers or volumes were modified.

### Delivered

- Integrated duplicate-safe messaging, ciphertext-only outbox, retries, local
  search, database reactions/pins, timestamps and scroll preservation into the
  existing ChatRoom/ChatComposer/ChatMessage design, including the compact home chat.
- Combined the corrected Windows legacy mapping contract with the newer API.
  The legacy ID remains the encryption salt; local writes use the mapped storage
  ID. Both route aliases read the same conversation. New migrations never create
  substitute room mappings or change existing invite codes or ciphertext.
- Authentication supplies a stable account ID. Legacy author IDs can be resolved
  through staged User records without changing the original messages.
- Ported the original SpaceRoom actor protocol to a local authenticated WebSocket
  gateway. Call Studio keeps its existing media processing, camera/screen controls,
  settings, negotiation and reconnection logic. TURN configuration comes from the
  authenticated backend. The UI also shows elapsed call duration.
- WebSockets authenticate in the first frame (tokens never enter URLs), verify
  membership, use server-controlled seats/sender IDs, bound message size/rate,
  enforce allowed origins and disconnect revoked sessions. Default origins are
  localhost/127.0.0.1 port 3003; configure SYNCSPACE_ALLOWED_ORIGINS for HTTPS hosting.
- The old Base44 import is now a local compatibility client. It reads scoped
  staged collections without contacting hosted Base44 and persists new encrypted
  notes/memories/goodnight entries, moods and hearts in app.local_entities.
  Original staged records remain read-only. File storage, file signing, external
  functions and full editing of other collections remain unfinished and report
  their unavailability. Original media binaries have not been restored.

### Evidence and limitations

- React build and lint pass. Typecheck still fails: the uploaded baseline has 175
  diagnostics; this revision has 171, with no new diagnostics by file/error comparison.
- Encryption/encoding unit tests and PostgreSQL tests cover mapped room identity,
  local message storage, pagination, send deduplication, reactions/pins, membership,
  collection authorization, authenticated sockets, forced sender identity, session
  revocation and signaling. Synthetic fixtures are removed after each run.
- `cd api && npm run test:react` runs real React + API + PostgreSQL + WebSocket
  browser integration against the cloud helper stack. It creates two synthetic
  users and a mapped legacy room with 100 readable and four invalid records; it
  verifies decryption placeholders, persistence, search and Call Studio ring/reject.
  This does **not** validate the owner's private 104 records. For a host database
  instead of the cloud Docker helper, set SYNCSPACE_REACT_TEST_DB=host and the PG
  variables used by the running API. CI uses this path with an isolated PostgreSQL.
- The read-only query for the actual original room returned zero staged messages
  in cloud. No alternate encoding was guessed and no failed private record was
  changed. `api/scripts/diagnose-message-encoding.js` reports IDs, lengths and
  categories, never ciphertext, secrets or plaintext. Shape is not proof of format.
- `scripts/diagnose-message-encoding.ps1 -Commit <published-40-character-SHA>` runs
  that diagnostic inside the existing Windows API container, downloading code
  into memory only. Run it manually if requested; it does not install or deploy.
  Share only its metadata output. Root cause analysis of the four real failures
  remains blocked until that metadata or approved sanitized fixtures are available.
- Remote media, relay credentials, real screen/system audio, device-switch recovery
  and physical mobile browsers still need actual-device/TURN tests. Cloud Chromium
  disables non-proxied UDP; ring/reject and local controls are verified, remote
  media is not. No application-level call E2EE beyond WebRTC DTLS-SRTP is claimed.

### Continue from here

Use the existing checkout and cloud services. Start `npm --prefix app run dev`
for the React interface after the API/database. Never deploy to Windows without
explicit approval. Remaining work includes encrypted private-file storage and
migration, editing/deleting legacy collections through reversible overlays,
restoring all non-messaging features, the existing type errors, and real-device
calling and recovery tests.
