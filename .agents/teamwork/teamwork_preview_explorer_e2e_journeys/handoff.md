# Investigation Report: BrandPilot Interactive Golden Path & E2E User Journeys

**Date:** 2026-10-28  
**Agent:** `teamwork_preview_explorer_e2e_journeys`  
**Working Directory:** `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_journeys`  
**Scope:** Complete DOM element, role, test-id, and interaction mapping for Playwright browser-level E2E tests across 6 core journeys.

---

## 1. Observation

Direct code analysis of `src/app/(workspace)` and `src/components` identified the exact UI architecture, routes, DOM elements, and API flows for each user journey.

### 1.1 Journey 1: Home & Demo Flow (`/`)
- **Route file:** `src/app/(workspace)/page.tsx`
- **Components:** `src/components/demo/hero.tsx`, `src/components/demo/one-click-demo-stepper.tsx`, `src/components/demo/fallback-banner.tsx`
- **Hero Extraction & Sample Loading:**
  - URL Input: `input#website-url-input` or `input[name="url"]` with placeholder `"https://yourbrand.com"` and `aria-label="Website URL to extract brand kit"`.
  - Extract Button: `button[type="submit"]` with text `"Extract Brand"` (or `"Extracting..."` with `Loader2` spinner when busy).
  - Quick Brand Chips: Buttons containing chip text `"Acme SaaS"`, `"DevFlow"`, `"CoffeeCo"`. Clicking fills the input.
  - Load Sample Brand Kit Button: Button with text `"Load Sample Brand Kit"`.
    - Action: sends `POST /api/brand-kits` with payload `{ sample: true }`.
    - Feedback: `div[role="status"]` with text `Sample kit "..." loaded instantly!`.
    - Navigation: executes `router.push('/brand-kit')`.
  - Error Feedback: `p[role="alert"]`.
- **4-Step Offline Demo Stepper:**
  - Stepper Container: `section[data-testid="demo-stepper"]` with `aria-labelledby="demo-stepper-heading"`.
  - Stepper Heading: `h2#demo-stepper-heading` with text `"Autonomous 4-Step Marketing Loop"`.
  - Main Stepper Button:
    - Idle: `button` containing `"Run One-Click Demo"` and Play icon.
    - Running: `div` containing `"Executing Loop (Step X of 4)..."` with `Loader2` animate-spin.
    - Completed: `button` containing `"Run Again"`.
    - Error: `button` containing `"Retry Demo"`.
  - Stepper Ordered List: `ol[aria-label="4-Step Autonomous Marketing Loop"]` containing 4 `li` elements:
    1. Step 1: "Brand Extraction" (`a[href="/brand-kit"]` with label `"View Brand Kit"`).
    2. Step 2: "Content Agent Run" (`a[href="/agent"]` with label `"View Agent Runs"`).
    3. Step 3: "Human Approval Gate" (`a[href="/queue"]` with label `"View Approval Queue"`).
    4. Step 4: "Schedule & Publish" (`a[href="/calendar"]` with label `"View Calendar"`).
    - Status pills per step: `"Ready"`, `"Processing..."`, or `"Completed"`.
  - Loop Completion Banner: `div[role="status"][aria-live="polite"]` with text `"Full 4-Step Autonomous Loop Completed Successfully!"`.
    - Link to Queue: `a[href="/queue"]` with text `"Inspect Queue"`.
    - Link to Activity: `a[href="/activity"]` with text `"View Activity Log"`.

