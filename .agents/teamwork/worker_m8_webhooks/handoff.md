# Handoff Report — Milestone M8 (Feature F8): HMAC-SHA256 Webhooks & Event Activity Feed

## 1. Observation
- **Unit Test Suite**: `tests/unit/f8-hmac-signatures.test.ts`
  Command: `pnpm vitest run tests/unit/f8-hmac-signatures.test.ts`
  Initial run result: 10 failed due to missing module `@/lib/security/hmac`.
  Final run result:
  ```
  ✓ tests/unit/f8-hmac-signatures.test.ts (10 tests) 130ms
  Test Files  1 passed (1)
  Tests  10 passed (10)
  ```
- **Integration Test Suite**: `tests/integration/f8-webhooks-api.test.ts`
  Command: `pnpm vitest run tests/integration/f8-webhooks-api.test.ts`
  Initial run result: 12 failed due to missing routes and dispatcher modules.
  Final run result:
  ```
  ✓ tests/integration/f8-webhooks-api.test.ts (12 tests) 2953ms
  Test Files  1 passed (1)
  Tests  12 passed (12)
  ```
- **Combined Test Run**:
  Command: `pnpm vitest run tests/unit/f8-hmac-signatures.test.ts tests/integration/f8-webhooks-api.test.ts`
  Result:
  ```
  ✓ tests/unit/f8-hmac-signatures.test.ts (10 tests) 130ms
  ✓ tests/integration/f8-webhooks-api.test.ts (12 tests) 2953ms
  Test Files  2 passed (2)
  Tests  22 passed (22)
  Duration  5.55s
  ```
- **ESLint**:
  Command: `pnpm lint` (`next lint`)
  Result: Exited with code 0. Zero warnings or errors in any M8 files.
- **TypeScript**:
  Zero type errors in all M8 owned files. Every occurrence of `any` is strictly documented with `// intentional any: <reason>`.
- **Files Created / Owned**:
  - `src/lib/security/hmac.ts`: Timing-safe HMAC-SHA256 signing, verification, Buffer length guard, and timestamp freshness check (300s window).
  - `src/server/webhooks/types.ts`: TypeScript contracts for `WebhookAttempt`, `WebhookDeliveryOptions`, `WebhookDeliveryResult`, `WebhookEvent`.
  - `src/server/webhooks/dispatcher.ts`: `deliverOutgoingWebhook` with SSRF guard, sandbox bypass, exponential backoff (up to 3 attempts), and immediate failure on 4xx.
  - `src/app/api/sandbox/receiver/[token]/route.ts`: Built-in offline sandbox receiver with in-memory ring buffer.
  - `src/app/api/hooks/in/[publicToken]/route.ts`: Public webhook ingestion with raw buffer verification, 1MB cap, Zod/JSON validation, event deduplication, and automation engine dispatch.
  - `src/app/api/hooks/in/rotate-secret/route.ts`: Secret rotation endpoint.
  - `src/app/api/hooks/route.ts`: Workspace incoming webhook endpoint retrieval and auto-initialization.
  - `src/app/api/hooks/[id]/route.ts`: Incoming endpoint GET and DELETE by ID.
  - `src/app/api/hooks/[id]/rotate-secret/route.ts`: Secret rotation by endpoint ID.
  - `src/app/api/hooks/[id]/test/route.ts`: Trigger test event delivery from UI.
  - `src/app/api/outgoing-webhooks/route.ts`: GET (list) and POST (create) outgoing webhooks with SSRF guard.
  - `src/app/api/outgoing-webhooks/[id]/route.ts`: GET, PATCH, and DELETE for specific outgoing webhooks.
  - `src/app/api/events/route.ts`: Activity feed GET with pagination, filtering (source, type, status), and sensitive field redaction (`apiKey`, `accessToken`, `secret`, `password`, `token` -> `[REDACTED]`).
  - `src/components/webhooks/incoming-endpoint-card.tsx`: UI card for incoming URL, secret reveal/mask, copy, rotate, and send test event.
  - `src/components/webhooks/curl-example.tsx`: UI component displaying ready-to-copy cURL command with shell signature generator.
  - `src/components/webhooks/outgoing-webhooks-list.tsx`: List of outgoing webhooks with active toggle, delivery test, and delete.
  - `src/components/webhooks/add-webhook-modal.tsx`: Modal to register destination URL with one-click sandbox receiver preset.
  - `src/components/activity/activity-filters.tsx`: Source tabs, status filter, and type search filter.
  - `src/components/activity/event-item-row.tsx`: Activity event row with badges, relative time, and expandable payload.
  - `src/components/activity/json-payload-viewer.tsx`: Expandable pretty-printed JSON viewer with copy button and masked credentials.
  - `src/app/(workspace)/webhooks/page.tsx`: Webhooks management page.
  - `src/app/(workspace)/activity/page.tsx`: Activity log page.

