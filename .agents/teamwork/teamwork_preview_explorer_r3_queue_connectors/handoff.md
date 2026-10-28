# Handoff Report: Explorer 3 — Approval Queue Hotkeys & Connectors Sandbox

## 1. Observation

### 1.1 Approval Queue Architecture & Hotkeys (`/queue`)
- **Route entrypoint**: `src/app/(workspace)/queue/page.tsx:31` renders `<QueueTable />`.
- **Queue Table implementation**: `src/components/queue/queue-table.tsx`
  - **Status Tabs**: lines 26–34:
    ```tsx
    const STATUS_TABS = [
      { id: 'all', label: 'All' },
      { id: 'in_review', label: 'In Review' },
      { id: 'approved', label: 'Approved' },
      { id: 'held', label: 'Held' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'published', label: 'Published' },
      { id: 'rejected', label: 'Rejected' },
    ] as const;
    ```
    - The default active tab is `in_review`: `const [activeTab, setActiveTab] = React.useState<string>('in_review');` (line 47).
    - Status tabs are rendered with:
      `<button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedIndex(0); }}><span>{tab.label}</span><span>{count}</span></button>` (lines 435–459).
  - **Keyboard Event Listener**: lines 259–323:
    - Input guard (lines 261–269):
      ```tsx
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;
      ```
    - Navigation keys:
      - `ArrowUp` or `k`: `setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredPosts.length - 1))` (lines 281–285)
      - `ArrowDown` or `j`: `setSelectedIndex((prev) => (prev < filteredPosts.length - 1 ? prev + 1 : 0))` (lines 287–292)
      - `?`: Toggles `shortcutsOpen` dialog (`data-testid="keyboard-shortcuts-dialog"`) (lines 272–276)
    - Action keys:
      - `a` or `A` (Approve): lines 298–304:
        ```tsx
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          if (currentSelectedPost.status === 'in_review') {
            handleApprove(currentSelectedPost);
          }
          return;
        }
        ```
      - `e` or `E` (Edit): lines 313–318:
        ```tsx
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setEditingPost(currentSelectedPost);
          return;
        }
        ```
      - `h` or `H` (Hold): lines 306–311: `setHoldingPost(currentSelectedPost)`
- **Post Card Component**: `src/components/queue/post-card.tsx`
  - Container selector: `data-testid={`post-card-${post.id}`}` (line 125)
  - Focusable: `tabIndex={0}`, `onClick={onSelect}`, `onFocus={onSelect}` (lines 126–128). Clicking or focusing sets `selectedIndex` in `QueueTable`.
  - Selected visual indicator: `isSelected ? 'border-accent shadow-md ring-2 ring-accent/30' : 'border-border hover:border-text-faint/40 hover:shadow-sm'` (lines 131–134).
  - Version indicator: `<span className="text-xs text-text-muted font-mono font-medium">v{post.version}</span>` (line 148).
  - Status badge: `<span className={clsx('px-2 py-0.5 rounded text-xs border font-medium uppercase tracking-wide', statusBadge.className)}>{statusBadge.label}</span>` (lines 160–166). `statusBadge.label` maps `in_review` -> `"In Review"` and `approved` -> `"Approved"`.
- **Edit Dialog & Version Increment / Reset**: `src/components/queue/edit-post-dialog.tsx`
  - Dialog container: `data-testid="edit-post-dialog"` (line 131).
  - Dialog Title: `Edit Post (v{post.version})` (line 140).
  - Re-approval warning banner (lines 153–162):
    ```tsx
    {willResetStatus && (
      <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Re-approval Required:</strong> Saving changes will bump version to v{post.version + 1} and reset status from{' '}
          <span className="font-semibold uppercase">{post.status}</span> back to{' '}
          <span className="font-semibold uppercase">in_review</span>.
        </div>
      </div>
    )}
    ```
    Where `willResetStatus = post.status === 'approved' || post.status === 'scheduled'` (line 72).
  - Form fields:
    - Caption textarea: `textarea[placeholder="Write post caption..."]` (line 181).
    - Hashtags input: `input[placeholder="tech, marketing, ai"]` (line 195).
    - Card Headline: `input[placeholder="Card headline..."]` (line 207).
    - Card Subline: `input[placeholder="Card subline..."]` (line 218).
    - Scheduled DateTime: `input[type="datetime-local"]` (line 230).
    - Submit button: `button[data-testid="save-post-button"]` (contains text `"Save Changes"`) (line 247).