### 1.2 Journey 2: Brand Kit Management (`/brand-kit`)
- **Route file:** `src/app/(workspace)/brand-kit/page.tsx`
- **TopBar Actions:** `Link[href="/agent"]` with text `"Launch Content Agent"` and Bot icon.
- **Brand Kits Selector Bar:** If multiple kits exist, horizontal button strip with kit names.
- **Header Card & Editing:**
  - Brand Name Heading: `h1` with `activeKit.name` (e.g. `"Acme SaaS"`).
  - Provider Badge: `span` with `"Gemini 2.5 Flash"` or `"Deterministic Fallback"`.
  - Edit Kit Button: `button` containing `"Edit Kit"` and `Edit2` icon.
  - In Edit Mode:
    - Brand Name Input: `input[type="text"][placeholder="Brand Name"]`.
    - Summary Textarea: `textarea[placeholder="Brand summary..."]`.
    - Primary Color Input: `input[type="text"]` (font-mono hex).
    - Secondary Color Input: `input[type="text"]` (font-mono hex).
    - Save Button: `button` containing `"Save"` (calls `PATCH /api/brand-kits/:id`).
    - Cancel Button: `button` containing `"Cancel"`.
- **WCAG AA Contrast Palette:**
  - Section Heading: `h2` with text `"WCAG AA Contrast Palette"`.
  - Contrast Badge: `span` containing `"Auto-Checked"` with `ShieldCheck` icon.
  - 4 Swatches: Primary, Secondary, Background, Text (displaying hex codes in font-mono).
- **Target Audience & Tone:**
  - Heading: `h2` with text `"Target Audience"`.
  - Subheading: `"Brand Tone"`.
  - Tone Tags: `span.capitalize` (e.g., `"professional"`, `"approachable"`, `"innovative"`).
- **Actionable Dos & Don'ts:**
  - Dos: `h2` with text `"Actionable Brand Dos"`, list items prefixed by `"✓"`.
  - Don'ts: `h2` with text `"Actionable Brand Don'ts"`, list items prefixed by `"✗"`.
- **Core Campaign Keywords:**
  - Heading: `h2` with text `"Core Campaign Keywords"`, tags formatted as `#{keyword}`.
- **Notification Banners:**
  - Success: `div[role="status"]` with `CheckCircle2` icon (e.g. `"Brand Kit updated successfully!"`).
  - Error: `div[role="alert"]` with `AlertCircle` icon.

### 1.3 Journey 3: Content Pipeline (`/agent` or `/runs`)
- **Route file:** `src/app/(workspace)/agent/page.tsx` (Route in Next.js is `/agent`; API endpoints are `/api/runs` and `/api/runs/:id/step`).
- **Pipeline Controls:**
  - Page Heading: `h1` with text `"Content Agent Pipeline"`.
  - Campaign Goal Input: `input#goal` with placeholder `"e.g. Announce 2.0 release with 50% faster indexing"`.
  - Target Brand Kit Select: `select#brandKit`.
  - Target Channels: Toggle buttons for `"LINKEDIN"`, `"X"`, `"INSTAGRAM"`, `"FACEBOOK"`.
    - Active style: `border-primary bg-primary/10 text-primary`.
  - Number of Posts: Buttons for `"2 Posts"`, `"4 Posts"`, `"6 Posts"`.
    - Active style: `border-primary bg-primary text-primary-foreground`.
  - Run Agent Button: `button` containing `"Run Content Agent"` (or `"Generating..."` with `Loader2` animate-spin when active).
