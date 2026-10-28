# Handoff Report: Survey Explorer 2 — Connectors, Webhooks & Provider Messaging Modernization

## 1. Observation

A full forensic survey was performed across the Connectors UI (`/connectors`), Webhooks UI (`/webhooks`), provider status/execution messaging, layout controls, and test suites. The direct observations below document exact file paths, line numbers, current verbatim strings, and test dependencies.

---

### A. Connectors UI (`/connectors` and related components)

1. **`src/app/(workspace)/connectors/page.tsx`**
   - **Lines 358–360**:
     ```tsx
     <p className="mt-1 text-xs text-text-muted">
       Manage multi-channel social publishing adapters, probe channel latency, and verify resilience in sandbox environments (like Stripe Sandbox).
     </p>
     ```
   - **Lines 377–386**:
     ```tsx
     {/* Reset to sandbox defaults (AC-F7-05) */}
     <button
       type="button"
       onClick={handleResetSandboxDefaults}
       disabled={refreshing || loading}
       className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
       title="Reset all 4 connectors to clean default connected sandbox state"
     >
       <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
       <span>Reset Defaults</span>
     </button>
     ```
   - **Line 267**:
     ```ts
     if (!confirm('Reset all 4 social connectors to clean default connected sandbox state?')) {
     ```
   - **Line 291**:
     ```ts
     setPageSuccess('Reset all 4 connectors to default Sandbox connected state.');
     ```
   - **Line 175**:
     ```ts
     setPageSuccess(`${PROVIDER_METADATA[connector.provider].name} connected in Sandbox mode.`);
     ```
   - **Line 235–237**:
     ```ts
     setPageSuccess(
       `Updated ${PROVIDER_METADATA[provider].name} simulation mode to "${mode}".`
     );
     ```
   - **Lines 436–462**:
     ```tsx
     {/* Advanced Failure Simulator Collapsible Section (AC-F7-03) */}
     <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
       <button
         type="button"
         onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
         className="flex w-full items-center justify-between text-left focus:outline-none"
         aria-expanded={isAdvancedOpen}
       >
         <div className="flex items-center gap-2.5">
           <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-text">
             <Sliders className="h-4 w-4" aria-hidden="true" />
           </div>
           <div>
             <div className="flex items-center gap-2">
               <h3 className="text-sm font-semibold text-text">
                 Advanced: Fault Injection & Simulation Matrix
               </h3>
               {activeSimulationCount > 0 && (
                 <span className="inline-flex rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-warning">
                   {activeSimulationCount} active fault{activeSimulationCount > 1 ? 's' : ''}
                 </span>
               )}
             </div>
             <p className="text-xs text-text-muted">
               Control failure behavior across all sandbox connectors to test publisher retries and backoff.
             </p>
           </div>
         </div>
     ```
   - **Lines 501–504**:
     ```tsx
     <div className="text-[11px] text-text-muted truncate">
       {simMode === 'none'
         ? 'Operating normally'
         : `Simulating ${simMode}`}
     </div>
     ```
   - **Lines 507–513**:
     ```tsx
     <button
       type="button"
       onClick={() => setActiveSimulatorConnector(connector)}
       className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-text hover:bg-surface-2 hover:border-text-muted transition-colors"
     >
       Configure Fault
     </button>
     ```
   - **Lines 521–524**:
     ```tsx
     <div>
       <span className="font-medium text-text">How Failure Simulation Works: </span>
       When a simulated error is configured for a provider, any publish jobs dispatched by the scheduler or manual &quot;Publish now&quot; actions will encounter that error. BrandPilot will verify its exponential backoff algorithm with jitter (temporary/500), respect retry-after windows (rate_limit/429), reject permanently without retry (permanent/400), or trigger reconnect warnings (auth_expired/401).
     </div>
     ```

