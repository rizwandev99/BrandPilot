## 2026-10-27T08:35:31Z
You are worker_m7_scheduler, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M7 (Feature F6): Idempotent Concurrency Scheduler & Social Publisher.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/server/db/schema.ts`, `src/lib/connectors/registry.ts`, `src/lib/status-machine.ts`, `src/server/workspace/workspace-service.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m7_scheduler

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/lib/scheduler/retry-policy.ts`
- `src/lib/scheduler/concurrency.ts`
- `src/lib/scheduler/runner.ts`
- `src/lib/scheduler/types.ts`
- `src/app/api/publish/run-due/route.ts`
- `src/app/api/posts/schedule-approved/route.ts`
- `src/app/api/posts/[id]/publish-now/route.ts`

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F6-01 & AC-F6-02: `POST /api/posts/schedule-approved`: batch transitions all `approved` posts with a `scheduled_for` timestamp into `scheduled` status, creating a corresponding `publish_jobs` record for each with `status = 'pending'`.
2. AC-F6-03: `POST /api/publish/run-due`: batch processor selecting due jobs (`scheduled_for <= now()` and `status = 'pending'`).
   - Concurrency locking: Use Postgres transaction with `FOR UPDATE SKIP LOCKED` (or safe advisory/version lock) so concurrent runners never process the same job twice.
   - For each job: transition post to `publishing`, invoke the appropriate connector from `ConnectorRegistry`, and handle response.
3. AC-F6-04: Pure exponential backoff calculation with jitter (`src/lib/scheduler/retry-policy.ts`):
   - Formula: `min(maxDelayMs, baseDelayMs * 2^attempt) * (0.5 + Math.random())`.
   - Max attempts: 3.
   - If connector throws `RATE_LIMITED` with `retryAfterSeconds`, respect `retryAfterSeconds`.
   - If error is `PERMANENT` or `VALIDATION_FAILED`, mark job and post as `failed` immediately without retrying.
4. AC-F6-05: Post status & event updates:
   - On success: post status becomes `published`, job `status = 'completed'`, emit event `post.published` into `events` table.
   - On retryable error: job `status = 'retry'`, update `next_run_at`, increment `attempt_count`.
   - On exhausted attempts or permanent failure: post status becomes `failed`, job `status = 'failed'`, emit `post.failed`.
5. AC-F6-06: Idempotency key: generate and pass `${postId}:${version}:${provider}` to connector publish call.
6. AC-F6-07: `POST /api/posts/:id/publish-now`: immediately transitions an approved post to `publishing` and executes publisher synchronously.
7. AC-F6-08: Cron authentication: check `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret` header on `POST /api/publish/run-due`. Trigger workspace TTL cleanup (`cleanupExpiredWorkspaces`) as part of cron run.
8. AC-F6-09: Failed post retry action (`POST /api/posts/:id/retry` or similar): reset attempt count and re-queue job.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run tests/unit/f6-retry-policy.test.ts tests/integration/f6-scheduler-concurrency.test.ts`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m7_scheduler\handoff.md` and send a message back.
