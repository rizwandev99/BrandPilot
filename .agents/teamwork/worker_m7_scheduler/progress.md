# Progress: worker_m7_scheduler

Last visited: 2026-10-27T09:07:30Z

## Current State
- [x] Initialized DISPATCH.md and BRIEFING.md
- [x] Inspected test files (`tests/unit/f6-retry-policy.test.ts`, `tests/integration/f6-scheduler-concurrency.test.ts`)
- [x] Inspected existing schemas, scoped queries, and connectors (`schema.ts`, `registry.ts`, `workspace-service.ts`)
- [x] Implemented `src/lib/scheduler/types.ts`
- [x] Implemented `src/lib/scheduler/retry-policy.ts` (AC-F6-04, 13/13 unit tests pass)
- [x] Implemented `src/lib/scheduler/concurrency.ts` (AC-F6-03 Postgres SKIP LOCKED & mutex locking)
- [x] Implemented `src/lib/scheduler/runner.ts` (AC-F6-03, AC-F6-05, AC-F6-06, AC-F6-09)
- [x] Implemented API routes:
  - `src/app/api/publish/run-due/route.ts` (AC-F6-08 CRON_SECRET authentication & TTL maintenance)
  - `src/app/api/posts/schedule-approved/route.ts` (AC-F6-01, AC-F6-02 batch scheduling & disconnected detection)
  - `src/app/api/posts/[id]/publish-now/route.ts` (AC-F6-07 immediate synchronous publish)
- [x] Ran vitest: 21/21 tests passing across `f6-retry-policy.test.ts` and `f6-scheduler-concurrency.test.ts`
- [x] Ran vitest on related suite: 7/7 tests passing in `f5-posts-api.test.ts`
- [x] Ran `pnpm typecheck`: 0 errors
- [x] Ran `pnpm lint`: 0 warnings or errors
- [ ] Write handoff.md and report to caller
