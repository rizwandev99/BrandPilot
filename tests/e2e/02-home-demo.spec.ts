import { test, expect } from './fixtures';

test.describe('BrandPilot E2E: Home & One-Click Demo Flow (02)', () => {
  test('Home Hero: renders value proposition, example chips populate URL input', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Check Hero title and input
    const heroHeading = page.locator('h1#hero-heading');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Turn Any Website URL into');
    await expect(heroHeading).toContainText('High-Impact Social Campaigns');

    const urlInput = page.locator('#website-url-input');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder', 'https://yourbrand.com');

    // Click example brand chip
    const devflowChip = page.getByRole('button', { name: 'DevFlow' });
    await expect(devflowChip).toBeVisible();
    await devflowChip.click();

    // Verify input populated with DevFlow URL
    await expect(urlInput).toHaveValue('https://devflow.io');
  });

  test('Load Sample Brand Kit: loads sample kit instantly and redirects to /brand-kit', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const loadSampleButton = page.getByRole('button', { name: 'Load Sample Brand Kit' });
    await expect(loadSampleButton).toBeVisible();
    await loadSampleButton.click();

    // Verify seamless navigation to /brand-kit upon loading sample kit
    await page.waitForURL(/\/brand-kit/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/brand-kit/);

    // Verify Brand Kit page rendered the loaded kit
    const brandKitHeading = page.locator('h1');
    await expect(brandKitHeading).toBeVisible({ timeout: 10000 });
    await expect(brandKitHeading).toHaveText('BrandPilot');
  });

  test('Offline Demo Stepper: executes 4-step autonomous marketing loop end-to-end', async ({ page }) => {
    test.setTimeout(120000); // Allow sufficient time for multi-step AI pipeline & image rendering
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const stepper = page.locator('[data-testid="demo-stepper"]');
    await expect(stepper).toBeVisible();

    // Check heading
    const stepperHeading = page.locator('#demo-stepper-heading');
    await expect(stepperHeading).toHaveText('Autonomous 4-Step Marketing Loop');

    // Check 4 steps are listed
    const stepList = stepper.locator('ol[aria-label="4-Step Autonomous Marketing Loop"] > li');
    await expect(stepList).toHaveCount(4);

    // Initial state: steps have "Ready" or links
    await expect(stepList.nth(0)).toContainText('Brand Extraction');
    await expect(stepList.nth(1)).toContainText('Content Agent Run');
    await expect(stepList.nth(2)).toContainText('Human Approval Gate');
    await expect(stepList.nth(3)).toContainText('Schedule & Publish');

    // Click "Run One-Click Demo"
    const runDemoButton = stepper.getByRole('button', { name: 'Run One-Click Demo' });
    await expect(runDemoButton).toBeVisible();
    await runDemoButton.click();

    // Verify stepper enters running state
    await expect(stepper.getByText(/Executing Loop/)).toBeVisible();

    // Wait for full completion banner
    const completionBanner = stepper.locator('div[role="status"]');
    await expect(completionBanner).toBeVisible({ timeout: 90000 });
    await expect(completionBanner).toContainText('Full 4-Step Autonomous Loop Completed Successfully!');

    // Check navigation buttons inside completion banner
    const inspectQueueBtn = completionBanner.getByRole('link', { name: 'Inspect Queue' });
    await expect(inspectQueueBtn).toBeVisible();
    await expect(inspectQueueBtn).toHaveAttribute('href', '/queue');

    const viewActivityBtn = completionBanner.getByRole('link', { name: 'View Activity Log' });
    await expect(viewActivityBtn).toBeVisible();
    await expect(viewActivityBtn).toHaveAttribute('href', '/activity');

    // Click Inspect Queue to verify seamless navigation to /queue
    await inspectQueueBtn.click();
    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator('[data-testid="queue-view"]')).toBeVisible();
  });
});
