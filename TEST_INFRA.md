# E2E Test Infra: BrandPilot

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests are derived strictly from `ORIGINAL_REQUEST.md` and `PRD.md` Section 9 Acceptance Criteria (`AC-F0-01` through `AC-F11-08`), treating implementation internals as black boxes.
- **Methodology**: 4-Tier verification pyramid:
  - **Tier 1: Feature Coverage (>=5 per feature)**: Isolated happy-path tests verifying each capability in isolation.
  - **Tier 2: Boundary & Corner Cases (>=5 per feature)**: Edge cases, zero/max inputs, SSRF injection, rate limit thresholds, format limits, offline fallbacks.
  - **Tier 3: Cross-Feature Combinations (Pairwise)**: Interaction tests (e.g., Brand Kit -> Agent Run -> Approval -> Scheduler -> Sandbox Connector -> Webhook -> Automation).
  - **Tier 4: Real-World Workload Scenarios**: Realistic end-to-end user workflows (e.g., 3-minute full demo walkthrough, LinkedIn OAuth connect-and-publish, webhook-driven automated drafting).

---

## Feature Inventory & Test Mapping

| # | Feature Code | Description | Key Acceptance Criteria | Tier 1 (Happy) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (E2E Workflow) |
|---|-------------|-------------|-------------------------|:--------------:|:-----------------:|:-----------------:|:----------------------:|
| 1 | F0 | Foundation & Tooling | AC-F0-01 .. AC-F0-08 | 5 | 5 | ✓ | ✓ |
| 2 | F1 | Anonymous Workspace | AC-F1-01 .. AC-F1-06 | 5 | 5 | ✓ | ✓ |
| 3 | F11 | Quota, Limits & Fallback | AC-F11-01 .. AC-F11-08 | 5 | 5 | ✓ | ✓ |
| 4 | F2 | Brand Kit & SSRF Guard | AC-F2-01 .. AC-F2-09 | 5 | 5 | ✓ | ✓ |
| 5 | F4 | Connector Framework | AC-F4-01 .. AC-F4-09 | 5 | 5 | ✓ | ✓ |
| 6 | F3 | Content Agent & Cards | AC-F3-01 .. AC-F3-11 | 5 | 5 | ✓ | ✓ |
| 7 | F5 | Approval Queue & Calendar | AC-F5-01 .. AC-F5-10 | 5 | 5 | ✓ | ✓ |
| 8 | F6 | Scheduler & Publisher | AC-F6-01 .. AC-F6-09 | 5 | 5 | ✓ | ✓ |
| 9 | F8 | Webhooks & Activity Log | AC-F8-01 .. AC-F8-09 | 5 | 5 | ✓ | ✓ |
| 10 | F9 | Automation Rule Engine | AC-F9-01 .. AC-F9-09 | 5 | 5 | ✓ | ✓ |
| 11 | F7 | Connectors UI & Sim | AC-F7-01 .. AC-F7-05 | 5 | 5 | ✓ | ✓ |
| 12 | F10 | Home, Demo, Docs, A11y | AC-F10-01 .. AC-F10-08 | 5 | 5 | ✓ | ✓ |
| **Total** | **All 12 Features** | **Full Platform Coverage** | **84 AC Specifications** | **60+** | **60+** | **15+** | **6+** |

---

## Test Architecture

### 1. Test Runners & Commands
- **Unit & Integration & Contract Tests**: Vitest
  - Invocation: `pnpm test`
  - Scope: Pure unit tables (status machine, retry backoff, channel rules, color contrast, HMAC, SSRF DNS checks, automation condition matching), Drizzle scoped query integration tests, and connector contract test suite.
- **End-to-End Tests**: Playwright
  - Invocation: `pnpm test:e2e`
  - Scope: Full-stack browser tests across Home, Brand Kit, Agent, Queue, Calendar, Connectors, Webhooks, and Activity pages; axe-core accessibility checks; keyboard navigation.
- **Typecheck & Linting**:
  - `pnpm typecheck` (`tsc --noEmit`)
  - `pnpm lint` (`eslint . --max-warnings 0`)

