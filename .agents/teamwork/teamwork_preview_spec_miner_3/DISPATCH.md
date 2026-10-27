# Task Assignment: Spec Miner 3 (Connector Framework, Scheduler & Publisher, Webhooks & Automations)

You are teamwork_preview_spec_miner_3.
Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3

Authoritative sources:
- PRD: c:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md
- User Request: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md

Scope:
Investigate and document all requirements, acceptance criteria, schema models, error states, and constraints for:
1. F4: Connector Framework (Connector TypeScript interface, registry, sandbox adapters for Instagram, X, Facebook, LinkedIn with simulated failure controls, live LinkedIn OAuth adapter with AES-GCM token encryption, shared contract tests).
2. F6: Scheduler and Publisher (schedule-approved endpoint, run-due runner, concurrency locks, exponential backoff with jitter retry policy, idempotencyKey handling, cron endpoint with secret).
3. F8: Webhooks and Activity Log (HMAC-SHA256 verification over raw body with timing-safe equal, 5-minute replay window, event deduplication, outgoing webhook signer & backoff delivery, SSRF guard, built-in receiver, activity event feed).
4. F9: Automations Engine (pure rule evaluation engine: trigger-condition-action, AND logic, path evaluation, AI on-brand check with keyword fallback, action execution, loop protection / recursion depth limit, dry-run test mode).

Deliverables:
Write a comprehensive specification analysis report in `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3\handoff.md`.
Include:
- Exhaustive feature & AC breakdown (AC-F4-01..09, AC-F6-01..09, AC-F8-01..09, AC-F9-01..09).
- Data schemas, API routes, and DB models needed.
- Dependencies & interfaces to other modules.
- Risk factors, edge cases, and failure modes.
- Recommended file layout.
When complete, notify the Project Orchestrator via send_message.

## 2026-10-27T07:17:32Z
You are teamwork_preview_spec_miner_3.
Your working directory is c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3.
First, read your task assignment at c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3\DISPATCH.md.
Also read ORIGINAL_REQUEST.md at c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md and PRD.md at c:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md.
Deeply analyze requirements, acceptance criteria (AC-F4-01..09, AC-F6-01..09, AC-F8-01..09, AC-F9-01..09), schemas, policies, and architecture for F4, F6, F8, and F9.
Write your comprehensive specification report to c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and linking to your handoff.md.