- **3-Step Progress Visualizer:**
  - Section Heading: `h2` with text `"3-Step Execution Pipeline"`.
  - Run Status Pill: `span` with uppercase status (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`).
  - 3 Steps:
    1. Idea Agent: `"Idea Agent"`, `"Brainstorm angles, hooks, and messaging targets"`.
    2. Creative Agent: `"Creative Agent"`, `"Draft multi-channel copy, hashtags, and branded card specs"`.
    3. Campaign Agent: `"Campaign Agent"`, `"Calculate 7-day schedule intervals and create review drafts"`.
  - Step State Indicators:
    - Pending: Step index number (1, 2, 3).
    - Running: `Loader2` animate-spin + pulsing node.
    - Succeeded: `CheckCircle2` icon.
    - Failed: `AlertCircle` icon.
  - Step Details: Displays JSON pre block with output upon success, provider tag (e.g. `fallback` or `gemini`).
  - Offline Fallback Note: If fallback provider used, banner shows `"Notice: Offline Writer Engaged"`.
  - Pipeline Completion Banner: `"Pipeline complete! Posts drafted in approval queue."` and `Link[href="/queue"]` with text `"View posts in queue"`.
- **Branded Card Resvg Rendering:**
  - PNG endpoint: `/api/creatives/[postId].png` dynamically renders PNG cards via Resvg JS across 3+ templates.

### 1.4 Journey 4: Approval Queue & State Machine (`/queue`)
- **Route file:** `src/app/(workspace)/queue/page.tsx`
- **Components:** `src/components/queue/queue-table.tsx`, `post-card.tsx`, `edit-post-dialog.tsx`, `hold-post-dialog.tsx`, `char-counter.tsx`, `keyboard-shortcuts-dialog.tsx`
- **Queue Table Controls:**
  - Root View: `div[data-testid="queue-view"]`.
  - Search Input: `input[placeholder="Filter queue by caption or hashtag..."]`.
  - Channel Select: `select` with options ("All Channels", "LinkedIn", "X (Twitter)", "Instagram", "Facebook").
  - Refresh Button: `button[title="Refresh queue"]`.
  - Shortcuts Button: `button[title="Keyboard shortcuts (?)"]` or `button:has-text("Shortcuts")`.
  - Bulk Approve Button: `button[data-testid="bulk-approve-button"]` (labeled `"Approve all in review (X)"`).
  - Schedule Approved Button: `button[data-testid="schedule-approved-button"]` (labeled `"Schedule approved (X)"`).
  - Filter Tabs: Buttons for `"All"`, `"In Review"`, `"Approved"`, `"Held"`, `"Scheduled"`, `"Published"`, `"Rejected"` with count pills.
- **Post Card Elements:**
  - Post Card Item: `div[data-testid="post-card-${post.id}"]`.
  - Selection Highlight: `border-accent shadow-md ring-2 ring-accent/30`.
  - Channel Tag: Uppercase channel name with channel-specific color badge.
  - Version Tag: `v${post.version}`.
  - Status Tag: Uppercase status badge ("In Review", "Approved", "Held", "Scheduled", "Published", "Rejected").
  - Creative Card Spec: Box showing `"Creative Card (${templateId})"`, headline, subline, and color dot swatches.
  - Post Character Count: Text `${post.caption.length} chars`.
  - Action Buttons:
    - Edit: `button[title="Edit post (E)"]` (contains text `"Edit"`).
    - Hold: `button[title="Hold post (H)"]` (contains text `"Hold"`).
    - Reject: `button[title="Reject post"]` (contains text `"Reject"`).
    - Approve: `button[title="Approve post (A)"]` (contains text `"Approve"`).
- **Edit Post Dialog:**
  - Dialog Content: `div[data-testid="edit-post-dialog"]`.
  - Version & Re-approval Warning: If post was approved/scheduled, displays `"Re-approval Required: Saving changes will bump version to vX and reset status back to IN_REVIEW."`.
  - Live Character Counter: `div[data-testid="char-counter"]` displaying `${count} / ${max}` with warning/overflow badges (`+X over limit`).
  - Inputs:
    - Caption Textarea: `textarea[placeholder="Write post caption..."]`.
    - Hashtags Input: `input[placeholder="tech, marketing, ai"]`.
    - Headline Input: `input[placeholder="Card headline..."]`.
    - Subline Input: `input[placeholder="Card subline..."]`.
    - Scheduled Date Input: `input[type="datetime-local"]`.
  - Save Button: `button[data-testid="save-post-button"]` (labeled `"Save Changes"`).
  - Cancel Button: `button:has-text("Cancel")`.
- **Hold Post Dialog:**
  - Dialog Content: `div[data-testid="hold-post-dialog"]`.
  - Reason Textarea: `textarea[placeholder="e.g. Waiting for legal review on trademark..."]`.
  - Confirm Button: `button[type="submit"]:has-text("Hold Post")`.
  - Cancel Button: `button:has-text("Cancel")`.
- **Keyboard Shortcuts Dialog & Listeners:**
  - Dialog Content: `div[data-testid="keyboard-shortcuts-dialog"]`.
  - Trigger: Pressing `?` anywhere outside text inputs.
  - Active Shortcuts:
    - `ArrowDown` or `j`: Focus next post card.
    - `ArrowUp` or `k`: Focus previous post card.
    - `a` or `A`: Approve selected post.
    - `h` or `H`: Open Hold dialog for selected post.
    - `e` or `E`: Open Edit dialog for selected post.
    - `Esc`: Close open modal.
- **Empty State:** `div[data-testid="queue-empty-state"]` containing `"No posts in queue"` and `Link[href="/agent"]` with text `"Run the agent"`.

### 1.5 Journey 5: Content Calendar (`/calendar`)
- **Route file:** `src/app/(workspace)/calendar/page.tsx`
- **Components:** `src/components/calendar/calendar-grid.tsx`, `calendar-cell.tsx`
- **Calendar Header Controls:**
  - Root View: `div[data-testid="calendar-view"]`.
  - Month Heading: `h2` displaying current month and year (e.g. `"October 2026"`).
  - Previous Month Button: `button[title="Previous month"]`.
  - Next Month Button: `button[title="Next month"]`.
  - Today Button: `button:has-text("Today")`.
  - Channel Filter: `select` with "All Channels", "LinkedIn", "X (Twitter)", "Instagram", "Facebook".
  - Status Filter: `select` with "All Statuses", "In Review", "Approved", "Scheduled", "Published", "Held".
  - Refresh Button: `button[title="Refresh calendar"]`.
- **Calendar Grid & Cells:**
  - Day of Week Headers: `Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`.
  - Cell Element: `div[data-testid="calendar-cell-YYYY-MM-DD"]`.
  - Day Number: Circle with date number (highlighted with `bg-accent` if today).
  - Post Count Pill: `${posts.length} post(s)`.
  - Post Item Pills: `button` inside cell displaying:
    - Status dot (green for published, blue for scheduled, yellow for in_review).
    - 2-letter channel prefix (e.g. `LI`, `X`, `IN`, `FA`).
    - Post headline or caption.
    - Scheduled time.
  - Post Click Action: Clicking any post pill in a cell immediately opens `EditPostDialog` (`div[data-testid="edit-post-dialog"]`) for inspecting and modifying scheduled content.

### 1.6 Journey 6: Connectors & Webhooks (`/connectors`, `/webhooks`)
- **Route files:** `src/app/(workspace)/connectors/page.tsx`, `src/app/(workspace)/webhooks/page.tsx`
- **Connectors View (`/connectors`):**
  - Reconnect Alert Banner: `ReconnectBanner` at the top when any connector has status `needs_reconnect` or `error`.
  - Header Toolbar:
    - Probe All: `button:has-text("Probe All")` (runs health checks across all 4 channels).
    - Reset Defaults: `button:has-text("Reset Defaults")` (resets all 4 connectors to clean default connected sandbox state).
    - Refresh: `button:has-text("Refresh")`.
  - Connector Cards: `div[data-testid="connector-card-${provider}"]` (providers: `linkedin`, `instagram`, `x`, `facebook`):
    - Provider text badge: `LI`, `IN`, `X`, `FB`.
    - Mode badge: `sandbox` or `live`.
    - Channel capabilities grid: char limit, max tags, branded cards, auto-schedule.
    - Health check button: `button` inside `HealthCheckButton` displaying `"Run Health Check"` or latency in milliseconds (`XXms`).
    - Connect / Disconnect button: `button:has-text("Connect")` or `button:has-text("Disconnect")`.
    - Simulation Button: `button[aria-label="Configure failure simulator for ..."]` or `button:has-text("Simulation")`.
  - Advanced Simulation Matrix (Collapsible):
    - Toggle Button: `button[aria-expanded]` with text `"Advanced: Fault Injection & Simulation Matrix"`.
    - Cards for each provider with `"Configure Fault"` buttons.
  - Failure Simulator Modal:
    - Dialog: `div[role="dialog"][aria-labelledby="simulator-modal-title"]`.
    - Title: `"Sandbox Failure Simulator"`.
    - Radio Options:
      - `none`: `"None (Normal Operation)"` (200 OK).
      - `temporary`: `"Temporary Failure (500)"` (HTTP 500).
      - `rate_limit`: `"Rate Limited (429)"` (HTTP 429).
      - `permanent`: `"Permanent Error (400)"` (HTTP 400).
      - `auth_expired`: `"Authentication Expired (401)"` (HTTP 401).
    - Retry Delay Input: `input#retry-delay` (visible when `rate_limit` or `temporary` selected).
    - Save Button: `button[type="submit"]:has-text("Save Simulation Mode")`.
    - Cancel Button: `button:has-text("Cancel")`.
  - Live LinkedIn OAuth Dialog:
    - Opened via `"Go Live"` button on LinkedIn card.
- **Webhooks View (`/webhooks`):**
  - Incoming Webhook Ingestion Card:
    - Send Test Event: `button:has-text("Send test event")` (triggers `POST /api/hooks/:id/test`).
    - Result Banner: Displays `"Test event delivered successfully! Event ID: ..."` on success.
    - Public Webhook URL: Read-only box with copy button `button[aria-label="Copy URL"]`.
    - Signing Secret: Masked secret with reveal button `button[aria-label="Reveal secret"]` and copy button `button[aria-label="Copy secret"]`.
    - Rotate Secret: `button:has-text("Rotate secret")` (triggers confirmation alert and rotates secret).
  - Outgoing Webhooks List:
    - Add Webhook Button: `button:has-text("Add webhook")`.
    - Empty State or List: displays URL, Sandbox badge, toggle active checkbox, Delete button `button[aria-label="Delete webhook"]`, and Test button `button:has-text("Test")`.
  - Add Webhook Modal:
    - Destination URL: `input[type="url"]`.
    - Sandbox Helper Button: `button:has-text("Use Sandbox Receiver")` (populates `/api/sandbox/receiver/demo`).
    - Secret Input: `input[placeholder="whsec_..."]`.
    - Active Checkbox: `input#active`.
    - Submit Button: `button[type="submit"]:has-text("Create Webhook")`.

### 1.7 AppShell & Responsive UI Guardrails (R3)
- **Component files:** `src/components/layout/app-shell.tsx`, `sidebar.tsx`, `top-bar.tsx`
- **Sidebar Elements:**
  - Container: `div[data-testid="sidebar-container"]`.
  - Brand Logo: `a[data-testid="brand-logo"]`.
  - Nav Items:
    - Home: `a[data-testid="nav-item-home"]` (`/`)
    - Brand Kit: `a[data-testid="nav-item-brand-kit"]` (`/brand-kit`)
    - Agent: `a[data-testid="nav-item-agent"]` (`/agent`)
    - Queue: `a[data-testid="nav-item-queue"]` (`/queue`)
    - Calendar: `a[data-testid="nav-item-calendar"]` (`/calendar`)
    - Connectors: `a[data-testid="nav-item-connectors"]` (`/connectors`)
    - Automations: `a[data-testid="nav-item-automations"]` (`/automations`)
    - Webhooks: `a[data-testid="nav-item-webhooks"]` (`/webhooks`)
    - Activity: `a[data-testid="nav-item-activity"]` (`/activity`)
  - Sidebar Collapse Toggle: `button[data-testid="sidebar-collapse-toggle"]` (toggles width between `w-60` and `w-16`).
  - Theme Toggle: `button[data-testid="theme-toggle"]` (switches between `light` and `dark`).
  - Reset Demo Button: `button[data-testid="reset-demo-button"]` (triggers confirmation and calls `POST /api/workspace/reset`).
- **Mobile Navigation:**
  - Mobile Menu Toggle: `button[data-testid="mobile-menu-toggle"]` in `top-bar`.
  - Mobile Sidebar Drawer: `aside[data-testid="mobile-sidebar"]`.
  - Backdrop: `div[data-testid="mobile-drawer-backdrop"]`.

---

## 2. Logic Chain

1. **User Persona Alignment:** Real users interact with buttons, form inputs, dialogs, and navigation links. Playwright tests should interact with visible, accessible elements rather than synthetic backend requests alone.
2. **Deterministic Workspace Isolation:** BrandPilot uses HttpOnly anonymous workspace cookies (`bp_workspace_id`). Each fresh browser context or test creates its own workspace isolation, guaranteeing tests don't cross-contaminate.
3. **Offline Demo Stepper as Foundation:** The Home page stepper (`OneClickDemoStepper`) triggers the entire pipeline: creates sample kit (`/api/brand-kits`), runs 3-step content agent (`/api/runs`), batch-approves posts (`/api/posts/approve-all`), and publishes to sandbox connectors (`/api/posts/schedule-approved` & `/api/publish/run-due`). Therefore, testing the Home page stepper provides end-to-end data seeding for subsequent queue and calendar assertions.
4. **State Machine Verification in UI:** The approval queue (`/queue`) relies on `@radix-ui/react-dialog` modals (`EditPostDialog`, `HoldPostDialog`) and optimistic UI updates. Testing clicking Approve, Hold, Edit, and keyboard shortcuts (`A`, `H`, `E`, `?`) directly proves the state machine and UI responsiveness.
5. **DOM Selector Stability:** Because components are already equipped with robust semantic attributes (`data-testid`, `role`, `aria-label`, button texts), Playwright tests can target reliable, maintainable selectors without brittle CSS paths.

---

## 3. Caveats

1. **Route Naming Difference:** In the dispatch message, item 3 referred to `/runs`, but the actual Next.js App Router workspace page is `/agent` (`src/app/(workspace)/agent/page.tsx`). The backend API route is `/api/runs`. Tests should navigate to `/agent`.
2. **Next.js Server Lifecycle:** Playwright `webServer` in `playwright.config.ts` uses `pnpm start` (port 3000), which requires `pnpm build` before running tests in CI/production mode, or `next dev` if running against local dev.
3. **LinkedIn OAuth Live Mode:** Live LinkedIn requires external OAuth tokens (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`). In E2E tests, live mode should be checked for graceful error handling or tested against Sandbox mode (`mode: 'sandbox'`), which is 100% offline and deterministic.
4. **Browser Clipboard Permissions:** In headless Chromium, `navigator.clipboard.writeText` requires clipboard permissions in the Playwright context (`permissions: ['clipboard-read', 'clipboard-write']`).

---

## 4. Conclusion & Recommended Test Architecture

A comprehensive suite of interactive Playwright spec files should be organized as follows:

```
tests/e2e/
├── golden-path.spec.ts          # Existing health & HTTP check suite
├── 01-home-demo.spec.ts         # Hero sample extraction, 4-step offline loop, and navigation links
├── 02-brand-kit.spec.ts         # Brand kit view, WCAG AA color palette badges, and inline editing
├── 03-content-pipeline.spec.ts  # Agent run configuration, 3-step state visualizer, and creative cards
├── 04-approval-queue.spec.ts    # Post cards, Approve/Hold/Reject state transitions, character counter, keyboard shortcuts
├── 05-content-calendar.spec.ts  # Month navigation, post status pills on calendar cells, detail modal inspection
├── 06-connectors-webhooks.spec.ts # Connector health check, failure simulator modal, webhooks copy & secret rotation
└── 07-responsive-shell.spec.ts  # Sidebar collapse, mobile navigation drawer, and light/dark theme toggle
```

### Key Playwright Selectors Reference Table

| Journey / Feature | Element | Recommended Playwright Selector | Expected Action / Outcome |
|---|---|---|---|
| **Home: Sample Demo** | "Load Sample Brand Kit" button | `page.getByRole('button', { name: 'Load Sample Brand Kit' })` | Click triggers POST `/api/brand-kits`, redirects to `/brand-kit` |
| **Home: Stepper** | "Run One-Click Demo" button | `page.getByTestId('demo-stepper').getByRole('button', { name: 'Run One-Click Demo' })` | Runs 4 steps, shows "Executing Loop", ends with "Full 4-Step Autonomous Loop Completed Successfully!" |
| **Brand Kit: View** | Heading & Badges | `page.locator('h1')`, `page.getByText('WCAG AA Contrast Palette')` | Displays brand name and "Auto-Checked" contrast badge |
| **Brand Kit: Edit** | Edit Kit & Save buttons | `page.getByRole('button', { name: 'Edit Kit' })`, `page.getByRole('button', { name: 'Save' })` | Updates brand name & summary, shows "Brand Kit updated successfully!" |
| **Agent: Run** | Goal input & Run button | `page.locator('#goal')`, `page.getByRole('button', { name: 'Run Content Agent' })` | Triggers `/api/runs`, advances Idea -> Creative -> Campaign nodes |
| **Queue: Approve** | Approve button on card | `page.getByTestId(/^post-card-/).first().getByRole('button', { name: 'Approve' })` | Transitions post status from `in_review` to `approved` |
| **Queue: Hold** | Hold button & Modal | `page.getByTestId(/^post-card-/).first().getByRole('button', { name: 'Hold' })`, `page.getByTestId('hold-post-dialog')` | Enters hold reason, transitions status to `held` |
| **Queue: Counter** | Live char counter | `page.getByTestId('char-counter')` | Displays tabular character count `X / 280` or limit |
| **Queue: Shortcuts** | Keyboard shortcut `?` | `page.keyboard.press('?')` | Opens `div[data-testid="keyboard-shortcuts-dialog"]` |
| **Calendar: Month** | Prev / Next buttons | `page.getByRole('button', { name: 'Previous month' })`, `page.getByRole('button', { name: 'Next month' })` | Switches month heading and updates day cells |
| **Calendar: Detail** | Post item pill in cell | `page.getByTestId(/^calendar-cell-/).locator('button').first()` | Opens `div[data-testid="edit-post-dialog"]` |
| **Connectors: Health** | Probe All button | `page.getByRole('button', { name: 'Probe All' })` | Probes all 4 channels, shows latency badges |
| **Connectors: Sim** | Failure Simulator Modal | `page.getByRole('button', { name: /Configure failure simulator for/ }).first()` | Opens simulator modal, allows selecting 500, 429, 400, 401 |
| **Webhooks: Secret** | Rotate secret button | `page.getByRole('button', { name: 'Rotate secret' })` | Rotates HMAC signing secret |
| **Webhooks: Test** | Send test event button | `page.getByRole('button', { name: 'Send test event' })` | Shows "Test event delivered successfully! Event ID: ..." |
| **AppShell: Theme** | Theme Toggle | `page.getByTestId('theme-toggle')` | Toggles `dark` class on root HTML element |
| **AppShell: Mobile** | Mobile menu button | `page.getByTestId('mobile-menu-toggle')` | Opens `aside[data-testid="mobile-sidebar"]` |

---

## 5. Verification Method

To independently verify all findings and test suite execution:

1. **TypeScript Type Check:**
   ```powershell
   pnpm typecheck
   ```
   *Expected:* 0 errors.

2. **Linting Check:**
   ```powershell
   pnpm lint
   ```
   *Expected:* 0 errors, 0 warnings.

3. **Playwright E2E Test Suite Run:**
   ```powershell
   pnpm test:e2e
   ```
   *Expected:* All interactive browser spec files pass headlessly with clean teardown.

4. **Unit and Integration Suites:**
   ```powershell
   pnpm test
   ```
   *Expected:* 406/406 unit and integration tests passing.
