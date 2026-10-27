## 2026-10-27T07:34:42Z
You are test_writer_track_a2 (role: E2E & Integration Test Writer for F2, F3, F5, F7).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\test_writer_track_a2
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
TEST_INFRA.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own test files in `tests/unit/f2-*.test.ts`, `tests/integration/f2-*.test.ts`, `tests/unit/f3-*.test.ts`, `tests/integration/f3-*.test.ts`, `tests/unit/f5-*.test.ts`, `tests/integration/f5-*.test.ts`, and `tests/integration/f7-*.test.ts`.

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md, and Spec Miner 2 handoff.
2. Create comprehensive test suites matching every AC from F2, F3, F5, and F7 with AC ID in test names:
   - `tests/unit/f2-ssrf-guard.test.ts` (AC-F2-02, AC-F2-03: rejects non-http(s), localhost, 127.0.0.1, 169.254.169.254, [::1], DNS resolution to private IP, redirect to private IP, 2MB size cap, 8s timeout, error code SSRF_BLOCKED)
   - `tests/unit/f2-color-contrast.test.ts` (AC-F2-05: WCAG AA contrast ratio >= 4.5:1, auto-adjustment of text luminance, hex validator)
   - `tests/integration/f2-brand-kits-api.test.ts` (AC-F2-01 brand kit schema output, AC-F2-04 Zod validation & fallback on invalid, AC-F2-06 { sample: true } zero network/zero AI, AC-F2-07 24h cache in llm_cache, AC-F2-08 PATCH API & validation)
   - `tests/unit/f3-channel-validation.test.ts` (AC-F3-04: LinkedIn <= 3000 chars, X <= 280 chars, Instagram <= 2200 chars / max 30 hashtags, Facebook <= 2000 chars; trimming & validation)
   - `tests/unit/f3-banned-words.test.ts` (AC-F3-05: brand kit donts filter from caption & hashtags)
   - `tests/unit/f3-schedule-planner.test.ts` (AC-F3-09: >= 2h channel spacing over next 7 days)
   - `tests/integration/f3-agent-runs-api.test.ts` (AC-F3-01 3-step run idea->creative->campaign, AC-F3-02 step logging in agent_run_steps, AC-F3-03 idempotency on re-calling /step, AC-F3-10 retry failed step)
   - `tests/integration/f3-creatives-png-api.test.ts` (AC-F3-06 GET /api/creatives/:postId.png returns valid PNG with correct channel dimensions, AC-F3-07 3+ distinct templates)
   - `tests/unit/f5-status-machine.test.ts` (AC-F5-03: 100% table-driven test matrix of canTransition() for all allowed and disallowed transitions, human approval requirement)
   - `tests/integration/f5-posts-api.test.ts` (AC-F5-02 transition endpoint, AC-F5-04 version bump and resetting approved posts to in_review on edit, AC-F5-06 bulk actions approve-all & schedule-approved)
   - `tests/integration/f7-connectors-api.test.ts` (AC-F7-01 GET /api/connectors returns 4 providers, AC-F7-02 health check, AC-F7-03 simulation failure settings, AC-F7-04 reconnect warning, AC-F7-05 default 4 sandbox connectors)
3. Ensure tests are rigorous, executable with `pnpm test`, and contain zero syntax errors.
4. Write `handoff.md` in your working directory with full summary and verification output.
