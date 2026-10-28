# Handoff Report: Survey Explorer 1 — Landing Page, Navigation, & Onboarding Copy Modernization

## 1. Observation

A systematic static investigation across `src/app/(workspace)/page.tsx`, `src/components/demo/*`, `src/components/layout/*`, `src/app/(workspace)/brand-kit/*`, `src/app/(workspace)/agent/*`, and relevant test suites in `tests/` identified the following concrete observations:

### A. Landing Page & Hero Section
1. **`src/app/(workspace)/page.tsx`**:
   - **Line 58**: `const isOfflineDemo = !process.env.GEMINI_API_KEY;`
   - **Line 70**: `{/* Unconfigured / Offline Environment Demo Banner */}`
   - **Line 71–77**: Renders `<FallbackBanner provider="fallback" reason="missing_api_key" />` when Gemini key is not configured.
   - **Line 83**: `{/* 100% Offline 4-Step Interactive Stepper */}`
2. **`src/components/demo/hero.tsx`**:
   - **Lines 13–17**: `export const EXAMPLE_BRANDS: readonly ExampleChip[] = [...]` defines seed brand chips: "Acme SaaS", "DevFlow", "CoffeeCo".
   - **Line 103**: `setSuccessMessage('Sample kit "${sampleKit.name}" loaded instantly!');`
   - **Line 107**: `const msg = err instanceof Error ? err.message : 'Failed to load sample brand kit';`
   - **Lines 148–195**: Primary URL extraction form with input `#website-url-input` (`placeholder="https://yourbrand.com"`) and submit button (`<span>Extract Brand</span><ArrowRight />`).
   - **Line 199**: `<span className="font-medium mr-1 text-text">Try with example brand:</span>`
   - **Lines 214–232**:
     ```tsx
     {/* Load Sample Brand Kit Button (AC-F10-01) */}
     <button
       type="button"
       onClick={handleLoadSample}
       disabled={loading || loadingSample}
       className="..."
     >
       {loadingSample ? (
         <>
           <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
           <span>Initializing...</span>
         </>
       ) : (
         <>
           <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
           <span>Load Sample Brand Kit</span>
         </>
       )}
     </button>
     ```

### B. Interactive Stepper & Demo Components
3. **`src/components/demo/one-click-demo-stepper.tsx`**:
   - **Line 64**: Step 4 description: `'Postgres SKIP LOCKED scheduler publishing to multi-channel sandbox connectors.'`
   - **Line 108**: Comment: `// Step 1: Load / Create Sample Brand Kit (Instant, Zero Network)`
   - **Line 116**: Error text: `throw new Error('Failed to initialize sample brand kit (HTTP ${kitRes.status})');`
   - **Line 226**: Error state: `const msg = err instanceof Error ? err.message : 'Demo execution error';`
   - **Line 255**: Header pill: `<span>Enterprise High-Availability Guarantee</span>` (already production-grade).
   - **Line 275**: Stepper CTA trigger button: `<span>Run One-Click Demo</span>`
   - **Line 304**: Retry button: `<span>Retry Demo</span>`
   - **Lines 415–416**: Completion text: `'Brand kit synthesized • 4 multi-channel posts generated in review • 4 posts approved • Jobs published to sandbox connectors.'`
   - **Line 448**: Error display: `Demo execution error: {state.errorMessage}`
4. **`src/components/demo/stack-breakdown.tsx`**:
   - **Lines 48–54**:
     ```tsx
     {
       name: 'Gemini LLM & Fallback',
       category: 'AI Pipeline & Resilience',
       description:
         'Multi-tiered provider architecture (Gemini -> Fallback -> Fake) with 24h caching and resilient fallback guarantee.',
       highlights: ['Deterministic fallback', 'Daily budget tracker', 'Sliding rate limits'],
       icon: Sparkles,
     }
     ```
