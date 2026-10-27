# Project: BrandPilot (PostPilot)

## Architecture
BrandPilot is a multi-channel AI marketing platform built on Next.js App Router (TypeScript strict mode), Tailwind CSS with CSS variable design tokens, Radix UI primitives, and Neon Postgres managed via Drizzle ORM.
The architecture enforces strict separation of concerns across 12 feature modules (F0–F11):

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 Web UI                                    │
│  Home / Demo (F10) │ Brand Kit (F2) │ Agent (F3) │ Queue & Calendar (F5)  │
│  Connectors UI (F7) │ Webhooks (F8) │ Automations (F9) │ Activity Log (F8)│
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                       Anonymous Workspace Layer (F1)                      │
│     Cookie-based UUID v4 session │ Scoped Database Query Boundary         │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│          Core Business Engine       │        Integration & Events         │
│  • Brand Kit Extraction & SSRF (F2) │  • Connector Framework & OAuth (F4) │
│  • 3-Step Content Pipeline (F3)     │  • Idempotent Concurrency Scheduler │
│  • Resvg Branded Card Engine (F3)   │    with Exponential Backoff (F6)    │
│  • Strict Status State Machine (F5) │  • HMAC-SHA256 Webhooks (F8)        │
│  • Rule Automation Engine (F9)      │  • Event Activity Feed (F8)         │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                    Reliability & Infrastructure Guardrails                │
│  • Resilient LlmProvider (Gemini -> Fallback -> Fake) (F11)               │
│  • Daily Budget (llm_usage) & Postgres Rate Limiter (rate_limit_counters) │
│  • 24h Response Cache (llm_cache) & Resource Caps (F11)                   │
│  • Drizzle ORM Relational Schema (15 Tables) on Neon Postgres (F0)        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Inventory

