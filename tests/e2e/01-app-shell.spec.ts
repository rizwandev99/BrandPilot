import { test, expect } from '@playwright/test';

test.describe('BrandPilot E2E: App Shell, Responsive Layout & Theme Switcher (01)', () => {
  test('Desktop: Sidebar collapses and expands with correct width classes and aria labels', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    await expect(desktopSidebar).toBeVisible();
    await expect(desktopSidebar).toHaveClass(/w-60/);

    // Verify brand logo text is visible
    const brandText = desktopSidebar.locator('[data-testid="brand-logo"] span');
    await expect(brandText).toBeVisible();
    await expect(brandText).toHaveText('BrandPilot');

    const collapseToggle = desktopSidebar.locator('[data-testid="sidebar-collapse-toggle"]');
    await expect(collapseToggle).toBeVisible();
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Collapse sidebar');

    // Click collapse
    await collapseToggle.click();
    await expect(desktopSidebar).toHaveClass(/w-16/);
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Expand sidebar');
    // Brand text should be hidden when collapsed
    await expect(brandText).toBeHidden();

    // Click expand
    await collapseToggle.click();
    await expect(desktopSidebar).toHaveClass(/w-60/);
    await expect(collapseToggle).toHaveAttribute('aria-label', 'Collapse sidebar');
    await expect(brandText).toBeVisible();
  });

  test('Desktop: Navigation links and active route highlighting', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    const homeLink = desktopSidebar.locator('[data-testid="nav-item-home"]');
    await expect(homeLink).toHaveAttribute('data-active', 'true');
    await expect(homeLink).toHaveAttribute('aria-current', 'page');

    // Navigate to Brand Kit
    const brandKitLink = desktopSidebar.locator('[data-testid="nav-item-brand-kit"]');
    await brandKitLink.click();
    await expect(page).toHaveURL(/\/brand-kit/);
    await expect(brandKitLink).toHaveAttribute('data-active', 'true');
    await expect(brandKitLink).toHaveAttribute('aria-current', 'page');
  });

  test('Mobile: Navigation drawer toggle, backdrop, escape key, and auto-close on navigate', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Desktop sidebar should be hidden
    const desktopSidebar = page.locator('[data-testid="desktop-sidebar"]');
    await expect(desktopSidebar).toBeHidden();

    // Mobile menu toggle should be visible
    const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(mobileToggle).toBeVisible();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');

    const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
    await expect(mobileSidebar).toHaveClass(/-translate-x-full/);

    // Open mobile drawer
    await mobileToggle.click();
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(mobileSidebar).toHaveClass(/translate-x-0/);

    const backdrop = page.locator('[data-testid="mobile-drawer-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Test dismissal via Escape key
    await page.keyboard.press('Escape');
    await expect(mobileSidebar).toHaveClass(/-translate-x-full/);
    await expect(backdrop).toBeHidden();

    // Re-open mobile drawer
    await mobileToggle.click();
    await expect(mobileSidebar).toHaveClass(/translate-x-0/);

    // Click navigation item inside mobile drawer
    const queueLink = mobileSidebar.locator('[data-testid="nav-item-queue"]');
    await queueLink.click();

    // Verify navigation occurred and mobile drawer auto-closed
    await expect(page).toHaveURL(/\/queue/);
    await expect(mobileSidebar).toHaveClass(/-translate-x-full/);
  });

  test('Theme Switcher: Toggles light and dark themes on html and applies expected body styling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const themeToggle = page.locator('[data-testid="desktop-sidebar"] [data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    const html = page.locator('html');

    // Normalize to light mode first if currently dark
    const isDarkInitially = await html.evaluate((el) => el.classList.contains('dark'));
    if (isDarkInitially) {
      await themeToggle.click();
      await expect(html).not.toHaveClass(/dark/);
    }

    // Toggle to Dark Mode
    await themeToggle.click();
    await expect(html).toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light mode');

    const darkBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(darkBg).toBe('rgb(14, 15, 17)');

    // Toggle back to Light Mode
    await themeToggle.click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');

    const lightBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(lightBg).toBe('rgb(250, 250, 251)');
  });

  test('Footer Disclaimer: Displays open-source demonstration notice and WCAG badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const footer = page.locator('[data-testid="footer-disclaimer"]');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Open-Source Demonstration Platform');
    await expect(footer).toContainText('WCAG AA Compliant');
    await expect(footer).toContainText('GitHub Repository');
  });
});