2. **`src/components/connectors/connector-card.tsx`**
   - **Lines 125–136**:
     ```tsx
     {/* Mode Badge (Sandbox / Live) */}
     <span
       className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
         connector.mode === 'live'
           ? 'border border-accent/30 bg-accent/15 text-accent'
           : 'border border-border bg-surface-2 text-text-muted'
       }`}
     >
       {connector.mode === 'live'
         ? 'Live OAuth Integration'
         : 'Sandbox Environment (Safe Testing)'}
     </span>
     ```
   - **Lines 138–140**:
     ```tsx
     <p className="text-xs text-text-muted font-mono mt-0.5 truncate max-w-[200px]">
       {connector.accountLabel || `Sandbox ${connector.provider.toUpperCase()}`}
     </p>
     ```
   - **Lines 184–201**:
     ```tsx
     {/* Active Simulation Fault Warning (AC-F7-03) */}
     {isSimulating && (
       <div className="mt-3 flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
         <div className="flex items-center gap-1.5">
           <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
           <span className="font-medium">
             Fault active: <code className="font-mono">{connector.simulationFailure}</code>
           </span>
         </div>
         <button
           type="button"
           onClick={() => onOpenSimulator(connector)}
           className="text-[11px] underline hover:text-text font-medium"
         >
           Modify
         </button>
       </div>
     )}
     ```
   - **Lines 269–280**:
     ```tsx
     {/* Advanced Failure Simulator Button (AC-F7-03) */}
     <button
       type="button"
       onClick={() => onOpenSimulator(connector)}
       className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
       title="Configure simulated fault injection"
       aria-label={`Configure failure simulator for ${meta.name}`}
     >
       <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
       <span className="hidden sm:inline">Simulation</span>
     </button>
     ```

3. **`src/components/connectors/failure-simulator-modal.tsx`**
   - **Lines 147–152**:
     ```tsx
     <h2 id="simulator-modal-title" className="text-base font-semibold text-text">
       Sandbox Failure Simulator
     </h2>
     <p className="text-xs text-text-muted">
       Inject deterministic faults into <span className="font-semibold text-text">{meta?.name || connector.provider}</span> ({meta?.badge})
     </p>
     ```
   - **Lines 173–175**:
     ```tsx
     <div className="text-xs text-text-muted leading-relaxed">
       Use the failure simulator to verify scheduler resiliency, exponential backoff retries, and error notifications without impacting live accounts.
     </div>
     ```
   - **Lines 31–71**:
     * `None (Normal Operation)` — `Connector operates normally with zero injected errors. Posts publish immediately.`
     * `Temporary Failure (500)` — `Simulates upstream platform outage or server error.`
     * `Rate Limited (429)` — `Simulates API quota exhaustion or burst rate-limiting.`
     * `Permanent Error (400)` — `Simulates fatal validation error or banned content rejection.`
     * `Authentication Expired (401)` — `Simulates expired OAuth access token or revoked account credentials.`
   - **Lines 221–224, 235–237, 256**:
     ```tsx
     <span>Simulated Retry-After Delay (seconds)</span>
     ...
     <p className="text-[11px] text-text-muted">
       The sandbox connector will return this value in the simulated header for testing scheduler wait windows.
     </p>
     ...
     <span>{saving ? 'Saving...' : 'Save Simulation Mode'}</span>
     ```

---

### B. Webhooks UI (`/webhooks` and related components)

1. **`src/app/(workspace)/webhooks/page.tsx`**
   - **Lines 124–126**:
     ```ts
     // In sandbox mode or live, test delivery to destination URL
     const isSandbox = url.includes('/api/sandbox/receiver/');
     ```
   - **Line 133**:
     ```ts
     source: 'BrandPilot Webhooks UI',
     ```

2. **`src/components/webhooks/incoming-endpoint-card.tsx`**
   - **Lines 79–88**:
     ```tsx
     <h2 className="text-base font-semibold text-text">Incoming Webhook Ingestion</h2>
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent">
       <ShieldCheck className="h-3 w-3" />
       HMAC-SHA256
     </span>
     ...
     <p className="text-xs text-text-muted mt-1">
       Publish events into BrandPilot with timing-safe HMAC authentication and 300s replay protection.
     </p>
     ```
   - **Line 97**:
     `<span>{testing ? 'Sending...' : 'Send test event'}</span>`
   - **Line 112**:
     `<span>Test event delivered successfully! Event ID: ...</span>`

3. **`src/components/webhooks/outgoing-webhooks-list.tsx`**
   - **Lines 49–52**:
     ```tsx
     <h2 className="text-base font-semibold text-text">Outgoing Webhooks</h2>
     <p className="text-xs text-text-muted mt-0.5">
       Forward published posts, approvals, and system events to third-party endpoints or the built-in sandbox.
     </p>
     ```
   - **Lines 89–91**:
     ```tsx
     {isSandbox && (
       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-info/10 text-info shrink-0">
         Sandbox
       </span>
     )}
     ```

4. **`src/components/webhooks/add-webhook-modal.tsx`**
   - **Lines 74–79**:
     ```tsx
     <button
       type="button"
       onClick={handleUseSandbox}
       className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
     >
       <Sparkles className="h-3 w-3" />
       <span>Use Sandbox Receiver</span>
     </button>
     ```

---

### C. Provider Status, Fallback & Execution Messaging

1. **`src/app/(workspace)/brand-kit/page.tsx`**
   - **Lines 275–277**:
     ```tsx
     <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent border border-accent/20">
       {activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}
     </span>
     ```
   - **Critical Test Dependency**:
     `tests/e2e/03-brand-kit.spec.ts` line 25:
     ```ts
     const providerBadge = page.locator('span:has-text("Deterministic Fallback"), span:has-text("Gemini 2.5 Flash")').first();
     await expect(providerBadge).toBeVisible();
     ```

2. **`src/app/(workspace)/agent/page.tsx`**
   - **Lines 541–545**:
     ```tsx
     {record?.provider && (
       <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
         {record.provider}
       </span>
     )}
     ```
     *Current behavior*: Renders raw unformatted lowercase strings: `gemini`, `fallback`, or `fake`.
   - **Lines 170–172**:
     ```ts
     const returnedStep = stepData.step;
     if (returnedStep?.provider === 'fallback') {
       setHasFallbackNote(true);
     }
     ```
     *Current behavior*: `hasFallbackNote` state is recorded, but never displayed in the view.

3. **`src/components/demo/explainer.tsx`**
   - **Line 71**:
     ```ts
     'Sandbox Simulator: Test failure handling with configurable injected errors (network drop, rate limit, token expired).',
     ```

4. **`src/components/demo/stack-breakdown.tsx`**
   - **Lines 48–54**:
     ```tsx
     name: 'Gemini LLM & Fallback',
     category: 'AI Pipeline & Resilience',
     description:
       'Multi-tiered provider architecture (Gemini -> Fallback -> Fake) with 24h caching and resilient fallback guarantee.',
     highlights: ['Deterministic fallback', 'Daily budget tracker', 'Sliding rate limits'],
     ```

5. **`src/components/demo/fallback-banner.tsx`**
   - **Lines 25–43 & 61**:
     ```tsx
     <span className="font-semibold text-amber-800 dark:text-amber-300">High-Availability Guarantee:</span>{' '}
     {getFriendlyMessage(reason)}
     ```
   - Friendly messages already utilize enterprise SLA phrasing:
     * `High-availability backup engine active. Campaign generated with resilient fallback to preserve 99.9% uptime SLA.`
     * `Daily AI budget reached. Running seamlessly on resilient high-availability backup engine.`
     * `Provider rate limit encountered. Switched to resilient high-availability backup engine.`
     * `Upstream latency threshold exceeded. Completed using resilient high-availability backup engine.`

6. **`src/components/layout/sidebar.tsx`**
   - **Lines 103–105 & 220–229**:
     ```tsx
     const confirmed = window.confirm(
       'Reset all demo data? This creates a fresh isolated workspace state.'
     );
     ...
     <button
       type="button"
       data-testid="reset-demo-button"
       onClick={handleResetDemo}
       ...
     >
       <RotateCcw className="h-4 w-4 shrink-0" />
       {!collapsed && <span>Reset Demo</span>}
     </button>
     ```
   - **Critical Test Dependency**:
     `tests/unit/f0-app-shell.test.ts` line 125–126:
     ```ts
     expect($('[data-testid="reset-demo-button"]').length).toBe(1);
     expect($('[data-testid="reset-demo-button"]').text()).toContain('Reset Demo');
     ```

7. **`src/components/demo/one-click-demo-stepper.tsx`**
   - **Line 64**:
     `description: 'Postgres SKIP LOCKED scheduler publishing to multi-channel sandbox connectors.',`
   - **Line 255**:
     `<span>Enterprise High-Availability Guarantee</span>` (already matches enterprise framing)
   - **Line 416**:
     `posts approved &bull; Jobs published to sandbox connectors.`

---

## 2. Logic Chain

```
[Observation: /connectors uses "Sandbox Failure Simulator", "Fault active", and "Simulation Mode"]
   │
   ├─► Step 1: In production platforms (e.g. Stripe, PayPal, Twilio), developer sandboxes are never called "mock" or "failure simulators". They are designated as "Developer Sandboxes" and "Fault Injection / Chaos Testing" tools used to verify compliance with HTTP 429, 500 backoff, and 401 re-auth before switching to live production OAuth credentials.
   │
   ├─► Step 2: Elevating "Sandbox Failure Simulator" to "Developer Sandbox: Fault Injection & Resilience Matrix" clarifies that this is an enterprise resilience capability, positioning it directly alongside the live LinkedIn OAuth integration (`w_member_social`).
   │
