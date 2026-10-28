# Investigation Report: AppShell, Responsive Layout, Theme Switcher & Interactive UI Feedback

**Target Working Directory**: `c:\Users\rizwan\Desktop\projects\BrandPilot-AuroScale\.agents\teamwork\teamwork_preview_explorer_e2e_shell`  
**Investigator**: Explorer Agent  
**Date**: 2026-10-28  
**Scope**: BrandPilot Playwright E2E Test Suite (AppShell, Layout Breakpoints, Theme Switcher, and Interactive UI Feedback)

---

## 1. Observation

### 1.1 Layout Architecture & Components
- **`src/app/layout.tsx` (lines 21-39)**:
  - Root layout mounts `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` around all pages.
  - Root `<html>` element has `lang="en" suppressHydrationWarning className={inter.variable}` (lines 26-27).
  - Root `<body>` element has class `min-h-screen bg-bg text-text antialiased` (line 28).
- **`src/components/layout/app-shell.tsx` (lines 19-132)**:
  - Container element: `<div data-testid="app-shell" className={clsx('min-h-screen flex bg-bg text-text', className)}>` (lines 60-63).
  - Desktop sidebar element: `<aside data-testid="desktop-sidebar" className={clsx('hidden md:flex flex-col border-r border-border bg-surface shrink-0 transition-all duration-200 z-20 sticky top-0 h-screen', collapsed ? 'w-16' : 'w-60')}>` (lines 65-70).
  - Mobile drawer backdrop: `{mobileOpen && <div data-testid="mobile-drawer-backdrop" className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setMobileOpen(false)} aria-hidden="true" />}` (lines 81-88).
  - Mobile sidebar drawer element: `<aside data-testid="mobile-sidebar" aria-modal="true" role="dialog" aria-label="Mobile navigation" className={clsx('md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-surface border-r border-border shadow-xl transform transition-transform duration-200 ease-in-out flex flex-col', mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none')}>` (lines 91-99).
  - Mobile drawer interactions:
    - `Escape` keydown listener closes mobile nav (`setMobileOpen(false)`, lines 33-41).
    - Body scroll lock toggled via `document.body.style.overflow = mobileOpen ? 'hidden' : ''` (lines 43-57).
    - Navigating via any link triggers `onNavigate={() => setMobileOpen(false)}` (line 104).
  - Content area: `<main data-testid="app-content-area" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"><div className="max-w-[1200px] mx-auto w-full">{children}</div></main>` (lines 121-129).

### 1.2 Sidebar & Navigation Items
- **`src/components/layout/sidebar.tsx` (lines 25-42, 118-232)**:
  - Container element: `<div data-testid="sidebar-container" className={clsx('flex flex-col h-full bg-surface text-text select-none', collapsed ? 'w-16' : 'w-60')}>` (lines 118-124).
  - Brand logo: `<Link href="/" data-testid="brand-logo">` with `BP` icon badge and text `<span className="truncate font-medium text-text">BrandPilot</span>` (visible only when `!collapsed`, lines 128-140).
  - Collapse toggle button: `<button type="button" data-testid="sidebar-collapse-toggle" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden md:flex h-6 w-6 ...">` (lines 142-155).
    - When `collapsed === true`: renders `<PanelLeftOpen className="h-3.5 w-3.5" />` with `aria-label="Expand sidebar"`.
    - When `collapsed === false`: renders `<PanelLeftClose className="h-3.5 w-3.5" />` with `aria-label="Collapse sidebar"`.
  - Navigation container: `<nav aria-label="Sidebar navigation" className="flex-1 overflow-y-auto px-2 py-3 space-y-1" data-testid="sidebar-nav">` (lines 159-163).
  - 9 Navigation items (`NAV_ITEMS`):
    1. `Home`: href `/`, `data-testid="nav-item-home"`
    2. `Brand Kit`: href `/brand-kit`, `data-testid="nav-item-brand-kit"`
    3. `Agent`: href `/agent`, `data-testid="nav-item-agent"`
    4. `Queue`: href `/queue`, `data-testid="nav-item-queue"`
    5. `Calendar`: href `/calendar`, `data-testid="nav-item-calendar"`
    6. `Connectors`: href `/connectors`, `data-testid="nav-item-connectors"`
    7. `Automations`: href `/automations`, `data-testid="nav-item-automations"`
    8. `Webhooks`: href `/webhooks`, `data-testid="nav-item-webhooks"`
    9. `Activity`: href `/activity`, `data-testid="nav-item-activity"`
  - Active route indicators:
    - Active link receives `data-active="true"` and `aria-current="page"` (lines 176-177).
    - Active classes: `'bg-accent-soft text-accent font-semibold'`.
    - Inactive classes: `'text-text-muted hover:text-text hover:bg-surface-2'`.
  - Bottom controls (lines 207-230):
    - Theme Toggle: `<ThemeToggle />` (lines 208-216).
    - Reset Demo button: `<button type="button" data-testid="reset-demo-button" onClick={handleResetDemo}>` (lines 217-229).

