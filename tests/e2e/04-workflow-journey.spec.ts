import { test, expect } from './fixtures';

/**
 * Helper to calculate relative luminance for WCAG contrast ratio calculations.
 * Linearizes sRGB channels according to WCAG 2.1 specifications.
 */
function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculates WCAG contrast ratio (L1 + 0.05) / (L2 + 0.05).
 * WCAG AA requirement for normal body text is >= 4.5:1.
 */
function getWcagContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// 8-byte standard PNG magic header: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test.describe('BrandPilot E2E: Complete Product Workflow Journey (04)', () => {
  test('Full Product Journey: live brand kit extraction -> autonomous agent pipeline -> Resvg PNG -> approval queue hotkeys & version bump -> connectors sandbox resilience', async ({
    page,
  }) => {
    // Generous timeout budget to comfortably accommodate live network scraping and multi-step Gemini generation
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1280, height: 720 });

    // =========================================================================
    // R1: Brand Kit Live URL Extraction Flow
    // =========================================================================
    await page.goto('/brand-kit');

    // In isolated workspace, verify empty state URL input is present
    const urlInput = page.locator('input[placeholder="https://yourbrand.com"]');
    await expect(urlInput).toBeVisible({ timeout: 15000 });

    // Input live external website URL (Linear)
    const targetUrl = 'https://linear.app';
    await urlInput.fill(targetUrl);

    // Trigger extraction and wait for API response + DOM render
    const extractButton = page.getByRole('button', { name: /Extract from URL|Extract/i });
    await expect(extractButton).toBeVisible();

    const [brandKitRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/brand-kits') && res.request().method() === 'POST',
        { timeout: 40000 }
      ),
      extractButton.click(),
    ]);

    expect([200, 201]).toContain(brandKitRes.status());
    const brandKitData = (await brandKitRes.json()) as {
      id: string;
      name: string;
      colors: { primary: string; secondary: string; background: string; text: string };
      provider: string;
      sourceUrl?: string;
    };

    // Assert Brand Name heading in populated view
    const brandHeading = page.locator('h1');
    await expect(brandHeading).toBeVisible({ timeout: 15000 });
    await expect(brandHeading).toContainText(/Linear/i);

    // Assert Provider Badge
    const providerBadge = page.locator(
      'span:has-text("Gemini 2.5 Flash"), span:has-text("High-Availability Fallback")'
    ).first();
    await expect(providerBadge).toBeVisible();

    // Assert WCAG AA Contrast Palette Section & Auto-Checked Badge
    const wcagHeading = page.getByRole('heading', { name: 'WCAG AA Contrast Palette' });
    await expect(wcagHeading).toBeVisible();

    const autoCheckedBadge = page.getByText('Auto-Checked');
    await expect(autoCheckedBadge).toBeVisible();

    // Assert Color Swatches
    await expect(page.getByText('Primary', { exact: true })).toBeVisible();
    await expect(page.getByText('Secondary', { exact: true })).toBeVisible();
    await expect(page.getByText('Background', { exact: true })).toBeVisible();
    await expect(page.getByText('Text', { exact: true })).toBeVisible();

    // Mathematical WCAG AA Contrast Verification (Text vs Background ratio >= 4.5:1)
    const contrastRatio = getWcagContrastRatio(
      brandKitData.colors.text,
      brandKitData.colors.background
    );
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

    // =========================================================================
    // R2: Autonomous 3-Step Agent Pipeline & Resvg PNG Rendering
    // =========================================================================
    // Navigate to Content Agent Pipeline via header action or direct URL
    const launchAgentLink = page.getByRole('link', { name: /Launch Content Agent/i });
    if (await launchAgentLink.isVisible()) {
      await launchAgentLink.click();
    } else {
      await page.goto('/agent');
    }
    await page.waitForURL(/\/agent/, { timeout: 20000 });

    await expect(page.locator('h1')).toHaveText('Content Agent Pipeline');

    // Select 2 posts to optimize execution time
    const twoPostsBtn = page.getByRole('button', { name: '2 Posts' });
    if (await twoPostsBtn.isVisible()) {
      await twoPostsBtn.click();
    }

    // Trigger Content Agent Run
    const runAgentBtn = page.getByRole('button', { name: /Run Content Agent/i });
    await expect(runAgentBtn).toBeVisible();
    await runAgentBtn.click();

    // Assert 3-step state machine visualizer structure
    await expect(page.getByRole('heading', { name: '3-Step Execution Pipeline' })).toBeVisible();
    await expect(page.locator('span:has-text("Idea Agent")')).toBeVisible();
    await expect(page.locator('span:has-text("Creative Agent")')).toBeVisible();
    await expect(page.locator('span:has-text("Campaign Agent")')).toBeVisible();

    // Wait for pipeline completion banner (with resilient retry support for transient API hiccups)
    const completionBanner = page.locator('text=Pipeline complete! Posts drafted in approval queue.');
    const retryBtn = page.getByRole('button', { name: /Retry step/i });

    const startTime = Date.now();
    while (Date.now() - startTime < 120000) {
      if (await completionBanner.isVisible()) break;
      if (await retryBtn.isVisible()) {
        await retryBtn.click();
        await page.waitForTimeout(3000);
      }
      await page.waitForTimeout(1500);
    }
    await expect(completionBanner).toBeVisible({ timeout: 30000 });

    // Assert agent provider badge
    const agentProviderBadge = page
      .locator('span:has-text("Live Gemini 2.5 Flash"), span:has-text("High-Availability SLA Engine")')
      .first();
    await expect(agentProviderBadge).toBeVisible();

    // Navigate to Approval Queue via the completion banner link
    const viewQueueBtn = page.getByRole('link', { name: /View posts in queue/i });
    await expect(viewQueueBtn).toBeVisible();
    await viewQueueBtn.click();
    await page.waitForURL(/\/queue/, { timeout: 15000 });

    // Extract drafted post ID from post-card testid
    const firstPostCard = page.locator('[data-testid^="post-card-"]').first();
    await expect(firstPostCard).toBeVisible({ timeout: 15000 });
    const postCardTestId = await firstPostCard.getAttribute('data-testid');
    expect(postCardTestId).toBeTruthy();
    const postId = postCardTestId!.replace('post-card-', '');

    // Verify server-side Resvg PNG card rendering endpoint via browser session
    const pngResult = await page.evaluate(async (id) => {
      const res = await fetch(`/api/creatives/${id}.png`);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hex = Array.from(bytes.subarray(0, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return {
        id,
        status: res.status,
        contentType: res.headers.get('content-type'),
        size: bytes.length,
        magicHex: hex,
      };
    }, postId);

    expect(pngResult.status).toBe(200);
    expect(pngResult.contentType).toBe('image/png');
    expect(pngResult.size).toBeGreaterThan(1000);
    expect(pngResult.magicHex).toBe('89504e470d0a1a0a');

    // =========================================================================
    // R3: Approval Queue Keyboard Shortcuts & Version/State Integrity
    // =========================================================================
    // Switch to "All" status tab so post remains in view across status transitions
    const allTab = page.locator('div.border-b button').filter({ hasText: /^All/i });
    await allTab.click();

    // Focus post card to establish keyboard selection context
    await firstPostCard.click();

    // Verify initial version v1 and status In Review
    await expect(firstPostCard.locator('span.font-mono:has-text("v1")')).toBeVisible();
    await expect(firstPostCard.getByText('In Review', { exact: true })).toBeVisible();

    // Press keyboard hotkey 'A' to approve and wait for transition to commit
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/transition') && res.status() === 200),
      page.keyboard.press('a'),
    ]);

    // Assert status transitions to Approved
    await expect(firstPostCard.getByText('Approved', { exact: true })).toBeVisible({ timeout: 10000 });

    // Press keyboard hotkey 'E' to open Edit Dialog
    await firstPostCard.click();
    await page.keyboard.press('e');

    const editDialog = page.getByTestId('edit-post-dialog');
    await expect(editDialog).toBeVisible({ timeout: 10000 });
    await expect(editDialog.getByRole('heading', { name: /Edit Post \(v1\)/i })).toBeVisible();

    // Assert re-approval warning banner is visible
    await expect(editDialog.getByText('Re-approval Required')).toBeVisible();
    await expect(
      editDialog.getByText(/reset status from APPROVED back to IN_REVIEW/i)
    ).toBeVisible();

    // Edit post caption
    const captionTextarea = editDialog.locator('textarea[placeholder="Write post caption..."]');
    await captionTextarea.fill('Autonomous AI marketing pipeline for Linear verified by Playwright.');

    // Save changes and wait for patch response
    const saveButton = editDialog.getByTestId('save-post-button');
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/posts/') && res.request().method() === 'PATCH' && res.status() === 200
      ),
      saveButton.click(),
    ]);
    await expect(editDialog).toBeHidden({ timeout: 20000 });

    // Assert version is bumped to v2 and status is reset to In Review
    await expect(firstPostCard.locator('span.font-mono:has-text("v2")')).toBeVisible();
    await expect(firstPostCard.getByText('In Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Post updated (v2).')).toBeVisible();

    // =========================================================================
    // R4: Connectors Sandbox Resilience & Live OAuth Controls
    // =========================================================================
    await page.goto('/connectors');
    await expect(page.getByRole('heading', { name: 'Social Connectors' })).toBeVisible();

    // Verify all 4 connector cards exist with developer sandbox badges
    const linkedinCard = page.getByTestId('connector-card-linkedin');
    const instagramCard = page.getByTestId('connector-card-instagram');
    const xCard = page.getByTestId('connector-card-x');
    const facebookCard = page.getByTestId('connector-card-facebook');

    await expect(linkedinCard).toBeVisible();
    await expect(instagramCard).toBeVisible();
    await expect(xCard).toBeVisible();
    await expect(facebookCard).toBeVisible();
    await expect(linkedinCard.getByText('Safe Developer Sandbox')).toBeVisible();

    // Run health check & latency probe
    const probeAllBtn = page.getByRole('button', { name: 'Probe All' });
    await expect(probeAllBtn).toBeVisible();
    await probeAllBtn.click();

    // Verify latency and healthy badge appear
    await expect(linkedinCard.getByText('Healthy')).toBeVisible({ timeout: 10000 });
    await expect(linkedinCard.locator('span.font-mono:has-text("ms")')).toBeVisible();

    // Open Sandbox Fault Mode modal on LinkedIn connector
    const faultModeBtn = linkedinCard.getByRole('button', { name: /Configure fault injection|Fault Mode/i });
    await faultModeBtn.click();

    const simulatorModal = page.locator('div[role="dialog"]');
    await expect(simulatorModal).toBeVisible();
    await expect(
      simulatorModal.getByText('Sandbox Fault Injection & Resilience Testing')
    ).toBeVisible();

    // Select Rate Limited (429) radio
    const rateLimitRadio = simulatorModal.locator('input[type="radio"][value="rate_limit"]');
    await rateLimitRadio.check();

    // Configure Simulated Retry-After Delay (seconds) input
    const retryDelayInput = simulatorModal.locator('#retry-delay');
    await expect(retryDelayInput).toBeVisible();
    await retryDelayInput.fill('60');

    // Apply sandbox fault mode
    const applyBtn = simulatorModal.getByRole('button', { name: 'Apply Sandbox Fault Mode' });
    await applyBtn.click();
    await expect(simulatorModal).toBeHidden({ timeout: 20000 });

    // Assert fault injected badge is visible on the connector card
    await expect(linkedinCard.getByText('Fault Injected: rate_limit')).toBeVisible();

    // Reset fault mode back to normal (none) to leave environment clean
    await faultModeBtn.click();
    await expect(simulatorModal).toBeVisible();
    const normalRadio = simulatorModal.locator('input[type="radio"][value="none"]');
    await normalRadio.check();
    await applyBtn.click();
    await expect(simulatorModal).toBeHidden({ timeout: 20000 });
    await expect(linkedinCard.getByText('Fault Injected: rate_limit')).toBeHidden();

    // Open Live LinkedIn OAuth Dialog
    const goLiveBtn = linkedinCard.getByRole('button', { name: /Go Live/i });
    await goLiveBtn.click();

    const liveDialog = page.locator('div[role="dialog"]');
    await expect(liveDialog).toBeVisible();
    await expect(
      liveDialog.getByRole('heading', { name: 'Connect Live LinkedIn Account' })
    ).toBeVisible();

    // Verify OAuth scopes, encryption statement, and live warning
    await expect(liveDialog.getByText('w_member_social')).toBeVisible();
    await expect(liveDialog.getByText('AES-256-GCM encryption')).toBeVisible();
    await expect(liveDialog.getByText('Live Publishing Warning')).toBeVisible();

    // Verify Authorize button starts disabled
    const authBtn = liveDialog.getByRole('button', { name: 'Authorize with LinkedIn' });
    await expect(authBtn).toBeDisabled();

    // Check safety acknowledgment checkbox and verify button is enabled
    const ackCheckbox = liveDialog.locator('input[type="checkbox"]');
    await ackCheckbox.check();
    await expect(authBtn).toBeEnabled();

    // Close live modal safely without triggering real OAuth redirect
    const cancelLiveBtn = liveDialog.getByRole('button', { name: 'Cancel' });
    await cancelLiveBtn.click();
    await expect(liveDialog).toBeHidden();

    // Reset sandboxes to clean staging defaults
    page.once('dialog', (dialog) => dialog.accept());
    const resetBtn = page.getByRole('button', { name: 'Reset Sandboxes' });
    await resetBtn.click();
    await expect(
      page.getByText('Reset all 4 connectors to default Developer Sandbox connected state.')
    ).toBeVisible({ timeout: 20000 });
  });

  test('Approval Queue: standalone keyboard hotkeys (A, E), version bump, and state reset', async ({
    page,
    request,
    baseURL,
    testWorkspaceId,
  }) => {
    test.setTimeout(90000);
    const url = baseURL || 'http://localhost:3000';

    // Seed post directly into the isolated test workspace
    const seedRes = await request.post(`${url}/api/posts`, {
      data: {
        channel: 'linkedin',
        caption: 'Enterprise AI autonomous marketing platform for high-growth tech brands.',
        status: 'in_review',
      },
      headers: { cookie: `brandpilot_workspace_id=${testWorkspaceId}` },
    });
    expect(seedRes.ok()).toBe(true);

    await page.goto('/queue');
    await expect(page.getByTestId('queue-view')).toBeVisible();

    // Switch to 'All' status tab so post remains in view through all transitions
    const allTab = page.locator('div.border-b button').filter({ hasText: /^All/i });
    await allTab.click();

    // Select first post card
    const postCard = page.locator('[data-testid^="post-card-"]').first();
    await expect(postCard).toBeVisible();
    await postCard.click();

    // Verify initial version v1 and status In Review
    await expect(postCard.locator('span.font-mono:has-text("v1")')).toBeVisible();
    await expect(postCard.getByText('In Review', { exact: true })).toBeVisible();

    // Press hotkey 'A' to approve and wait for transition to commit
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/transition') && res.status() === 200),
      page.keyboard.press('a'),
    ]);
    await expect(postCard.getByText('Approved', { exact: true })).toBeVisible({ timeout: 10000 });

    // Press hotkey 'E' to open Edit Post Dialog
    await postCard.click();
    await page.keyboard.press('e');

    const editDialog = page.getByTestId('edit-post-dialog');
    await expect(editDialog).toBeVisible({ timeout: 10000 });
    await expect(editDialog.getByRole('heading', { name: /Edit Post \(v1\)/i })).toBeVisible();

    // Verify re-approval warning banner
    await expect(editDialog.getByText('Re-approval Required')).toBeVisible();
    await expect(
      editDialog.getByText(/reset status from APPROVED back to IN_REVIEW/i)
    ).toBeVisible();

    // Edit post caption
    const captionTextarea = editDialog.locator('textarea[placeholder="Write post caption..."]');
    await captionTextarea.fill('Standalone test updated high-impact copy verified via Playwright.');

    // Save changes and wait for patch response
    const saveButton = editDialog.getByTestId('save-post-button');
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/posts/') && res.request().method() === 'PATCH' && res.status() === 200
      ),
      saveButton.click(),
    ]);
    await expect(editDialog).toBeHidden({ timeout: 20000 });

    // Verify post version increment (v1 -> v2) and status reset to In Review
    await expect(postCard.locator('span.font-mono:has-text("v2")')).toBeVisible();
    await expect(postCard.getByText('In Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Post updated (v2).')).toBeVisible();
  });

  test('Social Connectors: standalone health probe latency and sandbox resilience controls', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.goto('/connectors');
    await expect(page.getByRole('heading', { name: 'Social Connectors' })).toBeVisible();

    const linkedinCard = page.getByTestId('connector-card-linkedin');
    await expect(linkedinCard).toBeVisible();
    await expect(linkedinCard.getByText('Safe Developer Sandbox')).toBeVisible();

    // Run health check
    const probeAllBtn = page.getByRole('button', { name: 'Probe All' });
    await probeAllBtn.click();
    await expect(linkedinCard.getByText('Healthy')).toBeVisible({ timeout: 10000 });
    await expect(linkedinCard.locator('span.font-mono:has-text("ms")')).toBeVisible();

    // Fault injection
    const faultModeBtn = linkedinCard.getByRole('button', { name: /Configure fault injection|Fault Mode/i });
    await faultModeBtn.click();

    const simulatorModal = page.locator('div[role="dialog"]');
    await expect(simulatorModal).toBeVisible();
    await expect(
      simulatorModal.getByText('Sandbox Fault Injection & Resilience Testing')
    ).toBeVisible();

    const rateLimitRadio = simulatorModal.locator('input[type="radio"][value="rate_limit"]');
    await rateLimitRadio.check();

    const retryDelayInput = simulatorModal.locator('#retry-delay');
    await retryDelayInput.fill('45');

    const applyBtn = simulatorModal.getByRole('button', { name: 'Apply Sandbox Fault Mode' });
    await applyBtn.click();
    await expect(simulatorModal).toBeHidden({ timeout: 20000 });

    await expect(linkedinCard.getByText('Fault Injected: rate_limit')).toBeVisible();

    // Reset sandboxes
    page.once('dialog', (dialog) => dialog.accept());
    const resetBtn = page.getByRole('button', { name: 'Reset Sandboxes' });
    await resetBtn.click();
    await expect(
      page.getByText('Reset all 4 connectors to default Developer Sandbox connected state.')
    ).toBeVisible({ timeout: 20000 });
  });
});
