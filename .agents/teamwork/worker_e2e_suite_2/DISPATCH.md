## 2026-10-28T05:31:12Z

You are a Worker agent tasked with completing the Playwright End-to-End (E2E) testing suite for BrandPilot.

Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_e2e_suite_2
Scope document: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\PROJECT.md
Authoritative request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (Read ## Follow-up — 2026-10-28T04:41:50Z first!).

Reference Reports:
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_journeys\handoff.md
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_shell\handoff.md
- c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_runner\handoff.md

Existing Status:
- Playwright Chromium binaries are already installed in the local cache.
- playwright.config.ts and tests/e2e/fixtures.ts are configured.
- tests/e2e/01-app-shell.spec.ts, tests/e2e/02-home-demo.spec.ts, and tests/e2e/03-brand-kit.spec.ts are already implemented.
- tests/e2e/golden-path.spec.ts is retained.

Write Ownership:
You have exclusive write ownership of:
- tests/e2e/04-content-pipeline.spec.ts
- tests/e2e/05-approval-queue.spec.ts
- tests/e2e/06-calendar.spec.ts
- tests/e2e/07-connectors-webhooks.spec.ts
(and tests/e2e/fixtures.ts or playwright.config.ts if any tweaks are strictly required).
You MUST NOT edit production application source code files under src/.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Tasks:
1. Implement `tests/e2e/04-content-pipeline.spec.ts`:
   - Page route is `/agent` (App Router).
   - Test configuring campaign run: goal input (`#goal`), target brand kit selection (`#brandKit`), channel toggles (`LINKEDIN`, `X`, `INSTAGRAM`, `FACEBOOK`), post count buttons (`2 Posts`, `4 Posts`).
   - Trigger `Run Content Agent` button (`button:has-text("Run Content Agent")`).
   - Verify 3-step visualizer progress: Idea Agent -> Creative Agent -> Campaign Agent status nodes (`CheckCircle2` / succeeded).
   - Verify pipeline completion message and link to queue (`a[href="/queue"]`).
   - Verify creative card PNG preview route (`/api/creatives/:postId.png`).
2. Implement `tests/e2e/05-approval-queue.spec.ts`:
   - Page route is `/queue`.
   - Seed posts in the test workspace via fixture or API so cards exist.
   - Test post card display, channel badge, status pill, character count.
   - Test status action transitions: Approve button transitions post to approved (`data-testid="post-card-*"`).
   - Test Hold dialog: click Hold button, verify dialog `div[data-testid="hold-post-dialog"]` opens, fill reason, submit, verify post transitions to `held`.
   - Test Reject button: transitions post to `rejected`.
   - Test character counter in Edit dialog (`div[data-testid="char-counter"]`).
   - Test keyboard navigation shortcuts: press `?` to open `keyboard-shortcuts-dialog`, press `Escape` to close, navigate cards with `ArrowDown` / `ArrowUp` or shortcuts (`A`, `H`, `E`).
3. Implement `tests/e2e/06-calendar.spec.ts`:
   - Page route is `/calendar`.
   - Test month navigation: click `button[title="Next month"]` and `button[title="Previous month"]`, assert month/year heading updates.
   - Click `button:has-text("Today")` to return to current month.
   - Verify day cells (`div[data-testid^="calendar-cell-"]`).
   - Seed scheduled post; click post pill in calendar day cell; verify `EditPostDialog` opens with post details.
4. Implement `tests/e2e/07-connectors-webhooks.spec.ts`:
   - `/connectors`:
     - Test connector cards for LinkedIn, Instagram, X, Facebook (`div[data-testid^="connector-card-"]`).
     - Test "Probe All" health check button (`button:has-text("Probe All")`), assert health response/latency badge.
     - Test "Failure Simulator" modal: click simulation button, verify modal `div[role="dialog"]` opens, toggle simulation failure mode (e.g. Temporary 500, Rate Limit 429), save simulation.
   - `/webhooks`:
     - Test public webhook URL and signing secret display.
     - Test "Rotate secret" action and confirmation.
     - Test "Send test event" button, assert delivery feedback banner (`role="status"` or text `"Test event delivered successfully"`).
5. Execute full verification:
   - Run `pnpm build` (ensuring `.next/BUILD_ID` exists).
   - Run `pnpm test:e2e` (all specs must pass 100% headlessly with 0 failures).
   - Run `pnpm typecheck` (0 errors).
   - Run `pnpm lint` (0 errors).
   - Run `pnpm test` (all 406 unit & integration tests continue passing).
6. Document exact stdout, test duration, and results in:
   `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_e2e_suite_2\handoff.md`.
Update your progress.md and send a completion message to the orchestrator when finished.