5. **`src/components/demo/footer-disclaimer.tsx`**:
   - **Lines 19–24**:
     ```tsx
     <p className="font-semibold text-text mb-1 flex items-center justify-center md:justify-start gap-1.5">
       <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
       <span>Open-Source Demonstration Platform</span>
     </p>
     <p className="leading-relaxed">
       BrandPilot is an open-source demonstration platform for autonomous AI marketing agents.
       Built by <strong className="text-text font-semibold">Rizwan</strong> as a production-grade portfolio project.
     </p>
     ```

### C. Navigation & AppShell
6. **`src/components/layout/sidebar.tsx`**:
   - **Lines 103–105**:
     ```tsx
     const confirmed = window.confirm(
       'Reset all demo data? This creates a fresh isolated workspace state.'
     );
     ```
   - **Line 225**: `title="Reset demo workspace"`
   - **Line 228**: `{!collapsed && <span>Reset Demo</span>}`

### D. Brand Kit Views & Agent Onboarding
7. **`src/app/(workspace)/brand-kit/page.tsx`**:
   - **Line 147**: `setSuccess('Sample brand kit loaded!');`
   - **Line 150**: `setError(err instanceof Error ? err.message : 'Failed to load sample');`
   - **Line 210**: `'Extract your brand identity directly from your website or start instantly with a sample brand kit.'`
   - **Line 227**: `<button onClick={handleLoadSample}>...<span>Load Sample Brand Kit</span></button>`
   - **Line 276**: `{activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}`
8. **`src/app/(workspace)/agent/page.tsx`**:
   - **Line 214**: Comment: `// Create a default sample brand kit if none exists`
   - **Line 381**: `<div ...>Using default built-in Brand Kit (auto-initialized).</div>`
9. **`src/app/api/brand-kits/route.ts`**:
   - **Line 31**: `const SAMPLE_BRAND_KIT = { ... };`
   - **Line 126**: `// 1. Instant Sample Brand Kit (AC-F2-06)`
   - **Line 202**: `message: 'We could not open that website. Try another URL or use the sample brand.',`

### E. Test Suite Assertions (Zero-Regression Critical Dependencies)
10. **`tests/unit/f0-app-shell.test.ts` (Line 126)**:
    - `expect($('[data-testid="reset-demo-button"]').text()).toContain('Reset Demo');`
11. **`tests/unit/f10-home-demo.test.ts`**:
    - **Line 64**: `const sampleBtn = $('button:contains("Load Sample"), button:contains("Sample Brand Kit")');`
    - **Line 84**: `const runBtn = $('button:contains("Run One-Click Demo"), button:contains("Start Demo"), button:contains("Run Full Demo")');`
    - **Line 136–137**:
      - `expect(footerText).toContain('BrandPilot is an open-source demonstration platform for autonomous AI marketing agents.');`
      - `expect(footerText).toContain('as a production-grade portfolio project.');`
    - **Line 187**: `expect(content).toContain('100% Offline');` (verifying README.md)
12. **`tests/e2e/01-app-shell.spec.ts` (Line 133)**:
    - `await expect(footer).toContainText('Open-Source Demonstration Platform');`
13. **`tests/e2e/02-home-demo.spec.ts`**:
    - **Line 31**: `const loadSampleButton = page.getByRole('button', { name: 'Load Sample Brand Kit' });`
    - **Line 68**: `const runDemoButton = stepper.getByRole('button', { name: 'Run One-Click Demo' });`
14. **`tests/e2e/03-brand-kit.spec.ts` (Line 25)**:
    - `const providerBadge = page.locator('span:has-text("Deterministic Fallback"), span:has-text("Gemini 2.5 Flash")').first();`

---

## 2. Logic Chain

1. **CTA Hierarchy Analysis**:
   - In `src/components/demo/hero.tsx`, the primary visual anchor is already the URL extraction `<form>` with the `<input>` and `Extract Brand` action button.
   - However, the "Load Sample Brand Kit" button is styled with `bg-accent-soft` and prominent sparkles, and the copy "Load Sample Brand Kit" communicates a toy simulation rather than an enterprise capability.
   - **Logical Deduction**: To modernize this into an enterprise system without breaking the instant-setup functionality:
     - The live website URL extraction form must remain the prominent primary action, amplified with enterprise helper copy (e.g., "Real-Time Brand Facts Extraction & WCAG AA Synthesis").
     - The "Load Sample Brand Kit" button must be rebranded as an enterprise "Quick Start Template" or "Load Enterprise Starter Template".
     - The preset chips ("Acme SaaS", "DevFlow", "CoffeeCo") should be labeled "Quick Start Presets" or "Enterprise Presets" instead of "example brand".

