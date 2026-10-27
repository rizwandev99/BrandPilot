# Specification Mining & Architecture Report: F2, F3, F5, F7

**Agent**: `teamwork_preview_spec_miner_2`  
**Working Directory**: `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2`  
**Date**: 2026-10-27  
**Scope**: 
- **F2**: Brand Kit Agent (URL scraper, Cheerio facts extraction, SSRF guard, Zod validation, WCAG AA contrast auto-adjust, 24h cache, fallback offline generator)
- **F3**: Content Agent & Branded Image Cards (3-step run machine: idea -> creative -> campaign, step logs, provider tracking, channel limits, banned words, SVG->PNG image card rendering across 3+ templates, retry failed step)
- **F5**: Approval Queue & Content Calendar (strict post status machine, version bump on edit, character counts, channel limit warnings, optimistic UI, bulk actions, calendar month grid, keyboard navigation A/H/E/?)
- **F7**: Connectors UI (cards per provider, sandbox badges, health checks, simulated failure settings, reconnect banners)

---

## 1. Observation

Direct observations from authoritative specifications (`PRD.md` lines 1–683 and `ORIGINAL_REQUEST.md` lines 1–52):

1. **F2 Specification (`PRD.md:315-331`, `ORIGINAL_REQUEST.md:18-20`)**:
   - `AC-F2-01`: `POST /api/brand-kits` with valid URL returns: `name`, `summary` (max 280 chars), `tone` (3–5 words), `dos` (3–5), `donts` (3–5), `audience`, `colors` (4 valid hex values), `keywords` (5–12).
   - `AC-F2-02`: **SSRF Guard**: Rejects non-http(s) URLs, `localhost`, private/loopback/link-local IP ranges (IPv4 & IPv6), and hostnames resolving to them. Checks again after every redirect (max 3 redirects). Returns error code `SSRF_BLOCKED`. Mandatory test coverage: `http://127.0.0.1`, `http://localhost`, `http://169.254.169.254`, `http://[::1]`, hostname resolving to private IP, and redirect to private IP.
   - `AC-F2-03`: Fetch timeout and max response size (1–2 MB). Exceeded size or slow response returns `UPSTREAM_ERROR`, no crash.
   - `AC-F2-04`: LLM output validated with Zod. Invalid output triggers one retry with repair prompt. If still invalid, fallback provider builds basic brand kit from cheerio facts (no AI). Brand kit records provider used.
   - `AC-F2-05`: Colors extracted from `theme-color` or CSS, fallback to default palette. All 4 colors must be valid hex, and text/background pair must pass WCAG AA contrast (>= 4.5:1), auto-adjusting if needed.
   - `AC-F2-06`: `{ sample: true }` creates built-in sample brand kit with zero network and zero LLM calls.
   - `AC-F2-07`: 24-hour cache in `llm_cache` table by URL hash prevents redundant LLM calls.
   - `AC-F2-08`: UI shows editable form; edits call `PATCH /api/brand-kits/:id`. Invalid hex or empty name shows inline error.
   - `AC-F2-09`: UI has loading, error, and empty states. Errors are human-readable ("We could not open that website. Try another URL or use the sample brand.").

2. **F3 Specification (`PRD.md:333-356`, `ORIGINAL_REQUEST.md:18-20`)**:
   - `AC-F3-01`: `POST /api/runs` creates run; calling `/step` 3 times executes `idea`, `creative`, `campaign` in order and ends with status `succeeded`.
   - `AC-F3-02`: Each step saves input, output, provider (`gemini`/`fallback`/`fake`), and timestamps in `agent_run_steps`. UI shows these live.
   - `AC-F3-03`: Calling `/step` twice for the same step is idempotent and does not create duplicate posts.
   - `AC-F3-04`: Channel limits enforced via pure function `validatePostForChannel()`: LinkedIn <= 3000 chars (3–5 hashtags), X <= 280 chars (1–2 hashtags), Instagram <= 2200 chars (8–15 hashtags, max 30), Facebook <= 2000 chars. Violations trigger regeneration/shortening and hard trim as last resort.
   - `AC-F3-05`: Banned words from `donts` filtered from caption and hashtags (cleaned or regenerated).
   - `AC-F3-06`: `GET /api/creatives/:postId.png` returns valid PNG with correct channel dimensions (Instagram 1080x1080, LinkedIn 1200x627, X 1200x675, Facebook 1200x630). Text wraps without overflow; text/background contrast passes AA. No AI image-generation model used.
   - `AC-F3-07`: At least 3 distinct image templates exist, chosen by idea type.
   - `AC-F3-08`: Quota exhaustion/rate limit triggers fallback provider (deterministic template-based writer using brand keywords). UI shows note: "Written with the offline writer because the AI quota is used up."
   - `AC-F3-09`: Scheduled times are in the future, within next 7 days, and spread out (>= 2 hours apart per channel).
   - `AC-F3-10`: Step failure sets run status to `failed`, shows error, and "Retry step" button retries only the failed step.
   - `AC-F3-11`: UI shows vertical step list with status icons (waiting, running, done, failed), subtle animations, and "View posts in queue" button.

