import { test, expect } from './fixtures';

test.describe('BrandPilot E2E: Brand Kit Management & WCAG AA Contrast (03)', () => {
  test.beforeEach(async ({ request, baseURL, testWorkspaceId }) => {
    // Seed sample brand kit into the test workspace so the page has active content
    const url = baseURL || 'http://localhost:3000';
    await request.post(`${url}/api/brand-kits`, {
      data: { sample: true },
      headers: {
        cookie: `brandpilot_workspace_id=${testWorkspaceId}`,
      },
    });
  });

  test('Brand Kit View: displays brand facts, WCAG AA contrast badges, and tone tags', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/brand-kit');

    // Verify Brand Name heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('BrandPilot');

    // Verify Provider Badge
    const providerBadge = page.locator('span:has-text("High-Availability"), span:has-text("Deterministic Fallback"), span:has-text("Gemini 2.5 Flash")').first();
    await expect(providerBadge).toBeVisible();

    // Verify WCAG AA Contrast Palette Section & Auto-Checked Badge
    const wcagHeading = page.getByRole('heading', { name: 'WCAG AA Contrast Palette' });
    await expect(wcagHeading).toBeVisible();

    const autoCheckedBadge = page.getByText('Auto-Checked');
    await expect(autoCheckedBadge).toBeVisible();

    // Verify Color Swatches
    await expect(page.getByText('Primary', { exact: true })).toBeVisible();
    await expect(page.getByText('Secondary', { exact: true })).toBeVisible();
    await expect(page.getByText('Background', { exact: true })).toBeVisible();

    // Verify Brand Tone and Keywords
    await expect(page.getByText('Brand Tone')).toBeVisible();
    await expect(page.getByText('Core Campaign Keywords')).toBeVisible();

    // Verify Actionable Dos and Don'ts
    await expect(page.getByText('Actionable Brand Dos')).toBeVisible();
    await expect(page.getByText('Actionable Brand Don\'ts')).toBeVisible();
  });

  test('Inline Editing: modifies brand kit details and persists updates via PATCH', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/brand-kit');

    // Click Edit Kit
    const editButton = page.getByRole('button', { name: 'Edit Kit' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Edit Name input
    const nameInput = page.locator('input[placeholder="Brand Name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('BrandPilot Pro');

    // Edit Summary textarea
    const summaryTextarea = page.locator('textarea[placeholder="Brand summary..."]');
    await expect(summaryTextarea).toBeVisible();
    await summaryTextarea.fill('Autonomous AI marketing engine for high-growth tech brands.');

    // Edit Primary color hex
    const primaryInput = page.locator('input.font-mono').first();
    await expect(primaryInput).toBeVisible();
    await primaryInput.fill('#4f46e5');

    // Click Save
    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify Success Banner appears
    const successBanner = page.locator('div[role="status"]');
    await expect(successBanner).toBeVisible({ timeout: 15000 });
    await expect(successBanner).toContainText('Brand Kit updated successfully!');

    // Verify updated name and summary in view mode
    const heading = page.locator('h1');
    await expect(heading).toHaveText('BrandPilot Pro');
    await expect(page.getByText('Autonomous AI marketing engine for high-growth tech brands.')).toBeVisible();
  });
});
