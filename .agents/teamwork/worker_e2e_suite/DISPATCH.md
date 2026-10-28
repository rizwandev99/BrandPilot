## 2026-10-28T04:56:50Z
You are a Worker agent tasked with implementing and executing the full Playwright End-to-End (E2E) testing suite for BrandPilot.

Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_e2e_suite
Scope document: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\PROJECT.md
Authoritative request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (Read ## Follow-up — 2026-10-28T04:41:50Z first!).

Input Reports to read and follow:
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_runner\handoff.md
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_journeys\handoff.md
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_shell\handoff.md

Write Ownership:
You have exclusive write ownership of:
- playwright.config.ts
- tests/e2e/01-app-shell.spec.ts
- tests/e2e/02-home-demo.spec.ts
- tests/e2e/03-brand-kit.spec.ts
- tests/e2e/04-content-pipeline.spec.ts
- tests/e2e/05-approval-queue.spec.ts
- tests/e2e/06-calendar.spec.ts
- tests/e2e/07-connectors-webhooks.spec.ts
(and tests/e2e/fixtures.ts or helper files if needed).
Retain tests/e2e/golden-path.spec.ts as API smoke test.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Requirements:
1. Environment & Setup:
   - Run `pnpm exec playwright install chromium` so Chromium-1248 is installed in local ms-playwright cache.
   - Update `playwright.config.ts` per the Runner Explorer recommendations (use `url: 'http://localhost:3000'`, `baseURL`, `headless: true`, `viewport: { width: 1280, height: 720 }`, projects for Chromium, trace/screenshot on failure).
   - Run `pnpm build` so `.next/BUILD_ID` exists and Next.js production server starts cleanly during tests.
2. Spec Suite Implementation (tests/e2e/*.spec.ts):
   - `01-app-shell.spec.ts`: Test desktop sidebar collapse (`w-60` to `w-16`), aria-labels, mobile drawer toggle (`md:hidden` hamburger, backdrop, drawer translate classes, auto-close on navigate and Escape), theme switcher (`next-themes` toggling `dark` class on `<html>` and body background color), and footer disclaimer.
   - `02-home-demo.spec.ts`: Test Home hero, sample brand kit loading button (`Load Sample Brand Kit`), 4-step offline demo stepper (`Run One-Click Demo`), step status badges, and navigation links.
   - `03-brand-kit.spec.ts`: Test brand kit display, WCAG AA color palette contrast badge ("Auto-Checked"), tone tags, and inline editing form with save action (`PATCH /api/brand-kits/:id`).
   - `04-content-pipeline.spec.ts`: Test `/agent` page pipeline configuration (goal input, channel toggles, post count), trigger `Run Content Agent`, 3-step execution visualizer (Idea -> Creative -> Campaign nodes), and inspecting generated posts/creatives.
   - `05-approval-queue.spec.ts`: Test `/queue` post cards, Approve action, Hold modal with reason submission, Reject action, live character counter (`char-counter`), and keyboard navigation shortcuts (`A`, `H`, `E`, `?`).
   - `06-calendar.spec.ts`: Test `/calendar` month navigation (previous/next month buttons, month heading updates), post status cards on calendar cells, and clicking post item to view details modal.
   - `07-connectors-webhooks.spec.ts`: Test `/connectors` Probe All / health check, Failure Simulator modal (testing 500, 429, 400 fault injection), `/webhooks` secret rotation, copy-to-clipboard, and test event delivery.
3. Verification:
   Run the following verification commands and record exact stdout/stderr and exit codes:
   - `pnpm test:e2e` (all specs must pass 100%)
   - `pnpm typecheck` (0 errors)
   - `pnpm lint` (0 errors, 0 warnings)
   - `pnpm test` (all 406 unit & integration tests continue passing)
