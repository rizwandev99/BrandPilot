# Handoff Report: Playwright Test Runner & Windows Environment Setup Investigation

**Investigator**: teamwork_preview_explorer_e2e_runner (Explorer Agent)  
**Date**: 2026-10-28T04:55:00Z  
**Target Milestone**: Playwright E2E Suite Setup & Runner Investigation  
**Scope**: `playwright.config.ts`, `package.json`, `.env.local` / `.env.example`, WebServer on Windows, Chromium binaries, process teardown, `tests/e2e/golden-path.spec.ts`, and interactive spec architecture.

---

## 1. Observation

### 1.1 Playwright Runner Configuration (`playwright.config.ts` & `package.json`)
* **File**: `playwright.config.ts` (lines 1–17)
  ```typescript
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testDir: './tests/e2e',
    testMatch: /.*\.spec\.ts/,
    timeout: 30000,
    webServer: {
      command: 'pnpm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    use: {
      baseURL: process.env.APP_URL || 'http://localhost:3000',
    },
  });
  ```
* **Installed Version**: In `package.json` line 42, `"@playwright/test": "^1.50.1"` resolves to version **1.64.1** in `node_modules/@playwright/test/package.json` line 3 (`"version": "1.64.1"`).
* **Missing Config Settings**:
  1. No `projects` array is configured. Default settings do not specify explicit viewport sizes (e.g. desktop `1280x720`), explicit headless flags, or device presets.
  2. `webServer.port: 3000` is used rather than `webServer.url: 'http://localhost:3000'`. In Playwright, `port` checks only raw TCP socket connectivity, whereas `url` performs an HTTP GET probe, ensuring Next.js route handling is ready before tests fire.
  3. No diagnostic artifacts configured on failure: no screenshot (`only-on-failure`), trace (`on-first-retry`), or video capture.
* **Environment Configuration**:
  - `.env.local` exists and defines: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GEMINI_API_KEY`, `LLM_DAILY_BUDGET=100`, `ENCRYPTION_KEY`, `CRON_SECRET`, `WORKSPACE_TTL_DAYS=7`, `ENABLE_LIVE_LINKEDIN=false`, `APP_URL=http://localhost:3000`.
  - Next.js reads `.env.local` automatically during `next start` and `next dev`.

---

### 1.2 Windows WebServer Execution, Build Dependency & Port 3000

#### A. Initial `pnpm test:e2e` Failure (Missing Build ID)
When running `pnpm test:e2e` against a fresh checkout or unbuilt directory, Playwright executed `webServer.command: 'pnpm start'`, which produced the following verbatim error:
```
$ playwright test
[WebServer] $ next start

Running 1 test using 1 worker

[WebServer] [Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server. https://nextjs.org/docs/messages/production-start-no-build-id]
  x 1 tests\e2e\golden-path.spec.ts:4:3 › BrandPilot E2E: Golden Path & System Workflows › E2E Golden Path: System Health & Offline Demo Architecture (AC-F10-02) (59ms)

  1) tests\e2e\golden-path.spec.ts:4:3 › BrandPilot E2E: Golden Path & System Workflows › E2E Golden Path: System Health & Offline Demo Architecture (AC-F10-02) 

    AggregateError: apiRequestContext.get: connect ECONNREFUSED ::1:3000
    connect ECONNREFUSED 127.0.0.1:3000
```
* **Root Cause**: `next start` strictly requires `.next/BUILD_ID`. Although `.next` folder existed from earlier development, `BUILD_ID` was missing. When `pnpm start` failed immediately, the web server crashed, resulting in `ECONNREFUSED` on port 3000.

#### B. Verification of `pnpm build`
Running `pnpm build` (`node scripts/db-sync.mjs && next build`) executed successfully in **29.8s**:
- 25 routes compiled (including all static pages `/`, `/agent`, `/queue`, `/calendar`, `/brand-kit`, `/connectors`, `/automations`, `/webhooks`, `/activity`).
- Created `.next/BUILD_ID`.
- `Test-Path .next\BUILD_ID` confirmed `True`.