- **Backend API for Version Bump and Reset**: `src/app/api/posts/[id]/route.ts`
  - PATCH handler (lines 80–91):
    ```ts
    // AC-F5-04: Increment version integer on edit
    const currentVersion = typeof currentPost.version === 'number' ? currentPost.version : 1;
    const nextVersion = currentVersion + 1;

    // AC-F5-04: If post was approved or scheduled, editing resets it back to in_review
    let newStatus = currentPost.status;
    let approvedAt = currentPost.approvedAt;
    if (currentPost.status === 'approved' || currentPost.status === 'scheduled') {
      newStatus = 'in_review';
      approvedAt = null;
    }
    ```
  - Upon save, client updates local posts list and triggers:
    `setSuccessBanner("Post updated (v" + updatedPost.version + ").")` (`queue-table.tsx:255`).

---

### 1.2 Connectors Architecture & Resilience Controls (`/connectors`)
- **Route entrypoint**: `src/app/(workspace)/connectors/page.tsx`
  - Layout Model: Rather than tab primitives (`role="tab"`), the page uses a responsive 4-card grid for the 4 providers (`linkedin`, `instagram`, `x`, `facebook`) with modal dialogs:
    1. `ConnectorCard`: displays status, capabilities, mode badge, latency health probe, and action buttons ("Go Live", "Fault Mode", "Disconnect"/"Connect").
    2. `FailureSimulatorModal`: sandbox fault injection modal.
    3. `LiveLinkedInDialog`: live LinkedIn OAuth 2.0 configuration modal.
    4. `Chaos Engineering & SLA Resilience Testing Matrix`: collapsible section (`button[aria-expanded]`, lines 437–527).
- **Connector Card**: `src/components/connectors/connector-card.tsx`
  - Test ID: `data-testid={`connector-card-${connector.provider}`}` (line 107).
  - Mode badge (lines 127–136):
    `connector.mode === 'live' ? 'Live Production OAuth' : 'Safe Developer Sandbox'`
  - Status badge: `"Connected"`, `"Disconnected"`, `"Needs Reconnect"`, `"Error"`.
  - Health probe button: `<HealthCheckButton provider={connector.provider} ... />` (line 209).
    - Button text: `"Run health check"` (aria-label: `Run health check for ${provider}`).
    - Latency display upon check: `<span className="font-mono text-[11px]">{result.latencyMs}ms</span>` and `<span>Healthy</span>` (lines 58–74 of `health-check-button.tsx`).
  - Toolbar "Probe All" button: `button:has-text("Probe All")` (`page.tsx:365`) runs health checks across all 4 channels concurrently.
  - Active fault banner (lines 185–201):
    `Fault Injected: ${connector.simulationFailure}` (e.g. `rate_limit`, `temporary`).
  - Action buttons:
    - Fault Mode button: `<button onClick={() => onOpenSimulator(connector)} title="Configure fault injection testing for this sandbox" aria-label={`Configure fault injection for ${meta.name}`}>` with label `"Fault Mode"` (lines 270–280).
    - LinkedIn "Go Live" button: `<button onClick={onOpenLiveLinkedIn}><span>{connector.mode === 'live' ? 'Live Settings' : 'Go Live'}</span></button>` (lines 256–266).
- **Failure Simulator Modal**: `src/components/connectors/failure-simulator-modal.tsx`
  - Container: `div[role="dialog"][aria-labelledby="simulator-modal-title"]` (line 132).
  - Title: `<h2 id="simulator-modal-title">Sandbox Fault Injection & Resilience Testing</h2>` (line 148).
  - Fault Mode options (`input[type="radio"][name="simulationMode"]`, lines 178–211):
    - `value="none"`: "None (Normal Operation)" (200 OK)
    - `value="temporary"`: "Temporary Failure (500)" (HTTP 500)
    - `value="rate_limit"`: "Rate Limited (429)" (HTTP 429)
    - `value="permanent"`: "Permanent Error (400)" (HTTP 400)
    - `value="auth_expired"`: "Authentication Expired (401)" (HTTP 401)
  - Retry-After delay input (lines 214–239):
    Visible when `rate_limit` or `temporary` is selected:
    `<input id="retry-delay" type="number" min="5" max="3600" value={retryAfter} ... />`
  - Submit button: `button[type="submit"]` with text `"Apply Sandbox Fault Mode"` (line 251).
