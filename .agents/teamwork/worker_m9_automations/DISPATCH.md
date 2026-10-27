## 2026-10-27T09:15:43Z
You are worker_m9_automations, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M9 (Feature F9): Rule Automation Engine.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/server/db/schema.ts`, `src/lib/status-machine.ts`, `src/server/workspace/workspace-service.ts`, `src/server/llm/fallback-provider.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m9_automations

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/lib/automations/engine.ts`
- `src/lib/automations/types.ts`
- `src/app/api/automations/route.ts`
- `src/app/api/automations/[id]/route.ts`
- `src/app/api/automations/[id]/test/route.ts`
- `src/app/(workspace)/automations/page.tsx`
- `src/components/automations/**` (`rule-builder.tsx`, `condition-row.tsx`, `action-row.tsx`, `rules-list.tsx`, `dry-run-modal.tsx`, etc.)

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F9-01: Pure trigger-condition-action engine in `src/lib/automations/engine.ts`:
   - Evaluates event triggers (`webhook.received`, `post.created`, `post.published`, `post.failed`).
   - Supports compound path resolution (dot-notation e.g. `data.author.role`, `payload.event`) and typed operators:
     `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `in`.
   - Condition types: `path_comparison`, `ai_on_brand`.
   - AI on-brand condition uses LLM with fallback to brand kit `donts` / negative keywords when offline or unconfigured.
2. AC-F9-02: Action execution: executes actions sequentially and records audit logs in database `automation_runs` table.
3. AC-F9-03: Recursion loop protection: tracks execution depth and terminates execution if `depth >= 3`.
4. AC-F9-04: Action status machine validation: post status actions strictly validate transitions using `canTransition` / `validateTransition` from `src/lib/status-machine.ts`.
5. AC-F9-06: Dry-run simulation mode: `POST /api/automations/:id/test` evaluates a test event against the automation rule without writing side effects to posts or connectors, returning condition evaluation breakdown (`passed`, `details`).
6. AC-F9-07 & AC-F9-08: Create AI Draft action: creates a draft post in `in_review` adhering to channel limits and brand copy rules.
7. AC-F9-09: Workspace quota cap: enforce max 10 automations per workspace on `POST /api/automations`.
8. UI: Linear-grade rule builder and list page at `src/app/(workspace)/automations/page.tsx` with condition/action builder, dry-run modal, and active toggle.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run tests/unit/f9-automation-engine.test.ts tests/integration/f9-automations-api.test.ts`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m9_automations\handoff.md` and send a message back.