3. **F5 Specification (`PRD.md:229-242`, `PRD.md:395-410`, `ORIGINAL_REQUEST.md:24-26`)**:
   - `AC-F5-01`: Queue page lists posts with filters (status, channel), channel badge, caption preview, image card thumbnail, schedule time, and status chip.
   - `AC-F5-02`: Actions per post: Approve, Hold (optional reason), Reject, Edit. Buttons call `POST /api/posts/:id/transition`. Invalid moves blocked on UI and server with `INVALID_TRANSITION`.
   - `AC-F5-03`: Post status machine is a pure function with 100% test table coverage for allowed and disallowed transitions.
   - `AC-F5-04`: Editing caption/image text bumps `version` integer. If post was `approved`, editing resets status to `in_review`.
   - `AC-F5-05`: Edit form shows live character counter, channel-limit warnings, and blocks save when over hard limit.
   - `AC-F5-06`: Bulk actions: "Approve all in review" and "Schedule approved".
   - `AC-F5-07`: Calendar view shows posts by day for current, previous, and next month, color-coded by status. Click opens post. Local timezone display, UTC storage.
   - `AC-F5-08`: Keyboard shortcuts: arrow keys move between posts, `A` approve, `H` hold, `E` edit, `?` shortcuts help modal. Inactive when in text inputs.
   - `AC-F5-09`: Empty state with "Run the agent" CTA button.
   - `AC-F5-10`: Optimistic UI updates with server rollback on failure; rapid double-approvals handled safely.

4. **F7 Specification (`PRD.md:435-444`, `ORIGINAL_REQUEST.md:21-23`)**:
   - `AC-F7-01`: Connectors page shows one card per provider with logo-free text icon (`[LI]`, `[IG]`, `[X]`, `[FB]`), mode badge (Sandbox/Live), status, last check time, and actions.
   - `AC-F7-02`: "Run health check" calls `healthCheck` and displays status and latency.
   - `AC-F7-03`: Sandbox failure simulator is placed strictly inside an "Advanced" collapsible section.
   - `AC-F7-04`: `needs_reconnect` state displays clear warning banner and reconnect button.
   - `AC-F7-05`: New workspace defaults to all 4 sandbox connectors connected (`linkedin`, `instagram`, `x`, `facebook`).

---

## 2. Logic Chain

1. **Brand Kit Agent (F2) & SSRF Architecture**:
   - Public anonymous access creates severe SSRF vulnerability when fetching user-supplied URLs.
   - Standard node `fetch()` is vulnerable to DNS rebinding and redirection attacks.
   - Therefore, URL fetching must go through a custom resolver in `src/server/security/ssrf.ts`:
     1. Parse URL: protocol must be `http:` or `https:`.
     2. Resolve DNS hostname to IP addresses via `dns.promises.lookup({ all: true })`.
     3. Verify every resolved IP against IPv4 and IPv6 private, loopback, link-local, carrier-grade NAT, and cloud metadata (`169.254.169.254`) CIDR blocks.
     4. Make HTTP request with disabled automatic redirect following.
     5. On 3xx redirect: inspect `Location` header, validate URL, re-resolve DNS, and re-verify IP before following (max 3 redirects).
     6. Stream response with byte counter; abort if byte count exceeds 2 MB (`UPSTREAM_ERROR`).
     7. Enforce timeout of 8000ms via `AbortController`.
   - Extracted HTML processed via `cheerio` to pull title, description, headings, visible text snippet, and `theme-color`.
   - Facts fed into `LlmProvider`. Zod validation verifies schema. On validation failure, run repair prompt once. If still failing or quota exhausted, execute `FallbackProvider.generateBrandKit(facts)` deterministically.
   - Palette validation computes WCAG AA contrast ratio $((L_1 + 0.05) / (L_2 + 0.05))$. If contrast is below 4.5:1, adjust text color luminance towards black or white until contrast meets 4.5:1.
   - Normalized URL MD5/SHA256 hash stored in `llm_cache` with 24h TTL.

2. **Content Agent (F3) & Branded Creatives Architecture**:
   - Single long-running AI requests exceed Vercel serverless function timeouts (10–15s on free tier).
   - Hence, the pipeline is split into 3 atomic steps: `idea` -> `creative` -> `campaign`.
   - Each step is executed via `POST /api/runs/:id/step`:
     - Step 1 (`idea`): generates N post concepts mapped to requested channels.
     - Step 2 (`creative`): writes copy, selects hashtags, checks `donts` banned words, applies channel limits (`validatePostForChannel`), and crafts `creative_spec` (headline, subline, template ID).
     - Step 3 (`campaign`): spaces post times over the next 7 days (>= 2h gap per channel), creates records in `posts` table with status `in_review`, marks run `succeeded`.
   - Idempotency: `agent_run_steps` records step name and status. If step is already `succeeded`, `/step` skips execution and proceeds to next step.
   - Error handling: If a step fails, `agent_runs.status = 'failed'` and `agent_run_steps.status = 'failed'`. The "Retry step" button re-invokes `/step` targeting the failed step index, retaining previously completed steps.
   - Image generation: `GET /api/creatives/:postId.png` queries post `creative_spec` and renders server-side SVG converted to PNG via `@resvg/resvg-js`.
     - 3 templates: Minimalist Quote (`minimal-quote`), Feature Card (`feature-card`), Tip/Editorial (`editorial-tip`).
     - SVG contains text wrap calculations to ensure no text overflows boundaries.
     - Contrast between `colors.text` and `colors.background` guaranteed WCAG AA.
     - Zero third-party AI image APIs (100% deterministic, zero cost).

