# BRIEFING — 2026-10-27T08:59:30Z

## Mission
Implement M5 (Feature F3): Content Agent Pipeline & Branded Image Cards for BrandPilot, fulfilling AC-F3-01 through AC-F3-11 with full test coverage and offline guarantee.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m5_content
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M5 (Feature F3)

## 🔒 Key Constraints
- Exclusive file ownership: Only write to the assigned files:
  - `src/server/agents/run-orchestrator.ts`
  - `src/server/agents/idea-step.ts`
  - `src/server/agents/creative-step.ts`
  - `src/server/agents/campaign-step.ts`
  - `src/server/agents/schedule-planner.ts`
  - `src/server/creatives/card-renderer.ts`
  - `src/server/creatives/templates/minimal-quote.ts`
  - `src/server/creatives/templates/feature-card.ts`
  - `src/server/creatives/templates/editorial-tip.ts`
  - `src/lib/channels.ts`
  - `src/lib/banned-words.ts`
  - `src/app/api/runs/route.ts`
  - `src/app/api/runs/[id]/route.ts`
  - `src/app/api/runs/[id]/retry/route.ts`
  - `src/app/api/creatives/[postId].png/route.ts`
  - `src/app/(workspace)/agent/page.tsx`
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.
- ZERO uncommented `any`. Strict TypeScript types.
- Offline guarantee: seamless operation with `FallbackProvider` and sample brand kit when Gemini API key is absent.
- Integrity: DO NOT CHEAT. Real state and logic only.

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T08:59:30Z

## Task Summary
- **What to build**:
  1. 3-step state machine (`idea` -> `creative` -> `campaign`) recording steps in `agent_runs` & `agent_run_steps`.
  2. Channel limit enforcement (`src/lib/channels.ts`).
  3. Banned word filtering (`src/lib/banned-words.ts`).
  4. Resvg SVG->PNG card renderer with 3 templates (`minimal-quote`, `feature-card`, `editorial-tip`) and `/api/creatives/[postId].png` endpoint.
  5. Schedule planner spreading posts across 7 days with >=2h spacing per channel.
  6. Agent runs API routes (`/api/runs`, `/api/runs/[id]`, `/api/runs/[id]/step`, `/api/runs/[id]/retry`).
  7. Agent run UI in `src/app/(workspace)/agent/page.tsx`.
- **Success criteria**:
  - `pnpm vitest run f3-` passes with 0 errors (35/35 PASS).
  - All F3-owned files pass typecheck and linting.

## Key Decisions Made
- Resvg card renderer uses dynamic `@resvg/resvg-js` to render valid image/png buffers on Node runtime with exact channel dimensions (1080x1080 IG, 1200x627 LI, 1200x675 X, 1200x630 FB).
- Multi-template design implemented 3 structurally distinct templates: `minimal-quote`, `feature-card`, and `editorial-tip`.
- Idempotency in `run-orchestrator.ts` checks previous step status in `agent_run_steps` to prevent duplicated post creation on re-runs unless explicitly retried.
- Schedule planner divides the 7-day interval per channel into equal spacing, enforcing `>= 2 hours` between posts on the same channel.

## Artifact Index
- `handoff.md` — Final completion report
- `progress.md` — Liveness & status log

## Change Tracker
- **Files modified/created**:
  - `src/lib/channels.ts`: Channel limit validation & auto-trimming
  - `src/lib/banned-words.ts`: Banned words detection and scrubbing against brand kit donts
  - `src/server/agents/schedule-planner.ts`: 7-day schedule distribution with >=2h spacing
  - `src/server/creatives/templates/minimal-quote.ts`: Minimal quote template
  - `src/server/creatives/templates/feature-card.ts`: Feature card template
  - `src/server/creatives/templates/editorial-tip.ts`: Editorial tip template
  - `src/server/creatives/card-renderer.ts`: Resvg SVG & PNG renderer
  - `src/server/agents/idea-step.ts`: Step 1 of agent pipeline
  - `src/server/agents/creative-step.ts`: Step 2 of agent pipeline
  - `src/server/agents/campaign-step.ts`: Step 3 of agent pipeline
  - `src/server/agents/run-orchestrator.ts`: 3-step state machine orchestrator
  - `src/app/api/runs/route.ts`: POST & GET runs
  - `src/app/api/runs/[id]/route.ts`: GET run details with step history
  - `src/app/api/runs/[id]/step/route.ts`: POST execute step
  - `src/app/api/runs/[id]/retry/route.ts`: POST retry step
  - `src/app/api/creatives/[postId].png/route.ts`: GET branded PNG card
  - `src/app/(workspace)/agent/page.tsx`: Interactive Agent UI stepper & logs
- **Build status**: PASS (`pnpm vitest run f3-` 35/35 passing)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 35 passed, 0 failed
- **Lint status**: 0 errors
- **Tests added/modified**: 5 test suites verified

## Loaded Skills
- None
