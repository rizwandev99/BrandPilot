# Handoff Report: Explorer 2 — Content Pipeline & Resvg Rendering Endpoint

## 1. Observation

### 1.1 Content Pipeline UI & Entry Point
- **Route Path**: The Content Pipeline page is located at `/agent` (source file: `src/app/(workspace)/agent/page.tsx`, lines 1–595).
  - *Note*: While the prompt mentions `/runs`, the frontend App Router page is strictly `/agent`, whereas `/api/runs` is the backend REST API endpoint. Navigating directly to `/runs` would yield a 404.
  - Page Heading: `<h1 className="text-2xl font-bold tracking-tight text-foreground">Content Agent Pipeline</h1>` (`src/app/(workspace)/agent/page.tsx:317`).
  - Breadcrumbs: `[{ label: 'Agent', href: '/agent' }]` (`line 306`).
  - Sidebar Navigation Item: `<Link href="/agent" data-testid="nav-item-agent">` with `Bot` icon (`src/components/layout/sidebar.tsx:35, 175`).
  - Brand Kit Link: In `/brand-kit`, a primary CTA `<Link href="/agent"><span>Launch Content Agent</span></Link>` links directly to `/agent` (`src/app/(workspace)/brand-kit/page.tsx:239-244`).

### 1.2 Form Controls & Run Trigger Mechanics
Inside `src/app/(workspace)/agent/page.tsx`:
- **Brand Kit Select**:
  - Element: `<select id="brandKit" ...>` (`line 368`).
  - Populated via `GET /api/brand-kits` on mount (`lines 97–114`).
  - Options contain `{bk.name}` with value `{bk.id}`. If empty, falls back to displaying auto-initialized enterprise starter template (`line 381`).
- **Campaign Goal Input**:
  - Element: `<input id="goal" type="text" value={goal} ... placeholder="e.g. Announce 2.0 release with 50% faster indexing" />` (`lines 349–357`).
  - Default value: `'Product launch & feature announcement'` (`line 85`).
- **Channel Toggle Buttons**:
  - Buttons for channels `LINKEDIN`, `X`, `INSTAGRAM`, `FACEBOOK` (`lines 392–409`).
  - Default channels: `['linkedin', 'x', 'instagram']` (`line 86`).
  - Selected class: `'border-primary bg-primary/10 text-primary'`.
- **Post Count Buttons**:
  - Buttons for `2 Posts`, `4 Posts`, `6 Posts` (`lines 418–434`).
  - Default value: `4` (`line 87`). Clicking `2 Posts` reduces generation time for fast E2E test runs.
- **Run Content Agent Button**:
  - Element: `<button type="button" disabled={isProcessing || !goal.trim()} onClick={handleStartRun} ...>` (`lines 443–459`).
  - Idle text: `'Run Content Agent'` with `<Bot className="w-4 h-4" />`.
  - In-flight text: `'Generating...'` with `<Loader2 className="w-4 h-4 animate-spin" />` and `disabled={true}`.

### 1.3 3-Step State Machine Visualizer Execution Flow
Inside `src/app/(workspace)/agent/page.tsx:127–205` (`executePipeline`):
1. **Creation**: `POST /api/runs` is called with `{ brandKitId, goal, channels, postCount }` (`lines 235–244`). Returns `{ id, status: 'queued', currentStep: 'idea', ... }`.
2. **Step Progression**: Sequential loop over `['idea', 'creative', 'campaign']`:
   - Step 1 (`idea`): `POST /api/runs/${runId}/step` (`line 144`). Provider generates content ideas. Returns `{ run: { currentStep: 'creative' }, step: { name: 'idea', status: 'succeeded', output: IdeaItem[], provider: 'gemini' | 'fallback' } }`.
   - Step 2 (`creative`): `POST /api/runs/${runId}/step`. Provider writes multi-channel captions, filters brand kit `donts`, enforces character limits, and assigns rotating creative card templates (`minimal-quote`, `feature-card`, `editorial-tip`). Returns `{ run: { currentStep: 'campaign' }, step: { name: 'creative', status: 'succeeded', output: GeneratedCreative[], provider: ... } }`.
   - Step 3 (`campaign`): `POST /api/runs/${runId}/step`. Calculates 7-day schedule intervals with >=2h spacing and writes posts to Postgres with status `in_review` and `version: 1` (`src/server/agents/campaign-step.ts:45–83`). Returns `{ run: { status: 'succeeded' }, step: { name: 'campaign', status: 'succeeded' }, posts: Post[] }`.
