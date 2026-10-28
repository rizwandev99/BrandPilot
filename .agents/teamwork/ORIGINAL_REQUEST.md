# Original User Request

## Initial Request — 2026-10-27T07:13:48Z

Use a very large team of agents — invoke as much as possible, multiple parallel subagents to complete it quickly.

Build PostPilot (BrandPilot), a complete AI marketing agent platform for social media that converts website URLs into structured brand kits, generates multi-channel posts and branded image cards, routes posts through a strict human-in-the-loop approval queue, schedules and publishes posts via sandbox and live connectors, and supports incoming/outgoing webhooks and automation rules.

Working directory: C:\Users\rizwan\Desktop\projects\BrandPilot
Integrity mode: development
Reference material: C:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md

## Requirements

### R1. Foundation & Full-Stack Architecture (F0, F1)
Scaffold a production-grade Next.js App Router project in TypeScript (strict mode) with Tailwind CSS, CSS variable design tokens (light and dark mode with no flash), Radix/shadcn-style UI primitives, Inter font, Drizzle ORM with Neon Postgres schemas and migrations, and anonymous workspace cookie isolation (no login required, 7-day TTL cleanup, workspace data boundary helper).

### R2. Brand Kit & Content Agent Pipeline (F2, F3, F11)
Implement URL web scraper with strict SSRF protection (rejecting private/loopback/link-local/metadata IPs and checking on redirects), cheerio extraction, and LLM structured brand kit generation with Zod validation, fallback offline generator, color contrast auto-adjustment (WCAG AA), and 24h LLM caching. Build a 3-step agent run state machine (`idea` -> `creative` -> `campaign`) storing step logs and provider in database, supporting idempotent step execution, channel constraint enforcement, banned word filtering, and SVG->PNG branded image card rendering with at least 3 templates.

### R3. Connector Framework & Social Publishing (F4, F6, F7)
Build an extensible `Connector` provider interface with sandbox adapters for Instagram, X, Facebook, and LinkedIn (with configurable failure simulation for testing retries) and an optional live LinkedIn OAuth adapter (`w_member_social`, AES-GCM token encryption). Implement an idempotent scheduler (`schedule-approved` & `run-due`) with concurrency locks, exponential backoff with jitter retry policy for `TEMPORARY`/`RATE_LIMITED` errors, and a Connectors management UI.

### R4. Approval Queue & Content Calendar (F5)
Deliver a Linear-grade approval queue enforcing a strict status machine (`draft` -> `in_review` -> `approved` | `held` | `rejected`; `approved` -> `scheduled` -> `publishing` -> `published`), requiring human approval before publishing. Include live character counter, channel limit warnings, optimistic UI updates, bulk approval/scheduling, calendar grid view, and keyboard navigation (`A` approve, `H` hold, `E` edit, `?` shortcuts).

### R5. Webhooks & Rule Automation Engine (F8, F9)
Provide HMAC-SHA256 verified incoming webhook endpoints with timestamp replay protection, raw body hashing, and secret rotation. Implement an event log Activity feed and signed outgoing webhooks with backoff delivery. Build a pure trigger-condition-action automation engine (`webhook.received`, `post.*` triggers; path comparison and AI/keyword brand checks; draft creation and status actions) with execution depth limit (loop protection) and dry-run test mode.

### R6. One-Click Demo, Quotas & Guardrails (F10, F11)
Implement the Home page with one-click full demo walkthrough capable of running 100% offline via fallback providers. Add daily global Gemini call budget tracking (`llm_usage`), workspace rate limits (`rate_limit_counters`), resource caps (max 60 posts, 5 brand kits, 10 automations), responsive phone-friendly navigation, WCAG AA accessibility compliance across all pages, and complete documentation (`docs/review-log.md`, `docs/decisions.md`, `docs/architecture.md`, and `README.md`).

## Acceptance Criteria