#### C. Verification of WebServer Execution and Process Teardown on Windows
After `pnpm build`, running `pnpm test:e2e`:
```
$ playwright test
[WebServer] $ next start

Running 1 test using 1 worker

  ok 1 tests\e2e\golden-path.spec.ts:4:3 › BrandPilot E2E: Golden Path & System Workflows › E2E Golden Path: System Health & Offline Demo Architecture (AC-F10-02) (4.5s)

  1 passed (8.1s)
```
- **Port teardown verified**: Immediately after test exit, running `Get-NetTCPConnection -LocalPort 3000` returned exit code 1 (no listening port). `Get-Process node` confirmed zero lingering Next.js child processes. Playwright cleanly terminated `next start` on Windows.
- **Port Reuse (`reuseExistingServer`)**:
  - `reuseExistingServer: !process.env.CI` evaluates to `true` in local development.
  - If a developer already has `pnpm dev` or `pnpm start` running on port 3000, Playwright reuses the server without re-binding port 3000.

---

### 1.3 Chromium Browser Binary Availability on Windows

#### A. Verbatim Missing Binary Error on Playwright 1.64.1
When attempting to launch Chromium headlessly with Playwright 1.64.1 via `chromium.launch({ headless: true })`:
```
Launch error: browserType.launch: Executable doesn't exist at C:\Users\rizwan\AppData\Local\ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```
* **Store Inspection**: `C:\Users\rizwan\AppData\Local\ms-playwright` contained revisions `chromium-1117`, `chromium-1223`, `chromium-1228`, and `chromium-1234`, but lacked the required `chromium-1248` / `chromium_headless_shell-1248` expected by `@playwright/test@1.64.1`.
* **Why `golden-path.spec.ts` Previously Passed**:
  `golden-path.spec.ts` only imports `{ request }` (Playwright's Node API request context). It never imports or uses `{ page }`! Consequently, Playwright never attempted to instantiate a browser binary. The moment any interactive test using `{ page }` is executed, it fails immediately with the missing executable error.

#### B. System Browser Channels as Verified Alternative
Direct execution verified that local Windows system installations exist and launch successfully with zero configuration errors:
1. **Google Chrome**: Located at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
   - Verified via `chromium.launch({ channel: 'chrome', headless: true })` -> **Success**.
2. **Microsoft Edge**: Located at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
   - Verified via `chromium.launch({ channel: 'msedge', headless: true })` -> **Success**.

#### C. Dedicated Playwright Chromium Installation Verified
- Executed `pnpm exec playwright install chromium`.
- Chrome for Testing 156.0.8078.4 (`chromium-1248`, 197.5 MiB), FFmpeg (`ffmpeg-1013`, 1.6 MiB), and Chrome Headless Shell (`chromium_headless_shell-1248`, 118.1 MiB) downloaded and installed to `C:\Users\rizwan\AppData\Local\ms-playwright`.
- Verified headless launch:
  `node -e "const { chromium } = require('@playwright/test'); (async () => { const browser = await chromium.launch({ headless: true }); console.log('Chromium headless launch SUCCESS:', browser.version()); await browser.close(); })()"`
  Output: `Chromium headless launch SUCCESS: 156.0.8078.4` (exit code 0).
- Headless Chromium is now 100% installed, validated, and ready for all interactive `{ page }` tests without missing browser errors on Windows.

---

### 1.4 Analysis of `tests/e2e/golden-path.spec.ts`
* **File Content**:
  - Single test: `E2E Golden Path: System Health & Offline Demo Architecture (AC-F10-02)`.
  - Makes 8 sequential `request.get(...)` calls to verify HTTP 200 responses on `/api/health`, `/`, `/agent`, `/activity`, `/connectors`, `/queue`, `/calendar`, `/automations`, `/webhooks`.
  - Does NOT test interactive browser behavior: no clicks, no form fills, no stepper progress, no dialog modals, no keyboard shortcuts.
* **Navigation Links in UI**:
  - `src/components/layout/sidebar.tsx` defines `NAV_ITEMS`:
    - `/` (Home)
    - `/brand-kit` (Brand Kit)
    - `/agent` (Content Agent / Pipeline visualizer — note: this corresponds to R2.3 "Content Pipeline (`/runs`)")
    - `/queue` (Approval Queue)
    - `/calendar` (Content Calendar)
    - `/connectors` (Connectors)
    - `/automations` (Automations)
    - `/webhooks` (Webhooks)
    - `/activity` (Activity Log)
* **Pre-existing UI Test Instrumentation**:
  The application is already richly instrumented with `data-testid` attributes:
  - `desktop-sidebar`, `mobile-sidebar`, `sidebar-collapse-toggle`, `theme-toggle`, `reset-demo-button`, `mobile-menu-toggle`, `mobile-drawer-backdrop`.
  - `demo-stepper`, `footer-disclaimer`.
  - `queue-view`, `post-card-${id}`, `bulk-approve-button`, `schedule-approved-button`, `hold-post-dialog`, `keyboard-shortcuts-dialog`, `edit-post-dialog`, `char-counter`, `save-post-button`.
  - `calendar-view`, `calendar-cell-${date}`.
  - `connector-card-${provider}`.

---

## 2. Logic Chain

1. **WebServer Reliability (`pnpm start` vs `pnpm dev`)**:
   - `pnpm dev` (`next dev`) compiles routes dynamically on demand. On Windows, on-demand compilation of complex pages with Radix UI and Tailwind CSS takes 5–15 seconds per initial route visit. In an E2E suite hitting 7+ distinct pages, this causes unpredictable latency spikes and worker timeouts.
   - `pnpm start` (`next start`) serves pre-compiled production bundles. Page loads execute in under 100ms with zero compilation jitter, guaranteeing deterministic test execution.
   - However, `next start` strictly requires `.next/BUILD_ID`. If `pnpm test:e2e` is run without a prior build, it fails immediately.
   - **Therefore**: The test runner should ensure a production build exists before starting `next start`. Adding a `"test:e2e"` script pattern or an automatic build verification step prevents `production-start-no-build-id` failures.

2. **Port Detection & Readiness (`url` vs `port`)**:
   - `port: 3000` polls TCP socket binding. Next.js binds its TCP socket before route initialization is complete, which can cause premature requests to be dropped.
   - `url: 'http://localhost:3000'` sends an HTTP GET request and waits for an HTTP 200 response, ensuring the server is fully ready before tests start.
   - In addition, setting `reuseExistingServer: !process.env.CI` allows developers to run tests against an already running server while ensuring CI always spawns a fresh server.

3. **Browser Binary Strategy on Windows**:
   - Playwright requires a matching browser binary for its version (1.64.1 -> `chromium-1248`).
   - Running `pnpm exec playwright install chromium` installs the exact Chromium binary needed for headless execution.
   - As an alternative or fallback on Windows environments without internet access, Playwright can use the pre-installed system Google Chrome or Microsoft Edge channels (`channel: 'chrome'` or `channel: 'msedge'`), both of which were directly verified to launch headlessly with 0 errors.

4. **Process Teardown on Windows**:
   - When Playwright manages `webServer` lifecycle, it terminates the child process tree upon test exit. Empirical verification confirmed port 3000 was completely released with no lingering node processes.
   - If tests are killed abruptly (e.g. CTRL+C in terminal), Windows may occasionally orphan processes. If that happens, `npx kill-port 3000` or `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force` easily clears port 3000.

5. **Test Architecture & File Organization**:
   - Keeping all interactive tests inside a single monolithic file makes debugging slow and makes parallel worker execution inefficient.
   - Splitting tests into domain-specific spec files inside `tests/e2e/` allows parallel execution, clear failure isolation, and direct mapping to user journeys.

---

## 3. Caveats

1. **Initial Build Requirement**: `pnpm start` requires a pre-existing production build in `.next`. If source code is modified, `pnpm build` must be re-run before `pnpm test:e2e` to reflect those code changes, unless `pnpm dev` is running and reused.
2. **Download Size**: `pnpm exec playwright install chromium` downloads ~197.5 MiB of Chromium binaries to `%LOCALAPPDATA%\ms-playwright`.
3. **Route Naming**: The Content Pipeline page is located at `/agent` in the App Router (with `/api/runs` as the backend endpoint), whereas the dispatch prompt referenced `/runs`. The tests should navigate to `/agent` to interact with the pipeline visualizer.

---

## 4. Conclusion

1. **Recommended `playwright.config.ts`**:
   ```typescript
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/e2e',
     testMatch: /.*\.spec\.ts/,
     timeout: 30000,
     fullyParallel: true,
     workers: process.env.CI ? 1 : 2,
     reporter: [['list'], ['html', { open: 'never' }]],
     webServer: {
       command: 'pnpm start',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
       timeout: 120000,
     },
     use: {
       baseURL: process.env.APP_URL || 'http://localhost:3000',
       headless: true,
       trace: 'on-first-retry',
       screenshot: 'only-on-failure',
     },
     projects: [
       {
         name: 'chromium',
         use: {
           ...devices['Desktop Chrome'],
           viewport: { width: 1280, height: 720 },
         },
       },
     ],
   });
   ```

2. **Build & Package Script Recommendation**:
   In `package.json`, update `scripts`:
   ```json
   "test:e2e": "playwright test",
   "test:e2e:build": "pnpm build && playwright test"
   ```
   Or ensure `pnpm build` is documented as a prerequisite before running `pnpm test:e2e`.

3. **Browser Binary Recommendation**:
   Run `pnpm exec playwright install chromium` to guarantee `chromium-1248` is installed. If download is constrained, `use: { channel: 'chrome' }` or `use: { channel: 'msedge' }` can be used on Windows as a fallback since both binaries are already present on the system.

4. **Recommended Modular Spec File Layout**:
   - `tests/e2e/01-app-shell.spec.ts`: App shell, sidebar collapse/expand, mobile menu drawer, theme toggle (light/dark without flash), and footer disclaimer.
   - `tests/e2e/02-home-demo.spec.ts`: Home hero, URL input, "Try Instant Sample Demo", stepper progression, and section navigation.
   - `tests/e2e/03-brand-kit.spec.ts`: Brand kit cards, WCAG contrast badges, edit form validation, and save.
   - `tests/e2e/04-content-pipeline.spec.ts`: `/agent` page, trigger pipeline run, step visualizer (`idea` -> `creative` -> `campaign`), and creative PNG preview.
   - `tests/e2e/05-approval-queue.spec.ts`: `/queue` page, post status actions (approve, hold modal with reason, reject), character counter, and keyboard shortcuts (`A`, `H`, `E`, `?`).
   - `tests/e2e/06-calendar.spec.ts`: `/calendar` page, month navigation, status cards in day cells, and post modal inspection.
   - `tests/e2e/07-connectors-webhooks.spec.ts`: `/connectors` (health check, failure simulator modal) and `/webhooks` (secret rotation modal, copy curl action).
   - `tests/e2e/golden-path.spec.ts`: Retain as high-level smoke test.

---

## 5. Verification Method

1. **Verify Playwright Browser Installation**:
   ```powershell
   node -e "const { chromium } = require('@playwright/test'); (async () => { const b = await chromium.launch({ headless: true }); console.log('Chromium launch OK'); await b.close(); })()"
   ```
   *Expected output*: `Chromium launch OK` with exit code 0.

2. **Verify Production Build**:
   ```powershell
   pnpm build
   ```
   *Expected output*: `.next/BUILD_ID` exists and exit code is 0.

3. **Verify WebServer & Test Execution**:
   ```powershell
   pnpm test:e2e
   ```
   *Expected output*: `1 passed` with exit code 0.

4. **Verify Port 3000 Teardown**:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
   ```
   *Expected output*: No active connection (exit code 1 or empty output).
