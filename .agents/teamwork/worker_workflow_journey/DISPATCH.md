# Dispatch: Worker (E2E Workflow Journey Spec Implementation & Execution)

## Identity
- Role: E2E Spec Author and Test Runner
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey
- Parent Conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c

## Mandatory Reference Files (READ THESE FIRST)
- ORIGINAL_REQUEST.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (READ THIS FIRST)
- PROJECT.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\PROJECT.md`
- Explorer 1 Handoff: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit\handoff.md`
- Explorer 2 Handoff: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r2_agent\handoff.md`
- Explorer 3 Handoff: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors\handoff.md`
- Existing Test Fixtures: `tests/e2e/fixtures.ts`
- Playwright Configuration: `playwright.config.ts`

## File Ownership
- You exclusively own: `tests/e2e/04-workflow-journey.spec.ts`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Assignment & Requirements
Implement and execute the end-to-end Playwright test suite `tests/e2e/04-workflow-journey.spec.ts` automating the complete BrandPilot product journey under strict live network conditions:
1. **R1: Brand Kit Live URL Extraction Flow**:
   - Navigate to `/brand-kit` using the isolated workspace fixture.
   - Enter live external URL (`https://linear.app`).
   - Trigger extraction (`Extract from URL` / `Extract`).
   - Await response from `POST /api/brand-kits` and DOM rendering.
   - Assert brand name (`Linear`), palette rendering, and WCAG AA contrast compliance (`Auto-Checked` badge, contrast ratio >= 4.5:1).
2. **R2: Autonomous 3-Step Agent Pipeline & Resvg PNG**:
   - Navigate to `/agent` ("Content Agent Pipeline").
   - Ensure brand kit is selected, set post count to 2 (or 4), click "Run Content Agent".
   - Assert visualizer transitions across `idea` -> `creative` -> `campaign`.
   - Assert provider badge (`Live Gemini 2.5 Flash` or `High-Availability SLA Engine`).
   - Wait for `Pipeline complete! Posts drafted in approval queue.`.
   - Navigate to `/queue` or click "View posts in queue".
   - Extract post ID from drafted post (`data-testid="post-card-${post.id}"`).
   - Fetch `/api/creatives/${postId}.png` via `request.get()`.
   - Verify status 200, Content-Type `image/png`, PNG magic bytes (`0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a`), and body length > 1000.
3. **R3: Approval Queue Keyboard Shortcuts & Version/State Integrity**:
   - On `/queue`, switch to the "All" tab or select the first in-review post.
   - Click card or focus it to establish active selection.
   - Press keyboard hotkey `A` (or `a`).
   - Assert status transitions to "Approved".
   - Press keyboard hotkey `E` (or `e`).
   - Assert edit modal opens (`data-testid="edit-post-dialog"`).
   - Assert re-approval warning banner is visible explaining that editing will bump version to v2 and reset status to `in_review`.
   - Modify caption and click Save (`data-testid="save-post-button"`).
   - Assert version is bumped to `v2` and status is reset to `In Review`.
4. **R4: Connectors Sandbox Resilience & Live OAuth Controls**:
   - Navigate to `/connectors`.
   - Click "Probe All" and verify health probe latency badges appear on connector cards.
   - On Sandbox connector (e.g. LinkedIn or X), click "Fault Mode".
   - Verify modal opens (`Sandbox Fault Injection & Resilience Testing`).
   - Select `rate_limit` radio button (`Rate Limited (429)`), input retry delay (e.g. `60`), and submit.
   - Assert fault injected badge is visible on the connector card.
   - Reset fault mode back to normal (`none`) to leave environment clean.
   - On LinkedIn card, click "Go Live", verify Live LinkedIn OAuth modal opens, verify `w_member_social` permission description, AES-256-GCM encryption statement, and safety confirmation checkbox.
5. **Execution Verification**:
   - Run: `pnpm exec playwright test tests/e2e/04-workflow-journey.spec.ts`
   - Run: `pnpm typecheck`
   - Run: `pnpm lint`
   - Ensure all tests pass cleanly with 0 failures, 0 type errors, 0 lint warnings.

## Deliverable
Write your complete report to:
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey\handoff.md`
Report commands run, test execution outputs, and pass status.


## 2026-10-28T06:36:26Z
[Message] timestamp=2026-10-28T06:36:26Z sender=b5ced653-3c5c-49c2-84e3-7d97f7ecb40c priority=MESSAGE_PRIORITY_HIGH
You are the Worker: E2E Spec Author and Test Runner.
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey
Read your dispatch instructions in: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey\DISPATCH.md
MANDATORY: Read c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement tests/e2e/04-workflow-journey.spec.ts adhering to the findings of Explorers 1, 2, and 3.
Run tests via:
pnpm exec playwright test tests/e2e/04-workflow-journey.spec.ts
Run pnpm typecheck and pnpm lint.
Record all command outputs and results in c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\worker_workflow_journey\handoff.md.
When finished, send a message to the orchestrator (conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c) with your summary and handoff path.
