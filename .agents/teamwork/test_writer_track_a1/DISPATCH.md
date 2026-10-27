## 2026-10-27T07:34:41Z
You are test_writer_track_a1 (role: E2E & Integration Test Writer for Foundation, Workspace, and Quota).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\test_writer_track_a1
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
TEST_INFRA.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own test files in `tests/unit/f0-*.test.ts`, `tests/unit/f1-*.test.ts`, `tests/integration/f0-*.test.ts`, `tests/integration/f1-*.test.ts`, `tests/unit/f11-*.test.ts`, `tests/integration/f11-*.test.ts`, and test configuration `vitest.config.ts`.

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md, and Spec Miner 1 handoff.
2. Ensure `vitest.config.ts` is configured at project root supporting TypeScript and path alias `@/*`.
3. Create comprehensive test suites matching every AC from F0, F1, and F11 with AC ID in test names:
   - `tests/unit/f0-scripts.test.ts` (AC-F0-01 scripts exist in package.json, AC-F0-02 TypeScript strict configuration check)
   - `tests/integration/f0-health-api.test.ts` (AC-F0-03 GET /api/health returns 200 on healthy DB and 503 on DB error)
   - `tests/unit/f0-schema-migrations.test.ts` (AC-F0-04 all 15 tables defined and migration files exist)
   - `tests/unit/f0-design-tokens-theme.test.ts` (AC-F0-05 CSS variables exist for light/dark, ThemeProvider configured)
   - `tests/unit/f0-env-example.test.ts` (AC-F0-08 all 12 env vars documented in .env.example)
   - `tests/unit/f1-workspace-service.test.ts` (AC-F1-01 cookie UUID creation & extraction, AC-F1-02 last_seen_at throttled 5m, AC-F1-06 corrupt/missing cookie recovery)
   - `tests/integration/f1-workspace-isolation.test.ts` (AC-F1-03 integration test proving workspace A cannot read, edit, or delete workspace B's brand kits, posts, connectors, events, automations)
   - `tests/integration/f1-workspace-reset.test.ts` (AC-F1-04 POST /api/workspace/reset cascades deletions and re-seeds)
   - `tests/integration/f1-workspace-ttl.test.ts` (AC-F1-05 cleanupStaleWorkspaces deletes inactive > 7d with fake clock)
   - `tests/unit/f11-llm-provider-fallbacks.test.ts` (AC-F11-01 LlmProvider interface with Gemini, Fallback, Fake; fallback triggers on missing key, 429, timeout, 5xx)
   - `tests/unit/f11-daily-budget.test.ts` (AC-F11-02 daily global budget counter in llm_usage caps Gemini calls)
   - `tests/integration/f11-rate-limits.test.ts` (AC-F11-03 rate_limit_counters 429 RATE_LIMITED with Retry-After)
   - `tests/unit/f11-gemini-concurrency-backoff.test.ts` (AC-F11-04 serialized calls & backoff on 429)
   - `tests/unit/f11-response-cache.test.ts` (AC-F11-05 24h cache in llm_cache by hash)
   - `tests/integration/f11-data-caps.test.ts` (AC-F11-06 max 60 posts, 5 kits, 10 automations, 200 events trim)
   - `tests/unit/f11-secret-hygiene.test.ts` (AC-F11-08 server-only env handling, no leak to client or logs)
4. Ensure tests are rigorous, executable with `pnpm test`, and contain zero syntax errors.
5. Write `handoff.md` in your working directory with full summary and verification output.
