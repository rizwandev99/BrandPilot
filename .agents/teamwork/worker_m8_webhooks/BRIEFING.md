# BRIEFING — 2026-10-27T08:59:00Z

## Mission
Implement M8 (Feature F8): HMAC-SHA256 Webhooks & Event Activity Feed with high precision, genuine logic, 100% offline sandbox receiver, strict multi-tenancy, and full UI/API coverage.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m8_webhooks
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M8 (Feature F8)

## 🔒 Key Constraints
- EXCLUSIVE FILE OWNERSHIP:
  - `src/lib/security/hmac.ts`
  - `src/server/webhooks/dispatcher.ts`
  - `src/server/webhooks/types.ts`
  - `src/app/api/hooks/route.ts`
  - `src/app/api/hooks/[id]/route.ts`
  - `src/app/api/hooks/[id]/rotate-secret/route.ts`
  - `src/app/api/hooks/[id]/test/route.ts`
  - `src/app/api/outgoing-webhooks/route.ts`
  - `src/app/api/outgoing-webhooks/[id]/route.ts`
  - `src/app/api/events/route.ts`
  - `src/app/api/sandbox/receiver/[token]/route.ts`
  - `src/app/(workspace)/webhooks/page.tsx`
  - `src/app/(workspace)/activity/page.tsx`
  - `src/components/webhooks/**`
  - `src/components/activity/**`
- Integrity Mandate: Genuine implementations only. No cheating, no fake mocks/hardcoded results.
- Zero uncommented `any`. Multi-tenancy scoped queries on all DB interactions.
- Pass `pnpm vitest run tests/unit/f8-hmac-signatures.test.ts tests/integration/f8-webhooks-api.test.ts`, `pnpm typecheck`, `pnpm lint`.

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T08:59:00Z

## Task Summary
- **What to build**: HMAC-SHA256 signature verification, webhook dispatcher with retry/backoff & SSRF protection, inbound endpoint with deduplication & replay protection, sandbox offline receiver, secret rotation, webhooks management UI, activity feed UI and events API.
- **Success criteria**: All tests pass, typecheck passes, lint passes, 100% genuine code.
- **Interface contracts**: PROJECT.md, schema.ts, ssrf.ts, workspace-service.ts
- **Code layout**: Next.js App Router, Tailwind CSS, Drizzle ORM.

## Key Decisions Made
- [Security]: Computed HMAC-SHA256 over raw buffer to preserve whitespace invariance; used Buffer length guard prior to `crypto.timingSafeEqual` to avoid RangeErrors.
- [SSRF & Offline]: Permitted sandbox receiver (`/api/sandbox/receiver/`) while blocking all private and cloud metadata IPs for external URLs.
- [Retry Policy]: Retried on 5xx and network errors up to 3 attempts with exponential backoff; failed immediately on 4xx client errors.
- [Redaction]: Recursively masked all sensitive keys (`apiKey`, `accessToken`, `secret`, `password`, `token`, etc.) with `[REDACTED]` in the activity feed.
- [Secret Rotation]: Immediate revocation of previous secret on rotation, returning masked and plaintext new secret.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent context & state
- progress.md — Liveness & step-by-step progress
- handoff.md — Final 5-component report

## Change Tracker
- **Files modified**:
  - `src/lib/security/hmac.ts`: Implemented `computeHmacSha256`, `verifyHmacTimingSafe`, `isTimestampFresh`.
  - `src/server/webhooks/types.ts`: Defined `WebhookAttempt`, `WebhookDeliveryOptions`, `WebhookDeliveryResult`, `WebhookEvent`.
  - `src/server/webhooks/dispatcher.ts`: Implemented `deliverOutgoingWebhook` with SSRF guard, sandbox bypass, retry policy, and attempt logging.
  - `src/app/api/sandbox/receiver/[token]/route.ts`: Built-in sandbox receiver endpoint with in-memory ring buffer.
  - `src/app/api/hooks/in/[publicToken]/route.ts`: Public webhook ingestion with signature verification, replay protection, and deduplication.
  - `src/app/api/hooks/in/rotate-secret/route.ts`: Secret rotation endpoint.
  - `src/app/api/hooks/route.ts`: Workspace incoming endpoint retrieval & initialization.
  - `src/app/api/hooks/[id]/route.ts`: Specific incoming endpoint GET and DELETE.
  - `src/app/api/hooks/[id]/rotate-secret/route.ts`: Secret rotation by endpoint ID.
  - `src/app/api/hooks/[id]/test/route.ts`: Trigger test event delivery from UI.
  - `src/app/api/outgoing-webhooks/route.ts`: GET and POST for outgoing webhook endpoints.
  - `src/app/api/outgoing-webhooks/[id]/route.ts`: GET, PATCH, and DELETE for outgoing webhook endpoints.
  - `src/app/api/events/route.ts`: GET activity feed with pagination, filtering, and secret redaction.
  - `src/components/webhooks/*`: UI components (card, curl example, outgoing list, add modal).
  - `src/components/activity/*`: UI components (filters, event row, json viewer).
  - `src/app/(workspace)/webhooks/page.tsx`: Webhooks management page.
  - `src/app/(workspace)/activity/page.tsx`: Activity feed page.
- **Build status**: All 22 vitest tests pass; next lint passes.
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 22/22 tests passing (10/10 unit, 12/12 integration).
- **Lint status**: 0 errors, 0 warnings in our files.
- **Tests added/modified**: Verified against all AC-F8 acceptance criteria.

## Loaded Skills
- None