Every feature discovered during specification mining across F0–F11 is listed below with its assigned milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | App Router Scaffold & Scripts | Strict TS App Router setup with lint, typecheck, test, test:e2e | M0 (F0) | Spec Miner 1 §3 #1, AC-F0-01 |
| 2 | Strict Type Safety | TypeScript strict mode, zero uncommented `any` | M0 (F0) | Spec Miner 1 §3 #2, AC-F0-02 |
| 3 | Health Check API | `GET /api/health` verifying DB connectivity | M0 (F0) | Spec Miner 1 §3 #3, AC-F0-03 |
| 4 | Drizzle Relational Schema | 15 relational tables with indices and migrations | M0 (F0) | Spec Miner 1 §3 #4, AC-F0-04 |
| 5 | Design Tokens & Theme Toggle | CSS variables for light/dark theme, system preference | M0 (F0) | Spec Miner 1 §3 #5, AC-F0-05 |
| 6 | Responsive App Shell | Collapsible sidebar, topbar, mobile layout | M0 (F0) | Spec Miner 1 §3 #6, AC-F0-06 |
| 7 | CI Workflow | GitHub Actions CI for lint, typecheck, test | M0 (F0) | Spec Miner 1 §3 #7, AC-F0-07 |
| 8 | Environment Manifest | Complete `.env.example` with all 12 env vars | M0 (F0) | Spec Miner 1 §3 #8, AC-F0-08 |
| 9 | Anonymous Cookie Creation | UUID v4 in HttpOnly, secure, SameSite=lax cookie | M1 (F1) | Spec Miner 1 §3 #9, AC-F1-01 |
| 10 | Throttled `last_seen_at` | Workspace timestamp update throttled to 5 minutes | M1 (F1) | Spec Miner 1 §3 #10, AC-F1-02 |
| 11 | Query Isolation Helper | Scoped DB repository enforcing `workspace_id` boundary | M1 (F1) | Spec Miner 1 §3 #11, AC-F1-03 |
| 12 | Workspace Reset API | `POST /api/workspace/reset` cascading deletion & re-seed | M1 (F1) | Spec Miner 1 §3 #12, AC-F1-04 |
| 13 | Workspace TTL Cleanup | 7-day inactive workspace cleanup cron function | M1 (F1) | Spec Miner 1 §3 #13, AC-F1-05 |
| 14 | Cookie Recovery | Resilient recovery on corrupt or missing cookie | M1 (F1) | Spec Miner 1 §3 #14, AC-F1-06 |
| 15 | LlmProvider Architecture | Resilient wrapper: Gemini -> Fallback -> Fake | M2 (F11) | Spec Miner 1 §3 #15, AC-F11-01 |
| 16 | Daily Global Budget Tracker | Atomic daily call tracking via `llm_usage` | M2 (F11) | Spec Miner 1 §3 #16, AC-F11-02 |
| 17 | DB Rate Limit Counters | Sliding/fixed window limits in `rate_limit_counters` | M2 (F11) | Spec Miner 1 §3 #17, AC-F11-03 |
| 18 | Gemini Concurrency & Backoff | Serialized calls, exponential backoff on 429 | M2 (F11) | Spec Miner 1 §3 #18, AC-F11-04 |
| 19 | Response Cache | 24-hour cache in `llm_cache` by SHA-256 prompt hash | M2 (F11) | Spec Miner 1 §3 #19, AC-F11-05 |
| 20 | Resource Caps & Event Pruning | Max 60 posts, 5 kits, 10 rules, auto-prune 200 events | M2 (F11) | Spec Miner 1 §3 #20, AC-F11-06 |
| 21 | UI Fallback Banner | Calm indicator when fallback provider active | M2 (F11) | Spec Miner 1 §3 #22, AC-F11-07 |
| 22 | Secrets Leak Prevention | Server-only env handling, no client leaks | M2 (F11) | Spec Miner 1 §3 #23, AC-F11-08 |
| 23 | SSRF Guard & DNS Resolver | Strict IP blocklist (private, loopback, metadata) & 3 redirects | M3 (F2) | Spec Miner 2 §3 #1, AC-F2-02 |
| 24 | Cheerio Facts Extractor | Scrapes title, description, headings, samples, colors | M3 (F2) | Spec Miner 2 §3 #2, AC-F2-01 |
| 25 | Structured Brand Kit LLM | Zod-validated prompt generation with repair retry | M3 (F2) | Spec Miner 2 §3 #3, AC-F2-04 |
| 26 | Offline Fallback Brand Kit | Deterministic brand kit builder using cheerio facts | M3 (F2) | Spec Miner 2 §3 #4, AC-F2-04 |
| 27 | WCAG AA Contrast Auto-Adjust | Color validator auto-adjusting luminance to >= 4.5:1 | M3 (F2) | Spec Miner 2 §3 #5, AC-F2-05 |
| 28 | Built-in Sample Brand Kit | Instant `{ sample: true }` kit without network calls | M3 (F2) | Spec Miner 2 §3 #6, AC-F2-06 |
| 29 | 24-Hour Brand Kit Cache | Caching brand kits in `llm_cache` by URL hash | M3 (F2) | Spec Miner 2 §3 #7, AC-F2-07 |
| 30 | Brand Kit Edit & UI Form | Form with inline validation, `PATCH /api/brand-kits/:id` | M3 (F2) | Spec Miner 2 §3 #8, AC-F2-08, 09 |
| 31 | Connector Interface & Registry | Unified interface with capability querying & registry | M4 (F4) | Spec Miner 3 §3 #1, AC-F4-01 |
| 32 | Shared Contract Test Suite | Reusable contract tests verifying all adapters | M4 (F4) | Spec Miner 3 §3 #2, AC-F4-02 |
| 33 | Sandbox Adapters & Simulation | Adapters for LI, IG, X, FB with configurable error injection | M4 (F4) | Spec Miner 3 §3 #3, AC-F4-03 |
| 34 | Connector Connection Lifecycle | Connect and disconnect endpoints updating DB state | M4 (F4) | Spec Miner 3 §3 #4, AC-F4-04 |
| 35 | Live LinkedIn OAuth Adapter | LinkedIn Posts API (`w_member_social`) personal profiles | M4 (F4) | Spec Miner 3 §3 #5, AC-F4-05 |
| 36 | OAuth State & AES-GCM Tokens | Secure state cookie and AES-256-GCM token encryption | M4 (F4) | Spec Miner 3 §3 #6, AC-F4-06 |
| 37 | Live Safety Flag & Confirm | `ENABLE_LIVE_LINKEDIN` guard & explicit UI confirmation | M4 (F4) | Spec Miner 3 §3 #7, AC-F4-07, 08 |
| 38 | Extensible Adapter Pattern | Pluggable architecture for zero-core-change new adapters | M4 (F4) | Spec Miner 3 §3 #9, AC-F4-09 |
| 39 | 3-Step Run State Machine | `idea` -> `creative` -> `campaign` execution pipeline | M5 (F3) | Spec Miner 2 §3 #9, AC-F3-01 |
| 40 | Step Logging & Idempotency | Persists inputs, outputs, provider; idempotent execution | M5 (F3) | Spec Miner 2 §3 #10, AC-F3-02, 03 |
| 41 | Channel Limit Enforcement | Character and hashtag rules per channel (LI, X, IG, FB) | M5 (F3) | Spec Miner 2 §3 #11, AC-F3-04 |
| 42 | Banned Word Filtering | Scans and strips brand kit `donts` from copy | M5 (F3) | Spec Miner 2 §3 #12, AC-F3-05 |
| 43 | Schedule Spacing Algorithm | Distributes posts over 7 days, >= 2h apart per channel | M5 (F3) | Spec Miner 2 §3 #13, AC-F3-09 |
| 44 | Resvg Branded Card Engine | Server route `/api/creatives/:postId.png` rendering PNGs | M5 (F3) | Spec Miner 2 §3 #14, AC-F3-06 |
| 45 | Multi-Template Creatives | 3+ distinct templates (quote, feature, tip) | M5 (F3) | Spec Miner 2 §3 #15, AC-F3-07 |
| 46 | Step Error Retry | Failed step updates run; "Retry step" re-runs failed step | M5 (F3) | Spec Miner 2 §3 #16, AC-F3-10, 11 |
| 47 | Strict Status State Machine | Pure function validating post status transitions | M6 (F5) | Spec Miner 2 §3 #17, AC-F5-03 |
| 48 | Human Approval Gate | Mandatory human approval before scheduling or publishing | M6 (F5) | Spec Miner 2 §3 #18, AC-F5-02 |
| 49 | Post Transition Actions | Approve, hold (with reason), reject, edit actions | M6 (F5) | Spec Miner 2 §3 #19, AC-F5-02 |
| 50 | Version Bump & Review Reset | Edit increments version; approved posts reset to `in_review` | M6 (F5) | Spec Miner 2 §3 #20, AC-F5-04 |
| 51 | Live Character Counter | Live counter with warning thresholds; disables save on overflow | M6 (F5) | Spec Miner 2 §3 #21, AC-F5-05 |
| 52 | Bulk Approval & Scheduling | "Approve all in review" and "Schedule approved" actions | M6 (F5) | Spec Miner 2 §3 #22, AC-F5-06 |
| 53 | Calendar Month Grid View | Month view with status color-coding and local time mapping | M6 (F5) | Spec Miner 2 §3 #23, AC-F5-07 |
| 54 | Queue Keyboard Shortcuts | `ArrowUp/Down`, `A`, `H`, `E`, `?` keyboard navigation | M6 (F5) | Spec Miner 2 §3 #24, AC-F5-08 |
| 55 | Optimistic UI & Rollback | UI immediately transitions state and rolls back on failure | M6 (F5) | Spec Miner 2 §3 #25, AC-F5-10 |
| 56 | Schedule Approved Endpoint | Batch transition of approved posts into `publish_jobs` | M7 (F6) | Spec Miner 3 §3 #10, AC-F6-01, 02 |
| 57 | Run Due Jobs Runner | Batch processor selecting and executing due publish jobs | M7 (F6) | Spec Miner 3 §3 #11, AC-F6-03 |
| 58 | Concurrency Locking | `FOR UPDATE SKIP LOCKED` prevents duplicate job processing | M7 (F6) | Spec Miner 3 §3 #12, AC-F6-03 |
| 59 | Pure Exponential Backoff | Backoff with jitter and retry-after header respect | M7 (F6) | Spec Miner 3 §3 #13, AC-F6-04 |
| 60 | Status & Event Emission | Updates post status and writes `post.published`/`failed` | M7 (F6) | Spec Miner 3 §3 #14, AC-F6-05 |
| 61 | Idempotency Key Handling | Key `${postId}:${version}:${provider}` prevents double post | M7 (F6) | Spec Miner 3 §3 #15, AC-F6-06 |
| 62 | "Publish Now" Action | Immediate scheduling and execution for single post | M7 (F6) | Spec Miner 3 §3 #16, AC-F6-07 |
| 63 | Cron Route & Maintenance | `POST /api/publish/run-due` with `CRON_SECRET` & TTL cleanup | M7 (F6) | Spec Miner 3 §3 #17, AC-F6-08 |
| 64 | Failed Post Retry Action | Moves post from `failed` back to `scheduled` | M7 (F6) | Spec Miner 3 §3 #18, AC-F6-09 |
| 65 | Incoming Webhook Endpoint | Public webhook receiver verifying HMAC signature & timestamp | M8 (F8) | Spec Miner 3 §3 #19, AC-F8-01 |
| 66 | Raw Body Timing-Safe HMAC | Verification over raw Buffer via `crypto.timingSafeEqual` | M8 (F8) | Spec Miner 3 §3 #20, AC-F8-02 |
| 67 | Payload Zod Validation | Strict payload schema and 1MB size cap | M8 (F8) | Spec Miner 3 §3 #21, AC-F8-03 |
| 68 | Inbound Deduplication | Deduplicates events by `payload.event_id` | M8 (F8) | Spec Miner 3 §3 #22, AC-F8-04 |
| 69 | Outgoing Webhooks & SSRF | Outgoing dispatcher with SSRF guard and signed payload | M8 (F8) | Spec Miner 3 §3 #23, AC-F8-05, 06 |
| 70 | Outgoing Backoff Retry | Max 3 attempts with exponential backoff for outgoing hooks | M8 (F8) | Spec Miner 3 §3 #24, AC-F8-06 |
| 71 | Built-in Sandbox Receiver | `/api/sandbox/receiver/:token` for zero-dependency testing | M8 (F8) | Spec Miner 3 §3 #25, AC-F8-05 |
| 72 | Webhook Management UI | UI for endpoints, secret display, copyable curl | M8 (F8) | Spec Miner 3 §3 #26, AC-F8-07 |
| 73 | Secret Rotation | Instant rotation of incoming endpoint HMAC secret | M8 (F8) | Spec Miner 3 §3 #27, AC-F8-09 |
| 74 | Activity Feed & Event Log | Event list with filters, pagination, secret redaction | M8 (F8) | Spec Miner 3 §3 #28, AC-F8-08 |
| 75 | Pure Automation Engine | Pure function evaluating triggers and conditions | M9 (F9) | Spec Miner 3 §3 #29, AC-F9-01 |
| 76 | Compound Path Conditions | Dot-notation nested resolution with typed operators | M9 (F9) | Spec Miner 3 §3 #30, AC-F9-01 |
| 77 | AI On-Brand Condition | Semantic verification with fallback to `donts` keywords | M9 (F9) | Spec Miner 3 §3 #31, AC-F9-01, 08 |
| 78 | Action Execution & Step Logs | Sequential action execution with audit traces in DB | M9 (F9) | Spec Miner 3 §3 #32, AC-F9-02 |
| 79 | Recursion Loop Protection | Depth tracking aborting cascades at depth >= 3 | M9 (F9) | Spec Miner 3 §3 #33, AC-F9-03 |
| 80 | Action Status Machine Check | Post status actions strictly obey state machine rules | M9 (F9) | Spec Miner 3 §3 #34, AC-F9-04 |
| 81 | Create AI Draft Action | Action creating post draft in `in_review` | M9 (F9) | Spec Miner 3 §3 #35, AC-F9-07, 08 |
| 82 | Dry-Run Simulation Mode | `POST /api/automations/:id/test` dry run without side effects | M9 (F9) | Spec Miner 3 §3 #36, AC-F9-06 |
| 83 | Automation Quota Cap | Max 10 automations per workspace enforcement | M9 (F9) | Spec Miner 3 §3 #37, AC-F9-09 |
| 84 | Provider Cards UI | Cards for 4 providers with text badges (`[LI]`, etc.) | M10 (F7) | Spec Miner 2 §3 #26, AC-F7-01 |
| 85 | Connector Health Check UI | "Run health check" button querying latency and status | M10 (F7) | Spec Miner 2 §3 #27, AC-F7-02 |
| 86 | Failure Simulator UI | Advanced section to inject temporary, rate limit, perm errors | M10 (F7) | Spec Miner 2 §3 #28, AC-F7-03 |
| 87 | Reconnect Alert Banner | Clear banner when connector enters `needs_reconnect` | M10 (F7) | Spec Miner 2 §3 #29, AC-F7-04 |
| 88 | Default Workspace Seeding | Auto-seeds 4 connected sandbox connectors on workspace init | M10 (F7) | Spec Miner 2 §3 #30, AC-F7-05 |
| 89 | Home Hero & URL Input | Landing page with URL input, example chips, sample button | M11 (F10) | Spec Miner 1 §3 #24, AC-F10-01 |
| 90 | One-Click Demo Stepper | Stepper showing brand -> agent -> queue -> publish | M11 (F10) | Spec Miner 1 §3 #25, AC-F10-01 |
| 91 | 100% Offline Demo Guarantee | Complete walkthrough works with sample brand & zero net | M11 (F10) | Spec Miner 1 §3 #26, AC-F10-02 |
| 92 | Footer Portfolio Disclaimer | Mandatory portfolio disclaimer and GitHub repo link | M11 (F10) | Spec Miner 1 §3 #27, AC-F10-03 |
| 93 | Explainer & Stack Sections | 3-step "How it works" and technology stack breakdown | M11 (F10) | Spec Miner 1 §3 #28, AC-F10-04 |
| 94 | Complete README.md | Comprehensive README with screenshots, architecture, setup | M11 (F10) | Spec Miner 1 §3 #29, AC-F10-05 |
| 95 | Technical Architecture Doc | `docs/architecture.md` detailing subsystems and state machines | M11 (F10) | Spec Miner 1 §3 #30, AC-F10-06 |
| 96 | Decisions & Review Log | `docs/decisions.md` & `docs/review-log.md` with zero open items | M11 (F10) | Spec Miner 1 §3 #31, AC-F10-06 |
| 97 | Metadata & Open Graph | Dynamic meta tags, Open Graph card, favicon | M11 (F10) | Spec Miner 1 §3 #32, AC-F10-07 |
| 98 | WCAG AA Accessibility Suite | Keyboard nav, focus ring, contrast, axe tests on 6 pages | M11 (F10) | Spec Miner 1 §3 #33, AC-F10-08 |
| 99 | Design Consistency Audit | Verification of zero hardcoded hex colors, no FOUC | M11 (F10) | Spec Miner 1 §3 #34, AC-F10-D1..D4 |
| 100 | E2E Suite & Adversarial Audit | 100% passing test suite across Tiers 1-4 + Tier 5 hardening | M12 (Final) | Project Pattern Dual Track |

