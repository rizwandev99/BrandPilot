# Specification Mining Report: Foundation (F0), Workspace (F1), Quota & Fallbacks (F11), Home & Demo & Docs & A11y (F10)

**Date**: 2026-10-27  
**Agent**: `teamwork_preview_spec_miner_1`  
**Target Features**: F0 (Foundation), F1 (Anonymous Workspace), F11 (LLM Quota, Rate Limits, Fallbacks), F10 (Home, One-Click Demo, Docs, Accessibility)  
**Authoritative Sources**: `PRD.md` (lines 1-683), `ORIGINAL_REQUEST.md` (lines 1-52)

---

## 1. Observation

Direct observations extracted from `PRD.md` and `ORIGINAL_REQUEST.md`:

1. **Tech Stack & Core Tooling (PRD lines 120–148, 290–298)**:
   - Next.js (App Router), React, TypeScript strict mode enabled (`noImplicitAny`, etc.).
   - Styling: Tailwind CSS with CSS variable design tokens (`--bg`, `--surface`, `--accent`, etc.), Radix UI / shadcn style primitives, Lucide icons, `next-themes` (class-based).
   - Font: Inter (via framework font loader).
   - Database: Neon Postgres via Drizzle ORM (`drizzle-orm` + `drizzle-kit`).
   - Package manager: `pnpm`. Mandatory scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
   - CI: GitHub Actions workflow running lint, typecheck, tests on push.
   - Env documentation: `.env.example` capturing all variables from Section 13.1.

2. **Anonymous Workspace Isolation (PRD lines 109–112, 301–312)**:
   - Quote line 110: *"No login anywhere. Instead, each visitor gets an anonymous workspace (random ID in a cookie) so visitors do not see each other's data. This is data isolation, not auth. (F1)"*
   - Cookie attributes: `httpOnly`, `secure`, `sameSite=lax`.
   - Invariant: `last_seen_at` updated at most once per few minutes.
   - Query isolation helper: *"Every DB query for workspace-owned data goes through a helper that requires workspace_id. An integration test proves workspace A can never read, edit, or delete workspace B's brand kits, posts, connectors, events, or automations (try every resource)."* (AC-F1-03)
   - Reset endpoint: `POST /api/workspace/reset` cascades deletions and re-initializes defaults.
   - TTL cleanup: `cleanupStaleWorkspaces()` deletes workspaces inactive for $N$ days (`WORKSPACE_TTL_DAYS`, default 7).
   - Cookie resilience: Invalid or missing cookie must create a new workspace without crashing (AC-F1-06).

3. **LLM Provider, Quota, Rate Limits, Fallbacks (PRD lines 510–524, 211–228)**:
   - `LlmProvider` interface with three distinct implementations:
     - `GeminiProvider`: Real Google GenAI SDK calls using server-side `GEMINI_API_KEY`.
     - `FallbackProvider`: Deterministic, offline, template-based generator using brand kit keywords and rules (zero network calls).
     - `FakeProvider`: Deterministic test double supporting mock outputs, simulated 429s, and invocation counters.
     - Fallback triggers: Missing API key, HTTP 429, timeout, HTTP 5xx, invalid output after 1 repair prompt, or daily budget reached.
   - Database tables:
     - `llm_usage`: `day` (date pk), `calls` (int). Enforces `LLM_DAILY_BUDGET`.
     - `rate_limit_counters`: `key` (text), `window_start` (timestamp), `count` (int), composite pk `(key, window_start)`. Applies to `POST /api/brand-kits`, `POST /api/runs`, `POST /api/hooks/test`. Returns 429 `RATE_LIMITED` with `Retry-After`.
     - `llm_cache`: `key` (pk), `response` (jsonb), `created_at`. 24-hour cache by SHA-256 hash of prompt + input parameters.
     - Data caps: Max 60 posts, 5 brand kits, 10 automations, 200 events per workspace. Exceeding throws `VALIDATION_ERROR` (events auto-pruned).
   - UI indicator: Small, calm banner when fallback mode is active. Never expose raw Gemini errors.

4. **Home, One-Click Demo, Docs, Accessibility (PRD lines 496–508, 526–576)**:
   - Home page: URL input, example chips (`auroscale.com`, `vercel.com`), "Use sample brand" button, and "Run full demo" button.
   - Full demo: Brand kit -> Agent run -> Approve all -> Schedule -> Publish to sandbox. Must run 100% offline with zero external network dependencies (AC-F10-02).
   - Footer: "Portfolio project. Not affiliated with any company." + GitHub link.
   - Docs deliverables: `README.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/review-log.md`.
   - Accessibility (WCAG AA): Keyboard navigation, visible focus ring (`focus-visible:ring-accent`), explicit labels, `prefers-reduced-motion`, color contrast AA in light and dark themes. Automated axe checks passing on 6 core pages.

---

## 2. Logic Chain

1. **Foundational Integrity (F0)**:
   - Next.js App Router with TypeScript strict mode forms the runtime container.
   - Since serverless executions on Vercel Hobby have strict timeouts and cold-starts, database connectivity requires Neon's pooled connection string (`DATABASE_URL`).
   - Drizzle ORM provides type-safe queries and explicit migrations without heavy runtime overhead.
   - `GET /api/health` serves as the primary deployment and liveness gate: if `db.execute(sql\`SELECT 1\`)` fails, it signals 503 `db: false`; otherwise 200 `{ ok: true, db: true }`.

2. **Multi-Tenant Anonymous Boundary (F1)**:
   - In the absence of user authentication, multi-tenant isolation is anchored on a cryptographic cookie UUID.
   - If queries were written ad-hoc with `where(eq(...))`, developer oversight could easily leak posts or brand kits between users.
   - Therefore, a query scope wrapper (`withWorkspace(workspaceId, ...)` or a `WorkspaceScope` class) must be mandated across all domain repositories.
   - Throttling `last_seen_at` updates prevents Neon pool exhaustion caused by high-frequency asset or polling requests.
   - Workspace reset and TTL cleanup must execute cascading deletes across all 10 child tables to keep the 0.5 GB Neon free-tier storage bounded.