### 1.3 TopBar Component
- **`src/components/layout/top-bar.tsx` (lines 22-109)**:
  - Header element: `<header data-testid="top-bar" className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6 shrink-0">` (lines 31-37).
  - Mobile menu toggle: `<button type="button" data-testid="mobile-menu-toggle" aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileOpen} onClick={onToggleMobile} className="md:hidden inline-flex h-8 w-8 ...">` (lines 40-54).
    - Shows `<Menu data-testid="mobile-menu-open-icon" />` when closed.
    - Shows `<X data-testid="mobile-menu-close-icon" />` when open.
  - Breadcrumbs & Title:
    - When `breadcrumbs` provided: `<nav aria-label="Breadcrumb">` with `<ol>` and `<li>` items, chevron separators, and last item marked with `aria-current="page"` (lines 58-90).
    - When `title` provided without breadcrumbs: `<h1 className="text-sm font-semibold text-text truncate">{title}</h1>` (lines 91-93).
  - TopBar Actions slot: `<div data-testid="top-bar-actions">{actions}</div>` (lines 100-107).

### 1.4 Theme Switcher Implementation
- **`src/components/layout/sidebar.tsx` (lines 44-75)**:
  - `<ThemeToggle>` component uses `useTheme()` from `next-themes`.
  - Button element: `<button type="button" data-testid="theme-toggle" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} onClick={toggle}>` (lines 61-74).
  - State resolution:
    - Light mode: renders `<Moon className="h-4 w-4" />` with `aria-label="Switch to dark mode"`.
    - Dark mode: renders `<Sun className="h-4 w-4" />` with `aria-label="Switch to light mode"`.
    - Toggle action: `setTheme(isDark ? 'light' : 'dark')`.
- **`src/app/globals.css` (lines 5-41)**:
  - Light tokens under `:root`:
    - `--bg: #FAFAFB; --surface: #FFFFFF; --surface-2: #F4F4F6; --border: #E6E6EA; --text: #1B1B1F; --accent: #5E6AD2;`
  - Dark tokens under `.dark`:
    - `--bg: #0E0F11; --surface: #141518; --surface-2: #1B1C20; --border: #26272C; --text: #ECECEF; --accent: #7C86F0;`
- **`tailwind.config.ts` (lines 3-30)**:
  - `darkMode: ['class']`.
  - Semantic colors mapped to CSS variables (`bg: 'var(--bg)'`, `surface: 'var(--surface)'`, etc.).
- **FOUC & Flashing Prevention**:
  - `disableTransitionOnChange` on `<ThemeProvider>` in `src/app/layout.tsx:33`.
  - `suppressHydrationWarning` on `<html>` in `src/app/layout.tsx:27`.

### 1.5 Interactive Feedback Elements Across Pages
Investigation of the codebase reveals that BrandPilot uses dedicated, contextual feedback patterns rather than an external generic toast library:
- **No external toast library**: `package.json` contains `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`. No `sonner` or `react-toastify` is installed.
- **Spinners & Loading Indicators**:
  - `RefreshCw` with `animate-spin` on refresh buttons:
    - Webhooks page (`src/app/(workspace)/webhooks/page.tsx:164, 185`)
    - Connectors page (`src/app/(workspace)/connectors/page.tsx:396`)
    - Automations page (`src/app/(workspace)/automations/page.tsx:154`)
    - Activity page (`src/app/(workspace)/activity/page.tsx:71, 98`)
    - Queue table (`src/components/queue/queue-table.tsx:363`)
    - Calendar grid (`src/components/calendar/calendar-grid.tsx:228`)
    - Webhook secret rotation button (`src/components/webhooks/incoming-endpoint-card.tsx:152`)
  - `Loader2` with `animate-spin`:
    - Hero URL extraction (`Extracting...`, `src/components/demo/hero.tsx:184`)
    - Hero sample loader (`Loading...`, `src/components/demo/hero.tsx:223`)
    - One-click demo stepper (`Executing Loop (Step X of 4)...`, `src/components/demo/one-click-demo-stepper.tsx:281`)
    - Agent run generator (`Generating...`, `src/app/(workspace)/agent/page.tsx:450`)
    - Agent 3-step pipeline node running state (`src/app/(workspace)/agent/page.tsx:526`)
    - Connector health check button (`Checking...`, `src/components/connectors/health-check-button.tsx:50`)
    - Brand kit save button (`src/app/(workspace)/brand-kit/page.tsx:316`)
    - Live LinkedIn connection dialog (`src/components/connectors/live-linkedin-dialog.tsx:175`)