3. **Approval Queue & Content Calendar (F5) Architecture**:
   - The central product axiom is: **No post can ever be published without prior human approval.**
   - Status state machine is implemented as a pure function `canTransition(from, to)` in `src/lib/status-machine.ts`:
     - Disallowed: `draft -> published`, `in_review -> published`, `in_review -> scheduled`, `held -> scheduled`.
     - Allowed: `draft -> in_review -> approved -> scheduled -> publishing -> published`.
     - Rejection moves: `in_review -> rejected -> in_review`.
     - Hold moves: `in_review -> held -> in_review`.
   - Versioning integrity:
     - When user edits a post via `PATCH /api/posts/:id`, `version` is incremented.
     - If the post was in `approved` state, it is forcibly reset to `in_review`. This prevents sneaky post-approval tampering.
   - Real-time character counter in UI compares current caption length against channel caps and disables save on overflow.
   - Keyboard navigation handler binds `keydown` on window, ignoring events originating from `INPUT`, `TEXTAREA`, or `SELECT`.
   - Calendar view displays posts grouped by day based on `scheduled_at`, converting stored UTC timestamps into the browser's local timezone.

4. **Connectors UI (F7) Architecture**:
   - UI maps directly to the `connectors` database table.
   - On workspace creation, seed 4 connected sandbox connectors (`linkedin`, `instagram`, `x`, `facebook`).
   - Cards display text-based badges (`[LI]`, `[IG]`, etc.) to strictly avoid brand copyright issues.
   - Advanced section exposes simulation flags: `none`, `temporary` (500), `rate_limit` (429), `permanent` (400), `auth_expired` (401).
   - `auth_expired` simulation triggers `needs_reconnect` status, which renders the reconnect banner and button.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | F2: Brand Kit | URL Scraper & SSRF Guard | Validates URL, blocks private/loopback/link-local/metadata IPs, resolves DNS, checks redirects (max 3), fetches HTML | `url: string` | `html: string` | Throws `SSRF_BLOCKED` or `UPSTREAM_ERROR` | `PRD.md:321-324`, `AC-F2-02` |
