# Dispatch: Explorer 3 (Approval Queue Hotkeys & Connectors Sandbox)

## Identity
- Role: Queue & Connectors Exploration Specialist
- TypeName: teamwork_preview_explorer
- Working Directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors
- Parent Conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c

## Mandatory Reference Files
- ORIGINAL_REQUEST.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (READ THIS FIRST)
- PROJECT.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\PROJECT.md`
- Relevant code: `src/app/(workspace)/queue/`, `src/app/(workspace)/connectors/`, components for queue keyboard shortcuts, version tracking, edit dialogs, connectors tabs, and sandbox sliders.

## Assignment & Scope
Investigate the Approval Queue and Connectors pages for `tests/e2e/04-workflow-journey.spec.ts`:
1. Approval Queue (`/queue`):
   - Keyboard navigation and hotkey bindings (`A` to approve, `E` to edit).
   - How a post card is focused or selected before pressing keys.
   - What UI actions or dialogs occur on pressing `A` and `E`.
   - The versioning and state-reset behavior: when an approved post is edited, how does version increment (e.g. v1 -> v2) and how does status reset to `in_review`?
   - DOM elements showing post status badges and version indicators.
2. Connectors (`/connectors`):
   - Tab switching between Sandbox Simulator and Live OAuth tabs.
   - Resilience controls: latency simulation sliders/inputs, rate-limit toggles/sliders.
   - Live OAuth tab: LinkedIn OAuth status, connect/configure buttons, and safety flags.
3. Provide exact Playwright selectors, keyboard trigger sequences (`page.keyboard.press('a')`, etc.), expected responses, and test assertion snippets in `handoff.md`.

## Deliverable
Write your findings to `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors\handoff.md` and send a message when complete.


## 2026-10-28T06:26:52Z
[Message] timestamp=2026-10-28T06:26:52Z sender=b5ced653-3c5c-49c2-84e3-7d97f7ecb40c priority=MESSAGE_PRIORITY_HIGH content=You are Explorer 3: Queue & Connectors Exploration Specialist.
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors
Read your dispatch instructions in: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors\DISPATCH.md
MANDATORY: Read c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Investigate Approval Queue (/queue) keyboard navigation (hotkeys A and E), post editing version bump, and reset to in_review, as well as Connectors (/connectors) Sandbox latency/rate-limit controls and Live OAuth tabs.
Document exact selectors, keyboard trigger sequences, and assertion code in c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r3_queue_connectors\handoff.md.
When finished, send a message to the orchestrator (conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c) with your summary and handoff path.