### Verification & Testing Suite
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` scripts execute and pass with 0 errors.
- [ ] Every acceptance criterion from Section 9 (AC-F0-01 through AC-F11-08) has dedicated automated tests containing the AC ID in the test name.
- [ ] Contract tests run against all connector adapters; status machine, retry policy, and automation rule engine are verified with pure unit test tables.
- [ ] `docs/review-log.md` is populated for each milestone following the PRD review gate template with "Open items: none".

### Golden Path & Functional Workflows
- [ ] Anonymous workspace cookie is created on first hit and isolates all DB queries across workspaces.
- [ ] SSRF guard blocks all loopback, private, link-local, and metadata requests with `SSRF_BLOCKED`.
- [ ] URL brand kit extraction works with Gemini and gracefully falls back to deterministic offline generator on quota limit or missing key.
- [ ] Agent step execution (`idea` -> `creative` -> `campaign`) runs idempotently and creates posts in `in_review`.
- [ ] Branded image cards generate valid PNGs at `/api/creatives/:postId.png` across 3+ templates without external AI image services.
- [ ] Post status transitions strictly enforce human approval prior to scheduling/publishing.
- [ ] Scheduler `run-due` safely locks and executes publish jobs without duplicate delivery under concurrent calls.
- [ ] Incoming webhooks verify HMAC-SHA256 signatures over raw body within 5-minute freshness window.
- [ ] Automation engine triggers on incoming webhook or post events, evaluates conditions, and safely executes actions without recursion loops.
- [ ] One-click demo runs end-to-end in under 3 minutes even without external internet or AI API keys.

## Follow-up — 2026-10-27T07:26:37Z

Use a very large team of agents — invoke as much as possible, multiple parallel subagents to complete it quickly.

Build PostPilot (BrandPilot), a complete AI marketing agent platform for social media that converts website URLs into structured brand kits, generates multi-channel posts and branded image cards, routes posts through a strict human-in-the-loop approval queue, schedules and publishes posts via sandbox and live connectors, and supports incoming/outgoing webhooks and automation rules.

Working directory: C:\Users\rizwan\Desktop\projects\BrandPilot
Integrity mode: development
Reference material: C:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md

Note on prior progress: Phase 0 specification mining has already been completed by 3 spec miners in `.agents/teamwork/teamwork_preview_spec_miner_1/handoff.md`, `_2/handoff.md`, and `_3/handoff.md`. The orchestrator can directly ingest these completed specifications to jumpstart Phase 1 (PROJECT.md and TEST_INFRA.md) and Phase 2 (dispatching sub-orchestrators for milestones F0-F11).

## Requirements

### R1. Foundation & Full-Stack Architecture (F0, F1)
Scaffold a production-grade Next.js App Router project in TypeScript (strict mode) with Tailwind CSS, CSS variable design tokens (light and dark mode with no flash), Radix/shadcn-style UI primitives, Inter font, Drizzle ORM with Neon Postgres schemas and migrations, and anonymous workspace cookie isolation (no login required, 7-day TTL cleanup, workspace data boundary helper).

### R2. Brand Kit & Content Agent Pipeline (F2, F3, F11)
Implement URL web scraper with strict SSRF protection (rejecting private/loopback/link-local/metadata IPs and checking on redirects), cheerio extraction, and LLM structured brand kit generation with Zod validation, fallback offline generator, color contrast auto-adjustment (WCAG AA), and 24h LLM caching. Build a 3-step agent run state machine (`idea` -> `creative` -> `campaign`) storing step logs and provider in database, supporting idempotent step execution, channel constraint enforcement, banned word filtering, and SVG->PNG branded image card rendering with at least 3 templates.

### R3. Connector Framework & Social Publishing (F4, F6, F7)
Build an extensible `Connector` provider interface with sandbox adapters for Instagram, X, Facebook, and LinkedIn (with configurable failure simulation for testing retries) and an optional live LinkedIn OAuth adapter (`w_member_social`, AES-GCM token encryption). Implement an idempotent scheduler (`schedule-approved` & `run-due`) with concurrency locks, exponential backoff with jitter retry policy for `TEMPORARY`/`RATE_LIMITED` errors, and a Connectors management UI.

### R4. Approval Queue & Content Calendar (F5)
Deliver a Linear-grade approval queue enforcing a strict status machine (`draft` -> `in_review` -> `approved` | `held` | `rejected`; `approved` -> `scheduled` -> `publishing` -> `published`), requiring human approval before publishing. Include live character counter, channel limit warnings, optimistic UI updates, bulk approval/scheduling, calendar grid view, and keyboard navigation (`A` approve, `H` hold, `E` edit, `?` shortcuts).

### R5. Webhooks & Rule Automation Engine (F8, F9)
Provide HMAC-SHA256 verified incoming webhook endpoints with timestamp replay protection, raw body hashing, and secret rotation. Implement an event log Activity feed and signed outgoing webhooks with backoff delivery. Build a pure trigger-condition-action automation engine (`webhook.received`, `post.*` triggers; path comparison and AI/keyword brand checks; draft creation and status actions) with execution depth limit (loop protection) and dry-run test mode.

### R6. One-Click Demo, Quotas & Guardrails (F10, F11)
Implement the Home page with one-click full demo walkthrough capable of running 100% offline via fallback providers. Add daily global Gemini call budget tracking (`llm_usage`), workspace rate limits (`rate_limit_counters`), resource caps (max 60 posts, 5 brand kits, 10 automations), responsive phone-friendly navigation, WCAG AA accessibility compliance across all pages, and complete documentation (`docs/review-log.md`, `docs/decisions.md`, `docs/architecture.md`, and `README.md`).

## Acceptance Criteria

### Verification & Testing Suite
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e` scripts execute and pass with 0 errors.
- [ ] Every acceptance criterion from Section 9 (AC-F0-01 through AC-F11-08) has dedicated automated tests containing the AC ID in the test name.
- [ ] Contract tests run against all connector adapters; status machine, retry policy, and automation rule engine are verified with pure unit test tables.
- [ ] `docs/review-log.md` is populated for each milestone following the PRD review gate template with "Open items: none".