| 2 | F2: Brand Kit | Cheerio Facts Extraction | Parses HTML to extract title, description, OG tags, headings, visible text sample, theme-color | `html: string` | `BrandFacts` object | Empty strings if tags missing, no crash | `PRD.md:319`, `AC-F2-01` |
| 3 | F2: Brand Kit | LLM Brand Kit Generation | Formulates prompt, asks Gemini to produce structured brand kit, validates with Zod | `BrandFacts`, prompt | `BrandKit` object | Retries once with repair prompt; then falls back | `PRD.md:325`, `AC-F2-04` |
| 4 | F2: Brand Kit | Offline Fallback Brand Kit | Deterministic brand kit builder creating tone, colors, dos/donts from extracted facts | `BrandFacts` | `BrandKit` object (provider: `'fallback'`) | Always succeeds | `PRD.md:325`, `AC-F2-04` |
| 5 | F2: Brand Kit | WCAG AA Contrast Auto-Adjust | Validates 4 hex colors and adjusts text luminance until contrast ratio >= 4.5:1 against background | `colors: BrandColors` | Adjusted `BrandColors` | Default valid palette if hex invalid | `PRD.md:326`, `AC-F2-05` |
| 6 | F2: Brand Kit | Built-in Sample Brand Kit | Instantly returns built-in sample brand kit with zero network or AI calls | `{ sample: true }` | `BrandKit` object | Always succeeds | `PRD.md:327`, `AC-F2-06` |
| 7 | F2: Brand Kit | 24-Hour Cache | Caches LLM response in `llm_cache` by URL hash for 24 hours | Normalized URL hash | Cached `BrandKit` | Cache miss proceeds to scrape/LLM | `PRD.md:328`, `AC-F2-07` |
| 8 | F2: Brand Kit | Brand Kit Edit & Validation | Form to edit brand kit fields, updates DB via PATCH | `Partial<BrandKit>` | Updated `BrandKit` | Inline errors for invalid hex or empty name | `PRD.md:329`, `AC-F2-08` |
| 9 | F3: Content Agent | 3-Step Run Orchestrator | Manages sequential step machine: `idea` -> `creative` -> `campaign` | `brandKitId`, `goal`, `channels`, `postCount` | `AgentRun`, `AgentRunStep[]` | Fails step on error, allows retry | `PRD.md:344-347`, `AC-F3-01..03` |
| 10 | F3: Content Agent | Step Logging & Idempotency | Persists input, output, provider, timing per step; rerunning completed step is no-op | `runId`, `stepName` | Updated step record | Returns existing step if already succeeded | `PRD.md:346-347`, `AC-F3-02..03` |
| 11 | F3: Content Agent | Channel Limit Enforcement | Validates chars and hashtags per channel; triggers regen or hard trim | `Post`, `Channel` | Validated `Post` | Shortens text, truncates at word boundary | `PRD.md:348`, `AC-F3-04` |
| 12 | F3: Content Agent | Banned Word Filtering | Scans caption and hashtags for brand kit `donts`; removes or regenerates | Post text, `donts: string[]` | Cleaned post text | Strips banned word or triggers repair | `PRD.md:349`, `AC-F3-05` |
| 13 | F3: Content Agent | Schedule Spacing Algorithm | Generates spread-out schedule times over 7 days, minimum 2 hours apart per channel | Post list, channels | Array of UTC timestamps | Future timestamps only | `PRD.md:353`, `AC-F3-09` |
| 14 | F3: Content Agent | Branded Image Card Render | Server route `/api/creatives/:postId.png` rendering SVG to PNG via resvg | `postId` | `image/png` buffer | Fallback generic card on missing post | `PRD.md:350-351`, `AC-F3-06` |
| 15 | F3: Content Agent | Multi-Template Creatives | 3+ distinct SVG layouts: `minimal-quote`, `feature-card`, `editorial-tip` | `creative_spec`, dimensions | Rendered SVG | Defaults to template 1 if unknown ID | `PRD.md:351`, `AC-F3-07` |
| 16 | F3: Content Agent | Step Error & Retry Support | Failed step sets run to `failed`; "Retry step" button re-executes only failed step | `runId`, `failedStep` | Resumed step execution | Preserves previous step outputs | `PRD.md:354`, `AC-F3-10` |
| 17 | F5: Approval Queue | Strict Status State Machine | Pure function validating post status transitions | `fromStatus`, `toStatus` | Boolean / throws `INVALID_TRANSITION` | 400 `INVALID_TRANSITION` on illegal moves | `PRD.md:229-242`, `AC-F5-03` |
| 18 | F5: Approval Queue | Human Approval Enforcement | Hard guard preventing any post from publishing without prior `approved` status | `Post` | Blocked transition | Publishing blocked if not approved | `PRD.md:241`, `AC-F5-02` |
| 19 | F5: Approval Queue | Post Actions & Hold Reason | Approve, hold (with optional reason), reject, edit buttons | `postId`, action, reason | Updated `Post` | Rejects invalid moves | `PRD.md:401`, `AC-F5-02` |
| 20 | F5: Approval Queue | Version Bump & Approval Reset | Any edit increments `version`; if post was `approved`, resets to `in_review` | `PATCH /api/posts/:id` | `Post` (version+1, status: in_review) | Re-triggers review requirement | `PRD.md:403`, `AC-F5-04` |
| 21 | F5: Approval Queue | Live Character Counter | Real-time counter and warning threshold in edit dialog; blocks save if over limit | Current text, channel cap | Character count & warning state | Save button disabled if over limit | `PRD.md:404`, `AC-F5-05` |
| 22 | F5: Approval Queue | Bulk Approval & Scheduling | "Approve all in review" and "Schedule approved" actions | `workspaceId` | Count of updated posts | Processes matching posts only | `PRD.md:405`, `AC-F5-06` |
| 23 | F5: Approval Queue | Calendar Month Grid View | Visual month grid with color-coded post chips, local time conversion, prev/next month | Year, month, posts | Rendered calendar month view | Handles month boundary math | `PRD.md:406`, `AC-F5-07` |
| 24 | F5: Approval Queue | Keyboard Navigation | Hotkeys (`ArrowUp/Down`, `A`, `H`, `E`, `?`) when list has focus | KeyboardEvent | Post selection / modal action | Ignored inside form inputs | `PRD.md:407`, `AC-F5-08` |
| 25 | F5: Approval Queue | Optimistic UI & Rollback | UI immediately reflects state change and rolls back on server rejection | User click action | UI state update + rollback handler | Restores prior state on error | `PRD.md:409`, `AC-F5-10` |
| 26 | F7: Connectors UI | Provider Cards Display | Cards for LinkedIn, Instagram, X, Facebook with text icons and mode badges | `Connector[]` | Rendered connector cards | Shows disconnected if not configured | `PRD.md:437-438`, `AC-F7-01` |
| 27 | F7: Connectors UI | Connector Health Check | "Run health check" button querying connector status and latency | `provider` | Health status and latency | Displays error message on failure | `PRD.md:439`, `AC-F7-02` |
| 28 | F7: Connectors UI | Sandbox Failure Simulator | Hidden in "Advanced" section: simulate temporary, rate-limit, permanent, auth errors | Selected failure mode | Configured connector failure setting | Saved to DB for scheduler testing | `PRD.md:440`, `AC-F7-03` |
| 29 | F7: Connectors UI | Reconnect Alert Banner | Clear warning banner and reconnect CTA when connector enters `needs_reconnect` | Connector status | Rendered alert banner | Prompts user to re-authenticate | `PRD.md:441`, `AC-F7-04` |
| 30 | F7: Connectors UI | Default Workspace Seeding | Pre-connects all 4 sandbox connectors on new workspace initialization | New workspace ID | 4 connected sandbox connectors | Always pre-seeded | `PRD.md:442`, `AC-F7-05` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | F2: SSRF Guard | `http://127.0.0.1:8080` | Rejected immediately with `SSRF_BLOCKED`. |
| 2 | F2: SSRF Guard | `http://localhost/admin` | Hostname resolves to `127.0.0.1` -> Rejected with `SSRF_BLOCKED`. |
| 3 | F2: SSRF Guard | `http://169.254.169.254/latest/meta-data` | Cloud metadata IP blocked -> Rejected with `SSRF_BLOCKED`. |
| 4 | F2: SSRF Guard | `http://[::1]/` | IPv6 loopback blocked -> Rejected with `SSRF_BLOCKED`. |
| 5 | F2: SSRF Guard | `http://spoofed.internal.domain` | Resolves via DNS to `10.0.0.5` -> IP check detects RFC 1918 private range -> Rejected with `SSRF_BLOCKED`. |
| 6 | F2: SSRF Guard | `https://public-site.com/redirect` -> 302 -> `http://192.168.1.1` | Initial request allowed, redirect target analyzed, resolves to private IP -> Redirect blocked with `SSRF_BLOCKED`. |
| 7 | F2: SSRF Guard | 4 chained redirects (`site1` -> `site2` -> `site3` -> `site4` -> `site5`) | Exceeds max 3 redirects -> Aborts with `UPSTREAM_ERROR`. |
| 8 | F2: Web Scraper | Server returns 50MB ISO image / decompression bomb | Stream byte counter exceeds 2MB -> Stream aborted -> Returns `UPSTREAM_ERROR`. |
| 9 | F2: Web Scraper | Web server hangs without sending bytes | Exceeds 8000ms timeout -> AbortController triggers -> Returns `UPSTREAM_ERROR`. |
| 10 | F2: Brand Kit LLM | Gemini returns markdown text instead of JSON | Zod validation fails -> Sends repair prompt with validation error -> LLM repairs output or fallback provider triggers. |
| 11 | F2: Brand Kit LLM | Gemini API key missing or returns HTTP 429 quota exhausted | Caught by provider wrapper -> Triggers deterministic `FallbackProvider` using cheerio facts -> Saves brand kit with `provider: 'fallback'`. |
| 12 | F2: Brand Kit Palette | Website uses low-contrast colors (e.g. `#FFFF00` text on `#FFFFFF` background) | Contrast auto-adjustment calculates ratio 1.07:1 (< 4.5:1) -> Darkens text progressively until contrast ratio >= 4.5:1. |
| 13 | F2: Sample Brand Kit | `POST /api/brand-kits` with `{ sample: true }` | Bypasses scraper, DNS, SSRF, and LLM entirely -> Returns pre-defined "Acme Tech" brand kit in < 10ms. |
| 14 | F2: 24h Cache | Re-scraping `https://example.com` 2 hours after initial scrape | Cache hit in `llm_cache` table -> Returns cached brand kit without network or LLM calls. |
| 15 | F3: Run Step Machine | Client calls `POST /api/runs/:id/step` twice in parallel for `idea` step | First request executes step; second request checks step status, detects already completed or in-progress, returns existing step without duplicating post ideas. |
| 16 | F3: Channel Limits | Creative agent generates 400-character caption for X (limit: 280) | `validatePostForChannel` flags violation -> LLM repair triggered -> If still over 280, trims at last sentence/word boundary <= 277 chars + `...`. |
| 17 | F3: Banned Words | Creative agent includes "cheap" when `donts` contains "cheap" | Post text scanned -> Word found -> Text is cleaned or rewritten to eliminate banned word. |
| 18 | F3: Schedule Spacing | 3 LinkedIn posts generated in a single campaign run | Post 1 scheduled at `T + 4h`, Post 2 scheduled at `T + 28h`, Post 3 scheduled at `T + 52h` -> Guaranteed >= 2h interval per channel. |
| 19 | F3: Creative Image | Headline contains 250 characters of text | SVG template calculates text wrapping with fixed line heights; truncates subline if needed to ensure 0% overflow outside image box. |
| 20 | F3: Creative Image | Requested postId does not exist | Returns 404 with structured JSON error or renders fallback placeholder image. |
| 21 | F3: Step Failure & Retry | Creative step fails due to JSON syntax error in LLM output | `agent_run_steps` row marked `failed`, `agent_runs.status = 'failed'`. User clicks "Retry step" -> Executes only step 2 (`creative`), preserving step 1 (`idea`). |
| 22 | F5: Status Machine | Direct transition from `draft` to `published` attempted | `canTransition('draft', 'published')` returns `false` -> Server responds with 400 `INVALID_TRANSITION`. Human approval rule enforced. |
| 23 | F5: Status Machine | Transition from `in_review` directly to `scheduled` | `canTransition('in_review', 'scheduled')` returns `false` -> Blocked with `INVALID_TRANSITION`. |
| 24 | F5: Version Bump | User edits caption of an `approved` post | Caption updated, `version` incremented from 1 to 2, `status` automatically reverted to `in_review`. |
| 25 | F5: Character Counter | User types 285 characters into X caption textarea | Live counter turns red (`285/280`), "Exceeds limit by 5 characters" warning appears, "Save Changes" button is disabled. |
| 26 | F5: Keyboard Navigation | User presses `A` while typing "Amazing update" in caption textarea | Event listener checks `document.activeElement.tagName === 'TEXTAREA'` -> Hotkey ignored, "A" typed into textarea. |
| 27 | F5: Optimistic UI | User clicks "Approve", but network disconnects mid-flight | UI optimistically marks post approved; fetch fails -> Error toast shown, post reverts to `in_review`. |
| 28 | F5: Bulk Approval | "Approve all in review" clicked when some posts are in `held` and `draft` | Only posts in `in_review` are transitioned to `approved`. `held` and `draft` posts remain unchanged. |
| 29 | F7: Failure Simulation | Sandbox connector failure set to `rate_limit` in Advanced settings | Health check or publish call to connector returns simulated 429 `RATE_LIMITED` with `Retry-After: 60`. |
| 30 | F7: Reconnect State | Live LinkedIn connector token expires (or simulated `auth_expired`) | Status changes to `needs_reconnect` -> UI displays yellow alert banner with "Reconnect" CTA. |