- **Live LinkedIn OAuth Dialog**: `src/components/connectors/live-linkedin-dialog.tsx`
  - Container: `div[role="dialog"][aria-labelledby="live-dialog-title"]` (line 70).
  - Title: `<h2 id="live-dialog-title">Connect Live LinkedIn Account</h2>` (line 86).
  - Security and scopes text:
    - `"w_member_social"` (line 126)
    - `"AES-256-GCM encryption"` (line 129)
    - Warning: `"Live Publishing Warning: Any posts published through this connector in Live mode will be immediately publicly visible on your live LinkedIn feed."` (line 141)
  - Safety checkbox (lines 147–156):
    `<input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />`
  - Authorize button (lines 167–183):
    `<button type="button" disabled={!acknowledged || connecting} onClick={handleConnect}>Authorize with LinkedIn</button>`
    Starts disabled, becomes enabled once the safety checkbox is checked.
- **Reset Sandboxes Control**: `src/app/(workspace)/connectors/page.tsx:377`
  - Button: `button:has-text("Reset Sandboxes")`
  - Triggers browser `confirm(...)` (line 267):
    `if (!confirm('Reset all 4 developer sandboxes to clean default connected testing state (clearing active faults)?')) return;`
  - Resets all 4 connectors back to `mode: 'sandbox'`, `simulationFailure: 'none'`, and `status: 'connected'`.

---

## 2. Logic Chain

1. **Queue Hotkey Behavior & Active Element Guard**:
   - `QueueTable` binds keydown listeners to `window`.
   - Lines 261–269 explicitly abort execution if `activeEl.tagName === 'INPUT'`, `'TEXTAREA'`, or `isContentEditable`.
   - Therefore, to reliably trigger hotkeys `a` or `e` in Playwright, the test must click or focus the post card container (`[data-testid^="post-card-"]`).
2. **Filter Tab Interaction During Approval**:
   - By default, `/queue` filters to `activeTab = 'in_review'`.
   - When a post is approved via hotkey `a`, the status updates to `'approved'`.
   - On the `in_review` tab, the approved card would immediately disappear from the view.
   - Therefore, the test should switch to the `"All"` status tab (`button:has-text("All")`) prior to pressing hotkeys, ensuring the post remains visible and its status badge transition can be verified directly.
3. **Version Bump & State Reset Lifecycle**:
   - An approved post has `version = 1` and `status = 'approved'`.
   - When the user presses `e`, `EditPostDialog` opens and identifies `willResetStatus = true`, rendering the amber warning banner: `"Re-approval Required: Saving changes will bump version to v2 and reset status from APPROVED back to IN_REVIEW"`.
   - Submitting the form calls `PATCH /api/posts/[id]`.
   - The backend increments `version = 2` and resets `status = 'in_review'`.
   - Upon closing the dialog, the post card displays `v2` and `"In Review"`.
4. **Connectors Layout Reconciliation (Cards & Modals vs "Tabs")**:
   - The dispatch referred to "Sandbox Simulator and Live OAuth tabs".
   - Direct code inspection confirms there are no `<Tabs>` primitives; instead, the page presents 4 connector cards where each card has a "Go Live" button (triggering the `LiveLinkedInDialog` modal) and a "Fault Mode" button (triggering the `FailureSimulatorModal`).
   - The test must interact with these modal dialogs directly using `div[role="dialog"]`.
5. **Handling the `window.confirm` Dialog on Reset**:
   - "Reset Sandboxes" calls native `window.confirm`.
   - Playwright requires `page.once('dialog', dialog => dialog.accept())` before clicking the button to prevent test timeouts.

---

## 3. Caveats

1. **Workspace Seeding Dependency**:
   - The Approval Queue requires at least one post in `in_review`. In the full user journey test (`04-workflow-journey.spec.ts`), Step 2 (autonomous agent pipeline) runs before the queue test and generates posts in `in_review`. If testing the queue in isolation, a post must be seeded via `request.post('/api/posts', ...)`.
2. **LinkedIn Live OAuth Redirection**:
   - The Live LinkedIn OAuth dialog contains an "Authorize with LinkedIn" button. Clicking this button would redirect to the real LinkedIn OAuth URL (`https://www.linkedin.com/oauth/v2/authorization`) or throw if credentials are not set. The E2E test should verify that the button becomes enabled when the safety checkbox is checked, and then dismiss the modal by clicking "Cancel" or the close button (`X`).