- **Disabled States**:
  - All actionable buttons (`Extract Brand`, `Run One-Click Demo`, `Run Content Agent`, `Save`, `Health Check`, `Reconnect`, `Bulk Approve`, `Schedule Approved`) apply `disabled={loading}` and Tailwind class `disabled:opacity-50` or `disabled:opacity-40`.
- **Status Badges & Chips**:
  - Post status badges (`src/components/queue/post-card.tsx:30-79`):
    - `in_review`: `bg-warning/10 text-warning border-warning/20` ("In Review")
    - `approved`: `bg-success/10 text-success border-success/20` ("Approved")
    - `held`: `bg-warning/15 text-warning border-warning/30` ("Held")
    - `rejected`: `bg-danger/10 text-danger border-danger/20` ("Rejected")
    - `scheduled`: `bg-accent/15 text-accent border-accent/30` ("Scheduled")
    - `publishing`: `bg-info/15 text-info border-info/30 animate-pulse` ("Publishing")
    - `published`: `bg-success/15 text-success border-success/30 font-medium` ("Published")
    - `failed`: `bg-danger/15 text-danger border-danger/30 font-semibold` ("Failed")
    - `draft`: `bg-surface-2 text-text-muted border-border` ("Draft")
  - Connector status & platform badges (`src/components/connectors/connector-card.tsx:116-149`):
    - Platform badges: `[LI]`, `[IG]`, `[X]`, `[FB]`.
    - Mode badge: `sandbox` (neutral) vs `live` (accent).
    - Status badge: `connected` (green), `rate_limited` (yellow), `needs_reconnect` (warning), `error` (danger).
    - Health check result pill: latency e.g. `24ms` + `Healthy` (green) / `Unhealthy` (red).
  - Brand Kit badges (`src/app/(workspace)/brand-kit/page.tsx`):
    - `WCAG AA Contrast Palette` + `Auto-Checked` badge.
    - Provider pill: `Gemini 2.5 Flash` vs `Deterministic Fallback`.
    - Tone tags: `innovative`, `approachable`, etc.
  - Character Counter live indicator (`src/components/queue/char-counter.tsx:46-73`):
    - `data-testid="char-counter"`, `aria-live="polite"`, `aria-atomic="true"`.
    - Normal: `text-text-muted` (`140 / 280`).
    - Warning (>=90% limit): `text-warning` with badge `X left`.
    - Over-limit (>limit): `text-danger font-semibold` with badge `+X over limit`.
- **Alert & Banner Notifications**:
  - Hero extraction:
    - Success: `<div role="status" aria-live="polite" className="text-success font-medium">`
    - Error: `<p role="alert" className="text-danger font-medium">`
  - Queue actions:
    - Success banner: `<div className="flex items-center justify-between p-3 rounded-md bg-success/10 border border-success/20 text-xs text-success">`
    - Error banner: `<div className="flex items-center gap-2 p-3 rounded-md bg-danger/10 border border-danger/20 text-xs text-danger">`
  - Connectors:
    - Reconnect Alert Banner: `<div role="alert" aria-live="assertive" className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4">`
- **Interactive Modals & Dialogs**:
  - `[data-testid="hold-post-dialog"]` in Queue (`src/components/queue/hold-post-dialog.tsx:48`)
  - `[data-testid="keyboard-shortcuts-dialog"]` in Queue (`src/components/queue/keyboard-shortcuts-dialog.tsx:37`)
  - `[data-testid="edit-post-dialog"]` in Queue
  - `[role="dialog"]` Sandbox Failure Simulator (`src/components/connectors/failure-simulator-modal.tsx:132`)
  - `[role="dialog"]` Automation Dry-Run Modal (`src/components/automations/dry-run-modal.tsx`)
