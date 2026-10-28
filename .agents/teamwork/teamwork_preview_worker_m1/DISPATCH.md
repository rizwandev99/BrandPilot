# Dispatch: Worker M1 — UI & Onboarding Copy Modernization + Baseline Test Alignment

## Working Directory
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m1`

## Project Root
`c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale`

## Input References
- User Request: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically `## Follow-up — 2026-10-28T05:31:59Z`)
- Explorer 1 Handoff Blueprint: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md`
- Explorer 3 Test Assertion Mapping: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md`
- Scope: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_orchestrator_4\SCOPE.md`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/demo/hero.tsx`
- `src/components/demo/one-click-demo-stepper.tsx`
- `src/components/demo/stack-breakdown.tsx`
- `src/components/layout/sidebar.tsx`
- `src/app/(workspace)/page.tsx`
- `src/app/(workspace)/brand-kit/page.tsx`
- `src/app/(workspace)/agent/page.tsx`
- `src/app/api/brand-kits/route.ts`
- `tests/unit/f0-app-shell.test.ts`
- `tests/unit/f10-home-demo.test.ts`
- `tests/e2e/02-home-demo.spec.ts`
- `tests/e2e/03-brand-kit.spec.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. **Hero (`src/components/demo/hero.tsx`):**
   - Live URL extraction form is primary CTA.
   - Rebrand "Load Sample Brand Kit" button to "Load Quick Start Template".
   - Rebrand "Try with example brand:" to "Quick Start Presets:".
   - Rebrand success message to `'Quick Start Template "${sampleKit.name}" loaded successfully!'`.
2. **Interactive Stepper (`src/components/demo/one-click-demo-stepper.tsx`):**
   - Rebrand Step 4 description to `'Postgres SKIP LOCKED scheduler publishing to multi-channel connectors.'`.
   - Rebrand error messages from "Demo execution error" to "Pipeline execution error".
   - Rebrand button label from "Retry Demo" to "Retry Pipeline".
   - Rebrand completion text: `'Brand kit synthesized • 4 multi-channel posts generated in review • 4 posts approved • Jobs published to live & sandbox connectors.'`.
3. **Stack Breakdown (`src/components/demo/stack-breakdown.tsx`):**
   - Rebrand "Gemini LLM & Fallback" to "Gemini LLM & High-Availability Engine".
   - Category: "AI Pipeline & SLA Guard".
   - Description: "Multi-tiered enterprise AI provider architecture with real-time scraping, 24h SHA-256 caching, and high-availability SLA resilience.".
   - Highlights: `['Multi-tier failover', 'Daily quota governance', 'Sliding rate limits']`.
4. **Sidebar Navigation (`src/components/layout/sidebar.tsx`):**
   - Line 104: `'Reset workspace data? This restores a fresh isolated workspace state.'`.
   - Line 225: `title="Reset isolated workspace"`.
   - Line 228: `{!collapsed && <span>Reset Workspace</span>}` (keep `data-testid="reset-demo-button"`).
5. **Brand Kit Page (`src/app/(workspace)/brand-kit/page.tsx`):**
   - Rebrand "Load Sample Brand Kit" to "Load Quick Start Template".
   - Rebrand provider badge from `'Deterministic Fallback'` to `'High-Availability Fallback'` or `'High-Availability Engine (SLA Fallback)'`.
   - Rebrand copy: `'Extract your brand identity directly from your live website URL or start instantly with an enterprise Quick Start Template.'`.
6. **Agent Page (`src/app/(workspace)/agent/page.tsx`):**
   - Line 381: `Using Enterprise Starter Template (auto-initialized).`.
   - Format provider badge nicely (Live Gemini 2.5 Flash / High-Availability SLA Engine).
7. **API Route (`src/app/api/brand-kits/route.ts`):**
   - Line 202: `message: 'Unable to reach that website. Please check the URL or select an enterprise starter template.',`.
8. **Page comments & variables (`src/app/(workspace)/page.tsx`):**
   - Update `isOfflineDemo` to `isSlaFallbackActive` or clean naming, update header comments.
9. **Synchronize Test Assertions:**
   - `tests/unit/f0-app-shell.test.ts:126`: Update to check `expect($('[data-testid="reset-demo-button"]').text()).toContain('Reset Workspace');`.
   - `tests/unit/f10-home-demo.test.ts:64`: Update selector to check `button:contains("Quick Start Template"), button:contains("Load Sample"), button:contains("Sample Brand Kit")`.
   - `tests/unit/f10-home-demo.test.ts:84`: Ensure stepper button selector matches.
   - `tests/e2e/02-home-demo.spec.ts:31`: Update locator to `page.getByRole('button', { name: /Quick Start Template|Load Sample Brand Kit/i })`.
   - `tests/e2e/03-brand-kit.spec.ts:25`: Update locator to include `span:has-text("High-Availability")` alongside existing text options. Add `{ timeout: 15000 }` to line 80 if needed.
10. **Run Verification Commands:**
    - `pnpm test` (verify all 406 tests pass)
    - `pnpm typecheck` (verify 0 errors)
    - `pnpm lint` (verify 0 warnings/errors)
    - Document command outputs and exit codes in your handoff report.

Write your final report to `.agents/teamwork/teamwork_preview_worker_m1/handoff.md`.


## 2026-10-28T05:48:14Z
You are Worker M1 for BrandPilot production-grade modernization.
Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m1
Read your dispatch: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m1\DISPATCH.md
Read the user request: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\ORIGINAL_REQUEST.md (specifically ## Follow-up — 2026-10-28T05:31:59Z)
Read Explorer 1 blueprint: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md
Read Explorer 3 test assertion mapping: c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement UI & Onboarding Copy Modernization and synchronize baseline test assertions across your owned files.
After editing the files, execute the verification commands:
- pnpm test (must pass with 0 failures)
- pnpm typecheck (must pass with 0 errors)
- pnpm lint (must pass with 0 warnings)
Document your edits, commands run, test counts, and exit codes in:
c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_worker_m1\handoff.md
Send a completion message when done.