---

## Milestones

Milestones are organized into 4 execution waves + parallel E2E test track:

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | F0 Foundation | App Router, Strict TS, Health Check, Drizzle Schema (15 tables), Theme Tokens, App Shell, CI, .env.example | None | DONE |
| M1 | F1 Anonymous Workspace | Cookie UUID v4, Throttled `last_seen_at`, Scoped DB helper, Reset API, 7-day TTL cleanup, Resilient fallback | M0 | DONE |
| M2 | F11 Quota & Fallbacks | `LlmProvider` interface, GeminiProvider, FallbackProvider, FakeProvider, daily budget, rate_limit_counters, llm_cache | M0, M1 | DONE |
| M3 | F2 Brand Kit Agent | SSRF Guard, Cheerio scraper, Zod brand kit validator, WCAG AA contrast auto-adjust, Sample brand, Edit API | M0, M1, M2 | DONE |
| M4 | F4 Connector Framework | `Connector` interface & registry, sandbox adapters (LI, IG, X, FB), live LinkedIn adapter with AES-GCM, contract tests | M0, M1 | DONE |
| M5 | F3 Content Agent & Creatives | 3-step run machine (`idea` -> `creative` -> `campaign`), channel limit validator, banned words, Resvg PNG cards | M2, M3 | DONE |
| M6 | F5 Approval Queue & Calendar | Pure status machine, human approval gate, version bump on edit, live char counter, bulk actions, calendar, shortcuts | M0, M1, M5 | DONE |
| M7 | F6 Idempotent Scheduler | `schedule-approved`, `run-due` with `SKIP LOCKED`, exponential backoff + jitter, idempotency key, cron route | M4, M6 | DONE |
| M8 | F8 Webhooks & Activity Log | HMAC-SHA256 timing-safe endpoint, replay protection, raw body buffer, outgoing webhooks + SSRF, activity feed | M0, M1 | DONE |
| M9 | F9 Automation Rule Engine | Trigger-condition-action engine, compound paths, AI brand condition + fallback, recursion limit <= 3, dry-run | M5, M6, M8 | DONE |
| M10 | F7 Connectors UI | Connector cards, text badges, health check button, failure simulator modal, reconnect banner, default seeding | M4, M7 | DONE |
| M11 | F10 Demo, Docs & A11y | Home hero, one-click demo stepper (100% offline), footer disclaimer, README, docs/, WCAG AA axe tests | All prior | DONE |
| M12 | Final Milestone | 100% passing E2E test suite (Tiers 1-4) + Tier 5 Adversarial Coverage Hardening | All prior | DONE |