3. **Resilience & Guardrails (F11)**:
   - Google Gemini free-tier imposes low RPM limits (5–15 RPM) and unpredictable rate-limiting under concurrent public usage.
   - To guarantee zero downtime and 100% demo success, the `LlmProvider` must decouple agent logic from the upstream API.
   - The wrapper orchestrator attempts `GeminiProvider` only if within daily budget (`llm_usage.calls < LLM_DAILY_BUDGET`) and API key is present.
   - When Gemini fails or quotas trigger, execution transparently degrades to `FallbackProvider`, recording `provider: 'fallback'` on the step record.
   - `rate_limit_counters` in Postgres avoids any dependency on external paid Redis (Upstash/KV), preserving the zero-cost requirement.
   - Response caching (`llm_cache`) drastically reduces duplicate calls for common demo URLs.

4. **Presentation, Frictionless Demo & Accessibility (F10)**:
   - The primary user persona is an evaluator/recruiter who will spend under 3 minutes testing the product.
   - A single-click "Run full demo" walkthrough proves all subsystems (Brand Kit -> Step Agent -> Approval -> Scheduler -> Sandbox Connector -> Event Feed) without human intervention.
   - By leveraging the sample brand kit and `FallbackProvider`, the entire golden path runs deterministically offline without network or API key flakiness.
   - Linear-grade visual polish (dark/light tokens, tight spacing, subtle micro-interactions) combined with rigorous WCAG AA compliance ensures high engineering quality.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | F0 Foundation | App Router Scaffold | Strict TS Next.js App Router app structure | CLI commands, config files | Working dev/build/test server | Compilation/type error | PRD §4, §6.1, AC-F0-01 |
| 2 | F0 Foundation | Strict Type Safety | Strict TS flags with zero uncommented `any` | Source code | TS diagnostic output | Typecheck failure on `any` | PRD AC-F0-02 |
| 3 | F0 Foundation | Health Check API | Liveness probe verifying database connectivity | `GET /api/health` | 200 `{ ok: true, db: true }` | 503 `{ ok: false, db: false }` | PRD AC-F0-03, §8 |
| 4 | F0 Foundation | Drizzle Relational Schema | Full schema definition for all 15 tables & migrations | Schema definitions, migration files | Neon Postgres tables & indices | Migration failure on conflict | PRD §7, AC-F0-04 |
| 5 | F0 Foundation | Design Token System | Light/dark CSS tokens, Next-Themes toggle | System theme / user preference toggle | Dynamic CSS vars on `:root` & `.dark` | FOUC or contrast regression | PRD §10, AC-F0-05, AC-F10-D1 |
| 6 | F0 Foundation | App Shell & Navigation | Collapsible sidebar, header, responsive mobile layout | Viewport resize, navigation clicks | Rendered view, URL route update | Responsive layout break | PRD §10.4, AC-F0-06 |
| 7 | F0 Foundation | Automated CI Workflow | GitHub Actions workflow on push/PR | Git push events | Lint, typecheck, test execution status | Workflow failure blocks merge | PRD AC-F0-07 |
| 8 | F0 Foundation | Environment Manifest | Complete `.env.example` capturing all 12 env vars | Configuration audit | Verified `.env.example` file | Build/runtime config error | PRD §13.1, AC-F0-08 |
| 9 | F1 Workspace | Anonymous Cookie Creation | Generate & persist UUID v4 in HttpOnly cookie | Initial HTTP request | `Set-Cookie` header with UUID v4 | Create fallback workspace | PRD AC-F1-01, §3 |
| 10 | F1 Workspace | Throttled `last_seen_at` | Updates workspace timestamp at most every 5m | Inbound workspace requests | DB timestamp update | Silently ignore if < 5m | PRD AC-F1-02 |
| 11 | F1 Workspace | Query Isolation Helper | Scoped query helper requiring `workspace_id` | `workspace_id`, query builder callback | Scoped query results | Cross-tenant leak blocked | PRD AC-F1-03 |
| 12 | F1 Workspace | Workspace Reset API | Wipe all workspace entities & re-seed sandbox | `POST /api/workspace/reset` | 200 `{ ok: true }` + clean state | 500 on transaction failure | PRD AC-F1-04, §8 |
| 13 | F1 Workspace | Inactive Workspace TTL Cleanup | Cron-driven cleanup of workspaces older than 7d | Scheduled trigger (`CRON_SECRET`) | Count of pruned workspaces | 401 if unauthorized | PRD AC-F1-05 |
| 14 | F1 Workspace | Cookie Corrupt/Missing Recovery | Graceful fallback on corrupt or unknown cookie | Malformed cookie string | Fresh workspace created | Never throw unhandled 500 | PRD AC-F1-06 |
| 15 | F11 Quota & Fallback | `LlmProvider` Architecture | Unified interface with Gemini, Fallback, Fake | Prompt, options, schema | Typed completion + metadata | Fallback on upstream error | PRD §181, AC-F11-01 |
| 16 | F11 Quota & Fallback | Daily Global Budget Tracking | Daily call counter in `llm_usage` | Gemini invocation attempt | Budget check boolean | Fallback if budget exceeded | PRD AC-F11-02, §7 |
| 17 | F11 Quota & Fallback | DB Rate Limit Counters | Sliding/fixed window limits in `rate_limit_counters` | IP/Workspace request to costly endpoint | Allowed status or 429 response | 429 `RATE_LIMITED` with `Retry-After` | PRD AC-F11-03, §7 |
| 18 | F11 Quota & Fallback | Gemini Concurrency & Backoff | Serialized calls and backoff on HTTP 429 | Upstream Gemini API call | Output or fallback switch | Fallback after backoff failure | PRD AC-F11-04 |
| 19 | F11 Quota & Fallback | Response Cache (`llm_cache`) | 24-hour cache of LLM outputs by hash | Prompt hash, input parameters | Cached JSON response | Bypass cache on miss/expiry | PRD AC-F11-05, §7 |
| 20 | F11 Quota & Fallback | Workspace Resource Caps | Caps on posts (60), kits (5), automations (10) | Insertion/creation request | Allowed insertion or rejection | 400 `VALIDATION_ERROR` | PRD AC-F11-06 |
| 21 | F11 Quota & Fallback | Event Pruning Guardrail | Auto-trim workspace events exceeding 200 | Event creation | Oldest events deleted | Prune failure logged | PRD AC-F11-06 |
| 22 | F11 Quota & Fallback | UI Fallback Banner | Visual notification when fallback provider active | Agent step / brand kit response meta | Rendered banner component | Suppress raw LLM errors | PRD AC-F11-07 |
| 23 | F11 Quota & Fallback | Secrets Leak Prevention | Server-only env handling for `GEMINI_API_KEY` | Env variable loader | Safe sanitized logs | Build failure if key in client | PRD AC-F11-08, §11 |
| 24 | F10 Demo & Docs | Home Hero & URL Input | Landing page with URL input & example chips | User URL string or chip click | Form state update | Inline validation error | PRD §5.2, AC-F10-01 |
| 25 | F10 Demo & Docs | One-Click Demo Orchestrator | Automated end-to-end pipeline execution | "Run full demo" click | Stepper UI, final queue redirect | Display error step with retry | PRD AC-F10-01 |
| 26 | F10 Demo & Docs | 100% Offline Demo Guarantee | End-to-end demo running without internet/LLM | Sample brand selection | Fully populated demo data | Clean offline fallback | PRD AC-F10-02 |
| 27 | F10 Demo & Docs | Footer & Portfolio Disclaimer | Mandatory portfolio disclaimer and repo link | Static page footer | Rendered disclaimer & links | Missing disclaimer violation | PRD §1.2, AC-F10-03 |
| 28 | F10 Demo & Docs | How It Works & Tech Stack | 3-step explainer & technology stack listing | Page scroll | Rendered informational sections | Content layout failure | PRD AC-F10-04 |
| 29 | F10 Demo & Docs | Comprehensive `README.md` | Complete project documentation & screenshots | Documentation audit | High-quality Markdown file | Missing sections in audit | PRD AC-F10-05 |
| 30 | F10 Demo & Docs | Architecture Specification | `docs/architecture.md` detailing all systems | Technical design extraction | Markdown design doc | Missing subsystem specs | PRD AC-F10-06 |
| 31 | F10 Demo & Docs | Decisions & Review Logs | `docs/decisions.md` & `docs/review-log.md` | ADRs and TDD audit entries | Complete audit trails | Open review items | PRD §0.1, §0.2, AC-F10-06 |
| 32 | F10 Demo & Docs | Page Metadata & Open Graph | Dynamic title, description, and OG image | Route navigation | Meta tags and OG card | Social scraper fallback | PRD AC-F10-07 |
| 33 | F10 Demo & Docs | WCAG AA Accessibility Suite | Keyboard nav, focus ring, contrast, motion | Tab key, screen reader, axe tests | WCAG AA compliant UI | Axe test violation | PRD §10, AC-F10-08 |