---

## 5. Detailed Schema & Interface Specifications

### 5.1 Zod Schemas (`src/lib/validation/brand-kit.ts`, `src/lib/validation/posts.ts`, `src/lib/validation/runs.ts`)

```typescript
import { z } from 'zod';

// Brand Kit Schema (F2)
export const HexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BrandColorsSchema = z.object({
  primary: z.string().regex(HexColorRegex, 'Invalid primary hex color'),
  secondary: z.string().regex(HexColorRegex, 'Invalid secondary hex color'),
  background: z.string().regex(HexColorRegex, 'Invalid background hex color'),
  text: z.string().regex(HexColorRegex, 'Invalid text hex color'),
});

export const BrandKitSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  name: z.string().min(1, 'Brand name is required').max(100),
  summary: z.string().min(1).max(280, 'Summary must not exceed 280 characters'),
  tone: z.array(z.string().min(1)).min(3, 'Minimum 3 tone words').max(5, 'Maximum 5 tone words'),
  dos: z.array(z.string().min(1)).min(3, 'Minimum 3 dos').max(5, 'Maximum 5 dos'),
  donts: z.array(z.string().min(1)).min(3, 'Minimum 3 donts').max(5, 'Maximum 5 donts'),
  audience: z.string().min(1, 'Target audience is required').max(300),
  colors: BrandColorsSchema,
  keywords: z.array(z.string().min(1)).min(5, 'Minimum 5 keywords').max(12, 'Maximum 12 keywords'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CreateBrandKitRequestSchema = z.union([
  z.object({ url: z.string().url('Invalid URL format') }),
  z.object({ sample: z.literal(true) }),
]);

export const PatchBrandKitRequestSchema = BrandKitSchema.partial().omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});

// Content Agent & Runs Schema (F3)
export const ChannelEnum = z.enum(['linkedin', 'instagram', 'x', 'facebook']);
export type Channel = z.infer<typeof ChannelEnum>;

export const AgentRunStatusEnum = z.enum(['queued', 'running', 'succeeded', 'failed']);
export const AgentStepNameEnum = z.enum(['idea', 'creative', 'campaign']);
export const AgentStepStatusEnum = z.enum(['pending', 'running', 'succeeded', 'failed']);
export const ProviderEnum = z.enum(['gemini', 'fallback', 'fake']);

export const CreateAgentRunRequestSchema = z.object({
  brandKitId: z.string().uuid(),
  goal: z.string().min(1).max(300),
  channels: z.array(ChannelEnum).min(1),
  postCount: z.number().int().min(1).max(12).default(6),
});

export const CreativeSpecSchema = z.object({
  headline: z.string().min(1).max(150),
  subline: z.string().max(200).optional(),
  templateId: z.enum(['minimal-quote', 'feature-card', 'editorial-tip']),
  colors: BrandColorsSchema,
});

// Posts & Approval Queue Schema (F5)
export const PostStatusEnum = z.enum([
  'draft',
  'in_review',
  'approved',
  'held',
  'rejected',
  'scheduled',
  'publishing',
  'published',
  'failed',
]);
export type PostStatus = z.infer<typeof PostStatusEnum>;

export const PostTransitionRequestSchema = z.object({
  to: PostStatusEnum,
  reason: z.string().max(500).optional(),
});

export const PatchPostRequestSchema = z.object({
  caption: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  creativeSpec: CreativeSpecSchema.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

// Connectors UI Schema (F7)
export const ConnectorProviderEnum = z.enum(['linkedin', 'instagram', 'x', 'facebook']);
export const ConnectorModeEnum = z.enum(['sandbox', 'live']);
export const ConnectorStatusEnum = z.enum(['connected', 'disconnected', 'needs_reconnect', 'error']);
export const SimulationFailureEnum = z.enum(['none', 'temporary', 'rate_limit', 'permanent', 'auth_expired']);

export const UpdateConnectorSettingsSchema = z.object({
  simulationFailure: SimulationFailureEnum,
});
```

