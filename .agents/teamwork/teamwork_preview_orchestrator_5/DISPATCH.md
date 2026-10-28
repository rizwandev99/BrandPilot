# Orchestrator Dispatch — 2026-10-28T06:23:00Z

## Identity & Role
- **Agent Type**: `teamwork_preview_orchestrator`
- **Role**: Project Orchestrator
- **Working Directory**: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_5`
- **Authoritative Request**: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md`

## Objective
Implement and execute an end-to-end Playwright test suite verifying BrandPilot's complete product journey under strict live network conditions:
1. Brand Kit live URL extraction with SSRF guard and WCAG AA validation.
2. Autonomous 3-step agent generation with Gemini copy and Resvg PNG rendering.
3. Approval queue keyboard shortcuts (`A` to approve, `E` to edit) with version/state-reset integrity (editing an approved post bumps version and resets to `in_review`).
4. Connectors sandbox resilience controls (latency/rate-limit controls) and live OAuth tabs.
5. All Playwright tests execute via `pnpm exec playwright test` with 100% pass and 0 failures.

## Instructions
1. Initialize your BRIEFING.md and plan.md in your working directory.
2. Decompose and dispatch to specialized subagents (explorers, workers, reviewers/challengers) according to teamwork conventions.
3. Keep progress updated in `progress.md`.
4. Report back when complete.