### 2. Test File Hierarchy
```
tests/
├── unit/
│   ├── f0-scripts.test.ts               # AC-F0-01, AC-F0-02
│   ├── f1-workspace-service.test.ts     # AC-F1-01, AC-F1-02, AC-F1-06
│   ├── f2-ssrf-guard.test.ts            # AC-F2-02, AC-F2-03 (DNS, loopback, metadata)
│   ├── f2-color-contrast.test.ts        # AC-F2-05 (WCAG AA math & auto-adjust)
│   ├── f3-channel-validation.test.ts    # AC-F3-04 (LinkedIn, X, IG, FB limits)
│   ├── f3-banned-words.test.ts          # AC-F3-05 (donts removal/regeneration)
│   ├── f3-schedule-planner.test.ts      # AC-F3-09 (>= 2h spacing algorithm)
│   ├── f4-connector-contract.test.ts    # AC-F4-01..03 (Contract suite on 4 sandboxes)
│   ├── f5-status-machine.test.ts        # AC-F5-03 (100% transition matrix table)
│   ├── f6-retry-policy.test.ts          # AC-F6-04 (Exponential backoff + jitter)
│   ├── f8-hmac-signatures.test.ts       # AC-F8-01, AC-F8-02 (Timing-safe HMAC & replay)
│   ├── f9-automation-engine.test.ts     # AC-F9-01..04 (Pure condition evaluation & loop check)
│   └── f11-quota-budget.test.ts         # AC-F11-01..05 (LlmProvider fallback & rate limiter)
├── integration/
│   ├── f0-health-api.test.ts            # AC-F0-03 (DB reachable vs 503)
│   ├── f1-workspace-isolation.test.ts   # AC-F1-03 (Multi-tenant data boundary pen test)
│   ├── f1-workspace-reset.test.ts       # AC-F1-04 (Cascade delete & reseed)
│   ├── f1-workspace-ttl.test.ts         # AC-F1-05 (7-day TTL cleanup cron)
│   ├── f2-brand-kits-api.test.ts        # AC-F2-01, 04, 06, 07, 08 (API routes & cache)
│   ├── f3-agent-runs-api.test.ts        # AC-F3-01, 02, 03, 10 (3-step pipeline & retry)
│   ├── f3-creatives-png-api.test.ts     # AC-F3-06, 07 (Resvg PNG rendering route)
│   ├── f5-posts-api.test.ts             # AC-F5-02, 04, 05, 06 (Transitions & version bump)
│   ├── f6-scheduler-concurrency.test.ts # AC-F6-03, 06, 07, 08 (Parallel run-due locking)
│   ├── f8-webhooks-api.test.ts          # AC-F8-01, 04, 05, 06, 09 (Inbound & Outbound)
│   ├── f9-automations-api.test.ts       # AC-F9-06, 09 (CRUD, dry-run, max 10 cap)
│   └── f11-rate-limit-api.test.ts       # AC-F11-03, 06 (429 RATE_LIMITED & caps)
├── e2e/
│   ├── tier1-features.spec.ts           # Isolated feature sanity in browser
│   ├── tier2-boundaries.spec.ts         # Form overflows, keyboard nav, error states
│   ├── tier3-pairwise.spec.ts           # Cross-module flows (Brand -> Run -> Queue)
│   ├── tier4-workloads.spec.ts          # 100% offline demo walkthrough & full golden path
│   └── accessibility.spec.ts            # AC-F10-08 (Axe checks on 6 core views)
```

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Verification Criteria |
|---|----------|--------------------|-----------------------|
| 1 | **One-Click Offline Demo Walkthrough** | F1, F2, F3, F4, F5, F6, F7, F10, F11 | Clicking "Run full demo" completes all steps (Brand Kit -> Step Agent -> Approve All -> Schedule -> Publish to Sandbox) in < 60s with zero external API calls. |
| 2 | **Brand Kit Extraction to Approval Queue** | F1, F2, F3, F5, F11 | Submitting URL scrapes facts, synthesizes brand kit (or fallback), triggers 3-step agent run, validates channel limits, produces branded PNG image cards, and places posts in `in_review`. |
| 3 | **Human Approval & Concurrency Scheduling** | F4, F5, F6, F7 | Human user reviews posts, edits caption (verifying version bump & character counter), approves posts, clicks "Schedule approved"; scheduler executes `run-due` with DB locking and publishes to sandbox without duplicates. |
| 4 | **Inbound Webhook to Automated Post Drafting** | F8, F9, F3, F5, F11 | External system sends signed HMAC-SHA256 webhook with event `product.launched`; timestamp validated; event deduplicated; automation rule triggers, evaluates brand condition, and creates drafted post in `in_review`. |
| 5 | **Connector Failure Simulation & Exponential Retry** | F4, F6, F7 | User configures sandbox connector failure to `temporary` (500); scheduler runs job; job fails; retry backoff schedules attempt 2; connector reset to `none`; next retry succeeds with `post.published`. |
| 6 | **Multi-Tenant Boundary Penetration** | F1, F0 | Two concurrent anonymous workspace sessions attempt to access, mutate, or delete each other's brand kits, posts, connectors, webhooks, and automation rules; verified 100% isolated. |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >= 5 test cases per feature (60+ total).
- **Tier 2 (Boundary & Corner)**: >= 5 test cases per feature covering edge cases, limit values, and error behaviors (60+ total).
- **Tier 3 (Cross-Feature Pairwise)**: Pairwise interactions across all adjacent modules (15+ total).
- **Tier 4 (Real-World Workload)**: 6 high-value realistic application scenarios.
- **Pass Semantics**: All test commands (`pnpm test`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`) must exit with code 0 and zero unresolved warnings.