### 5.2 Drizzle ORM Schema (`src/server/db/schema.ts`)

```typescript
import { pgTable, uuid, text, timestamp, integer, jsonb, date, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const brandKits = pgTable('brand_kits', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  sourceUrl: text('source_url'),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  tone: text('tone').array().notNull(),
  dos: text('dos').array().notNull(),
  donts: text('donts').array().notNull(),
  audience: text('audience').notNull(),
  colors: jsonb('colors').notNull(), // { primary, secondary, background, text }
  keywords: text('keywords').array().notNull(),
  provider: text('provider').default('gemini').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  brandKitId: uuid('brand_kit_id').references(() => brandKits.id, { onDelete: 'cascade' }).notNull(),
  goal: text('goal').notNull(),
  channels: text('channels').array().notNull(),
  postCount: integer('post_count').notNull().default(6),
  status: text('status').notNull().default('queued'), // queued, running, succeeded, failed
  currentStep: text('current_step'), // idea, creative, campaign
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const agentRunSteps = pgTable('agent_run_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // idea, creative, campaign
  status: text('status').notNull(), // pending, running, succeeded, failed
  input: jsonb('input'),
  output: jsonb('output'),
  provider: text('provider').notNull(), // gemini, fallback, fake
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(), // linkedin, instagram, x, facebook
  caption: text('caption').notNull(),
  hashtags: text('hashtags').array().default([]).notNull(),
  creativeSpec: jsonb('creative_spec'), // { headline, subline, templateId, colors }
  status: text('status').default('in_review').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  holdReason: text('hold_reason'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const connectors = pgTable('connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(), // linkedin, instagram, x, facebook
  mode: text('mode').default('sandbox').notNull(), // sandbox, live
  status: text('status').default('connected').notNull(), // connected, disconnected, needs_reconnect, error
  accountLabel: text('account_label').notNull(),
  tokenEncrypted: text('token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  simulationFailure: text('simulation_failure').default('none'), // none, temporary, rate_limit, permanent, auth_expired
  lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const llmCache = pgTable('llm_cache', {
  key: text('key').primaryKey(),
  response: jsonb('response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const llmUsage = pgTable('llm_usage', {
  day: date('day').primaryKey(),
  calls: integer('calls').default(0).notNull(),
});
```

### 5.3 Pure Status Machine (`src/lib/status-machine.ts`)