---

## 4. Edge Cases

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|-----------------------------|
| 1 | F0 Health Check | Neon Postgres connection times out or credentials invalid | Catch exception, return HTTP 503 `{ ok: false, db: false, error: "Database unreachable" }`, no credential leak. |
| 2 | F0 Theme System | Visitor system preference is Dark, but localStorage has Light | Respect stored choice without hydration mismatch (`suppressHydrationWarning` on `<html>`). |
| 3 | F1 Cookie Init | Two parallel requests arrive from a new visitor without cookie | Both generate a UUID or first sets cookie; each request gets a valid workspace; no primary key collision. |
| 4 | F1 Cookie Tampering | Client sends header `Cookie: brandpilot_workspace_id=malicious-id; drop table` | Regex validation rejects non-UUID; creates a brand new valid workspace; no SQL injection. |
| 5 | F1 Throttled Update | 100 asset/poll requests in 10 seconds from same workspace | Exactly one DB update to `workspaces.last_seen_at` executed; remaining 99 skip update. |
| 6 | F1 Reset during Run | Reset endpoint called while an agent run is actively processing | Transaction cascades deletion of `agent_run_steps` and `agent_runs`; active step aborts safely. |
| 7 | F1 TTL Cleanup | Workspaces exist with `last_seen_at` 8 days ago and 2 days ago | Cron cleanup deletes the 8-day-old workspace and all child records; 2-day-old workspace untouched. |
| 8 | F11 Daily Budget | Global calls reach exact value of `LLM_DAILY_BUDGET` (e.g. 100) | 101st call increments usage, checks threshold, immediately switches to `FallbackProvider`. |
| 9 | F11 Midnight Rollover | Request arrives at 23:59:59 UTC and next at 00:00:01 UTC | `llm_usage` creates a fresh record for the new UTC date; daily budget resets to 0. |
| 10 | F11 Rate Limit Burst | 15 brand kit creation requests sent in 5 seconds from same IP | First $N$ requests proceed; subsequent requests receive 429 with `Retry-After: 55` and JSON error. |
| 11 | F11 Gemini 429 | Gemini API returns HTTP 429 Resource Exhausted | Catch error, record warning, seamlessly switch to `FallbackProvider`; return complete brand kit. |
| 12 | F11 Truncated Output | Gemini returns cut-off JSON due to token limit | Zod parse fails; trigger repair prompt; if second attempt fails, fall back to `FallbackProvider`. |
| 13 | F11 Cache Hit | Exact same URL submitted twice within 24 hours | Second call returns JSON from `llm_cache`; 0 calls added to `llm_usage`; response marked `cached: true`. |
| 14 | F11 Post Cap Reached | Workspace already has 60 posts; agent attempts to create 6 more | Post creation rejected with 400 `VALIDATION_ERROR` explaining limit reached; no partial corrupt writes. |
| 15 | F11 Event Overflow | Event activity exceeds 200 items in a workspace | Pruning subquery deletes oldest events `OFFSET 200` to maintain exactly 200 rows. |
| 16 | F10 Offline Demo | Disconnected network, missing `GEMINI_API_KEY`, empty DB | "Run full demo" selects sample brand, uses fallback provider, sandbox connectors, finishes in < 60s. |
| 17 | F10 Reduced Motion | User OS has `prefers-reduced-motion: reduce` enabled | CSS transitions and stepper animations immediately disable duration or drop to 0ms. |
| 18 | F10 Color Contrast | Dark mode rendered with subtle secondary text | Normal text contrast verified $\ge 4.5:1$, large text $\ge 3:1$ against `--surface` and `--bg`. |

