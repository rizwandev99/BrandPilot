# Dispatch: Worker M2 — Connectors, Safe Developer Sandboxes & Enterprise Resilience Messaging

## Working Directory
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m2`

## Project Root
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale`

## Input References
- User Request: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically `## Follow-up — 2026-10-28T05:31:59Z`)
- Explorer 2 Handoff Blueprint: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md`
- Scope: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_4\SCOPE.md`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/app/(workspace)/connectors/page.tsx`
- `src/components/connectors/connector-card.tsx`
- `src/components/connectors/failure-simulator-modal.tsx`
- `src/components/demo/explainer.tsx`
- `src/components/webhooks/outgoing-webhooks-list.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. **Connectors Page (`src/app/(workspace)/connectors/page.tsx`):**
   - Modernize subheader (lines 358–360):
     `Manage multi-channel social publishing adapters, monitor real-time API latency, and verify delivery resilience across safe developer sandboxes (Stripe-grade staging) and live OAuth production integrations.`
   - Reset button (lines 381–386): `title="Reset all 4 connectors to default connected sandbox staging state"`, label: `<span>Reset Sandboxes</span>` (or `Reset Defaults`).
   - Confirmation dialog (line 267): `'Reset all 4 developer sandboxes to clean default connected testing state (clearing active faults)?'`.
   - Toast (line 175): `setPageSuccess(`${name} connected in Developer Sandbox environment.`);`.
   - Section heading & description (lines 451–462):
     `Chaos Engineering & SLA Resilience Testing Matrix`
     `Simulate upstream outages, quota limits, and token expirations in safe developer sandboxes to verify automated retry policies before live publishing.`
   - Active status (lines 501–504):
     `simMode === 'none' ? 'Normal Operation (200 OK)' : 'Fault Active: ' + simMode.toUpperCase()`
   - Button (line 511): `<span>Configure Fault Mode</span>`
   - Explanatory block (lines 521–524):
     Modernize to highlight Stripe/PayPal developer sandbox analogy and exponential backoff retry verification.
2. **Connector Card (`src/components/connectors/connector-card.tsx`):**
   - Mode badge (lines 134–136):
     `connector.mode === 'live' ? 'Live Production OAuth' : 'Safe Developer Sandbox'`
   - Active fault indicator (lines 185–201):
     `Fault Injected: <code>...</code>` with action `Change Fault`.
   - Simulation button (lines 278–280):
     `title="Configure fault injection testing for this sandbox"`, `<span className="hidden sm:inline">Fault Mode</span>`.
3. **Failure Simulator Modal (`src/components/connectors/failure-simulator-modal.tsx`):**
   - Title (line 148): `Sandbox Fault Injection & Resilience Testing`
   - Description (line 174):
     `Simulate upstream social network error conditions in this safe developer sandbox to verify automated retries, rate-limit backoff, and admin notifications without impacting live accounts.`
   - Save button (line 256): `Apply Sandbox Fault Mode`
4. **Explainer (`src/components/demo/explainer.tsx`):**
   - Line 71:
     `'Chaos Resilience Matrix: Test scheduler fault-tolerance with deterministic injected errors (rate limits, upstream drops, token expiration) in safe developer sandboxes.',`
5. **Outgoing Webhooks List (`src/components/webhooks/outgoing-webhooks-list.tsx`):**
   - Lines 51–52:
     `Forward published posts, approvals, and system events to third-party endpoints or the internal developer sandbox receiver.`
6. **Execute Verification Commands:**
   - `pnpm test` (verify all 406 tests pass)
   - `pnpm typecheck` (verify 0 errors)
   - `pnpm lint` (verify 0 warnings/errors)
   - Document results in handoff report.

Write your final report to `.agents/teamwork/teamwork_preview_worker_m2/handoff.md`.


## 2026-10-28T06:11:48Z
You are Worker M2 for BrandPilot production-grade modernization.
Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m2
Read your dispatch: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m2\DISPATCH.md
Read the user request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (specifically ## Follow-up — 2026-10-28T05:31:59Z)
Read Explorer 2 blueprint: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Connectors, Safe Developer Sandboxes, and Provider Messaging modernizations across your 5 exclusively owned files.
After making edits, run:
- pnpm test (must pass with 0 failures)
- pnpm typecheck (must pass with 0 errors)
- pnpm lint (must pass with 0 warnings)
Document your edits, commands run, test counts, and exit codes in:
c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m2\handoff.md
Send a completion message when done.