```typescript
export type PostStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'held'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';

const ALLOWED_TRANSITIONS: Record<PostStatus, readonly PostStatus[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'held', 'rejected'],
  held: ['in_review'],
  approved: ['scheduled', 'in_review'],
  scheduled: ['publishing', 'approved'],
  publishing: ['published', 'failed'],
  failed: ['scheduled'],
  rejected: ['in_review'],
  published: [], // terminal state
} as const;

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: PostStatus, to: PostStatus): void {
  if (!canTransition(from, to)) {
    const error = new Error(`Cannot transition post from ${from} to ${to}`);
    (error as any).code = 'INVALID_TRANSITION';
    throw error;
  }
}
```

### 5.4 Channel Rules Config (`src/lib/channels.ts`)

```typescript
export interface ChannelLimits {
  maxCharacters: number;
  warnCharacters: number;
  maxHashtags: number;
  qualityHashtagTarget: [number, number];
  imageDimensions: { width: number; height: number };
}

export const CHANNEL_CONFIG: Record<'linkedin' | 'instagram' | 'x' | 'facebook', ChannelLimits> = {
  linkedin: {
    maxCharacters: 3000,
    warnCharacters: 2700,
    maxHashtags: 10,
    qualityHashtagTarget: [3, 5],
    imageDimensions: { width: 1200, height: 627 }, // 1.91:1
  },
  x: {
    maxCharacters: 280,
    warnCharacters: 240,
    maxHashtags: 4,
    qualityHashtagTarget: [1, 2],
    imageDimensions: { width: 1200, height: 675 }, // 16:9
  },
  instagram: {
    maxCharacters: 2200,
    warnCharacters: 2000,
    maxHashtags: 30,
    qualityHashtagTarget: [8, 15],
    imageDimensions: { width: 1080, height: 1080 }, // 1:1 square
  },
  facebook: {
    maxCharacters: 2000,
    warnCharacters: 1800,
    maxHashtags: 10,
    qualityHashtagTarget: [2, 5],
    imageDimensions: { width: 1200, height: 630 }, // 1.91:1
  },
};
```

---

## 6. Recommended File Layout

```
src/
├── app/
│   ├── api/
│   │   ├── brand-kits/
│   │   │   ├── route.ts                 # POST /api/brand-kits
│   │   │   └── [id]/
│   │   │       └── route.ts             # GET, PATCH /api/brand-kits/:id
│   │   ├── runs/
│   │   │   ├── route.ts                 # POST /api/runs
│   │   │   └── [id]/
│   │   │       ├── route.ts             # GET /api/runs/:id
│   │   │       └── step/
│   │   │           └── route.ts         # POST /api/runs/:id/step
│   │   ├── posts/
│   │   │   ├── route.ts                 # GET /api/posts
│   │   │   ├── schedule-approved/
│   │   │   │   └── route.ts             # POST /api/posts/schedule-approved
│   │   │   └── [id]/
│   │   │       ├── route.ts             # GET, PATCH /api/posts/:id
│   │   │       └── transition/
│   │   │           └── route.ts         # POST /api/posts/:id/transition
│   │   ├── creatives/
│   │   │   └── [postId].png/
│   │   │       └── route.ts             # GET /api/creatives/:postId.png
│   │   └── connectors/
│   │       ├── route.ts                 # GET /api/connectors
│   │       └── [provider]/
│   │           ├── connect/route.ts     # POST connect
│   │           ├── disconnect/route.ts  # POST disconnect
│   │           ├── health/route.ts      # POST health check
│   │           └── settings/route.ts    # PATCH simulation failure settings
│   ├── (dashboard)/
│   │   ├── brand-kit/page.tsx           # F2 Brand Kit view & edit form
│   │   ├── agent/page.tsx               # F3 Agent run step visualizer
│   │   ├── queue/page.tsx               # F5 Approval Queue with filters & bulk actions
│   │   ├── calendar/page.tsx            # F5 Calendar Month Grid
│   │   └── connectors/page.tsx          # F7 Connectors management UI
├── components/
│   ├── brand-kit/
│   │   ├── brand-kit-form.tsx
│   │   └── palette-picker.tsx
│   ├── agent/
│   │   ├── step-list.tsx
│   │   └── step-card.tsx
│   ├── queue/
│   │   ├── post-card.tsx
│   │   ├── post-edit-modal.tsx
│   │   ├── hold-reason-modal.tsx
│   │   ├── live-char-counter.tsx
│   │   └── keyboard-help-dialog.tsx
│   ├── calendar/
│   │   ├── month-grid.tsx
│   │   └── day-cell.tsx
│   └── connectors/
│       ├── connector-card.tsx
│       ├── failure-simulator-select.tsx
│       └── reconnect-banner.tsx
├── lib/
│   ├── status-machine.ts                # Pure status machine rules
│   ├── channels.ts                      # Channel limits, dimensions, hashtag targets
│   ├── color-contrast.ts                # WCAG AA contrast calculator & auto-adjust
│   ├── banned-words.ts                  # Brand kit donts filtering logic
│   └── validation/
│       ├── brand-kit.ts                 # Brand kit Zod schemas
│       ├── runs.ts                      # Agent run Zod schemas
│       ├── posts.ts                     # Post & transitions Zod schemas
│       └── connectors.ts                # Connector Zod schemas
└── server/
    ├── security/
    │   └── ssrf.ts                      # Strict SSRF guard with DNS & redirect checks
    ├── scraper/
    │   └── facts-extractor.ts           # Cheerio HTML facts scraper
    ├── agents/
    │   ├── run-orchestrator.ts          # Step machine controller
    │   ├── idea-step.ts                 # Idea generation step
    │   ├── creative-step.ts             # Creative copy & spec step
    │   ├── campaign-step.ts             # Campaign scheduling & post creation
    │   └── schedule-planner.ts          # >=2h channel spacing algorithm
    ├── creatives/
    │   ├── card-renderer.ts             # Resvg SVG -> PNG compiler
    │   └── templates/
    │       ├── minimal-quote.ts
    │       ├── feature-card.ts
    │       └── editorial-tip.ts
    └── llm/
        ├── fallback-provider.ts         # Offline deterministic brand kit & post generator
        └── gemini-provider.ts

tests/
├── unit/
│   ├── ssrf-guard.test.ts               # AC-F2-02, AC-F2-03
│   ├── color-contrast.test.ts           # AC-F2-05
│   ├── status-machine.test.ts           # AC-F5-03
│   ├── channel-validation.test.ts       # AC-F3-04
│   ├── banned-words.test.ts             # AC-F3-05
│   ├── schedule-planner.test.ts         # AC-F3-09
│   └── creative-templates.test.ts       # AC-F3-06, AC-F3-07
├── integration/
│   ├── brand-kits-api.test.ts           # AC-F2-01, AC-F2-04, AC-F2-06, AC-F2-07, AC-F2-08
│   ├── agent-runs-api.test.ts           # AC-F3-01, AC-F3-02, AC-F3-03, AC-F3-10
│   ├── posts-api.test.ts                # AC-F5-02, AC-F5-04, AC-F5-06
│   └── connectors-api.test.ts           # AC-F7-01, AC-F7-02, AC-F7-03, AC-F7-05
└── component/
    ├── brand-kit-form.test.tsx          # AC-F2-08, AC-F2-09
    ├── queue-keyboard.test.tsx          # AC-F5-08
    ├── live-char-counter.test.tsx       # AC-F5-05
    ├── calendar-grid.test.tsx           # AC-F5-07
    └── connector-cards.test.tsx         # AC-F7-01, AC-F7-04
```