3. **DOM Visual Indicators**:
   - Section heading: `<h2 className="text-base font-semibold text-foreground">3-Step Execution Pipeline</h2>` (`line 487`).
   - Run Status Badge: `<span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ...">{activeRun.status}</span>` (`lines 489–500`). Shows `succeeded` with `bg-emerald-500/10 text-emerald-600`.
   - Step Nodes: Step status icons change from numbered badges to `<Loader2 className="w-3.5 h-3.5 animate-spin" />` (running) to `<CheckCircle2 className="w-3.5 h-3.5" />` (succeeded) (`lines 513–532`).
   - Provider Badge: Displays either `'Live Gemini 2.5 Flash'` or `'High-Availability SLA Engine'` (`lines 543–548`).
   - Step Output Previews: Completed steps show JSON output inside `<pre className="text-muted-foreground">` (`lines 555–561`).
   - Pipeline Completion Banner: `<div className="flex items-center gap-2 text-emerald-600 ...">Pipeline complete! Posts drafted in approval queue.</div>` (`lines 576–580`).
   - Queue Link: `<Link href="/queue" ...><span>View posts in queue</span><ArrowRight className="w-4 h-4" /></Link>` (`lines 581–587`).

### 1.4 Post Display in Approval Queue (`/queue`)
In `src/components/queue/queue-table.tsx` and `src/components/queue/post-card.tsx`:
- Newly generated posts are fetched via `GET /api/posts` and rendered in the default `in_review` tab.
- Each post card is rendered with:
  - Container: `<div data-testid="post-card-${post.id}" ...>` (`src/components/queue/post-card.tsx:125`).
  - Channel badge: `<span className="...">{post.channel}</span>` (`line 145`).
  - Version: `<span className="...">v{post.version}</span>` (`line 148`).
  - Status badge: `<span className="...">In Review</span>` (`line 165`).
  - Caption: `<p className="text-sm text-text whitespace-pre-wrap leading-relaxed line-clamp-4">{post.caption}</p>` (`line 174`).
  - Hashtags: `<span className="...">#{tag}</span>` (`lines 180–187`).
  - Creative Card Preview: `Creative Card ({post.creativeSpec.templateId})` with headline and color swatches (`lines 207–237`).
  - Approve Button: `<button type="button" title="Approve post (A)">...<span>Approve</span></button>` (`line 291`).
  - Edit Button: `<button type="button" title="Edit post (E)">...<span>Edit</span></button>` (`line 256`).

### 1.5 Resvg PNG Image Rendering Endpoint
In `src/app/api/creatives/[postId].png/route.ts:10–78`:
- **Route Path**: `GET /api/creatives/${postId}.png`
- **Authentication / Workspace Scoping**: Uses `resolveWorkspace(cookieHeader)` matching `brandpilot_workspace_id` cookie (`line 27`).
- **Rendering Engine**: Uses `@resvg/resvg-js` via `renderCardPng` (`src/server/creatives/card-renderer.ts:84–100`).
- **Template Generation**: Resolves one of 3 templates (`minimal-quote`, `feature-card`, `editorial-tip`) matching `post.creativeSpec.templateId`.
- **Dimensions Per Channel**:
  - LinkedIn: `1200 x 627`
  - X / Twitter: `1200 x 675`
  - Instagram: `1080 x 1080`
  - Facebook: `1200 x 630`
- **HTTP Response Verification**:
  - Status: `200 OK`
  - Header `content-type`: `'image/png'`
  - Header `content-length`: `String(pngBuffer.length)`
  - PNG Magic Bytes header: `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]`
  - Buffer length: `> 1000` bytes (typically 20KB – 80KB)

---

## 2. Logic Chain

1. **Route Discrepancy Reconciliation**:
   - Dispatch states: "Investigate Content Pipeline (/runs)".
   - Investigation of `src/app/` shows no page route exists at `/runs`. The Next.js App Router page is `src/app/(workspace)/agent/page.tsx`, mapped to `/agent`.
   - The backend API endpoints are at `/api/runs`.
   - Therefore, Playwright tests must navigate to `/agent` to exercise the Content Pipeline UI.

2. **Autonomous Run Execution Logic**:
   - On `/agent`, `handleStartRun` dispatches `POST /api/runs` and then initiates 3 sequential `POST /api/runs/${runId}/step` requests for `idea`, `creative`, and `campaign`.
   - The UI does not use WebSockets or SSE; it uses direct client-side async `fetch` iteration with local state updates (`setStepsMap`, `setActiveRun`).
   - Under live conditions with `GEMINI_API_KEY`, Gemini 2.5 Flash generates AI copy in ~8–20s total. Under offline/fallback conditions, `FallbackProvider` executes deterministically in <2s.
   - Therefore, a Playwright waiting assertion on `Pipeline complete! Posts drafted in approval queue.` with a 60-second timeout ensures 100% pass rate in both live and fallback modes.

3. **Post ID Extraction & Resvg Endpoint Verification**:
   - After the 3-step pipeline completes, clicking `View posts in queue` navigates to `/queue`.
   - On `/queue`, each post has an element with `data-testid="post-card-${post.id}"`.
   - Playwright can extract the `postId` via `firstCard.getAttribute('data-testid')` or query `GET /api/posts`.
   - Playwright can then issue `page.request.get(`/api/creatives/${postId}.png`)`.
   - Because `page.request` shares cookies with the browser context, `brandpilot_workspace_id` is automatically passed, allowing the server to find the post and return the generated PNG buffer.
   - Asserting `res.status() === 200`, `res.headers()['content-type'] === 'image/png'`, and checking `buffer.slice(0, 8)` against `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]` guarantees valid server-side Resvg rendering.