---

## Interface Contracts

### 1. Workspace Isolation Contract (`src/server/workspace/workspace-service.ts`)
```typescript
export interface WorkspaceContext {
  workspaceId: string;
  isNew: boolean;
}
export async function resolveWorkspace(cookieValue?: string): Promise<WorkspaceContext>;
export function withWorkspace<T>(workspaceId: string, fn: (repo: ScopedRepository) => Promise<T>): Promise<T>;
```

### 2. LLM Resilient Provider Contract (`src/server/llm/interface.ts`)
```typescript
export interface LlmResult<T> {
  data: T;
  provider: 'gemini' | 'fallback' | 'fake';
  cached?: boolean;
  fallbackReason?: string;
}
export interface LlmProvider {
  readonly name: 'gemini' | 'fallback' | 'fake';
  generateBrandKit(input: BrandKitInput): Promise<LlmResult<BrandKitOutput>>;
  generateIdeas(input: IdeasInput): Promise<LlmResult<IdeaItem[]>>;
  generateCreative(input: CreativeInput): Promise<LlmResult<CreativeOutput>>;
  evaluateCondition(input: ConditionInput): Promise<LlmResult<ConditionOutput>>;
}
```

### 3. Connector Provider Contract (`src/lib/connectors/types.ts`)
```typescript
export interface Connector {
  readonly provider: 'linkedin' | 'instagram' | 'x' | 'facebook';
  readonly mode: 'sandbox' | 'live';
  readonly capabilities: ConnectorCapabilities;
  connect(ctx: ConnectorExecutionContext): Promise<{ status: ConnectorStatus; accountLabel: string; authUrl?: string }>;
  disconnect(ctx: ConnectorExecutionContext): Promise<void>;
  healthCheck(ctx: ConnectorExecutionContext): Promise<{ healthy: boolean; details?: string }>;
  publish(ctx: ConnectorExecutionContext, input: PublishInput): Promise<PublishResult>;
}
```