3. **Health Check Network Mocking / Latency**:
   - Health check probes (`POST /api/connectors/:provider/health`) run against local sandbox adapters and complete in under 50ms without external network dependencies.

---

## 4. Conclusion & Playwright Automation Snippets

The exact selectors, keyboard interaction sequences, and assertions are established. Below are the drop-in ready Playwright test blocks for the implementer:

### 4.1 Approval Queue Playwright Test Implementation

```typescript
import { test, expect } from './fixtures';

test.describe('Approval Queue: Hotkeys & State Integrity (F5)', () => {
  test('Approval Queue: keyboard hotkeys (A, E), version bump, and state reset', async ({ page, request, baseURL, testWorkspaceId }) => {
    const url = baseURL || 'http://localhost:3000';

    // 1. Ensure at least one post exists in the queue (or verify agent-generated post)
    const seedRes = await request.post(`${url}/api/posts`, {
      data: {
        channel: 'linkedin',
        caption: 'Enterprise AI autonomous marketing platform for high-growth tech brands.',
        status: 'in_review',
      },
      headers: { cookie: `brandpilot_workspace_id=${testWorkspaceId}` },
    });
    expect(seedRes.ok()).toBe(true);

    // 2. Navigate to /queue
    await page.goto('/queue');
    await expect(page.getByTestId('queue-view')).toBeVisible();

    // 3. Switch to 'All' status tab so post remains in view through all transitions
    const allTab = page.locator('div.border-b button').filter({ hasText: /^All/i });
    await allTab.click();

    // 4. Select the first post card
    const postCard = page.locator('[data-testid^="post-card-"]').first();
    await expect(postCard).toBeVisible();
    await postCard.click(); // Sets focus and selectedIndex=0

    // Verify initial version v1 and status In Review
    await expect(postCard.locator('span.font-mono:has-text("v1")')).toBeVisible();
    await expect(postCard.getByText('In Review', { exact: true })).toBeVisible();

    // 5. Press hotkey 'A' to approve
    await page.keyboard.press('a');

    // Assert status badge updates to Approved
    await expect(postCard.getByText('Approved', { exact: true })).toBeVisible({ timeout: 5000 });

    // 6. Press hotkey 'E' to open Edit Post Dialog
    await postCard.click(); // Ensure card container has focus
    await page.keyboard.press('e');

    const editDialog = page.getByTestId('edit-post-dialog');
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByRole('heading', { name: /Edit Post \(v1\)/i })).toBeVisible();

    // Verify re-approval warning banner
    await expect(editDialog.getByText('Re-approval Required')).toBeVisible();
    await expect(editDialog.getByText(/reset status from APPROVED back to IN_REVIEW/i)).toBeVisible();

    // 7. Edit post caption
    const captionTextarea = editDialog.locator('textarea[placeholder="Write post caption..."]');
    await captionTextarea.fill('Updated high-impact copy verified via Playwright E2E automation.');

    // 8. Save changes
    const saveButton = editDialog.getByTestId('save-post-button');
    await saveButton.click();
    await expect(editDialog).toBeHidden({ timeout: 5000 });

    // 9. Verify post version increment (v1 -> v2) and status reset to In Review
    await expect(postCard.locator('span.font-mono:has-text("v2")')).toBeVisible();
    await expect(postCard.getByText('In Review', { exact: true })).toBeVisible();
    await expect(page.getByText('Post updated (v2).')).toBeVisible();
  });
});
```

### 4.2 Connectors Playwright Test Implementation

