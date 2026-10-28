# BRIEFING — 2026-10-28T12:08:00Z

## Mission
Implement and verify tests/e2e/04-workflow-journey.spec.ts covering the complete BrandPilot product journey: Brand Kit live URL extraction, autonomous 3-step agent generation & Resvg PNG card rendering, approval queue keyboard shortcuts (A, E) with version/state-reset integrity, and connectors sandbox resilience controls.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey
- Original parent: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c
- Milestone: E2E Workflow Journey Spec Authoring & Verification

## 🔒 Key Constraints
- Exclusively own: tests/e2e/04-workflow-journey.spec.ts
- Genuine implementation — no cheating, no hardcoded results, no facade implementations
- Run: pnpm exec playwright test tests/e2e/04-workflow-journey.spec.ts
- Run: pnpm typecheck
- Run: pnpm lint
- Write handoff report to .agents/teamwork/worker_workflow_journey/handoff.md
- Send message to parent orchestrator with summary and handoff path

## Current Parent
- Conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c
- Updated: 2026-10-28T12:08:00Z

## Task Summary
- **What to build**: `tests/e2e/04-workflow-journey.spec.ts` automating the 4 major user journeys (Brand Kit Live Extraction, Autonomous Agent Run & Resvg PNG, Approval Queue Hotkeys & Version Reset, Connectors Sandbox Resilience & Live OAuth).
- **Success criteria**: All tests in 04-workflow-journey.spec.ts pass, typecheck passes with 0 errors, lint passes with 0 warnings.
- **Interface contracts**: PROJECT.md, Explorer 1, 2, 3 handoffs, fixtures.ts, playwright.config.ts.
- **Code layout**: tests/e2e/04-workflow-journey.spec.ts

## Key Decisions Made
- Use isolated workspace fixture (`tests/e2e/fixtures.ts`) for clean database state per test.
- Test 1 (R1 & R2 combined or separate sequential journey):
  - R1: `/brand-kit` live URL extraction with `https://linear.app`, verify brand name, palette rendering, and mathematical WCAG AA contrast ratio calculation.
  - R2: `/agent` 3-step pipeline with 2 posts to optimize timing, verify transitions, provider badge, pipeline completion, and `/api/creatives/${postId}.png` Resvg PNG headers/magic bytes.
  - R3: `/queue` keyboard hotkeys 'A' (approve) and 'E' (edit dialog), verify version bump (v1 -> v2) and status reset to in_review on save.
  - R4: `/connectors` probe latency, sandbox fault injection (rate_limit + retry delay), fault indicator, Go Live modal validation, and reset sandboxes.
- Timeout budgets: 60s for live extraction, 90s for agent generation to accommodate live network & Gemini API latency.

## Change Tracker
- **Files modified**: tests/e2e/04-workflow-journey.spec.ts (new)
- **Build status**: pending initial run
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: pending
- **Tests added/modified**: tests/e2e/04-workflow-journey.spec.ts

## Loaded Skills
- None specified in dispatch

## Artifact Index
- tests/e2e/04-workflow-journey.spec.ts — Playwright test suite for complete workflow journey
- .agents/teamwork/worker_workflow_journey/handoff.md — Final handoff report
