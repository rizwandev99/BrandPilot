# BRIEFING — 2026-10-27T09:37:00Z

## Mission
Implement M10 (Feature F7): Connectors Management UI & Failure Simulator for BrandPilot.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M10 (Feature F7 Connectors Management UI & Failure Simulator)

## 🔒 Key Constraints
- EXCLUSIVE FILE OWNERSHIP:
  - `src/app/(workspace)/connectors/page.tsx`
  - `src/components/connectors/**` (`connector-card.tsx`, `health-check-button.tsx`, `failure-simulator-modal.tsx`, `reconnect-banner.tsx`, `live-linkedin-dialog.tsx`, etc.)
- Do NOT touch other files outside ownership.
- ZERO uncommented `any`. Strict TypeScript typing.
- Follow Linear-grade aesthetic with semantic tokens (`bg-surface`, `bg-bg`, `text-text`, `text-muted`, `border-border`, `bg-accent`), accessible keyboard controls, responsive layout.
- Real genuine implementation, no dummy facades or hardcoded values.
- Verify with `pnpm vitest run tests/integration/f7-connectors-api.test.ts`, `pnpm typecheck`, `pnpm lint`.

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T09:37:00Z

## Task Summary
- **What to build**: Connectors Management Page (`src/app/(workspace)/connectors/page.tsx`) and components (`src/components/connectors/*`) covering AC-F7-01 (4 provider cards with badges, account labels, status, capabilities), AC-F7-02 (Health check UI with latency and status), AC-F7-03 (Failure simulator UI for sandbox connectors), AC-F7-04 (Reconnect alert banner for `needs_reconnect`/`error`), AC-F7-05 (Default workspace seeding verification/call).
- **Success criteria**: All ACs met, typecheck passing on owned files, lint passing, integration tests passing with 0 errors.
- **Interface contracts**: API routes in `src/app/api/connectors/**` and `src/lib/connectors/**`.
- **Code layout**: Next.js App Router, React Client Components, Lucide icons, Tailwind semantic tokens.

## Key Decisions Made
- Built structured metadata for all 4 providers (LinkedIn, Instagram, X, Facebook) with clear text badges (`[LI]`, `[IG]`, `[X]`, `[FB]`), account labels, channel limits, and capabilities.
- Created `HealthCheckButton` with real-time latency measurement and operational status badges.
- Created `FailureSimulatorModal` and advanced collapsible matrix for sandbox connectors fault injection (`none`, `temporary`, `rate_limit`, `permanent`, `auth_expired`) with configurable retry-after delays.
- Created `ReconnectBanner` with alert role and one-click reconnect action for channels in `needs_reconnect` or `error` state.
- Created `LiveLinkedInDialog` with live OAuth security explanation, `ENABLE_LIVE_LINKEDIN` awareness, and explicit confirmation before initiating redirect.
- Ensured zero `any` across all created files.

## Artifact Index
- `src/app/(workspace)/connectors/page.tsx` — Master Connectors workspace page
- `src/components/connectors/types.ts` — Data models and provider metadata
- `src/components/connectors/connector-card.tsx` — Provider card component with capabilities, status, health check, and actions
- `src/components/connectors/health-check-button.tsx` — Dedicated health check probe button
- `src/components/connectors/failure-simulator-modal.tsx` — Modal for configuring simulated fault injection
- `src/components/connectors/reconnect-banner.tsx` — Prominent reconnect alert banner
- `src/components/connectors/live-linkedin-dialog.tsx` — Live LinkedIn OAuth safety confirmation modal
- `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui\DISPATCH.md` — Dispatch prompt
- `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui\progress.md` — Progress tracker
- `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m10_connectors_ui\handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `src/app/(workspace)/connectors/page.tsx`: Connectors management page with AppShell, header toolbar, cards grid, and collapsible simulation section.
  - `src/components/connectors/types.ts`: Connector data types, health check types, and provider metadata.
  - `src/components/connectors/connector-card.tsx`: Full provider card component.
  - `src/components/connectors/health-check-button.tsx`: Health check runner with latency badge.
  - `src/components/connectors/failure-simulator-modal.tsx`: Advanced fault simulation modal.
  - `src/components/connectors/reconnect-banner.tsx`: Reconnection warning banner with one-click action.
  - `src/components/connectors/live-linkedin-dialog.tsx`: Live LinkedIn OAuth dialog.
- **Build status**: Integration tests passed (6/6 in f7, 42/42 in f4). Lint passed (0 errors, 0 warnings).
- **Pending issues**: None in M10 scope.

## Quality Status
- **Build/test result**: PASS (48/48 tests in f7 and f4 passed).
- **Lint status**: PASS (0 errors, 0 warnings).
- **Tests added/modified**: Covered by existing test suite `tests/integration/f7-connectors-api.test.ts`.
