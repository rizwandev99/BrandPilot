## 2026-10-27T08:35:31Z
You are worker_m8_webhooks, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M8 (Feature F8): HMAC-SHA256 Webhooks & Event Activity Feed.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/server/db/schema.ts`, `src/server/workspace/workspace-service.ts`, `src/server/security/ssrf.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m8_webhooks

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
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

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F8-01: Public incoming webhook endpoint `POST /api/hooks` verifying signature header (`x-hub-signature-256` or `x-postpilot-signature`) and timestamp header (`x-postpilot-timestamp`).
2. AC-F8-02: HMAC-SHA256 verification (`src/lib/security/hmac.ts`):
   - Computed over raw request body Buffer using `crypto.createHmac('sha256', secret)`.
   - Constant-time comparison using `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))`.
   - Replay protection: verify timestamp is within +/- 5 minutes (300 seconds) of `Date.now()`.
3. AC-F8-03: Strict Zod payload validation (`event`, `event_id`, `timestamp`, `data`). Enforce 1MB maximum payload size limit.
4. AC-F8-04: Inbound event deduplication: check `events` table for existing `event_id` before processing. If already seen, return 200 with `{ deduplicated: true }`.
5. AC-F8-05 & AC-F8-06: Outgoing webhook dispatcher (`src/server/webhooks/dispatcher.ts`):
   - Validates destination URL using SSRF guard (`safeFetch`).
   - Signs payload with HMAC-SHA256 and attaches `x-postpilot-signature` and `x-postpilot-timestamp`.
   - Retries on transient failure with exponential backoff up to 3 attempts.
   - Logs delivery attempts in `webhook_logs` table.
6. AC-F8-05 (Sandbox): Built-in sandbox receiver endpoint `POST /api/sandbox/receiver/:token` and `GET /api/sandbox/receiver/:token` storing payloads in an in-memory or database ring buffer so webhook integration tests can run 100% offline with zero external network dependencies.
7. AC-F8-07: Webhooks management UI: list endpoints, view/copy signing secret, test trigger button, copyable curl command with valid signature generator.
8. AC-F8-08: Activity Feed UI & `GET /api/events` API: event list with filters (by type: `post.*`, `webhook.*`, etc.), pagination, and automatic redaction of sensitive credentials/tokens in event metadata.
9. AC-F8-09: Secret rotation: `POST /api/hooks/:id/rotate-secret` generates a new cryptographically secure secret (`crypto.randomBytes(32).toString('hex')`).

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run tests/unit/f8-hmac-signatures.test.ts tests/integration/f8-webhooks-api.test.ts`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m8_webhooks\handoff.md` and send a message back.
