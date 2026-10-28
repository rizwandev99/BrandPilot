# Execution Plan: Playwright E2E Workflow Journey

## Objective
Implement and verify an end-to-end Playwright test suite (`tests/e2e/04-workflow-journey.spec.ts`) verifying BrandPilot's complete product journey under strict live network conditions with 0 failures:
- R1: Brand Kit live URL extraction with SSRF guard and WCAG AA validation.
- R2: Autonomous 3-step agent generation with Gemini copy and Resvg PNG rendering.
- R3: Approval queue keyboard shortcuts (A, E) with version/state-reset integrity.
- R4: Connectors sandbox resilience controls and live OAuth tabs.

## Iteration 1 Plan

### Step 1: Survey & Technical Exploration (3 Parallel Explorers)
- **Explorer 1 (`explorer_e2e_r1_brandkit`)**:
  - Focus: Brand Kit UI (`/brand-kit`), live URL extraction flow, Cheerio facts extraction API route (`POST /api/brand-kits/extract`), SSRF validation tests/guards, WCAG AA contrast badge display, existing fixtures in `tests/e2e/fixtures.ts`.
  - Output: `handoff.md` with selectors, network mocks/live expectations, timing patterns, and assertion strategies.
- **Explorer 2 (`explorer_e2e_r2_agent_pipeline`)**:
  - Focus: Content pipeline UI (`/runs`), triggering 3-step agent generation (`idea` -> `creative` -> `campaign`), Gemini copy generation, Resvg card rendering endpoint (`/api/creatives/[postId].png`), polling/state assertions in Playwright.
  - Output: `handoff.md` with selectors, run triggering mechanics, Resvg image verification via page request buffer/response status.
- **Explorer 3 (`explorer_e2e_r3_r4_queue_connectors`)**:
  - Focus: Approval queue (`/queue`) hotkeys (`A` to approve, `E` to edit), version bump (`version` increment, status reset to `in_review`), and Connectors UI (`/connectors`) sandbox latency/rate-limit sliders and Live OAuth tabs.
  - Output: `handoff.md` with exact keyboard event triggers, selectors for hotkey feedback, dialogs, sliders, tabs, and version assertions.

### Step 2: Implementation (1 Worker)
- **Worker (`worker_e2e_journey`)**:
  - Synthesize findings from Explorers 1, 2, 3.
  - Author `tests/e2e/04-workflow-journey.spec.ts` covering R1, R2, R3, R4 seamlessly.
  - Execute Playwright test suite via `pnpm exec playwright test tests/e2e/04-workflow-journey.spec.ts` (and entire suite if feasible).
  - Verify zero lint/type errors and zero test failures.
  - Produce comprehensive `handoff.md`.

### Step 3: Review & Challenge (2 Reviewers, 2 Challengers)
- **Reviewer 1 (`reviewer_journey_spec`)**:
  - Code review of `04-workflow-journey.spec.ts` for completeness against R1-R4 requirements, selector resilience, and adherence to Playwright best practices.
- **Reviewer 2 (`reviewer_journey_runtime`)**:
  - Independent execution of Playwright test runner, verifying clean test exits, execution speed, and absence of race conditions.
- **Challenger 1 (`challenger_edge_resilience`)**:
  - Adversarially challenge edge conditions (slow network timeouts, rapid hotkeys, invalid URL handling in extraction).
- **Challenger 2 (`challenger_flakiness`)**:
  - Verify repeatability under repeated executions, concurrent runs, and headless Windows environment quirks.

### Step 4: Forensic Audit (1 Forensic Auditor)
- **Auditor (`auditor_journey_integrity`)**:
  - Inspect `tests/e2e/04-workflow-journey.spec.ts` for integrity violations (mocking away core checks, hardcoded fake passes, bypassing assertions).
  - Ensure genuine end-to-end interactions with live components.

### Step 5: Gate Verdict Evaluation
- Evaluate in `GATE_STATUS.md`.
- If all pass (Build/tests pass, 2 APPROVE, 2 Challengers confirmed, Auditor CLEAN), declare milestone complete.