- **Copy Feedback**:
  - Webhook URL & Secret copy buttons (`src/components/webhooks/incoming-endpoint-card.tsx:137, 174`):
    - Toggles icon from `<Copy className="text-text-muted">` to `<Check className="text-success">`.

---

## 2. Logic Chain

1. **Responsive Breakpoint Mechanics**:
   - Tailwind's default `md` breakpoint is `768px`.
   - In `app-shell.tsx:68`, `aside[data-testid="desktop-sidebar"]` has `hidden md:flex`.
   - In `app-shell.tsx:97`, `aside[data-testid="mobile-sidebar"]` has `md:hidden`.
   - In `top-bar.tsx:46`, `button[data-testid="mobile-menu-toggle"]` has `md:hidden`.
   - *Inference*: Tests targeting desktop behavior must run at viewport width >= 768px (e.g. 1280x800). Tests targeting mobile navigation drawer must run at viewport width < 768px (e.g. 390x844 or 375x667).

2. **Sidebar Collapse / Expansion**:
   - `AppShell` holds `collapsed` in state, initialized to `initialCollapsed` (default `false`).
   - The collapse button is inside `Sidebar` at `data-testid="sidebar-collapse-toggle"`.
   - Clicking `sidebar-collapse-toggle` flips `collapsed`.
   - When collapsed is `true`:
     - Desktop sidebar width changes from `w-60` (240px) to `w-16` (64px).
     - Logo text `"BrandPilot"` is hidden.
     - Nav item label text `<span>` elements are hidden; icons remain centered.
     - Toggle icon switches to `PanelLeftOpen` and `aria-label="Expand sidebar"`.
   - *Inference*: A Playwright test can verify this state change by asserting bounding box width (`getBoundingClientRect().width` ~ 240 vs ~ 64) and checking `sidebar-collapse-toggle`'s `aria-label`.

3. **Mobile Drawer Lifecycle**:
   - At mobile viewports (< 768px), `desktop-sidebar` is hidden.
   - Initial state: `mobileOpen === false`. The mobile drawer aside has `-translate-x-full pointer-events-none`. Backdrop is not rendered. Hamburger button has `aria-expanded="false"`.
   - User clicks `[data-testid="mobile-menu-toggle"]`:
     - `mobileOpen` becomes `true`.
     - `[data-testid="mobile-drawer-backdrop"]` is rendered in DOM and visible.
     - `[data-testid="mobile-sidebar"]` transitions to `translate-x-0` and becomes visible.
     - Hamburger button updates to `aria-expanded="true"` and displays `[data-testid="mobile-menu-close-icon"]`.
     - `document.body.style.overflow` is set to `'hidden'`.
   - Dismissal works through 5 distinct triggers:
     1. Clicking hamburger button again.
     2. Clicking `[data-testid="mobile-drawer-backdrop"]`.
     3. Pressing the `Escape` key (`keydown` listener on `window`).
     4. Clicking any navigation link in `[data-testid="mobile-sidebar"]`.
     5. Clicking "Reset Demo" in the mobile drawer.
   - *Inference*: The E2E test should test opening via hamburger and closing via link navigation or backdrop click.

4. **Theme Switcher Mechanics & Style Stability**:
   - NextThemes `ThemeProvider` operates with `attribute="class"`.
   - Clicking `[data-testid="theme-toggle"]` calls `setTheme(isDark ? 'light' : 'dark')`.
   - When dark mode is active:
     - `<html>` element has class `dark`.
     - CSS variable `--bg` is `#0E0F11` (dark), `--surface` is `#141518`, `--text` is `#ECECEF`.
     - `ThemeToggle` displays `<Sun>` and `aria-label="Switch to light mode"`.
   - When light mode is active:
     - `<html>` element does not have class `dark`.
     - CSS variable `--bg` is `#FAFAFB` (light), `--surface` is `#FFFFFF`, `--text` is `#1B1B1F`.
     - `ThemeToggle` displays `<Moon>` and `aria-label="Switch to dark mode"`.
   - *FOUC and flashing protection*: `disableTransitionOnChange` disables CSS transitions when the class is added/removed, ensuring instantaneous, flash-free theme switches.
   - *Inference*: In E2E tests, asserting `html` element class (`toHaveClass(/dark/)` vs `not.toHaveClass(/dark/)`) and computed `backgroundColor` of `document.body` provides 100% deterministic verification.

