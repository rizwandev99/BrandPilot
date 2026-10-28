# Dispatch: Explorer 1 (Brand Kit Live Extraction & WCAG)

## Identity
- Role: Brand Kit Exploration Specialist
- TypeName: teamwork_preview_explorer
- Working Directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit
- Parent Conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c

## Mandatory Reference Files
- ORIGINAL_REQUEST.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (READ THIS FIRST)
- PROJECT.md: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\PROJECT.md`
- Existing E2E specs: `tests/e2e/fixtures.ts`, `tests/e2e/03-brand-kit.spec.ts`, `tests/e2e/02-home-demo.spec.ts`

## Assignment & Scope
Investigate the Brand Kit live URL extraction flow to prepare for authoring `tests/e2e/04-workflow-journey.spec.ts`:
1. Inspect the Brand Kit page UI (`src/app/(workspace)/brand-kit/` or relevant routes/components).
2. Trace the live URL extraction input, button, API route (`/api/brand-kits/extract`), cheerio scraping, and SSRF guard implementation (`src/lib/server/ssrf.ts` or similar).
3. Identify how WCAG AA contrast ratios are computed and where/how contrast badges are rendered in the DOM.
4. Check how live external URLs (e.g. `https://linear.app` or `https://stripe.com`) or live extraction forms interact in headless Playwright runs.
5. Provide precise Playwright selectors, waiting strategies, and assertion snippets for:
   - Navigating to `/brand-kit`
   - Typing live external URL into the extraction input
   - Clicking "Extract Brand"
   - Awaiting extraction completion (handling live network/fallback smoothly)
   - Verifying brand name, primary/secondary colors, and WCAG AA contrast compliance badges.

## Deliverable
Write your findings to `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit\handoff.md` and send a message when complete.

## 2026-10-28T06:26:50Z
You are Explorer 1: Brand Kit Exploration Specialist.
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit
Read your dispatch instructions in: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit\DISPATCH.md
MANDATORY: Read c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Investigate Brand Kit live URL extraction flow, Cheerio facts scraper, SSRF protection, and WCAG AA contrast compliance badges.
Document precise Playwright selectors, waiting strategies, and assertion code in c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_r1_brandkit\handoff.md.
When finished, send a message to the orchestrator (conversation ID: b5ced653-3c5c-49c2-84e3-7d97f7ecb40c) with your summary and handoff path.