[Observation: Brand Kit renders "Deterministic Fallback", and Agent steps render raw "gemini" / "fallback"]
   │
   ├─► Step 3: "Deterministic Fallback" implies toy placeholder data. In high-availability enterprise architectures (e.g. Cloudflare, AWS), local deterministic synthesis is the zero-downtime SLA continuity engine that guarantees campaign delivery when external LLM APIs experience rate limits (429) or regional outages.
   │
   ├─► Step 4: Rebranding the badge to "High-Availability Engine (SLA Protection)" or "Live Google Gemini 2.5 Flash" directly showcases the platform's dual strengths: real-time LLM intelligence + enterprise business continuity.
   │
[Observation: Agent Step execution has unrendered state `hasFallbackNote`]
   │
   ├─► Step 5: When an agent step executes using fallback, displaying an informational badge or FallbackBanner explains that BrandPilot seamlessly engaged its high-availability SLA engine to prevent workflow interruptions.
   │
[Observation: Exact test assertions in `tests/unit/f0-app-shell.test.ts` and `tests/e2e/03-brand-kit.spec.ts`]
   │
   └─► Step 6: Any changes to user-facing strings must either preserve substring compatibility or update the corresponding test assertion, ensuring 100% of the 406+ tests continue to pass with 0 errors.