5. **Interactive Feedback Elements**:
   - Rather than floating external toasts, BrandPilot uses semantic, accessible inline feedback:
     - Form submission & action loading: `disabled` attribute + `opacity-50` + `animate-spin` on icons.
     - Success feedback: `role="status"` with `aria-live="polite"`.
     - Error feedback: `role="alert"`.
     - Modals: `role="dialog"` with `aria-modal="true"`.
   - *Inference*: E2E tests should assert `disabled` states and presence of `role="alert"` / `role="status"` / modal dialogs rather than waiting for third-party toast components that do not exist.

---

## 3. Caveats

1. **No External Toast Library**: The PRD and codebase deliberately do not include a generic toast library (like Sonner or React-Toastify). All action feedback is delivered via accessible inline status banners (`role="status"`, `role="alert"`), button spinners (`animate-spin`), and modal dialogs. Tests should not expect `[data-sonner-toaster]` or `.toast`.
2. **ThemeToggle Location in Mobile vs Desktop**: `ThemeToggle` is rendered inside `Sidebar`. Since `Sidebar` is mounted in two places (`desktop-sidebar` and `mobile-sidebar`), on mobile viewports `[data-testid="desktop-sidebar"] [data-testid="theme-toggle"]` will be hidden! To toggle theme on mobile, the test must open the mobile drawer first and target `[data-testid="mobile-sidebar"] [data-testid="theme-toggle"]`, or run the theme test on desktop.
3. **Animations in Headless Browsers**: CSS transitions like `transition-all duration-200` on sidebar width and drawer translation take ~200ms. In Playwright, `expect(locator).toBeVisible()` automatically waits for visibility, but checking bounding box widths immediately after a click should use `expect.poll` or wait for the class change (`toHaveClass(/w-16/)`).

---

## 4. Conclusion

The AppShell, responsive navigation, theme switcher, and interactive feedback architecture is robust, highly accessible, and comprehensively instrumented with clean `data-testid` attributes and ARIA semantics.

### Recommended Playwright E2E Spec: `tests/e2e/app-shell-theme.spec.ts`

The recommended E2E test file should cover:
1. **Desktop AppShell & Sidebar Collapse/Expansion** (`1280 x 800`):
   - Desktop sidebar is visible (`w-60`, ~240px wide).
   - Mobile hamburger button is hidden (`md:hidden`).
   - Clicking `[data-testid="sidebar-collapse-toggle"]` collapses sidebar to `w-16` (~64px wide).
   - Brand logo text is hidden, tooltips on icons are enabled, toggle aria-label becomes `"Expand sidebar"`.
   - Clicking toggle again restores `w-60`.
2. **Sidebar Navigation & Active Route Highlighting**:
   - All 9 navigation links exist (`nav-item-home`, `nav-item-brand-kit`, `nav-item-agent`, `nav-item-queue`, `nav-item-calendar`, `nav-item-connectors`, `nav-item-automations`, `nav-item-webhooks`, `nav-item-activity`).
   - Navigating to `/brand-kit` updates `data-active="true"` and `aria-current="page"` on `nav-item-brand-kit`.
   - TopBar breadcrumbs update to display page hierarchy (`nav[aria-label="Breadcrumb"]`).
3. **Mobile Responsive Navigation Drawer** (`390 x 844`):
   - Desktop sidebar is hidden (`toBeHidden()`).
   - Mobile hamburger button `[data-testid="mobile-menu-toggle"]` is visible.
   - Clicking hamburger button opens drawer:
     - Backdrop `[data-testid="mobile-drawer-backdrop"]` appears.
     - Mobile sidebar `[data-testid="mobile-sidebar"]` has class `translate-x-0` and is visible.
     - Hamburger toggle has `aria-expanded="true"` and close icon.
   - Closing drawer via:
     - Backdrop click -> drawer closes.
     - Hamburger button re-click -> drawer closes.
     - Navigating via link (e.g. clicking `nav-item-queue` in drawer) -> navigates to `/queue` and drawer closes automatically.
4. **Theme Switcher (Light / Dark / Persistence)**:
   - Initial state check on `<html>` class.
   - Clicking `[data-testid="theme-toggle"]` toggles dark mode:
     - `<html>` acquires `.dark` class.
     - Body computed `backgroundColor` shifts to dark background (`#0E0F11` / `rgb(14, 15, 17)`).
     - ThemeToggle icon switches to `<Sun>` with `aria-label="Switch to light mode"`.
   - Clicking `[data-testid="theme-toggle"]` again reverts to light mode:
     - `<html>` loses `.dark` class.
     - Body computed `backgroundColor` shifts to light background (`#FAFAFB` / `rgb(250, 250, 251)`).
   - Reloading the page (`page.reload()`) verifies the chosen theme persists without flashing or style breaks.