```typescript
import { test, expect } from './fixtures';

test.describe('Social Connectors: Sandbox Resilience & Live OAuth (F7)', () => {
  test('Social Connectors: sandbox resilience controls and Live OAuth modal', async ({ page }) => {
    // 1. Navigate to /connectors
    await page.goto('/connectors');
    await expect(page.getByRole('heading', { name: 'Social Connectors' })).toBeVisible();

    // 2. Verify all 4 provider cards exist with developer sandbox mode badges
    const linkedinCard = page.getByTestId('connector-card-linkedin');
    const instagramCard = page.getByTestId('connector-card-instagram');
    const xCard = page.getByTestId('connector-card-x');
    const facebookCard = page.getByTestId('connector-card-facebook');

    await expect(linkedinCard).toBeVisible();
    await expect(instagramCard).toBeVisible();
    await expect(xCard).toBeVisible();
    await expect(facebookCard).toBeVisible();
    await expect(linkedinCard.getByText('Safe Developer Sandbox')).toBeVisible();

    // 3. Health check & latency probe
    const probeAllBtn = page.getByRole('button', { name: 'Probe All' });
    await expect(probeAllBtn).toBeVisible();
    await probeAllBtn.click();

    // Verify latency badge appears on card
    await expect(linkedinCard.getByText('Healthy')).toBeVisible({ timeout: 10000 });
    await expect(linkedinCard.locator('span.font-mono:has-text("ms")')).toBeVisible();

    // 4. Sandbox Resilience Controls: Fault Injection & Rate Limit Delay
    const faultModeBtn = linkedinCard.getByRole('button', { name: /Fault Mode/i });
    await faultModeBtn.click();

    const simulatorModal = page.locator('div[role="dialog"]');
    await expect(simulatorModal).toBeVisible();
    await expect(simulatorModal.getByText('Sandbox Fault Injection & Resilience Testing')).toBeVisible();

    // Select Rate Limited (429) radio
    const rateLimitRadio = simulatorModal.locator('input[type="radio"][value="rate_limit"]');
    await rateLimitRadio.check();

    // Configure Simulated Retry-After Delay (seconds) input
    const retryDelayInput = simulatorModal.locator('#retry-delay');
    await expect(retryDelayInput).toBeVisible();
    await retryDelayInput.fill('45');

    // Apply fault mode
    const applyBtn = simulatorModal.getByRole('button', { name: 'Apply Sandbox Fault Mode' });
    await applyBtn.click();
    await expect(simulatorModal).toBeHidden({ timeout: 5000 });

    // Verify active fault indicator on LinkedIn card
    await expect(linkedinCard.getByText('Fault Injected: rate_limit')).toBeVisible();

    // 5. Live OAuth Dialog & Safety Flags
    const goLiveBtn = linkedinCard.getByRole('button', { name: /Go Live/i });
    await goLiveBtn.click();

    const liveDialog = page.locator('div[role="dialog"]');
    await expect(liveDialog).toBeVisible();
    await expect(liveDialog.getByRole('heading', { name: 'Connect Live LinkedIn Account' })).toBeVisible();

    // Verify OAuth scope and security descriptions
    await expect(liveDialog.getByText('w_member_social')).toBeVisible();
    await expect(liveDialog.getByText('AES-256-GCM encryption')).toBeVisible();
    await expect(liveDialog.getByText('Live Publishing Warning')).toBeVisible();

    // Verify Authorize button is disabled before acknowledgment checkbox
    const authBtn = liveDialog.getByRole('button', { name: 'Authorize with LinkedIn' });
    await expect(authBtn).toBeDisabled();

    // Check safety acknowledgment checkbox
    const ackCheckbox = liveDialog.locator('input[type="checkbox"]');
    await ackCheckbox.check();
    await expect(authBtn).toBeEnabled();

    // Close live modal safely without redirecting
    const cancelLiveBtn = liveDialog.getByRole('button', { name: 'Cancel' });
    await cancelLiveBtn.click();
    await expect(liveDialog).toBeHidden();

    // 6. Reset sandboxes to clean state
    page.once('dialog', (dialog) => dialog.accept());
    const resetBtn = page.getByRole('button', { name: 'Reset Sandboxes' });
    await resetBtn.click();
    await expect(page.getByText('Reset all 4 connectors to default Developer Sandbox connected state.')).toBeVisible();
  });
});
```

---

## 5. Verification Method

1. **Source Code Inspection**:
   - `src/components/queue/queue-table.tsx` lines 259–323 (keyboard handlers).
   - `src/app/api/posts/[id]/route.ts` lines 80–98 (version bump and status reset).
   - `src/components/connectors/failure-simulator-modal.tsx` lines 178–240 (radio values and retry-delay input).
   - `src/components/connectors/live-linkedin-dialog.tsx` lines 120–172 (scopes, safety warning, checkbox, button disabled state).
2. **Unit & Integration Test Verification**:
   - Run existing connector and queue tests:
     `pnpm test tests/integration/f7-connectors-api.test.ts`
     `pnpm test tests/unit/f4-connector-contract.test.ts`
3. **E2E Playwright Execution**:
   - Run the complete Playwright E2E suite:
     `pnpm exec playwright test`
   - Invalidation conditions: If hotkey `a` fails to approve, verify that `activeElement` was not an input and that the post card had focus. If the post disappears upon approval, confirm the test switched to the `"All"` status tab first.