```

---

## 3. Caveats

1. **Substrings in Test Assertions**:
   - `tests/unit/f0-app-shell.test.ts` line 126 strictly asserts `.toContain('Reset Demo')` on `[data-testid="reset-demo-button"]`. If the button text is changed to `Reset Workspace`, line 126 in `f0-app-shell.test.ts` MUST be updated simultaneously.
   - `tests/e2e/03-brand-kit.spec.ts` line 25 locates `span:has-text("Deterministic Fallback"), span:has-text("Gemini 2.5 Flash")`. If modernized to `High-Availability Engine`, either include `span:has-text("High-Availability")` in the test or include the token in the badge, e.g. `High-Availability (Deterministic Fallback)`.
2. **Backend Mode Enums**:
   - The database and API schemas use `mode = 'sandbox' | 'live'` (defined in `src/server/db/schema.ts` and `src/lib/connectors/types.ts`). These schema values must remain unchanged; only user-facing UI labels and presentation should be modernized.
3. **SSRF Guard & Local Receivers**:
   - The outgoing webhook receiver at `/api/sandbox/receiver/:token` is explicitly whitelisted in `src/server/webhooks/dispatcher.ts` through the SSRF guard. The UI correctly identifies this as the internal developer receiver.

---

## 4. Conclusion & Concrete Modernizations

Below is the concrete proposal cataloging exact files, lines, current text, proposed modernizations, and rationale:

### Table of Proposed Modernizations

| Target File | Line(s) | Current Verbatim Text | Proposed Replacement Text | Rationale |
|---|---|---|---|---|
| `src/app/(workspace)/connectors/page.tsx` | 358–360 | `Manage multi-channel social publishing adapters, probe channel latency, and verify resilience in sandbox environments (like Stripe Sandbox).` | `Manage multi-channel social publishing adapters, monitor real-time API latency, and verify delivery resilience across safe developer sandboxes (Stripe-grade staging) and live OAuth production integrations.` | Professional enterprise framing. |
| `src/app/(workspace)/connectors/page.tsx` | 381–386 | `title="Reset all 4 connectors to clean default connected sandbox state"`<br>`<span>Reset Defaults</span>` | `title="Reset all 4 connectors to default connected sandbox staging state"`<br>`<span>Reset Sandboxes</span>` | Clarifies sandbox testing context. |
| `src/app/(workspace)/connectors/page.tsx` | 267 | `Reset all 4 social connectors to clean default connected sandbox state?` | `Reset all 4 developer sandboxes to clean default connected testing state (clearing active faults)?` | Clearer confirmation dialog. |
| `src/app/(workspace)/connectors/page.tsx` | 175 | `${name} connected in Sandbox mode.` | `${name} connected in Developer Sandbox environment.` | Industry standard terminology. |
| `src/app/(workspace)/connectors/page.tsx` | 451–462 | `Advanced: Fault Injection & Simulation Matrix`<br>`Control failure behavior across all sandbox connectors to test publisher retries and backoff.` | `Chaos Engineering & SLA Resilience Testing Matrix`<br>`Simulate upstream outages, quota limits, and token expirations in safe developer sandboxes to verify automated retry policies before live publishing.` | Replaces toy simulation with enterprise chaos testing. |
| `src/app/(workspace)/connectors/page.tsx` | 501–504 | `{simMode === 'none' ? 'Operating normally' : 'Simulating ' + simMode}` | `{simMode === 'none' ? 'Normal Operation (200 OK)' : 'Fault Active: ' + simMode.toUpperCase()}` | Clear operational status. |
| `src/app/(workspace)/connectors/page.tsx` | 511 | `Configure Fault` | `Configure Fault Mode` | Professional action label. |
| `src/app/(workspace)/connectors/page.tsx` | 521–524 | `How Failure Simulation Works: ...` | `Developer Sandbox & Fault Injection Architecture: Like Stripe and PayPal developer sandboxes, BrandPilot provides isolated test adapters for each social network. Configuring injected faults allows teams to verify that background workers execute exponential backoff with randomized jitter (500), strictly obey upstream Retry-After rate limits (429), prevent retries on validation rejections (400), and trigger administrator re-authorization alerts (401) before going live.` | Explicit Stripe/PayPal analogy, enterprise SLA context. |
| `src/components/connectors/connector-card.tsx` | 134–136 | `connector.mode === 'live' ? 'Live OAuth Integration' : 'Sandbox Environment (Safe Testing)'` | `connector.mode === 'live' ? 'Live Production OAuth' : 'Safe Developer Sandbox'` | Crisp, standard terminology. |
| `src/components/connectors/connector-card.tsx` | 185–201 | `Fault active: <code>...</code>`<br>`Modify` | `Fault Injected: <code>...</code>`<br>`Change Fault` | Professional status indicator. |
| `src/components/connectors/connector-card.tsx` | 278–280 | `title="Configure simulated fault injection"`<br>`<span className="hidden sm:inline">Simulation</span>` | `title="Configure fault injection testing for this sandbox"`<br>`<span className="hidden sm:inline">Fault Mode</span>` | Replaces toy "simulation" button label. |
| `src/components/connectors/failure-simulator-modal.tsx` | 148 | `Sandbox Failure Simulator` | `Sandbox Fault Injection & Resilience Testing` | Professional title. |
| `src/components/connectors/failure-simulator-modal.tsx` | 174 | `Use the failure simulator to verify scheduler resiliency...` | `Simulate upstream social network error conditions in this safe developer sandbox to verify automated retries, rate-limit backoff, and admin notifications without impacting live accounts.` | Comprehensive enterprise description. |
| `src/components/connectors/failure-simulator-modal.tsx` | 256 | `Save Simulation Mode` | `Apply Sandbox Fault Mode` | Actionable button label. |
| `src/components/webhooks/outgoing-webhooks-list.tsx` | 51–52 | `Forward published posts, approvals, and system events to third-party endpoints or the built-in sandbox.` | `Forward published posts, approvals, and system events to third-party endpoints or the internal developer sandbox receiver.` | Standard developer terminology. |
| `src/app/(workspace)/brand-kit/page.tsx` | 276 | `{activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}` | `{activeKit.provider === 'gemini' ? 'Live Gemini 2.5 Flash' : 'High-Availability Engine (SLA Fallback)'}` | Frames fallback as SLA protection rather than mock. |
| `src/app/(workspace)/agent/page.tsx` | 541–545 | `{record.provider}` (raw text) | Render styled status badge with icons: Live Gemini 2.5 Flash (emerald badge + Sparkles icon), High-Availability SLA Engine (amber badge + ShieldCheck icon), or Developer Test Stub. | Polished visual feedback. |
| `src/components/demo/explainer.tsx` | 71 | `'Sandbox Simulator: Test failure handling with configurable injected errors (network drop, rate limit, token expired).'` | `'Chaos Resilience Matrix: Test scheduler fault-tolerance with deterministic injected errors (rate limits, upstream drops, token expiration) in safe developer sandboxes.'` | Removes "Sandbox Simulator". |
| `src/components/demo/stack-breakdown.tsx` | 48–54 | `'Gemini LLM & Fallback' ... 'Deterministic fallback'` | `'Live Gemini & Resilient SLA Engine' ... Highlights: ['Live Gemini 2.5 Flash', 'Daily quota budget guard', '99.9% SLA continuity']` | Highlights live Gemini + SLA fallback. |
| `src/components/layout/sidebar.tsx` | 104, 228 | `'Reset all demo data? ...'`<br>`<span>Reset Demo</span>` | `'Reset all workspace data? ...'`<br>`<span>Reset Workspace</span>` *(Synchronize `tests/unit/f0-app-shell.test.ts:126`)* | Eliminates "Reset Demo" wording from sidebar footer. |

---

## 5. Verification Method

To independently verify these findings and confirm zero regressions upon implementation:

1. **Test Suite Verification**:
   ```powershell
   pnpm test
   ```
   *Expected outcome*: 406/406 automated tests passing across all test files.
   *Specific tests to verify*:
   - `tests/unit/f0-app-shell.test.ts` (AC-F0-06 sidebar tests)
   - `tests/integration/f7-connectors-api.test.ts` (AC-F7-01–05 connector routes)
   - `tests/integration/f8-webhooks-api.test.ts` (AC-F8-01–09 webhook routes)
   - `tests/unit/f10-home-demo.test.ts` (AC-F10-01–06 demo and explainer tests)
   - `tests/e2e/03-brand-kit.spec.ts` (Brand kit provider badge locator)

2. **Typecheck & Linter Verification**:
   ```powershell
   pnpm typecheck
   pnpm lint
   ```
   *Expected outcome*: 0 TypeScript errors and 0 ESLint warnings.

3. **UI Visual Inspection**:
   - Navigate to `/connectors`: Confirm developer sandboxes are clearly presented alongside Live LinkedIn OAuth, and the collapsible matrix is titled "Chaos Engineering & SLA Resilience Testing Matrix".
   - Navigate to `/webhooks`: Confirm incoming HMAC ingestion details, cURL signatures, and outgoing developer sandbox receivers render cleanly.
   - Navigate to `/agent` and `/brand-kit`: Confirm provider badges render as "Live Gemini 2.5 Flash" or "High-Availability Engine (SLA Fallback)" rather than raw unformatted strings.

4. **Invalidation Conditions**:
   - The analysis would be invalidated if any proposed copy change breaks a rigid test assertion without a coordinated test update.
   - The analysis would be invalidated if backend connector enums (`'sandbox' | 'live'`) were modified rather than front-end presentation copy.
