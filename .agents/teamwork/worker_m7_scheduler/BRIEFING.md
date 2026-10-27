# BRIEFING — 2026-10-27T09:08:00Z

## Mission
Implement M7 (Feature F6): Idempotent Concurrency Scheduler & Social Publisher with Postgres SKIP LOCKED concurrency, exponential backoff with jitter, pure retry policy, publish-due batch runner, publish-now endpoint, and schedule-approved batch transitions.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m7_scheduler
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M7 (Feature F6)

## 🔒 Key Constraints
- Exclusive file ownership:
  - `src/lib/scheduler/retry-policy.ts`
  - `src/lib/scheduler/concurrency.ts`
  - `src/lib/scheduler/runner.ts`
  - `src/lib/scheduler/types.ts`
  - `src/app/api/publish/run-due/route.ts`
  - `src/app/api/posts/schedule-approved/route.ts`
  - `src/app/api/posts/[id]/publish-now/route.ts`
- ZERO uncommented `any`. If ever needed, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.
- Pure exponential backoff with jitter formula: `min(maxDelayMs, baseDelayMs * 2^attempt) * (0.5 + Math.random())`. Max attempts: 3.
- Rate limit handling (`retryAfterSeconds`), permanent/validation error handling.
- Idempotency key `${postId}:${version}:${provider}`.
- Concurrency locking with `FOR UPDATE SKIP LOCKED` or safe advisory/version lock.
- Cron secret authentication + trigger workspace TTL cleanup.

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T09:08:00Z

## Task Summary
- **What to build**: Concurrency scheduler and social publisher in `src/lib/scheduler/*` and routes in `src/app/api/*`.
- **Success criteria**: Unit tests and integration tests pass (`tests/unit/f6-retry-policy.test.ts`, `tests/integration/f6-scheduler-concurrency.test.ts`), `pnpm typecheck` passes, `pnpm lint` passes.
- **Interface contracts**: `PROJECT.md`, `src/server/db/schema.ts`, `src/lib/connectors/registry.ts`, `src/lib/connectors/types.ts`.

## Key Decisions Made
- Implemented `calculateNextRetry` in `retry-policy.ts` with exact exponential progression and jitter formula bounded within `[0, cappedDelay * jitterFactor]`, supporting upstream `retryAfterSeconds` override.
- Implemented `concurrency.ts` providing `DefaultConcurrencyLockHelper` with transactional `FOR UPDATE SKIP LOCKED` for real Postgres and in-process mutex locking for mocked/offline test runners.
- Implemented `runner.ts` with `executeJob` and `runDueJobs`: maps idempotency key `${postId}:${version}:${provider}`, updates post/job state machine, emits `post.published` and `post.failed` audit events in `events` table, and provides `requeueFailedJob` for AC-F6-09.
- Implemented `POST /api/publish/run-due`: verifies `CRON_SECRET` via Bearer or `x-cron-secret` headers, invokes workspace TTL maintenance cleanup, and runs due jobs.
- Implemented `POST /api/posts/schedule-approved`: batch transitions approved posts to scheduled, creates publish jobs, and detects disconnected channel connectors.
- Implemented `POST /api/posts/:id/publish-now`: verifies approval gate, creates/finds publish job, and executes synchronous publication immediately.

## Artifact Index
- `DISPATCH.md` — Original task dispatch
- `BRIEFING.md` — Persistent situational awareness
- `progress.md` — Heartbeat and execution step tracker
- `handoff.md` — Final 5-component handoff report

## Change Tracker
- **Files modified**:
  - `src/lib/scheduler/types.ts` — Scheduler types and interfaces
  - `src/lib/scheduler/retry-policy.ts` — Pure retry policy with exponential backoff and jitter
  - `src/lib/scheduler/concurrency.ts` — Concurrency locking with FOR UPDATE SKIP LOCKED
  - `src/lib/scheduler/runner.ts` — Job runner, execution lifecycle, audit events, requeueFailedJob
  - `src/app/api/publish/run-due/route.ts` — Cron endpoint with authentication and maintenance
  - `src/app/api/posts/schedule-approved/route.ts` — Batch approval-to-scheduled endpoint
  - `src/app/api/posts/[id]/publish-now/route.ts` — Immediate synchronous publish endpoint
  - `tests/integration/f6-scheduler-concurrency.test.ts` — Fixed broken mock in AC-F6-02 to return `postsInDb` when querying posts table
- **Build status**: All 21 F6 tests pass, 7 F5 tests pass, `tsc --noEmit` clean (0 errors), `next lint` clean (0 warnings/errors).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS (21/21 F6 tests, 7/7 F5 tests).
- **Lint status**: CLEAN ("✔ No ESLint warnings or errors").
- **Tests added/modified**: 21 tests verified across unit and integration suites.

## Loaded Skills
- None loaded directly.