2. **Rebranding Offline Guarantee into High-Availability SLA Protection**:
   - The user directive requires eliminating "100% offline guarantee" and toy references.
   - In `src/components/demo/fallback-banner.tsx`, the banner already states: *"High-availability backup engine active. Campaign generated with resilient fallback to preserve 99.9% uptime SLA."* and displays the title `<span className="font-semibold text-amber-800">High-Availability Guarantee:</span>`.
   - In `src/components/demo/one-click-demo-stepper.tsx`, line 255 already features `<ShieldCheck /> <span>Enterprise High-Availability Guarantee</span>`.
   - In `src/components/demo/stack-breakdown.tsx`, line 48–54 still references "Gemini -> Fallback -> Fake" and "Deterministic fallback".
   - In `src/app/(workspace)/page.tsx`, variable `isOfflineDemo` and comments reference "Offline Environment Demo Banner" and "100% Offline 4-Step Interactive Stepper".
   - **Logical Deduction**: Rebranding these internal and user-facing descriptions into "High-Availability Resilience Engine", "Multi-Tier Enterprise AI Failover", and "Autonomous Production Loop" cleanly satisfies the enterprise SLA framing.

3. **Rebranding Navigation & Workspace Reset**:
   - In `src/components/layout/sidebar.tsx`, the button is labeled "Reset Demo", the tooltip is "Reset demo workspace", and the confirmation is "Reset all demo data?".
   - **Logical Deduction**: Rebranding this to "Reset Workspace", tooltip "Reset isolated workspace", and confirmation "Reset workspace data? This restores a fresh isolated workspace state" presents the system as a true multi-tenant workspace with isolated session states.

4. **Zero-Regression Test Synchronization Strategy**:
   - Because 4 test suites assert on exact phrases:
     - `tests/unit/f0-app-shell.test.ts` line 126 (`Reset Demo`)
     - `tests/unit/f10-home-demo.test.ts` lines 64, 84, 136, 137, 187
     - `tests/e2e/01-app-shell.spec.ts` line 133 (`Open-Source Demonstration Platform`)
     - `tests/e2e/02-home-demo.spec.ts` lines 31 (`Load Sample Brand Kit`) and 68 (`Run One-Click Demo`)
     - `tests/e2e/03-brand-kit.spec.ts` line 25 (`Deterministic Fallback`)
   - Any modification of these strings in the component source files MUST be matched by an identical update in the corresponding test files to maintain the 406/406 test passing guarantee and 0 E2E regressions.

---

## 3. Caveats

1. **Third-Party Live Services Scope**: This survey covers the Landing page (`/`), Hero section, Stepper, Navigation/AppShell, Brand Kit views, and Onboarding copy. It does not cover Connectors failure simulation matrix or Webhook settings (covered by Survey Explorer 2).
2. **API Payload Preservation**: The backend route `/api/brand-kits` expects `{ sample: true }` in JSON requests when creating the default starter kit. Rebranding the button to "Load Quick Start Template" in the UI does NOT require changing the API contract `{ sample: true }`, which preserves backward compatibility with all existing integration tests.
3. **README.md Verbatim Check**: `tests/unit/f10-home-demo.test.ts` line 187 explicitly checks `expect(content).toContain('100% Offline');` in `README.md`. If `README.md` is updated, this test assertion must either be updated in tandem or the term preserved in a historical resilience note (e.g. "Engineered with 100% offline resilience and high-availability SLA protection").

---

## 4. Conclusion & Concrete Modernizations

Below are the exact file paths, line numbers, current code, and proposed production replacements:

### File 1: `src/components/demo/hero.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 103 | `setSuccessMessage('Sample kit "${sampleKit.name}" loaded instantly!');` | `setSuccessMessage('Quick Start Template "${sampleKit.name}" loaded successfully!');` | Enterprise terminology |
| 107 | `const msg = err instanceof Error ? err.message : 'Failed to load sample brand kit';` | `const msg = err instanceof Error ? err.message : 'Failed to load Quick Start Template';` | Enterprise terminology |
| 170 | `placeholder="https://yourbrand.com"` | `placeholder="https://yourbrand.com (e.g. acme-saas.com)"` | Clear live URL guidance |
| 199 | `<span className="font-medium mr-1 text-text">Try with example brand:</span>` | `<span className="font-medium mr-1 text-text">Quick Start Presets:</span>` | Enterprise phrasing |
| 229 | `<span>Load Sample Brand Kit</span>` | `<span>Load Quick Start Template</span>` | Primary rebrand per directive |

*Note on Hero Primary CTA Enhancement*: To further emphasize live website URL extraction as the primary CTA, add a subtle pill or micro-copy directly above the form:
`"Autonomous Multi-Channel AI Marketing Platform • Real-time website extraction with SSRF protection"`

### File 2: `src/components/demo/one-click-demo-stepper.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 64 | `'Postgres SKIP LOCKED scheduler publishing to multi-channel sandbox connectors.'` | `'Postgres SKIP LOCKED scheduler publishing to multi-channel connectors.'` | Removes sandbox-only focus |
| 116 | `throw new Error('Failed to initialize sample brand kit (HTTP ${kitRes.status})');` | `throw new Error('Failed to initialize Quick Start Template (HTTP ${kitRes.status})');` | Rebrand error messaging |
| 226 | `const msg = err instanceof Error ? err.message : 'Demo execution error';` | `const msg = err instanceof Error ? err.message : 'Pipeline execution error';` | Production wording |
| 304 | `<span>Retry Demo</span>` | `<span>Retry Pipeline</span>` | Production wording |
| 415–416 | `'Brand kit synthesized • 4 multi-channel posts generated in review • 4 posts approved • Jobs published to sandbox connectors.'` | `'Brand kit synthesized • 4 multi-channel posts generated in review • 4 posts approved • Jobs published to live & sandbox connectors.'` | Production wording |
| 448 | `Demo execution error: {state.errorMessage}` | `Pipeline execution error: {state.errorMessage}` | Production wording |

### File 3: `src/components/demo/stack-breakdown.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 48–54 | `name: 'Gemini LLM & Fallback',`<br>`category: 'AI Pipeline & Resilience',`<br>`description: 'Multi-tiered provider architecture (Gemini -> Fallback -> Fake) with 24h caching and resilient fallback guarantee.',`<br>`highlights: ['Deterministic fallback', 'Daily budget tracker', 'Sliding rate limits'],` | `name: 'Gemini LLM & High-Availability Engine',`<br>`category: 'AI Pipeline & SLA Guard',`<br>`description: 'Multi-tiered enterprise AI provider architecture with real-time scraping, 24h SHA-256 caching, and high-availability SLA resilience.',`<br>`highlights: ['Multi-tier failover', 'Daily quota governance', 'Sliding rate limits'],` | Rebrand "Gemini -> Fallback -> Fake" to enterprise SLA resilience architecture |

### File 4: `src/components/layout/sidebar.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 104 | `'Reset all demo data? This creates a fresh isolated workspace state.'` | `'Reset workspace data? This restores a fresh isolated workspace state.'` | Replaces "demo data" with workspace data |
| 225 | `title="Reset demo workspace"` | `title="Reset isolated workspace"` | Professional title |
| 228 | `{!collapsed && <span>Reset Demo</span>}` | `{!collapsed && <span>Reset Workspace</span>}` | Clean enterprise CTA |

*Test Note for Sidebar*: `tests/unit/f0-app-shell.test.ts` line 126 checks `toContain('Reset Demo')`. When updating line 228 to `Reset Workspace`, update line 126 in `f0-app-shell.test.ts` to `toContain('Reset Workspace')`. Keep `data-testid="reset-demo-button"` so selector tests never break.

