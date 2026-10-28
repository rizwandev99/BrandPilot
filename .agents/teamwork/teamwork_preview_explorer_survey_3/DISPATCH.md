# Dispatch: Survey Explorer 3 — Test Suite, Assertions & Verification

## Working Directory
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3`

## Project Root
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale`

## Reference Material
- User Request: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (read the entire file, especially `## Follow-up — 2026-10-28T05:31:59Z`)
- Project Guidelines: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\AGENTS.md`

## Mission & Scope
Investigate the test suite (`tests/` directory, unit, integration, and E2E Playwright tests):
1. Identify all test files and specific test cases that assert on user-facing copy being updated in R1 and R2 (e.g. searching for text like "100% offline", "demo", "sample", "flight simulator", "failure simulator", etc.).
2. Map out how tests verify landing page, brand kit, connectors, queue, calendar, and runs.
3. Document which test files will need assertion updates when copy is modernized to ensure 0 broken tests.
4. Document the exact test commands (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`), test runner configs, and baseline test counts.
5. Write your comprehensive analysis to `.agents/teamwork/teamwork_preview_explorer_survey_3/handoff.md` and send a brief completion message to your orchestrator.


## 2026-10-28T05:35:43Z
From: b0fc9aa4-00fa-4892-8700-32ecbee457db
You are Survey Explorer 3 for BrandPilot production-grade modernization.
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3
Read your dispatch assignment: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3\DISPATCH.md
Read the user request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (specifically ## Follow-up — 2026-10-28T05:31:59Z)
Read project memory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\AGENTS.md

Your mission:
Investigate the test suite (tests/ directory, unit, integration, and E2E Playwright tests).
Identify all test files and specific test cases that assert on user-facing copy being updated in R1 and R2 (e.g. searching for text like "100% offline", "demo", "sample", "flight simulator", "failure simulator", etc.).
Map out how tests verify landing page, brand kit, connectors, queue, calendar, and runs.
Document which test files will need assertion updates when copy is modernized to ensure 0 broken tests.
Document the exact test commands (pnpm test, pnpm typecheck, pnpm lint, pnpm test:e2e), test runner configs, and baseline test counts.
Write your findings to c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md.
When finished, send a brief message to your orchestrator.
