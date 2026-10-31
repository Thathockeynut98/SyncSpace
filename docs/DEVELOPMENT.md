# SyncSpace 2.1 development progress

This branch continues the existing API and static preview. The React `app/` and
`syncspace-api-21-invite-fix:local` source are **not present** in the checked-out
repository. Windows recovery results supplied by the owner are not cloud test
results. No Windows data, containers, backups, accounts or volumes were touched.

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