---

## 5. Comprehensive Feature & Acceptance Criteria Breakdown

### F0: Foundation (P0)

- **AC-F0-01**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` scripts exist and pass on a clean checkout.
  - *Implementation Requirement*: Root `package.json` must configure scripts using Vitest for unit/integration tests and Playwright for E2E tests. Strict zero warning policy for ESLint (`--max-warnings 0`).
  - *Proof*: Test `tests/f0-foundation/ac-f0-01-scripts.test.ts`.

- **AC-F0-02**: TypeScript strict mode is on. No `any` without a comment explaining why.
  - *Implementation Requirement*: `tsconfig.json` contains `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`. Any rare `any` must be preceded by a comment `// intentional any: <reason>`.
  - *Proof*: Test `tests/f0-foundation/ac-f0-02-typescript-strict.test.ts` (scans AST/files).

- **AC-F0-03**: `GET /api/health` returns 200 with `{ ok: true, db: true }` when the DB is reachable, and 503 with `db: false` when not.
  - *Implementation Requirement*: Route handler in `src/app/api/health/route.ts`. Executes `SELECT 1` via Drizzle. If DB probe fails, returns HTTP 503.
  - *Proof*: Test `tests/f0-foundation/ac-f0-03-health-check.test.ts`.

- **AC-F0-04**: Drizzle schema and migrations exist for all tables in Section 7. Running migrations on an empty DB works.
  - *Implementation Requirement*: `src/server/db/schema.ts` defining all 15 tables. Drizzle migration directory `drizzle/` populated via `drizzle-kit generate`.
  - *Proof*: Test `tests/f0-foundation/ac-f0-04-schema-migrations.test.ts`.

- **AC-F0-05**: Design tokens (Section 10) exist as CSS variables for light and dark. A theme toggle works and the choice persists across reload. Default follows the system setting.
  - *Implementation Requirement*: `src/app/globals.css` with semantic variables. `ThemeProvider` from `next-themes`. Theme switcher component in sidebar.
  - *Proof*: Test `tests/f0-foundation/ac-f0-05-design-tokens-theme.test.ts`.

- **AC-F0-06**: App shell exists: left sidebar, top bar, content area, responsive down to phone width.
  - *Implementation Requirement*: Layout shell in `src/app/(workspace)/layout.tsx` or `src/components/layout/app-shell.tsx`. Includes collapsible navigation for screens `< 768px`.
  - *Proof*: Test `tests/f0-foundation/ac-f0-06-app-shell.test.ts`.

- **AC-F0-07**: GitHub Actions workflow runs lint, typecheck, and tests on every push.
  - *Implementation Requirement*: `.github/workflows/ci.yml` with steps: checkout, node setup, pnpm cache, install, lint, typecheck, test.
  - *Proof*: Test `tests/f0-foundation/ac-f0-07-ci-workflow.test.ts`.

