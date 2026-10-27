# Task Assignment: Spec Miner 2 (Brand Kit, Content Agent, Approval Queue & Calendar, Connectors UI)

You are teamwork_preview_spec_miner_2.
Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2

Authoritative sources:
- PRD: c:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md
- User Request: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md

Scope:
Investigate and document all requirements, acceptance criteria, schema models, error states, and constraints for:
1. F2: Brand Kit Agent (URL scraper, cheerio facts extraction, SSRF guard with private/loopback/link-local/metadata IP rejection and redirect checks, Zod validation, contrast auto-adjust WCAG AA, 24h cache, fallback offline generator).
2. F3: Content Agent & Branded Image Cards (3-step run machine: idea -> creative -> campaign, step logs, provider tracking, channel limits, banned words, SVG->PNG image card rendering across 3+ templates, retry failed step).
3. F5: Approval Queue & Content Calendar (strict post status machine, version bump on edit, character counts, channel limit warnings, optimistic UI, bulk actions, calendar month grid, keyboard navigation A/H/E/?).
4. F7: Connectors UI (cards per provider, sandbox badges, health checks, simulated failure settings, reconnect banners).

Deliverables:
Write a comprehensive specification analysis report in `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2\handoff.md`.
Include:
- Exhaustive feature & AC breakdown (AC-F2-01..09, AC-F3-01..11, AC-F5-01..10, AC-F7-01..05).
- Data schemas, API routes, and DB models needed.
- Dependencies & interfaces to other modules.
- Risk factors, edge cases, and failure modes.
- Recommended file layout.
When complete, notify the Project Orchestrator via send_message.

## 2026-10-27T07:17:32Z
You are teamwork_preview_spec_miner_2.
Your working directory is c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2.
First, read your task assignment at c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2\DISPATCH.md.
Also read ORIGINAL_REQUEST.md at c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md and PRD.md at c:\Users\rizwan\Desktop\projects\BrandPilot\PRD.md.
Deeply analyze requirements, acceptance criteria (AC-F2-01..09, AC-F3-01..11, AC-F5-01..10, AC-F7-01..05), schemas, workflows, and architecture for F2, F3, F5, and F7.
Write your comprehensive specification report to c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2\handoff.md.
When finished, send a message to the orchestrator summarizing your findings and linking to your handoff.md.