5. **Interactive UI Feedback & Dialogs**:
   - On `/queue`:
     - Clicking `Keyboard shortcuts (?)` or pressing `?` displays `[data-testid="keyboard-shortcuts-dialog"]`.
     - Pressing `Escape` closes the shortcuts dialog.
     - Character counter `[data-testid="char-counter"]` displays live limits and ARIA attributes (`aria-live="polite"`).
   - On `/connectors`:
     - Clicking `Simulation` on any connector card opens `[role="dialog"]` (Sandbox Failure Simulator).
     - Pressing `Escape` or clicking close dismisses the modal.
     - Clicking `Run health check` triggers spinner (`animate-spin`) and displays latency badge (`Healthy`).

---

## 5. Verification Method

### 5.1 Proposed Playwright Test Code Snippet
To independently verify this specification, implement `tests/e2e/app-shell-theme.spec.ts` with the following structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('BrandPilot E2E: AppShell, Responsive Layout & Theme Switcher', () => {
  test('Desktop: Sidebar collapses and expands with correct classes and aria labels', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    await expect(desktopSidebar).toBeVisible();
    await expect(desktopSidebar).toHaveClass(/w-60/);

    const collapseToggle = page.locator('[data-testid="sidebar-collapse-toggle"]');
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Collapse sidebar');

    // Collapse
    await collapseToggle.click();
    await expect(desktopSidebar).toHaveClass(/w-16/);
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Expand sidebar');

    // Expand
    await collapseToggle.click();
    await expect(desktopSidebar).toHaveClass(/w-60/);
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Collapse sidebar');
  });

  test('Mobile: Hamburger toggle opens and closes navigation drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    await expect(desktopSidebar).toBeHidden();

    const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(mobileToggle).toBeVisible();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');

    const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
    await expect(mobileSidebar).toHaveClass(/-translate-x-full/);

    // Open Drawer
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(mobileSidebar).toHaveClass(/translate-x-0/);
    await expect(page.locator('[data-testid="mobile-drawer-backdrop"]')).toBeVisible();

    // Navigate to Queue from mobile drawer
    const queueLink = mobileSidebar.locator('[data-testid="nav-item-queue"]');
    await queueLink.click();

    // Verify navigation and drawer auto-close
    await expect(page).toHaveURL(/\/queue/);
    await expect(mobileSidebar).toHaveClass(/-translate-x-full/);
  });

  test('Theme Switcher: Toggles light/dark mode and updates html classes and styles', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const themeToggle = page.locator('[data-testid="desktop-sidebar"] [data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    const html = page.locator('html');

    // Ensure predictable starting theme (switch to light if dark)
    const initialIsDark = await html.evaluate((el) => el.classList.contains('dark'));
    if (initialIsDark) {
      await themeToggle.click();
      await expect(html).not.toHaveClass(/dark/);
    }

    // Toggle to Dark
    await themeToggle.click();
    await expect(html).toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light mode');

    // Verify dark background applied to body
    const darkBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(darkBg).toBe('rgb(14, 15, 17)');

    // Toggle to Light
    await themeToggle.click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Verify light background applied to body
    const lightBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(lightBg).toBe('rgb(250, 250, 251)');
  });

  test('Interactive UI Feedback: Keyboard shortcuts modal and char counter on /queue', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/queue');

    // Press '?' to trigger shortcuts dialog
    await page.keyboard.press('?');
    const shortcutsDialog = page.locator('[data-testid="keyboard-shortcuts-dialog"]');
    await expect(shortcutsDialog).toBeVisible();

    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(shortcutsDialog).toBeHidden();
  });
});
```

### 5.2 Commands to Run
```powershell
pnpm test:e2e
```
Or targeting this spec specifically:
```powershell
npx playwright test tests/e2e/app-shell-theme.spec.ts --headed=false
```

### 5.3 Invalidation Conditions
- Changing Tailwind's `md` breakpoint from 768px.
- Altering `data-testid` names on sidebar, topbar, mobile drawer, or theme toggle.
- Changing `next-themes` configuration from `attribute="class"` to `attribute="data-theme"`.