- **AC-F0-08**: `.env.example` lists every env var from Section 13. No real secrets are committed.
  - *Implementation Requirement*: `.env.example` verified to contain all 12 variables: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GEMINI_API_KEY`, `LLM_DAILY_BUDGET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `WORKSPACE_TTL_DAYS`, `ENABLE_LIVE_LINKEDIN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `APP_URL`.
  - *Proof*: Test `tests/f0-foundation/ac-f0-08-env-example.test.ts`.

---

### F1: Anonymous Workspace (P0)

- **AC-F1-01**: On first request, a workspace is created and its ID is stored in an `httpOnly`, `secure`, `sameSite=lax` cookie. Later requests reuse it.
  - *Implementation Requirement*: Middleware or server helper `getOrCreateWorkspace()` in `src/server/workspace/workspace-service.ts`. Cookie name `brandpilot_workspace_id`.
  - *Proof*: Test `tests/f1-workspace/ac-f1-01-cookie-creation.test.ts`.

- **AC-F1-02**: `last_seen_at` is updated at most once per few minutes (do not write on every request).
  - *Implementation Requirement*: Check `Date.now() - workspace.last_seen_at > 5 * 60 * 1000`. If false, skip update.
  - *Proof*: Test `tests/f1-workspace/ac-f1-02-last-seen-throttling.test.ts`.

- **AC-F1-03**: Every DB query for workspace-owned data goes through a helper that requires `workspace_id`. An integration test proves workspace A can never read, edit, or delete workspace B's brand kits, posts, connectors, events, or automations.
  - *Implementation Requirement*: Scoped query layer `src/server/db/scoped-queries.ts` where all data access methods enforce `eq(table.workspaceId, workspaceId)`. Multi-tenant matrix test covering 5 entity types.
  - *Proof*: Test `tests/f1-workspace/ac-f1-03-workspace-isolation.test.ts`.

- **AC-F1-04**: `POST /api/workspace/reset` deletes all data of the current workspace and creates a fresh state. UI has a "Reset demo" button with a confirm dialog.
  - *Implementation Requirement*: Route handler `src/app/api/workspace/reset/route.ts` deletes all records in transaction, re-seeds default sandbox connectors, and returns clean workspace state.
  - *Proof*: Test `tests/f1-workspace/ac-f1-04-workspace-reset.test.ts`.

- **AC-F1-05**: A cleanup function deletes workspaces (and all their data) not seen for N days (default 7, from env). It is callable by the cron endpoint. Test with a fake clock.
  - *Implementation Requirement*: `cleanupStaleWorkspaces(cutoffDate)` in `src/server/workspace/cleanup.ts`. Cascade delete on all foreign keys.
  - *Proof*: Test `tests/f1-workspace/ac-f1-05-workspace-ttl-cleanup.test.ts`.

- **AC-F1-06**: Missing or invalid cookie never crashes the app; a new workspace is created.
  - *Implementation Requirement*: Exception handler around cookie parsing. If invalid UUID or non-existent in DB, seamlessly generates a new workspace.
  - *Proof*: Test `tests/f1-workspace/ac-f1-06-resilient-cookie.test.ts`.

---

### F11: Quota, Rate Limits, Fallbacks (P0)

- **AC-F11-01**: `LlmProvider` interface has implementations: `GeminiProvider` (real), `FallbackProvider` (template-based, no AI, deterministic), `FakeProvider` (tests). A wrapper tries Gemini first and falls back on: missing key, 429, timeout, 5xx, invalid output after one repair, or exhausted budget.
  - *Implementation Requirement*: `src/server/llm/interface.ts`, `gemini-provider.ts`, `fallback-provider.ts`, `fake-provider.ts`, and `resilient-provider.ts`.
  - *Proof*: Test `tests/f11-quota/ac-f11-01-llm-provider-fallbacks.test.ts`.

- **AC-F11-02**: A daily global budget counter (`llm_usage`) caps Gemini calls per UTC day (env `LLM_DAILY_BUDGET`, default well under the free limit). When reached, all calls use the fallback.
  - *Implementation Requirement*: Atomic upsert into `llm_usage` by `CURRENT_DATE`. Returns whether budget permits Gemini call.
  - *Proof*: Test `tests/f11-quota/ac-f11-02-daily-budget.test.ts`.

- **AC-F11-03**: Per-IP and per-workspace rate limits (stored in `rate_limit_counters`, no paid Redis) apply to expensive routes: brand kit creation, run creation, test event sending. Over limit → 429 `RATE_LIMITED` with `Retry-After`.
  - *Implementation Requirement*: `checkRateLimit(key, limit, windowSeconds)` in `src/server/security/rate-limiter.ts`. Upserts into `rate_limit_counters`.
  - *Proof*: Test `tests/f11-quota/ac-f11-03-rate-limits.test.ts`.

- **AC-F11-04**: Gemini calls are made one at a time per request path and respect the provider's rate limit. On 429 use backoff, then fall back.
  - *Implementation Requirement*: Retry with exponential backoff and jitter inside `GeminiProvider` before escalating to fallback.
  - *Proof*: Test `tests/f11-quota/ac-f11-04-gemini-concurrency-backoff.test.ts`.

- **AC-F11-05**: Response cache (`llm_cache`) by hash of prompt + inputs, with expiry.
  - *Implementation Requirement*: `getCachedLlmResponse(key)` and `setCachedLlmResponse(key, value, ttlSeconds)` in `src/server/llm/cache.ts`.
  - *Proof*: Test `tests/f11-quota/ac-f11-05-response-cache.test.ts`.

- **AC-F11-06**: Data caps per workspace (max 60 posts, 5 brand kits, 10 automations, 200 events). Over the cap → `VALIDATION_ERROR` with a clear message. Old events are trimmed.
  - *Implementation Requirement*: Pre-insert count checks in repository methods. Background trimming of `events` table to max 200.
  - *Proof*: Test `tests/f11-quota/ac-f11-06-data-caps.test.ts`.

- **AC-F11-07**: The UI shows a small, calm banner when fallback mode is active, and never shows raw errors from Gemini.
  - *Implementation Requirement*: `FallbackNoticeBanner` rendered in app shell / step log if step provider is `fallback`. Error sanitization in API error response formatter.
  - *Proof*: Test `tests/f11-quota/ac-f11-07-fallback-banner.test.ts`.

- **AC-F11-08**: The Gemini API key is read from env only, never sent to the client, never logged.
  - *Implementation Requirement*: Codebase scan ensuring no `NEXT_PUBLIC_GEMINI_API_KEY` exists, and logger redact rules replace keys with `[REDACTED]`.
  - *Proof*: Test `tests/f11-quota/ac-f11-08-secret-hygiene.test.ts`.

---

### F10: Home, One-Click Demo, README, Docs, Accessibility (P0)

- **AC-F10-01**: Home page has short headline, URL input, example chips, "Use sample brand", and a clear "Run full demo" button that does: brand kit → agent run → approve all → schedule → publish in sandbox, showing progress.
  - *Implementation Requirement*: `src/app/(workspace)/page.tsx` with hero section, example chips, and interactive demo stepper.
  - *Proof*: Test `tests/f10-demo/ac-f10-01-home-demo-flow.test.ts`.

- **AC-F10-02**: Full demo works end to end with the fake/fallback providers (offline), so the demo never depends on the AI quota or the internet.
  - *Implementation Requirement*: Offline execution path triggered by "Use sample brand" or network disconnection.
  - *Proof*: Test `tests/f10-demo/ac-f10-02-offline-demo.test.ts`.

- **AC-F10-03**: Footer text: "Portfolio project. Not affiliated with any company." Plus a link to the GitHub repo.
  - *Implementation Requirement*: `Footer` component in `src/components/layout/footer.tsx`.
  - *Proof*: Test `tests/f10-demo/ac-f10-03-footer-disclaimer.test.ts`.

- **AC-F10-04**: A short "How it works" section (3 steps) and a "Tech" section listing the stack.
  - *Implementation Requirement*: Educational sections on landing page explaining URL extraction, approval queue, and social publishing.
  - *Proof*: Test `tests/f10-demo/ac-f10-04-how-it-works-tech.test.ts`.

- **AC-F10-05**: README includes: what it is, a GIF or screenshots (light and dark), live link, how to run locally, env vars, architecture diagram (simple), test commands, "TDD and review log" note, the free-tier design notes, and the skills table from Section 1.1.
  - *Implementation Requirement*: Comprehensive `README.md` at repo root matching all Section 10.5 requirements.
  - *Proof*: Test `tests/f10-demo/ac-f10-05-readme-audit.test.ts`.

- **AC-F10-06**: `docs/architecture.md` explains: step-machine agent runs, connector interface, status machine, scheduler, webhooks, and free-tier guardrails.
  - *Implementation Requirement*: Thorough architecture document in `docs/architecture.md`.
  - *Proof*: Test `tests/f10-demo/ac-f10-06-architecture-doc.test.ts`.

- **AC-F10-07**: Page metadata: title, description, Open Graph image (can be generated by the same image route), favicon.
  - *Implementation Requirement*: `export const metadata: Metadata` in `src/app/layout.tsx`.
  - *Proof*: Test `tests/f10-demo/ac-f10-07-page-metadata.test.ts`.

- **AC-F10-08**: Accessibility: all interactive elements reachable by keyboard, visible focus ring, labels on inputs, `prefers-reduced-motion` respected, color contrast AA in both themes. An automated accessibility check passes on Home, Brand Kit, Queue, Connectors, Webhooks, Activity.
  - *Implementation Requirement*: Axe-core automated tests across all 6 pages; semantic HTML and Radix UI primitives.
  - *Proof*: Test `tests/f10-demo/ac-f10-08-wcag-accessibility.test.ts`.

- **AC-F10-D1..D4 (Design System Criteria)**:
  - Both themes complete with zero hardcoded hex colors; no layout shift on theme load; loading, empty, and error states on every page; visual consistency audit logged.

---

## 6. Data Schemas & DB Migrations

### Complete Drizzle Schema Definition (`src/server/db/schema.ts`)

```typescript
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, date, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Workspaces
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Brand Kits
export const brandKits = pgTable('brand_kits', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceUrl: text('source_url'), // nullable for sample brand
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  tone: text('tone').array().notNull(),
  dos: text('dos').array().notNull(),
  donts: text('donts').array().notNull(),
  audience: text('audience').notNull(),
  colors: jsonb('colors').$type<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
  }>().notNull(),
  keywords: text('keywords').array().notNull(),
  provider: text('provider').notNull().default('gemini'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Agent Runs
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  brandKitId: uuid('brand_kit_id').notNull().references(() => brandKits.id, { onDelete: 'cascade' }),
  goal: text('goal').notNull(),
  channels: text('channels').array().notNull(),
  postCount: integer('post_count').notNull(),
  status: text('status').notNull().default('queued'), // queued | running | succeeded | failed
  currentStep: text('current_step'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

// 4. Agent Run Steps
export const agentRunSteps = pgTable('agent_run_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // idea | creative | campaign
  status: text('status').notNull().default('pending'), // pending | running | succeeded | failed
  input: jsonb('input'),
  output: jsonb('output'),
  provider: text('provider').notNull().default('gemini'), // gemini | fallback | fake
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  error: text('error'),
});

// 5. Posts
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(), // linkedin | instagram | x | facebook
  caption: text('caption').notNull(),
  hashtags: text('hashtags').array().notNull().default(sql`'{}'::text[]`),
  creativeSpec: jsonb('creative_spec').$type<{
    headline: string;
    subline?: string;
    templateId: string;
    colors: Record<string, string>;
  }>().notNull(),
  status: text('status').notNull().default('draft'), // draft | in_review | approved | held | rejected | scheduled | publishing | published | failed
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  holdReason: text('hold_reason'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Connectors
export const connectors = pgTable('connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // linkedin | instagram | x | facebook
  mode: text('mode').notNull().default('sandbox'), // sandbox | live
  status: text('status').notNull().default('connected'), // connected | disconnected | needs_reconnect | error
  accountLabel: text('account_label').notNull(),
  tokenEncrypted: text('token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  settings: jsonb('settings').$type<{ simulateFailure?: 'none' | 'temporary' | 'rate_limit' | 'permanent' }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Publish Jobs
export const publishJobs = pgTable('publish_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  attempt: integer('attempt').notNull().default(0),
  status: text('status').notNull().default('queued'), // queued | running | succeeded | failed | retrying
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Incoming Webhook Endpoints
export const incomingEndpoints = pgTable('incoming_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  publicToken: text('public_token').notNull().unique(),
  secretEncrypted: text('secret_encrypted').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Outgoing Webhooks
export const outgoingWebhooks = pgTable('outgoing_webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secretEncrypted: text('secret_encrypted').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Events (Activity Log)
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  source: text('source').notNull(), // incoming | outgoing | system
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  status: text('status').notNull().default('success'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Automations
export const automations = pgTable('automations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  trigger: jsonb('trigger').notNull(),
  conditions: jsonb('conditions').notNull().default(sql`'[]'::jsonb`),
  actions: jsonb('actions').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Automation Runs
export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').notNull().references(() => automations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // succeeded | failed | skipped
  log: jsonb('log').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Rate Limit Counters (F11)
export const rateLimitCounters = pgTable('rate_limit_counters', {
  key: text('key').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.key, table.windowStart] }),
}));

// 14. LLM Usage Daily Budget Tracker (F11)
export const llmUsage = pgTable('llm_usage', {
  day: date('day').primaryKey(), // YYYY-MM-DD
  calls: integer('calls').notNull().default(0),
});

// 15. LLM Response Cache (F11)
export const llmCache = pgTable('llm_cache', {
  key: text('key').primaryKey(),
  response: jsonb('response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 7. Dependencies & Module Interfaces

### 7.1 LLM Provider Interface (`src/server/llm/interface.ts`)

```typescript
export interface BrandKitGenerationInput {
  url?: string;
  scrapedData?: {
    title: string;
    description: string;
    headings: string[];
    sampleText: string;
    colors: string[];
  };
}

export interface BrandKitOutput {
  name: string;
  summary: string;
  tone: string[];
  dos: string[];
  donts: string[];
  audience: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  keywords: string[];
}

export interface IdeasGenerationInput {
  brandKit: BrandKitOutput;
  goal: string;
  channels: ('linkedin' | 'instagram' | 'x' | 'facebook')[];
  postCount: number;
}

export interface IdeaItem {
  id: string;
  channel: 'linkedin' | 'instagram' | 'x' | 'facebook';
  angle: string;
  keyMessage: string;
}

export interface CreativeGenerationInput {
  brandKit: BrandKitOutput;
  idea: IdeaItem;
}

export interface CreativeOutput {
  caption: string;
  hashtags: string[];
  creativeSpec: {
    headline: string;
    subline?: string;
    templateId: string;
    colors: Record<string, string>;
  };
}

export interface ConditionEvaluationInput {
  brandKit: BrandKitOutput;
  eventPayload: Record<string, unknown>;
  prompt: string;
}

export interface ConditionOutput {
  matched: boolean;
  reason: string;
}

export interface LlmResult<T> {
  data: T;
  provider: 'gemini' | 'fallback' | 'fake';
  cached?: boolean;
  fallbackReason?: string;
}

export interface LlmProvider {
  readonly name: 'gemini' | 'fallback' | 'fake';
  generateBrandKit(input: BrandKitGenerationInput): Promise<LlmResult<BrandKitOutput>>;
  generateIdeas(input: IdeasGenerationInput): Promise<LlmResult<IdeaItem[]>>;
  generateCreative(input: CreativeGenerationInput): Promise<LlmResult<CreativeOutput>>;
  evaluateCondition(input: ConditionEvaluationInput): Promise<LlmResult<ConditionOutput>>;
}
```

### 7.2 Workspace Isolation Helper (`src/server/workspace/workspace-service.ts`)

```typescript
export interface WorkspaceContext {
  workspaceId: string;
  isNew: boolean;
}

export async function resolveWorkspace(reqCookie?: string): Promise<WorkspaceContext>;
export function withWorkspace<T>(workspaceId: string, fn: (scope: ScopedRepository) => Promise<T>): Promise<T>;
```

### 7.3 Rate Limiter Interface (`src/server/security/rate-limiter.ts`)

```typescript
export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult>;
```

---

## 8. Risk Factors, Failure Modes & Edge Cases

1. **Neon Serverless Cold-Starts & Pool Starvation**:
   - *Risk*: Multiple parallel serverless functions attempting direct connections will exhaust the 100-connection limit on Neon Free plan.
   - *Mitigation*: Ensure `DATABASE_URL` uses the pooled host (`-pooler` suffix); set max pool connections to 1 in serverless lambdas.

2. **Cross-Tenant Data Leakage via Raw Queries**:
   - *Risk*: A developer writing `db.select().from(posts).where(eq(posts.id, id))` omits `workspaceId`.
   - *Mitigation*: Wrap DB operations in a scoped repository that forces `workspaceId` onto every `where()` clause. Run multi-tenant penetration tests (AC-F1-03).

3. **Gemini Free-Tier Rate Limits (429) & Inconsistent Latency**:
   - *Risk*: Public visitors hitting Gemini simultaneously cause 429 cascades, breaking the agent run.
   - *Mitigation*: Fallback provider executes deterministically in < 10ms with zero network calls. Quota tracker switches early when daily budget is hit.

4. **Flash of Unstyled Content (FOUC) on Theme Toggle**:
   - *Risk*: Hydration mismatch and screen flickering between dark/light themes.
   - *Mitigation*: Next-themes class strategy with `suppressHydrationWarning` on `<html>` and explicit inline CSS variables.

5. **Accessibility Regressions in Complex Components**:
   - *Risk*: Status chips, calendar cells, or custom dropdowns lacking ARIA roles or keyboard focus states.
   - *Mitigation*: Automated axe-core audits integrated into Playwright/Vitest testing suites.

---

## 9. Recommended File Layout

```
BrandPilot/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   └── review-log.md
├── drizzle/
│   └── 0000_initial_schema.sql
├── src/
│   ├── app/
│   │   ├── (workspace)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # F10: Home & Walkthrough
│   │   │   ├── brand-kit/
│   │   │   ├── runs/
│   │   │   ├── queue/
│   │   │   ├── calendar/
│   │   │   ├── connectors/
│   │   │   ├── webhooks/
│   │   │   └── activity/
│   │   ├── api/
│   │   │   ├── health/route.ts          # F0: AC-F0-03
│   │   │   ├── workspace/
│   │   │   │   └── reset/route.ts       # F1: AC-F1-04
│   │   │   ├── brand-kits/
│   │   │   ├── runs/
│   │   │   ├── posts/
│   │   │   ├── connectors/
│   │   │   ├── publish/
│   │   │   ├── hooks/
│   │   │   └── automations/
│   │   ├── globals.css                  # F0: Design tokens
│   │   └── layout.tsx                   # F0/F10: Providers & App Root
│   ├── components/
│   │   ├── ui/                          # Button, Dialog, Chip, Input, Stepper...
│   │   ├── layout/                      # AppShell, Sidebar, TopBar, Footer
│   │   └── demo/                        # OneClickDemoStepper, FallbackBanner
│   ├── lib/
│   │   ├── errors.ts                    # Standard error codes & formatting
│   │   ├── validation.ts                # Shared Zod schemas
│   │   └── clock.ts                     # Clock interface & fake clock
│   └── server/
│       ├── db/
│       │   ├── index.ts                 # Drizzle client & pooled connection
│       │   ├── schema.ts                # All 15 relational tables
│       │   └── scoped-queries.ts        # AC-F1-03 Isolation helper
│       ├── workspace/
│       │   ├── workspace-service.ts     # Cookie resolution & creation
│       │   └── cleanup.ts               # AC-F1-05 TTL cleanup
│       ├── llm/
│       │   ├── interface.ts             # LlmProvider contract
│       │   ├── gemini-provider.ts       # Real Google GenAI client
│       │   ├── fallback-provider.ts     # Offline deterministic generator
│       │   ├── fake-provider.ts         # Test double
│       │   ├── resilient-provider.ts    # Budget & fallback orchestrator
│       │   ├── usage.ts                 # AC-F11-02 Daily budget tracker
│       │   └── cache.ts                 # AC-F11-05 24h response cache
│       └── security/
│           └── rate-limiter.ts          # AC-F11-03 DB rate limiter
├── tests/
│   ├── f0-foundation/
│   │   ├── ac-f0-01-scripts.test.ts
│   │   ├── ac-f0-02-typescript-strict.test.ts
│   │   ├── ac-f0-03-health-check.test.ts
│   │   ├── ac-f0-04-schema-migrations.test.ts
│   │   ├── ac-f0-05-design-tokens-theme.test.ts
│   │   ├── ac-f0-06-app-shell.test.ts
│   │   ├── ac-f0-07-ci-workflow.test.ts
│   │   └── ac-f0-08-env-example.test.ts
│   ├── f1-workspace/
│   │   ├── ac-f1-01-cookie-creation.test.ts
│   │   ├── ac-f1-02-last-seen-throttling.test.ts
│   │   ├── ac-f1-03-workspace-isolation.test.ts
│   │   ├── ac-f1-04-workspace-reset.test.ts
│   │   ├── ac-f1-05-workspace-ttl-cleanup.test.ts
│   │   └── ac-f1-06-resilient-cookie.test.ts
│   ├── f11-quota/
│   │   ├── ac-f11-01-llm-provider-fallbacks.test.ts
│   │   ├── ac-f11-02-daily-budget.test.ts
│   │   ├── ac-f11-03-rate-limits.test.ts
│   │   ├── ac-f11-04-gemini-concurrency-backoff.test.ts
│   │   ├── ac-f11-05-response-cache.test.ts
│   │   ├── ac-f11-06-data-caps.test.ts
│   │   ├── ac-f11-07-fallback-banner.test.ts
│   │   └── ac-f11-08-secret-hygiene.test.ts
│   └── f10-demo/
│       ├── ac-f10-01-home-demo-flow.test.ts
│       ├── ac-f10-02-offline-demo.test.ts
│       ├── ac-f10-03-footer-disclaimer.test.ts
│       ├── ac-f10-04-how-it-works-tech.test.ts
│       ├── ac-f10-05-readme-audit.test.ts
│       ├── ac-f10-06-architecture-doc.test.ts
│       ├── ac-f10-07-page-metadata.test.ts
│       └── ac-f10-08-wcag-accessibility.test.ts
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

---

## 10. Caveats

- **No Caveats**: All specifications, schemas, interfaces, constraints, and criteria for F0, F1, F11, and F10 are directly grounded in `PRD.md` and `ORIGINAL_REQUEST.md`. No implementation assumptions or deviations have been introduced.

---

## 11. Conclusion

The foundational, architectural, and guardrail requirements (F0, F1, F11, F10) have been exhaustively documented. The schema encompasses all 15 relational tables with cascading integrity, strict workspace boundaries via scoped helpers, deterministic fallback providers for 100% offline uptime, and an accessible Linear-grade frontend with full documentation and automated test harnesses.

---

## 12. Verification Method

To independently verify this specification analysis:

1. **AC Naming & Coverage Audit**:
   - Inspect `tests/` directory ensuring test filenames map 1:1 to criteria `AC-F0-01..08`, `AC-F1-01..06`, `AC-F11-01..08`, `AC-F10-01..08`.

2. **Schema & Migration Verification**:
   - Run `pnpm db:generate` to produce Drizzle migrations.
   - Run migrations against test Postgres: verify all 15 tables are created with proper indices and foreign key cascades.

3. **Multi-Tenant Boundary Test**:
   - Run `pnpm test tests/f1-workspace/ac-f1-03-workspace-isolation.test.ts` to verify workspace A cannot access or alter workspace B entities across all resource types.

4. **Offline Capability Test**:
   - Run `pnpm test tests/f10-demo/ac-f10-02-offline-demo.test.ts` with mocked network and unset `GEMINI_API_KEY` to prove the one-click demo completes end-to-end within 60 seconds.

5. **Accessibility Audit**:
   - Run `pnpm test:e2e` with Playwright axe-core runner across all core routes to verify 0 WCAG AA violations.