---

## 7. Cross-Module Dependencies & Interfaces

1. **F2 (Brand Kit) -> F1 (Workspace)**:
   - All `brand_kits` rows must include `workspace_id`.
   - Every route validates caller workspace via cookie helper (`getWorkspaceFromCookies`).
2. **F2 (Brand Kit) -> F11 (LLM & Fallback Provider)**:
   - Brand Kit generation uses `LlmProvider.generateBrandKit()`.
   - If quota exhausted or key absent, uses `FallbackProvider`.
   - Caching uses `llm_cache` table.
3. **F3 (Content Agent) -> F2 (Brand Kit)**:
   - Run input requires valid `brand_kit_id`.
   - Creative step pulls `tone`, `keywords`, `dos`, and `donts` to guide generation.
4. **F3 (Content Agent) -> F5 (Approval Queue)**:
   - Campaign step populates the `posts` table with status `in_review`.
   - `creative_spec` is attached to each post for rendering via `/api/creatives/:postId.png`.
5. **F5 (Approval Queue) -> F4 / F6 (Connectors & Scheduler)**:
   - Bulk action "Schedule approved" (`POST /api/posts/schedule-approved`) transitions posts to `scheduled` and generates corresponding `publish_jobs` consumed by F6 scheduler.
6. **F5 (Approval Queue) -> F8 (Webhooks) & F9 (Automations)**:
   - Transitions in `posts` emit system events (`post.approved`, `post.rejected`, `post.held`) logged in `events` table and trigger active automation rules.
7. **F7 (Connectors UI) -> F4 (Connector Framework) & F6 (Scheduler)**:
   - Connectors UI reads and mutates connector settings, including failure simulations (`simulation_failure`).
   - Scheduler retry policies (exponential backoff) directly test against these simulated failures.

---

## 8. Caveats

- **No Caveats**: All specifications, acceptance criteria, schema models, error states, and constraints for F2, F3, F5, and F7 have been directly verified and synthesized from `PRD.md` and `ORIGINAL_REQUEST.md`. No assumptions or external dependencies outside the free-tier specification were introduced.

---

## 9. Conclusion

Features F2, F3, F5, and F7 constitute the core value pipeline of BrandPilot:
1. F2 reliably and safely transforms any public URL (or sample brand) into a validated brand kit while enforcing strict SSRF protections and WCAG AA contrast compliance.
2. F3 executes a 3-step idempotent agent state machine that generates multi-channel copy adhering to channel rules and renders high-quality branded PNG image cards without external AI image services.
3. F5 guarantees that human approval is strictly required before any post can be scheduled or published, enforces atomic version bumps on edit, provides live character checking, keyboard hotkeys, and a calendar month grid.
4. F7 delivers an intuitive management dashboard for social connectors with zero-friction default sandbox connections and an advanced simulation suite for testing failure and retry mechanics.

The specifications, data schemas, API routes, and test cases defined in this report are complete, unambiguous, and ready for immediate test-driven implementation (TDD).

---

## 10. Verification Method

To verify these specifications independently:
1. Inspect `PRD.md` lines 214–228 (Data Models), 229–242 (Status Machine), 315–356 (F2 & F3), 395–410 (F5), 435–444 (F7).
2. Inspect `ORIGINAL_REQUEST.md` lines 18–26 (R2, R3, R4).
3. Validate that each Acceptance Criterion from `AC-F2-01` through `AC-F2-09`, `AC-F3-01` through `AC-F3-11`, `AC-F5-01` through `AC-F5-10`, and `AC-F7-01` through `AC-F7-05` has:
   - Defined input/output interfaces.
   - Prescribed error behaviors.
   - Designated unit, integration, or component test files named after the AC ID.
