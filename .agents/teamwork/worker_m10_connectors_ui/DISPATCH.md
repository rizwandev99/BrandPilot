## 2026-10-27T09:15:43Z

You are worker_m10_connectors_ui, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M10 (Feature F7): Connectors Management UI & Failure Simulator.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/lib/connectors/registry.ts`, `src/app/api/connectors/**`, `src/server/workspace/workspace-service.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/app/(workspace)/connectors/page.tsx`
- `src/components/connectors/**` (`connector-card.tsx`, `health-check-button.tsx`, `failure-simulator-modal.tsx`, `reconnect-banner.tsx`, `live-linkedin-dialog.tsx`, etc.)

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F7-01: Provider cards UI for 4 social providers (LinkedIn, Instagram, X, Facebook) with clear text badges (`[LI]`, `[IG]`, `[X]`, `[FB]`), account labels, connected/disconnected status badges, and channel capabilities.
2. AC-F7-02: Connector Health Check UI: "Run health check" button per connector that calls `GET /api/connectors/:id/health` or `POST /api/connectors/:id/health-check`, displaying measured latency (ms) and operational status.
3. AC-F7-03: Failure Simulator UI: advanced collapsible section / modal to configure simulated failure modes for sandbox connectors (`none`, `temporary`, `rate_limit`, `permanent`), error messages, and retry delays.
4. AC-F7-04: Reconnect alert banner: prominent banner displayed when any connector status is `needs_reconnect` or `error` with a one-click "Reconnect" action.
5. AC-F7-05: Default workspace seeding: when a workspace visits the connectors page or calls connectors list, ensure default sandbox connectors are seeded and displayed.
6. Design: Follow Linear-grade aesthetic with semantic tokens (`bg-surface`, `bg-bg`, `text-text`, `text-muted`, `border-border`, `bg-accent`), accessible keyboard controls, and responsive layout.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run tests/integration/f7-connectors-api.test.ts`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui\handoff.md` and send a message back.
