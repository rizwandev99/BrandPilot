## 2026-10-27T07:34:42Z
You are test_writer_track_a3 (role: E2E & Integration Test Writer for F4, F6, F8, F9).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\test_writer_track_a3
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
TEST_INFRA.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own test files in `tests/unit/f4-*.test.ts`, `tests/unit/f6-*.test.ts`, `tests/integration/f6-*.test.ts`, `tests/unit/f8-*.test.ts`, `tests/integration/f8-*.test.ts`, `tests/unit/f9-*.test.ts`, and `tests/integration/f9-*.test.ts`.

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md, and Spec Miner 3 handoff.
2. Create comprehensive test suites matching every AC from F4, F6, F8, and F9 with AC ID in test names:
   - `tests/unit/f4-connector-contract.test.ts` (AC-F4-01..03: shared contract test suite running across LinkedIn, X, Instagram, Facebook sandbox adapters; idempotencyKey handling; error mappings to AUTH_EXPIRED, RATE_LIMITED, INVALID_CONTENT, TEMPORARY, PERMANENT)
   - `tests/unit/f4-token-encryption.test.ts` (AC-F4-06: AES-256-GCM token encryption & decryption using ENCRYPTION_KEY)
   - `tests/unit/f6-retry-policy.test.ts` (AC-F6-04: calculateNextRetry pure backoff + jitter function, retry-after support, max 4 attempts, non-retryable error handling)
   - `tests/integration/f6-scheduler-concurrency.test.ts` (AC-F6-01 schedule-approved batch job creation, AC-F6-03 run-due concurrency locking with 2 parallel calls ensuring no duplicate publishes, AC-F6-05 post.published / post.failed events, AC-F6-06 idempotency crash recovery, AC-F6-08 cron route with CRON_SECRET & TTL cleanup)
   - `tests/unit/f8-hmac-signatures.test.ts` (AC-F8-01, AC-F8-02: HMAC-SHA256 timingSafeEqual over raw Buffer, whitespace invariance, timestamp freshness 300s window)
   - `tests/integration/f8-webhooks-api.test.ts` (AC-F8-01 POST /api/hooks/in/:token, AC-F8-04 deduplication by payload.event_id, AC-F8-05 outgoing webhook delivery + /api/sandbox/receiver/:token bypass, AC-F8-06 outgoing retry backoff, AC-F8-08 activity feed pagination & redaction, AC-F8-09 secret rotation)
   - `tests/unit/f9-automation-engine.test.ts` (AC-F9-01 pure evaluateRule, path resolution dot-notation eq/neq/contains/gt/lt/exists, AC-F9-03 recursion loop protection depth limit 3, AC-F9-04 status machine validation in actions)
   - `tests/integration/f9-automations-api.test.ts` (AC-F9-06 dry run test endpoint, AC-F9-07 create_ai_draft action, AC-F9-09 max 10 automations per workspace cap)
3. Ensure tests are rigorous, executable with `pnpm test`, and contain zero syntax errors.
4. Write `handoff.md` in your working directory with full summary and verification output.