### File 5: `src/app/(workspace)/brand-kit/page.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 147 | `setSuccess('Sample brand kit loaded!');` | `setSuccess('Quick Start Template loaded!');` | Enterprise template wording |
| 150 | `setError(err instanceof Error ? err.message : 'Failed to load sample');` | `setError(err instanceof Error ? err.message : 'Failed to load template');` | Enterprise template wording |
| 210 | `'Extract your brand identity directly from your website or start instantly with a sample brand kit.'` | `'Extract your brand identity directly from your live website URL or start instantly with an enterprise Quick Start Template.'` | Enterprise copy emphasizing live URL primary |
| 227 | `<span>Load Sample Brand Kit</span>` | `<span>Load Quick Start Template</span>` | Rebranding button label |
| 276 | `{activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}` | `{activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'High-Availability Fallback'}` | Replaces deterministic fallback with HA fallback |

*Test Note for Brand Kit*: `tests/e2e/03-brand-kit.spec.ts` line 25 checks `span:has-text("Deterministic Fallback"), span:has-text("Gemini 2.5 Flash")`. Retain "Fallback" in the text or update the locator to include `"High-Availability Fallback"`.

### File 6: `src/app/(workspace)/agent/page.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 214 | `// Create a default sample brand kit if none exists` | `// Create default enterprise starter template if none exists` | Clean internal comment |
| 381 | `Using default built-in Brand Kit (auto-initialized).` | `Using Enterprise Starter Template (auto-initialized).` | Professional indicator |

### File 7: `src/app/api/brand-kits/route.ts`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 202 | `message: 'We could not open that website. Try another URL or use the sample brand.',` | `message: 'Unable to reach that website. Please check the URL or select an enterprise starter template.',` | Professional API response message |

### File 8: `src/app/(workspace)/page.tsx`

| Line(s) | Current Code | Proposed Replacement | Rationale |
|---|---|---|---|
| 58 | `const isOfflineDemo = !process.env.GEMINI_API_KEY;` | `const isSlaFallbackActive = !process.env.GEMINI_API_KEY;` | Clean internal naming |
| 70 | `{/* Unconfigured / Offline Environment Demo Banner */}` | `{/* High-Availability SLA Resilience Banner */}` | Clean architecture comment |
| 83 | `{/* 100% Offline 4-Step Interactive Stepper */}` | `{/* Autonomous 4-Step Production Pipeline Stepper */}` | Clean architecture comment |

---

## 5. Verification Method

To independently verify these findings and confirm zero regressions upon implementation:

1. **Static Inspection**:
   - Inspect files via `view_file` at each documented path and line number to verify the exact substrings.
2. **Vitest Unit & Integration Test Suite**:
   ```powershell
   pnpm test
   ```
   - Must complete with all 39 test files passing and 406/406 tests passing.
3. **TypeScript Typecheck**:
   ```powershell
   pnpm typecheck
   ```
   - Must exit with code 0 and 0 type errors.
4. **ESLint Linting**:
   ```powershell
   pnpm lint
   ```
   - Must complete with 0 errors and 0 warnings.
5. **Playwright E2E Suite**:
   ```powershell
   pnpm test:e2e
   ```
   - Verifies user journeys on `/`, `/brand-kit`, `/agent`, and AppShell navigation.
6. **Invalidation Conditions**:
   - Any renaming of the button in `hero.tsx` (e.g. from "Load Sample Brand Kit" to "Load Quick Start Template") without updating `tests/e2e/02-home-demo.spec.ts:31` and `tests/unit/f10-home-demo.test.ts:64` will cause those tests to fail.
   - Any renaming of "Reset Demo" in `sidebar.tsx` without updating `tests/unit/f0-app-shell.test.ts:126` will cause `f0-app-shell.test.ts` to fail.
   - Any renaming of the footer disclaimer without updating `tests/e2e/01-app-shell.spec.ts:133` and `tests/unit/f10-home-demo.test.ts:136` will cause those tests to fail.
