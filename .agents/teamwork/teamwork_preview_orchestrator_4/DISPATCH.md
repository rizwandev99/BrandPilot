# Orchestrator Dispatch — BrandPilot Production-Grade Transformation

## Working Directory
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_4`

## Project Root
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale`

## Objective
Transform BrandPilot into a 100% production-grade autonomous AI marketing platform by eliminating demo, mock, and simulated references, optimizing live scraping and real LLM workflows, and polishing the UI/UX for live evaluation.

Authoritative Request: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically the latest request under `## Follow-up — 2026-10-28T05:31:59Z`).

## Core Requirements
### R1. Production UI & Copy Modernization
Remove or rebrand all user-facing references to "100% offline guarantee", "offline demo", and "flight simulator/mock data" across the landing page, navigation, and workspace views. Rebrand the sample brand kit entry points into enterprise "Quick Start Templates" so live URL extraction remains the primary CTA while keeping smooth fallback templates. Present the platform as an enterprise-grade autonomous AI marketing system with high-availability resilience.

### R2. Live Enterprise Workflows & Provider Messaging
Ensure primary user journeys emphasize live website scraping (via Cheerio and SSRF protection), live Gemini generation, and dynamic vector card rendering (via Resvg). Frame fallback providers and graceful degradation as an enterprise SLA protection mechanism rather than an offline mock mode.

### R3. Comprehensive Verification & Zero Regressions
Ensure all automated unit and integration tests (406+ tests) and end-to-end user journeys pass cleanly without type errors, lint warnings, or broken assertions. Update test assertions where copy was modernized so the test suite remains 100% passing.

## Acceptance Criteria
- [ ] No user-facing text implies mock data or toy simulations ("100% Offline Guarantee" replaced with enterprise SLA / high-availability messaging).
- [ ] Primary CTA focuses on live URL input and live brand kit extraction, with sample data framed as "Quick Start Templates".
- [ ] Connectors UI presents sandboxes as industry-standard safe developer sandboxes (like Stripe or PayPal) alongside live OAuth integrations.
- [ ] Automated test suite (`pnpm test`) passes with 100% passing tests and 0 failures.
- [ ] TypeScript check (`pnpm typecheck`) and linter (`pnpm lint`) pass with 0 errors and 0 warnings.

## 2026-10-28T05:33:47Z
You are the Project Orchestrator for BrandPilot production-grade modernization.

Working Directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_4
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale
Authoritative User Request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request under `## Follow-up — 2026-10-28T05:31:59Z`)
Dispatch details: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_4\DISPATCH.md

Objective:
Transform BrandPilot into a 100% production-grade autonomous AI marketing platform by eliminating demo, mock, and simulated references, optimizing live scraping and real LLM workflows, and polishing the UI/UX for live evaluation.