### 4. Post Status State Machine Contract (`src/lib/status-machine.ts`)
```typescript
export type PostStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'held'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';

export function canTransition(from: PostStatus, to: PostStatus): boolean;
export function validateTransition(from: PostStatus, to: PostStatus): void;
```

### 5. Automation Rule Engine Contract (`src/lib/automations/engine.ts`)
```typescript
export interface RuleEvaluationResult {
  matched: boolean;
  actionsToRun: Array<RuleAction>;
  logs: StepLog[];
}
export function evaluateRule(rule: AutomationRule, event: SystemEvent): Promise<RuleEvaluationResult>;
```

---

## Code Layout

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
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (workspace)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # F10: Home & Demo Stepper
│   │   │   ├── brand-kit/page.tsx       # F2: Brand Kit Dashboard
│   │   │   ├── runs/page.tsx            # F3: Content Agent Run View
│   │   │   ├── queue/page.tsx           # F5: Approval Queue
│   │   │   ├── calendar/page.tsx        # F5: Content Calendar
│   │   │   ├── connectors/page.tsx      # F7: Connectors Dashboard
│   │   │   ├── webhooks/page.tsx        # F8: Webhooks Management
│   │   │   └── activity/page.tsx        # F8: Event Log Feed
│   │   ├── api/
│   │   │   ├── health/route.ts          # F0: Liveness probe
│   │   │   ├── workspace/reset/route.ts # F1: Workspace reset
│   │   │   ├── brand-kits/
│   │   │   ├── runs/
│   │   │   ├── posts/
│   │   │   ├── creatives/[postId].png/
│   │   │   ├── connectors/
│   │   │   ├── publish/
│   │   │   ├── hooks/
│   │   │   └── automations/
│   │   ├── globals.css                  # F0: Theme CSS variables
│   │   └── layout.tsx                   # F0: Next-Themes & Root Shell
│   ├── components/
│   │   ├── ui/                          # Radix / shadcn UI primitives
│   │   ├── layout/                      # AppShell, Sidebar, TopBar, Footer
│   │   ├── brand-kit/                   # Form, Palette, Facts Preview
│   │   ├── agent/                       # Stepper, RunVisualizer
│   │   ├── queue/                       # PostCard, LiveCharCounter, Modals
│   │   ├── calendar/                    # MonthGrid, DayCell
│   │   ├── connectors/                  # ConnectorCard, SimulatorModal
│   │   ├── webhooks/                    # CurlSnippet, SecretModal
│   │   ├── automations/                 # RuleBuilder, DryRunDrawer
│   │   └── demo/                        # OneClickDemoStepper, FallbackBanner
│   ├── lib/
│   │   ├── status-machine.ts            # Pure post status machine
│   │   ├── channels.ts                  # Channel limit rules & dimensions
│   │   ├── color-contrast.ts            # WCAG AA contrast math
│   │   ├── banned-words.ts              # Brand donts filter
│   │   ├── security/                    # SSRF guard, HMAC, AES-GCM
│   │   ├── scheduler/                   # Retry policy, backoff with jitter
│   │   ├── automations/                 # Rule engine & path resolver
│   │   └── validation/                  # Zod schemas (brand-kit, runs, posts...)
│   └── server/
│       ├── db/                          # Drizzle schema, client, scoped queries
│       ├── workspace/                   # Workspace cookie & TTL service
│       ├── scraper/                     # Cheerio facts scraper & SSRF client
│       ├── llm/                         # Gemini, Fallback, Fake providers & cache
│       ├── creatives/                   # Resvg card renderer & templates
│       ├── connectors/                  # Registry, Sandbox adapters, LinkedIn live
│       └── publisher/                   # Concurrency locker & publisher loop
└── tests/
    ├── e2e/                             # Playwright acceptance tests
    ├── integration/                     # API route & DB boundary tests
    └── unit/                            # Pure function tests (status, retry, contrast...)
```
