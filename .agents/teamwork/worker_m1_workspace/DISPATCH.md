## 2026-10-27T08:03:03Z
You are worker_m1_workspace (role: Workspace Isolation & TTL Specialist).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m1_workspace
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- `src/server/workspace/workspace-service.ts`
- `src/server/workspace/cleanup.ts`
- `src/server/db/scoped-queries.ts`
- `src/app/api/workspace/reset/route.ts`

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and Spec Miner 1 handoff.
2. Implement `src/server/workspace/workspace-service.ts`:
   - `resolveWorkspace(cookieHeader?: string)`: Extracts or generates UUID v4 for `brandpilot_workspace_id`. If invalid or missing, creates new workspace in `workspaces` table without crashing (AC-F1-01, AC-F1-06). Sets cookie with `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.
   - Throttled `last_seen_at` updates: Checks if `Date.now() - workspace.lastSeenAt.getTime() > 5 * 60 * 1000`; only updates DB if > 5 minutes (AC-F1-02).
3. Implement `src/server/db/scoped-queries.ts`:
   - Scoped query repository helper `withWorkspace(workspaceId, fn)` and `ScopedRepository` class enforcing `workspaceId` on all SELECT, INSERT, UPDATE, DELETE queries for brand kits, posts, connectors, events, and automations. Ensures Workspace B can NEVER access Workspace A's data (AC-F1-03).
4. Implement `src/server/workspace/cleanup.ts`:
   - `cleanupStaleWorkspaces(cutoffDate?: Date)`: Deletes workspaces where `last_seen_at < cutoffDate` (default `Date.now() - WORKSPACE_TTL_DAYS * 86400000`). Cascading foreign keys delete all child records (AC-F1-05).
5. Implement `POST /api/workspace/reset` in `src/app/api/workspace/reset/route.ts`:
   - Deletes all current workspace records in transaction and re-seeds default connected sandbox connectors (`linkedin`, `instagram`, `x`, `facebook`) (AC-F1-04).
6. Run targeted tests:
   `pnpm vitest run tests/unit/f1-workspace-service.test.ts tests/integration/f1-workspace-isolation.test.ts tests/integration/f1-workspace-reset.test.ts tests/integration/f1-workspace-ttl.test.ts`
   Ensure all tests turn GREEN with 0 errors. Run `pnpm typecheck`.
7. Write `handoff.md` in your working directory and message the orchestrator.
