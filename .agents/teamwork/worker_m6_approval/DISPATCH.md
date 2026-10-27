## 2026-10-27T08:35:31Z
You are worker_m6_approval, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M6 (Feature F5): Approval Queue, Content Calendar & Status State Machine.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/server/db/schema.ts`, `src/server/workspace/workspace-service.ts`, `src/server/db/scoped-queries.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m6_approval

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/lib/status-machine.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`
- `src/app/api/posts/[id]/approve/route.ts`
- `src/app/api/posts/[id]/reject/route.ts`
- `src/app/api/posts/[id]/hold/route.ts`
- `src/app/api/posts/[id]/move-to-draft/route.ts`
- `src/app/api/posts/bulk-approve/route.ts`
- `src/components/queue/**` (`queue-table.tsx`, `post-card.tsx`, `char-counter.tsx`, `keyboard-shortcuts-dialog.tsx`, etc.)
- `src/components/calendar/**` (`calendar-grid.tsx`, `calendar-cell.tsx`, etc.)
- `src/app/(workspace)/queue/page.tsx`
- `src/app/(workspace)/calendar/page.tsx`

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F5-01 & AC-F5-02: Human-in-the-loop approval gate. No post can ever transition to `scheduled` or `published` without prior human approval.
2. AC-F5-03: Pure status machine function `canTransition(from, to): boolean` and `validateTransition(from, to): void` in `src/lib/status-machine.ts`.
   Allowed transitions:
   - `draft` -> `in_review`
   - `in_review` -> `approved` | `held` | `rejected`
   - `held` -> `in_review` | `rejected`
   - `rejected` -> `in_review` | `draft`
   - `approved` -> `scheduled` | `in_review` (on edit)
   - `scheduled` -> `publishing` | `in_review` (on edit)
   - `publishing` -> `published` | `failed`
   - `failed` -> `scheduled` (on retry) | `in_review`
   All other transitions must be rejected with descriptive error.
3. AC-F5-04: Post edit increments `version` and automatically resets `approved` or `scheduled` post back to `in_review`.
4. AC-F5-05: Live character counter with warning thresholds and save button disabling on overflow.
5. AC-F5-06: Bulk actions: "Approve all in review" (`POST /api/posts/bulk-approve`).
6. AC-F5-07: Calendar month grid view with local time mapping and status color badges (`bg-accent`, `bg-success`, `bg-warning`, etc. using semantic tokens).
7. AC-F5-08: Keyboard navigation (`ArrowUp/Down`, `A` approve, `H` hold, `E` edit, `?` shortcuts dialog).
8. AC-F5-10: Optimistic UI updates with graceful rollback on error.
9. Posts API: `GET /api/posts` (with status, channel, search filtering), `POST /api/posts` (create manual post), `GET /api/posts/:id`, `PATCH /api/posts/:id` (edit copy, media, scheduled_for, bumping version and resetting approved->in_review), `DELETE /api/posts/:id`.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run tests/unit/f5-status-machine.test.ts tests/integration/f5-posts-api.test.ts`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m6_approval\handoff.md` and send a message back.
