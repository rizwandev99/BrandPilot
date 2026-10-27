# BRIEFING — 2026-10-27T08:58:00Z

## Mission
Implement M6 (Feature F5): Approval Queue, Content Calendar & Status State Machine for BrandPilot, ensuring human-in-the-loop approval, strict status transitions, version bumping, bulk approval, calendar view, keyboard shortcuts, and full multi-tenant posts API.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m6_approval
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M6 (Feature F5: Approval Queue, Content Calendar & Status State Machine)

## 🔒 Key Constraints
- Exclusive file ownership:
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
- Do NOT touch other files.
- ZERO uncommented `any`. If needed, `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.
- Integrity: no cheating, no facade implementations, genuine state machines and database queries.
- Linear-grade UI defaults: dark/light theme tokens, semantic CSS variables (`bg-surface`, `bg-accent`, `border-border`, etc.).

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T08:58:00Z

## Task Summary
- **What was built**:
  - `src/lib/status-machine.ts`: pure functions `canTransition`, `validateTransition`, `isPostStatus`, `getAllowedTransitions`, `StatusTransitionError` (AC-F5-03)
  - `src/app/api/posts/route.ts`: collection `GET` with status, channel, search, and date filters, and `POST` with resource cap checks (AC-F5-01, AC-F11-06)
  - `src/app/api/posts/[id]/route.ts`: `GET`, `PATCH` with version bump and automatic status reset (`approved` -> `in_review`), and `DELETE` (AC-F5-04)
  - `src/app/api/posts/[id]/transition/route.ts`: status machine enforcement endpoint (AC-F5-02)
  - Action endpoints: `[id]/approve`, `[id]/reject`, `[id]/hold`, `[id]/move-to-draft`, `bulk-approve`, `approve-all`, `schedule-approved` (AC-F5-06)
  - `src/components/queue/`: `char-counter.tsx` (live limit warnings & overflow blocking), `keyboard-shortcuts-dialog.tsx` (`?` key modal), `edit-post-dialog.tsx` (re-approval warning and live editing), `hold-post-dialog.tsx`, `post-card.tsx` (badges, actions, creative preview), `queue-table.tsx` (filters, optimistic updates with rollback, keyboard navigation)
  - `src/components/calendar/`: `calendar-cell.tsx`, `calendar-grid.tsx` (month navigation, local time display, status badges)
  - Pages: `src/app/(workspace)/queue/page.tsx`, `src/app/(workspace)/calendar/page.tsx`
- **Success criteria**:
  - All 91 unit tests in `tests/unit/f5-status-machine.test.ts` pass
  - All 7 integration tests in `tests/integration/f5-posts-api.test.ts` pass
  - `pnpm lint`: clean (0 errors, 0 warnings)
  - Strict file ownership respected

## Change Tracker
- **Files created/modified**:
  - `src/lib/status-machine.ts`: pure state machine
  - `src/app/api/posts/route.ts`: list/create posts
  - `src/app/api/posts/[id]/route.ts`: get/patch/delete post
  - `src/app/api/posts/[id]/transition/route.ts`: transition route
  - `src/app/api/posts/[id]/approve/route.ts`: approve action
  - `src/app/api/posts/[id]/reject/route.ts`: reject action
  - `src/app/api/posts/[id]/hold/route.ts`: hold action
  - `src/app/api/posts/[id]/move-to-draft/route.ts`: move to draft action
  - `src/app/api/posts/approve-all/route.ts`: approve all in review
  - `src/app/api/posts/bulk-approve/route.ts`: bulk approve alias
  - `src/app/api/posts/schedule-approved/route.ts`: batch schedule approved posts
  - `src/components/queue/char-counter.tsx`: live character counter
  - `src/components/queue/keyboard-shortcuts-dialog.tsx`: shortcuts modal
  - `src/components/queue/edit-post-dialog.tsx`: edit post modal
  - `src/components/queue/hold-post-dialog.tsx`: hold dialog with reason
  - `src/components/queue/post-card.tsx`: post card with optimistic actions
  - `src/components/queue/queue-table.tsx`: queue view with keyboard navigation
  - `src/components/calendar/calendar-cell.tsx`: day cell
  - `src/components/calendar/calendar-grid.tsx`: month grid view
  - `src/app/(workspace)/queue/page.tsx`: queue page
  - `src/app/(workspace)/calendar/page.tsx`: calendar page
- **Build status**: 98 tests passing (100% pass rate)

## Quality Status
- **Build/test result**: Pass (98/98 tests passing)
- **Lint status**: 0 errors, 0 warnings

## Loaded Skills
- None
