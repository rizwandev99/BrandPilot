# BRIEFING — 2026-10-27T07:18:00Z

## Mission
Lead the end-to-end development and verification of PostPilot (BrandPilot), a complete AI marketing agent platform for social media with R1-R6 features and all Section 9 Acceptance Criteria (AC-F0-01 through AC-F11-08) verified by automated tests.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_orchestrator_1
- Original parent: Sentinel / Parent Agent
- Original parent conversation ID: 4c2672d6-3c60-4bd5-a1d5-f11e60765b61

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation Track + E2E Testing Track)
- **Scope document**: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
1. **Decompose**:
   - Survey via 3 parallel spec miners / explorers to map features, ACs, contracts, dependencies
   - Synthesize survey findings into PROJECT.md
   - Decompose into modular milestones (F0 Foundation, F1 Workspace, F11/Part1 LLM, F2 Brand Kit, F3 Content Agent, F4 Connector Framework, F5 Approval Queue & Calendar, F6 Scheduler, F7 Connectors UI, F8 Webhooks, F9 Automations, F11/Part2 Quotas & Guardrails, F10 Demo & Docs)
   - Spawn E2E Testing Orchestrator in parallel for test suite and runner
   - Spawn Sub-orchestrators for milestones respecting dependencies
2. **Dispatch & Execute**:
   - Delegate milestones to Sub-orchestrators (or direct iteration loops: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate)
   - Maintain write ownership and file boundaries
   - Require workers to run builds and tests; do not write code or run tests directly
3. **On failure**:
   - Retry -> Replace -> Skip (non-critical) -> Redistribute -> Redesign -> Escalate
   - Zero tolerance on forensic audit integrity violations
4. **Succession**:
   - Self-succeed at 16 spawns after active subagents deliver handoffs
- **Work items**:
  1. Survey & Scope Mapping [in-progress]
  2. PROJECT.md & TEST_INFRA.md initialization [pending]
  3. Milestone Sub-orchestrator Dispatch [pending]
  4. Final Milestone & Verification [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Survey Spec Miners active mapping PRD.md

## 🔒 Key Constraints
- DISPATCH-ONLY orchestrator. Delegate ALL work to subagents.
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands directly.
- NEVER investigate code directly — dispatch Explorers / Spec Miners.
- Metadata/state files (.md) in .agents/teamwork/ only.
- Audit is a binary veto (zero tolerance for cheating/dummy implementations).
- Never reuse a subagent after it has delivered handoff.
- Maximum subagent concurrency within quota.

## Current Parent
- Conversation ID: 4c2672d6-3c60-4bd5-a1d5-f11e60765b61
- Updated: 2026-10-27T07:16:00Z

## Key Decisions Made
- Project classified as Greenfield Build under Project Pattern.
- Dual Track structure adopted: Implementation Track + E2E Testing Track.
- High-concurrency strategy per user request: parallel explorers/spec miners, parallel sub-orchestrators for independent modules.
- Phase 0 Survey initiated with 3 specialized Spec Miners.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| spec_miner_1 | teamwork_preview_spec_miner | Survey: F0, F1, F11, F10 | in-progress | 146cf5fe-21fa-4bac-b502-8be5c76d1491 |
| spec_miner_2 | teamwork_preview_spec_miner | Survey: F2, F3, F5, F7 | in-progress | 9fdd0ef4-43e7-4783-bf13-8c91913fa69f |
| spec_miner_3 | teamwork_preview_spec_miner | Survey: F4, F6, F8, F9 | in-progress | 40138934-f9f8-434d-b0f7-883f51a68e63 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 146cf5fe-21fa-4bac-b502-8be5c76d1491, 9fdd0ef4-43e7-4783-bf13-8c91913fa69f, 40138934-f9f8-434d-b0f7-883f51a68e63
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-33 (*/10 * * * *)
- Safety timer: pending

## Artifact Index
- c:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md — Authoritative PRD
- c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md — User request
- c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_orchestrator_1\DISPATCH.md — Dispatch log
- c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_orchestrator_1\progress.md — Progress & Liveness