### Golden Path & Functional Workflows
- [ ] Anonymous workspace cookie is created on first hit and isolates all DB queries across workspaces.
- [ ] SSRF guard blocks all loopback, private, link-local, and metadata requests with `SSRF_BLOCKED`.
- [ ] URL brand kit extraction works with Gemini and gracefully falls back to deterministic offline generator on quota limit or missing key.
- [ ] Agent step execution (`idea` -> `creative` -> `campaign`) runs idempotently and creates posts in `in_review`.
- [ ] Branded image cards generate valid PNGs at `/api/creatives/:postId.png` across 3+ templates without external AI image services.
- [ ] Post status transitions strictly enforce human approval prior to scheduling/publishing.
- [ ] Scheduler `run-due` safely locks and executes publish jobs without duplicate delivery under concurrent calls.
- [ ] Incoming webhooks verify HMAC-SHA256 signatures over raw body within 5-minute freshness window.
- [ ] Automation engine triggers on incoming webhook or post events, evaluates conditions, and safely executes actions without recursion loops.
- [ ] One-click demo runs end-to-end in under 3 minutes even without external internet or AI API keys.


## Follow-up — 2026-10-28T04:41:50Z

Implement and run a comprehensive browser-level Playwright end-to-end testing suite for BrandPilot, verifying interactive user journeys across the application.

Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale
Integrity mode: development

## Requirements

### R1. Playwright Test Runner & Environment Setup
Ensure Playwright browser binaries (e.g., Chromium) and test configurations are fully set up so that running `pnpm test:e2e` spins up or connects to the local Next.js server (`http://localhost:3000`) and executes all spec files headlessly with clean exit codes and no lingering processes.

### R2. Interactive Golden Path & Feature User Journeys
Write interactive Playwright test specs (`tests/e2e/*.spec.ts`) that test the UI like a real user:
1. **Home / Demo Flow (`/`):** Click the "Try Instant Sample Demo" button, verify brand kit generation, navigate through the demo stepper, and check navigation to workspace sections.
2. **Brand Kit Management (`/brand-kit`):** Verify brand kit display, color palette contrast badges, and form interactions.
3. **Content Pipeline (`/runs`):** Verify initiating a run, viewing the 3-step progress visualizer (`idea` -> `creative` -> `campaign`), and inspecting generated posts and creatives.
4. **Approval Queue & State Machine (`/queue`):** Test clicking post status transitions (Approve, Hold with reason modal, Reject), verifying live character counters, and testing keyboard navigation shortcuts (`A`, `H`, `E`, `?`).
5. **Content Calendar (`/calendar`):** Test switching months, verifying post status cards on calendar cells, and clicking into post details.
6. **Connectors & Webhooks (`/connectors`, `/webhooks`):** Test failure simulator modals, copy-to-clipboard actions, and secret rotation modals.

### R3. Responsive AppShell & UI Guardrails
Verify UI accessibility and responsiveness:
1. Test desktop sidebar expansion/collapse and mobile navigation drawer.
2. Test theme switcher (light/dark mode toggle without flashing or broken CSS classes).
3. Verify that interactive actions trigger appropriate feedback (toasts, loading spinners, state changes).

## Acceptance Criteria

### Automated E2E Verification
- [ ] `pnpm test:e2e` completes with 100% of specs passing and 0 failures.
- [ ] Test suite covers interactive workflows for Home, Brand Kit, Agent Runs, Queue, Calendar, and Connectors.
- [ ] Playwright properly executes in headless mode on Windows with reliable teardown.
- [ ] TypeScript check (`pnpm typecheck`) and ESLint (`pnpm lint`) continue to pass with 0 errors across all test files.
