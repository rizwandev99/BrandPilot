## 2026-10-27T08:03:03Z
You are worker_m2_quota (role: Quota, Rate Limits & Resilient LLM Specialist).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m2_quota
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- `src/server/llm/interface.ts`
- `src/server/llm/gemini-provider.ts`
- `src/server/llm/fallback-provider.ts`
- `src/server/llm/fake-provider.ts`
- `src/server/llm/resilient-provider.ts`
- `src/server/llm/cache.ts`
- `src/server/security/rate-limiter.ts`
- `src/components/demo/fallback-banner.tsx`

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and Spec Miner 1 handoff.
2. Implement `src/server/llm/interface.ts`:
   - Types: `BrandKitGenerationInput`, `BrandKitOutput`, `IdeasGenerationInput`, `IdeaItem`, `CreativeGenerationInput`, `CreativeOutput`, `ConditionEvaluationInput`, `ConditionOutput`, `LlmResult<T>`, and `LlmProvider` interface (AC-F11-01).
3. Implement `src/server/llm/fallback-provider.ts`:
   - Deterministic offline brand kit and post generator based on cheerio facts, brand keywords, and channel constraints. Zero external network calls.
4. Implement `src/server/llm/fake-provider.ts`:
   - Test double provider with programmable outputs, invocation counting, and simulated 429 errors.
5. Implement `src/server/llm/gemini-provider.ts`:
   - Google GenAI SDK integration reading `process.env.GEMINI_API_KEY`. Serialized request handling and exponential backoff with jitter on HTTP 429 (AC-F11-04).
6. Implement `src/server/llm/resilient-provider.ts`:
   - Wraps GeminiProvider with fallback to FallbackProvider on: missing API key, HTTP 429, timeout, HTTP 5xx, or exhausted daily budget. Records `provider: 'gemini' | 'fallback' | 'fake'` on results (AC-F11-01).
   - Daily budget check: atomic counter in `llm_usage` table by UTC date (`day`). If `calls >= LLM_DAILY_BUDGET` (default 50), switches immediately to fallback provider (AC-F11-02).
7. Implement `src/server/llm/cache.ts`:
   - Deterministic SHA-256 prompt hash caching in `llm_cache` table with 24-hour expiration (AC-F11-05).
8. Implement `src/server/security/rate-limiter.ts`:
   - Sliding/fixed window rate limiter in Postgres `rate_limit_counters` table (zero paid Redis). Returns 429 `RATE_LIMITED` with `Retry-After` header when limit exceeded (AC-F11-03).
   - Data caps checker: enforces max 60 posts, 5 brand kits, 10 automations per workspace (throwing `VALIDATION_ERROR`). Auto-pruning helper to trim `events` table to max 200 rows per workspace (AC-F11-06).
9. Implement `src/components/demo/fallback-banner.tsx`:
   - Calm UI banner shown when provider is `'fallback'` (AC-F11-07).
10. Ensure secret hygiene: server-only env handling for `GEMINI_API_KEY`, no client leak, redacted logs (AC-F11-08).
11. Run targeted tests:
    `pnpm vitest run tests/unit/f11-*.test.ts tests/integration/f11-*.test.ts`
    Ensure all tests turn GREEN with 0 errors. Run `pnpm typecheck`.
12. Write `handoff.md` in your working directory and message the orchestrator.