## 2. Logic Chain
1. *HMAC Verification & Replay Protection (AC-F8-01, AC-F8-02)*:
   - `computeHmacSha256` operates directly on raw buffers or UTF-8 strings.
   - `verifyHmacTimingSafe` strips optional `sha256=` prefixes and validates buffer byte lengths before invoking `crypto.timingSafeEqual` to avoid RangeError exceptions on mismatched lengths.
   - `isTimestampFresh` standardizes seconds and milliseconds, enforcing a 300-second window to prevent replay attacks and future clock skew.
2. *Payload Validation, Deduplication, & Ingestion (AC-F8-03, AC-F8-04)*:
   - `POST /api/hooks/in/[publicToken]` enforces a 1MB byte limit over the raw buffer.
   - Deduplication verifies whether `payload.event_id` or `payload.id` was previously recorded for the workspace. If found, it returns `202 Accepted` with `{ duplicate: true, deduplicated: true }` without creating a duplicate row.
   - If novel, an `incoming` event is recorded in the `events` table and forwarded to the automations engine.
3. *Outgoing Webhook Delivery & SSRF Security (AC-F8-05, AC-F8-06)*:
   - `deliverOutgoingWebhook` validates all destination URLs against private IP ranges, loopback addresses, and cloud metadata endpoints using `validateUrl`.
   - Outgoing URLs matching `/api/sandbox/receiver/:token` are explicitly permitted, enabling 100% offline integration testing and demo operation.
   - Delivery retries on 5xx errors or network drops up to 3 attempts with backoff, while failing immediately without retry on non-retryable 4xx client errors.
4. *Secret Rotation (AC-F8-09)*:
   - Rotating the secret immediately updates the database record with a newly generated `crypto.randomBytes(32).toString('hex')` secret.
   - Requests signed with the obsolete secret are immediately rejected with `401 SIGNATURE_INVALID`.
5. *Activity Feed & Redaction (AC-F8-08)*:
   - `GET /api/events` supports pagination and filtering across source, type, and status.
   - Sensitive keys matching `apiKey`, `accessToken`, `secret`, `password`, `token`, etc., are recursively replaced with `[REDACTED]` prior to response transmission.
6. *UI Implementation (AC-F8-07, AC-F8-08)*:
   - `/webhooks` provides full incoming configuration, masked secret visibility, secret rotation, a copyable cURL example, a test trigger button, and outgoing webhook management.
   - `/activity` provides an interactive feed with source filtering, expandable formatted JSON payload viewer, and pagination.

## 3. Caveats
- No caveats. All 9 acceptance criteria (AC-F8-01 through AC-F8-09) are implemented with genuine logic, strict typing, and multi-tenancy workspace isolation.

## 4. Conclusion
Milestone M8 (Feature F8) is complete and verified. All 22 automated tests (10 unit, 12 integration) pass cleanly. Zero lint warnings or errors exist in owned files.

## 5. Verification Method
To independently verify this implementation:
1. Run the test suites:
   `pnpm vitest run tests/unit/f8-hmac-signatures.test.ts tests/integration/f8-webhooks-api.test.ts`
   Expected result: 22 passed (0 failed).
2. Run linter:
   `pnpm lint`
   Expected result: 0 errors in owned files.
3. Inspect files:
   - `src/lib/security/hmac.ts`
   - `src/server/webhooks/dispatcher.ts`
   - `src/app/api/hooks/in/[publicToken]/route.ts`
   - `src/app/api/events/route.ts`
   - `src/app/(workspace)/webhooks/page.tsx`
   - `src/app/(workspace)/activity/page.tsx`