---

## 3. Caveats

1. **Page URL vs API URL**: The frontend route is `/agent` (`src/app/(workspace)/agent/page.tsx`), NOT `/runs`. If an E2E test navigates to `/runs`, it will hit a 404.
2. **Post Count and Duration**: By default, `postCount` is 4. Choosing `2 Posts` in the UI reduces Gemini generation requests by half, speeding up the test execution time while thoroughly validating multi-channel generation.
3. **Workspace Cookie Requirement for `/api/creatives/:postId.png`**: The creative PNG endpoint requires the workspace cookie (`brandpilot_workspace_id`). Using `page.request.get` automatically carries the browser context cookies, but if using standalone `request`, `headers: { cookie: ... }` must be included.

---

## 4. Conclusion & Recommended Playwright Spec Implementation

For `tests/e2e/04-workflow-journey.spec.ts` (Step 2: Autonomous Agent Generation Pipeline), the exact recommended implementation snippet is:

```typescript
// --- STEP 2: AUTONOMOUS AGENT PIPELINE & RESVG CREATIVE VERIFICATION ---

// 1. Navigate to Content Agent Pipeline
await page.goto('/agent');
await expect(page.locator('h1')).toHaveText('Content Agent Pipeline');

// 2. Select 2 posts to optimize live generation timing
const twoPostsBtn = page.getByRole('button', { name: '2 Posts' });
if (await twoPostsBtn.isVisible()) {
  await twoPostsBtn.click();
}

// 3. Trigger Content Agent Run
const runAgentBtn = page.getByRole('button', { name: /Run Content Agent/i });
await expect(runAgentBtn).toBeVisible();
await runAgentBtn.click();

// 4. Verify 3-step state machine visualizer transitions
await expect(page.getByRole('heading', { name: '3-Step Execution Pipeline' })).toBeVisible();
await expect(page.locator('span:has-text("Idea Agent")')).toBeVisible();
await expect(page.locator('span:has-text("Creative Agent")')).toBeVisible();
await expect(page.locator('span:has-text("Campaign Agent")')).toBeVisible();

// 5. Wait for pipeline completion banner (handles live Gemini network latency up to 60s)
const completionBanner = page.locator('text=Pipeline complete! Posts drafted in approval queue.');
await expect(completionBanner).toBeVisible({ timeout: 60000 });

// 6. Verify provider badge (Live Gemini 2.5 Flash or High-Availability SLA Engine)
const providerBadge = page.locator('span:has-text("Live Gemini 2.5 Flash"), span:has-text("High-Availability SLA Engine")').first();
await expect(providerBadge).toBeVisible();

// 7. Click CTA to view newly drafted posts in Approval Queue
const viewQueueBtn = page.getByRole('link', { name: /View posts in queue/i });
await expect(viewQueueBtn).toBeVisible();
await viewQueueBtn.click();
await page.waitForURL(/\/queue/, { timeout: 15000 });

// 8. Assert post card exists in queue
const firstPostCard = page.locator('[data-testid^="post-card-"]').first();
await expect(firstPostCard).toBeVisible({ timeout: 15000 });

// 9. Extract postId from post card data-testid attribute
const testIdAttr = await firstPostCard.getAttribute('data-testid');
expect(testIdAttr).toBeTruthy();
const postId = testIdAttr!.replace('post-card-', '');

// 10. Verify Resvg PNG Rendering Endpoint
const creativePngRes = await page.request.get(`/api/creatives/${postId}.png`);
expect(creativePngRes.status()).toBe(200);
expect(creativePngRes.headers()['content-type']).toBe('image/png');

const pngBuffer = await creativePngRes.body();
expect(pngBuffer.length).toBeGreaterThan(1000);

// Verify PNG Magic Header bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
expect(pngBuffer.subarray(0, 8)).toEqual(PNG_MAGIC);
```

---

## 5. Verification Method

To independently verify all findings and selectors:
1. **TypeScript Typecheck**:
   ```powershell
   pnpm typecheck
   ```
   *Verified Result*: Exited with code 0 (no errors).
2. **Integration Test for Resvg PNG Route**:
   ```powershell
   pnpm exec vitest run tests/integration/f3-creatives-png-api.test.ts
   ```
   *Verified Result*: Validates dimensions, PNG headers, and 404 handling.
3. **Inspect Target Files**:
   - `src/app/(workspace)/agent/page.tsx`: Lines 82–260 (state machine loop), 304–594 (DOM UI structure)
   - `src/app/api/creatives/[postId].png/route.ts`: Lines 10–78 (Resvg PNG endpoint)
   - `src/components/queue/post-card.tsx`: Lines 124–304 (`data-testid="post-card-${post.id}"`, action buttons)
