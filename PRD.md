# PostPilot — Product Requirements Document (PRD)

Working name: **PostPilot** (can be renamed).
Document date: 27 October 2026.
Reader: an AI coding agent that will build this project end to end.
Language: simple English. Every rule here is a rule, not a suggestion.

---

## 0. How the AI agent must use this document

Read this whole file before writing any code. Then build one feature at a time, in the order in Section 14.

### 0.1 Mandatory loop for EVERY feature (TDD + PRD review gate)

1. **Read** the feature section (Section 9) and the rules in Sections 3, 10, 11, 12.
2. **Write failing tests first (RED).** Tests come before any production code. Run them. Confirm they fail for the right reason (missing behavior, not a typo or import error). Every acceptance criterion (AC) must have at least one test whose name contains the AC ID, for example `AC-F2-03`.
3. **Write the smallest code that passes (GREEN).**
4. **Refactor** while tests stay green.
5. **Run the full gate:** lint, typecheck, unit tests, integration tests, and e2e tests (if the feature has UI). All must pass.
6. **Code review against this PRD (REVIEW GATE).** Re-open the feature section. For each AC, write down the proof (test name + file path). Also check the global rules (Sections 3, 10, 11). Write the result in `docs/review-log.md` using the template in 0.2.
7. If any item fails, fix it and go back to step 5. **Never start the next feature while any item is failing or unchecked.**
8. **Commit** with a message like `feat(F3): content agent with step log`.

Forbidden:
- Writing tests after the code.
- Deleting, skipping, or weakening a test just to make it pass.
- Adding any paid service, paid API, or credit card requirement.
- Adding login, signup, or any user-account system (see Section 3).
- Hardcoding secrets in code.

If something in this PRD is unclear or two parts conflict, choose the simplest option that serves the goal in Section 2, write the decision in `docs/decisions.md` (one short paragraph), and continue. Only stop and ask if you are truly blocked.

### 0.2 Review log template (`docs/review-log.md`)

```
## F<number> — <feature name> — <date>
Tests written first: yes/no (RED run summary: ...)
AC check:
- AC-Fx-01: PASS — proof: <test name> in <file path>
- AC-Fx-02: PASS — proof: ...
Global rules check (Sec 3, 10, 11): PASS/FAIL — notes
Gaps found and fixed: ...
Open items: none  (must be "none" to continue)
```

### 0.3 Versions rule

Do not use old versions from your memory. At the start of the project, and whenever you add a dependency, use the **latest stable** version of every framework and library, and read its **current official documentation** first. Do not copy API usage from memory; check the docs. If a library has a breaking change from what you remember, follow the docs, not memory. Pin whatever the package manager installs in the lockfile.

---

## 1. Product summary

**PostPilot** is a small AI marketing agent for social media. A person pastes a website URL. The agent studies the brand, writes on-brand posts for several channels, makes simple branded image cards, and puts every post in an **approval queue**. Nothing is published until a human approves it. Approved posts are scheduled and sent through a **connector framework** to social platforms (real where it is free, sandbox where it is not). The product also has **webhooks** and simple **automation rules** (trigger → condition → action) so that other systems can talk to it.

This is a showcase / portfolio project. It is public, has no login, and must run on free tiers only.

### 1.1 Why this project exists (purpose)

It is built to show a hiring team, in 2 minutes, that the builder can already work in the stack and domain of an "AI agent-led workflow automation and integration platform for marketing". The skills below must be visible in the product and in the repo.

| Skill a full-stack role needs | Where PostPilot shows it |
|---|---|
| React + TypeScript frontend | Whole UI (F0–F10) |
| Node.js backend, REST APIs | All `/api/*` route handlers (Section 8) |
| Third-party API integrations / connectors | Connector framework + LinkedIn adapter (F4) |
| Webhooks, JSON data handling | Incoming and outgoing webhooks, event log (F8) |
| Workflow automation logic | Automation rules (F9) |
| AI agent features: trigger-based actions, simple decision flows, data handling between systems | Agent run steps (F2, F3), AI condition in automations (F9), webhook → draft flow |
| Debugging, performance, clean code | Retries, idempotency, error states, tests (F6, Section 12) |
| Git, documentation | Conventional commits, README, review log (F10) |
| Marketing domain understanding | Brand kit, multi-channel posts, approval-before-publish, scheduling |

### 1.2 Honesty rule

The product must never pretend to be something it is not. Sandbox channels are always labelled **"Sandbox"** in the UI. The footer says: "Portfolio project. Not affiliated with any company." Do not use any company's logo or brand assets.

---

## 2. Goals, non-goals, success

### 2.1 Goals
- G1: One-click demo: from URL to a full approved-and-published campaign in under 3 minutes.
- G2: Real, working engineering, not a mock-up: real tests, real retries, real webhook signatures.
- G3: Looks like a modern product (clean, fast, Linear-style), in dark and light mode.
- G4: Costs zero rupees to build, host, and run.
- G5: An AI agent can build it from this document alone.

### 2.2 Non-goals (do NOT build)
- No login, signup, teams, roles, billing, or user profiles.
- No video generation. No AI image-generation model. (Images are branded cards made from templates. See F3.)
- No real publishing to X, Instagram, Facebook (not free or not self-serve; see Section 16). They are sandbox adapters.
- No ad campaign management, no real analytics from platforms.
- No drag-and-drop workflow canvas. Automations are a simple rule form.
- No mobile app. (The web UI must still be responsive.)

### 2.3 Success checks
- A new visitor can finish the one-click demo with no instructions.
- All AC tests pass. Test coverage of business logic is high (target 85%+ lines for `src/server` and `src/lib`).
- Lighthouse performance and accessibility scores of 90+ on the home page and the queue page.
- The app still works (with fallbacks) when the free AI quota is used up.

---

## 3. Hard constraints

1. **Free only.** Use only free tiers: Vercel (Hobby), Neon (Free plan), Google Gemini API free tier, GitHub. No paid add-ons. No credit card should ever be needed to run this.
2. **Backend/database:** Neon Postgres, connected through the Vercel Marketplace integration (it sets the connection strings as env vars). Use the **pooled** connection string in serverless code.
3. **No authentication.** No login anywhere. Instead, each visitor gets an **anonymous workspace** (random ID in a cookie) so visitors do not see each other's data. This is data isolation, not auth. (F1)
4. **No secrets in the browser.** API keys and tokens live only in server env vars or encrypted in the database.
5. **Public + no login = abuse risk.** Rate limits, quotas, SSRF protection, and data cleanup are mandatory (Section 11).
6. **Free LLM is limited.** The app must work with a strict rate limit and must have fallbacks (F2, F3, F11).
7. **Serverless time limits.** Free hosting has short function time limits. Never run a long job in one request. Agent runs are split into short steps; each step is its own request and its state is saved in the database. Check the current limits in Vercel docs when you start.
8. **Tests never call the internet.** Unit and integration tests use a fake LLM provider and mocked HTTP. Only a small optional smoke script may call real services, and it is never part of CI.
9. **Versions:** latest stable, verified from official docs (Section 0.3).

---

## 4. Tech stack

Use the latest stable version of each. Check official docs before use.

| Area | Choice |
|---|---|
| Language | TypeScript (strict mode on) |
| Frontend | React with Next.js (App Router) |
| Backend | Next.js route handlers running on Node.js runtime |
| Database | Neon Postgres (Vercel integration) |
| DB access + migrations | Drizzle ORM + drizzle-kit |
| Validation | Zod (validate every request body, every LLM output, every webhook payload) |
| Styling | Tailwind CSS + CSS variables for design tokens |
| UI primitives | shadcn/ui style components built on Radix primitives (copy into repo, restyle to match Section 10) |
| Icons | Lucide |
| Theme | next-themes (class based, system default + manual toggle) |
| Font | Inter (self-hosted through the framework font loader) |
| LLM | Google Gemini API, free tier, through the official Google GenAI SDK. Hidden behind our own `LlmProvider` interface |
| Image cards | Server-side SVG template → PNG rendering route (use the framework's built-in image generation or `satori` + resvg; pick what works on free hosting) |
| HTML parsing | cheerio (for brand extraction) |
| Unit/integration tests | Vitest |
| Component tests | React Testing Library |
| HTTP mocking | MSW |
| E2E tests | Playwright |
| Lint/format | ESLint + Prettier |
| Package manager | pnpm |
| CI | GitHub Actions (free for public repos) running lint, typecheck, tests |
| Hosting | Vercel Hobby |

If a listed library is a bad fit on free hosting, pick the closest free alternative and write it in `docs/decisions.md`.

---

## 5. Users and demo flow

### 5.1 Main user
A visitor (recruiter, founder, engineer) who opens the live link. They do not log in.

### 5.2 Golden path (the "wow" flow, must work perfectly)
1. Visitor opens Home. Sees one input: "Paste your website URL". Under it are example chips (for example `auroscale.com`, `vercel.com`, and "Use sample brand" which needs no internet).
2. Click **Create brand kit**. The Brand Kit appears (name, summary, voice, colors, keywords, audience). The visitor can edit it.
3. Click **Run agent**. A live step log shows: Idea agent → Creative agent → Campaign agent. Each step shows status and output as it finishes.
4. 6 posts appear in the **Approval Queue** (2 per channel, 3 channels), each with a branded image card.
5. Visitor approves some, holds one, edits one caption.
6. Click **Schedule approved** (or "Publish now"). The scheduler publishes through connectors. Sandbox channels show a realistic "published" result with a fake post URL labelled Sandbox.
7. Open **Activity** to see the event log: publish events, outgoing webhook deliveries, automation runs.
8. Open **Automations** and **Webhooks**: send a test incoming webhook (button, or a copy-paste curl command) and see an automation create a new AI draft.

---

## 6. Architecture

### 6.1 Folder layout (suggested)

```
/src
  /app                 # pages + route handlers (UI and /api)
  /components          # UI components (design system in /components/ui)
  /lib                 # pure helpers (no I/O): validation, text rules, status machine, hmac
  /server
    /db                # drizzle schema, queries
    /llm               # LlmProvider interface, gemini provider, fake provider, fallback provider
    /agents            # idea, creative, campaign steps + run orchestrator
    /connectors        # Connector interface, registry, sandbox adapters, linkedin adapter
    /scheduler         # due-job runner, retry policy
    /webhooks          # incoming verify, outgoing deliver
    /automations       # rule engine
    /security          # ssrf guard, rate limit, crypto
/tests                 # unit, integration, e2e (or colocated *.test.ts)
/docs                  # review-log.md, decisions.md, architecture.md
```

### 6.2 Key design rules
- **Pure core, thin edges.** Business rules (status machine, text limits, rule conditions, retry delays, HMAC) are pure functions in `/lib` so they are easy to test.
- **Provider interfaces** for anything external: `LlmProvider`, `Connector`, `Clock`, `HttpClient`. Tests inject fakes.
- **Agent runs are step machines.** A run has steps `idea → creative → campaign`. The client calls `POST /api/runs/:id/step` repeatedly (or the server chains short steps) until status is `succeeded` or `failed`. State is saved after each step. A step must be safe to retry.
- **All external calls** have a timeout, error mapping to our own error codes, and structured logging.
- **JSON everywhere** with Zod schemas shared between client and server.

### 6.3 Error format (all API errors)
```json
{ "error": { "code": "RATE_LIMITED", "message": "Human readable text", "details": {} } }
```
Use stable codes: `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `QUOTA_EXHAUSTED`, `UPSTREAM_ERROR`, `SSRF_BLOCKED`, `INVALID_TRANSITION`, `SIGNATURE_INVALID`, `INTERNAL`.

---

## 7. Data model (Postgres via Drizzle)

All tables with a `workspace_id` must be filtered by it in every query. Add a helper so it is impossible to forget (see AC-F1-03).

| Table | Main columns |
|---|---|
| `workspaces` | id (uuid pk), created_at, last_seen_at |
| `brand_kits` | id, workspace_id, source_url, name, summary, tone (text[]), dos (text[]), donts (text[]), audience, colors (jsonb: primary, secondary, background, text), keywords (text[]), created_at, updated_at |
| `agent_runs` | id, workspace_id, brand_kit_id, goal, channels (text[]), post_count, status (`queued`/`running`/`succeeded`/`failed`), current_step, error, created_at, finished_at |
| `agent_run_steps` | id, run_id, name (`idea`/`creative`/`campaign`), status, input (jsonb), output (jsonb), provider (`gemini`/`fallback`/`fake`), started_at, finished_at, error |
| `posts` | id, workspace_id, run_id (nullable), channel (`linkedin`/`instagram`/`x`/`facebook`), caption, hashtags (text[]), creative_spec (jsonb), status, scheduled_at, approved_at, hold_reason, version (int), created_at, updated_at |
| `connectors` | id, workspace_id, provider, mode (`sandbox`/`live`), status (`connected`/`disconnected`/`needs_reconnect`/`error`), account_label, token_encrypted (nullable), token_expires_at, created_at |
| `publish_jobs` | id, post_id, connector_id, idempotency_key (unique), attempt, status (`queued`/`running`/`succeeded`/`failed`/`retrying`), next_attempt_at, external_id, external_url, error_code, error_message, created_at, updated_at |
| `incoming_endpoints` | id, workspace_id, public_token (unique), secret_encrypted, created_at |
| `outgoing_webhooks` | id, workspace_id, url, secret_encrypted, active, created_at |
| `events` | id, workspace_id, type, source (`incoming`/`outgoing`/`system`), payload (jsonb), status, created_at |
| `automations` | id, workspace_id, name, enabled, trigger (jsonb), conditions (jsonb), actions (jsonb), created_at |
| `automation_runs` | id, automation_id, event_id, status, log (jsonb), created_at |
| `rate_limit_counters` | key, window_start, count (pk: key + window_start) |
| `llm_usage` | day (date pk), calls (int) |
| `llm_cache` | key (pk), response (jsonb), created_at |

### 7.1 Post status machine (enforced on the server, pure function)

```
draft -> in_review
in_review -> approved | held | rejected
held -> in_review
approved -> scheduled | in_review
scheduled -> publishing | approved
publishing -> published | failed
failed -> scheduled        (retry)
rejected -> in_review      (re-open)
```
Any other move returns `INVALID_TRANSITION`. **A post can never be published unless it was approved first.** This is the most important business rule.

---

## 8. API (REST, JSON)

All routes are under `/api`. All inputs are validated with Zod. All routes read the workspace from the cookie (F1).

| Method + path | Purpose |
|---|---|
| `GET /api/health` | Health check (db reachable, mode flags) |
| `POST /api/workspace/reset` | Delete this workspace's data |
| `POST /api/brand-kits` | Body `{ url }` or `{ sample: true }` → creates brand kit |
| `GET /api/brand-kits/:id` · `PATCH /api/brand-kits/:id` | Read / edit brand kit |
| `POST /api/runs` | Start agent run `{ brandKitId, goal, channels, postCount }` |
| `GET /api/runs/:id` | Run + steps |
| `POST /api/runs/:id/step` | Execute next step (idempotent) |
| `GET /api/posts` · `GET /api/posts/:id` | List (filters: status, channel, date range) / read |
| `PATCH /api/posts/:id` | Edit caption, hashtags, creative_spec, scheduled_at (bumps `version`) |
| `POST /api/posts/:id/transition` | `{ to, reason? }` → status machine |
| `POST /api/posts/schedule-approved` | Schedule all approved posts `{ scheduledAt? }` |
| `GET /api/creatives/:postId.png` | Render branded image card |
| `GET /api/connectors` | List connectors (all providers, with mode + status) |
| `POST /api/connectors/:provider/connect` · `.../disconnect` | Sandbox connect is instant; live LinkedIn starts OAuth |
| `GET /api/connectors/linkedin/callback` | OAuth callback (live mode only) |
| `POST /api/publish/run-due` | Run due publish jobs (called by cron and by the UI button) |
| `GET /api/events` | Activity feed (filters) |
| `POST /api/hooks/in/:publicToken` | Public incoming webhook (signature required) |
| `GET/POST/PATCH/DELETE /api/outgoing-webhooks` | Manage outgoing webhooks |
| `POST /api/sandbox/receiver/:token` | Built-in receiver so outgoing webhooks work with no third party |
| `GET/POST/PATCH/DELETE /api/automations` | Manage automations |
| `POST /api/automations/:id/test` | Dry-run an automation against a sample event |

The cron endpoint `/api/publish/run-due` must also be callable by the scheduler with a secret header (`CRON_SECRET`), and by the browser button for the current workspace only.

---

## 9. Features and acceptance criteria

Priority: **P0** = must have. **P1** = should have, do after all P0.
Every AC needs an automated test named with its ID.

---

### F0 — Foundation (P0)

Scaffold, tooling, design system base, database, CI.

**Acceptance criteria**
- AC-F0-01: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` scripts exist and pass on a clean checkout.
- AC-F0-02: TypeScript strict mode is on. No `any` without a comment explaining why.
- AC-F0-03: `GET /api/health` returns 200 with `{ ok: true, db: true }` when the DB is reachable, and 503 with `db: false` when not.
- AC-F0-04: Drizzle schema and migrations exist for all tables in Section 7. Running migrations on an empty DB works.
- AC-F0-05: Design tokens (Section 10) exist as CSS variables for light and dark. A theme toggle works and the choice persists across reload. Default follows the system setting.
- AC-F0-06: App shell exists: left sidebar, top bar, content area, responsive down to phone width.
- AC-F0-07: GitHub Actions workflow runs lint, typecheck, and tests on every push.
- AC-F0-08: `.env.example` lists every env var from Section 13. No real secrets are committed.

---

### F1 — Anonymous workspace (P0)

No login. Each visitor gets an isolated workspace.

**Acceptance criteria**
- AC-F1-01: On first request, a workspace is created and its ID is stored in an `httpOnly`, `secure`, `sameSite=lax` cookie. Later requests reuse it.
- AC-F1-02: `last_seen_at` is updated at most once per few minutes (do not write on every request).
- AC-F1-03: Every DB query for workspace-owned data goes through a helper that requires `workspace_id`. An integration test proves workspace A can never read, edit, or delete workspace B's brand kits, posts, connectors, events, or automations (try every resource).
- AC-F1-04: `POST /api/workspace/reset` deletes all data of the current workspace and creates a fresh state. UI has a "Reset demo" button with a confirm dialog.
- AC-F1-05: A cleanup function deletes workspaces (and all their data) not seen for N days (default 7, from env). It is callable by the cron endpoint. Test with a fake clock.
- AC-F1-06: Missing or invalid cookie never crashes the app; a new workspace is created.

---

### F2 — Brand Kit agent (P0)

URL → brand kit. This is the first agent step.

Flow: fetch page (safely) → extract facts with cheerio (title, meta description, Open Graph tags, `theme-color`, headings, visible text sample, link texts) → ask the LLM to turn the facts into a structured brand kit → validate with Zod → save.

**Acceptance criteria**
- AC-F2-01: `POST /api/brand-kits` with a valid URL returns a brand kit with: name, summary (max 280 chars), tone (3–5 words), dos (3–5), donts (3–5), audience, colors (4 valid hex values), keywords (5–12).
- AC-F2-02: **SSRF guard.** The fetcher rejects non-http(s) URLs, `localhost`, private/loopback/link-local IP ranges (IPv4 and IPv6), and hostnames that resolve to them. It also checks again after every redirect (max 3 redirects). Returns `SSRF_BLOCKED`. Tests cover: `http://127.0.0.1`, `http://localhost`, `http://169.254.169.254`, `http://[::1]`, a hostname that resolves to a private IP, and a redirect to a private IP.
- AC-F2-03: Fetch has a timeout and a max response size (for example 1–2 MB). Larger or slower responses fail with `UPSTREAM_ERROR`, not a crash.
- AC-F2-04: LLM output is validated with Zod. Invalid output triggers one retry with a repair prompt. If still invalid, the **fallback provider** builds a basic brand kit from the extracted facts (no AI). The brand kit records which provider was used.
- AC-F2-05: Colors: if the page gives a usable `theme-color` or colors in CSS, use them; otherwise pick a nice default palette. All colors must be valid hex, and text/background pair must pass WCAG AA contrast (fix automatically if not).
- AC-F2-06: `{ sample: true }` creates a built-in sample brand kit with no network and no LLM call.
- AC-F2-07: Same URL within 24 hours uses `llm_cache` (no second LLM call). Test with the fake provider call counter.
- AC-F2-08: UI shows the brand kit as an editable form; saving calls `PATCH`. Invalid hex or empty name shows an inline error.
- AC-F2-09: UI has loading, error, and empty states. Errors are readable ("We could not open that website. Try another URL or use the sample brand.").

---

### F3 — Content agent: ideas, captions, creatives (P0)

An agent run with 3 visible steps.

- **Idea agent:** from brand kit + goal, produces N post ideas (angle, key message, channel).
- **Creative agent:** for each idea, writes caption + hashtags per channel rules, and a `creative_spec` for the image card (headline, sub-line, template id, colors from brand kit).
- **Campaign agent:** assigns suggested schedule times (spread over the next days, not in the past), creates `posts` in status `in_review`, and finishes the run.

**Channel rules (put in ONE config file; values are starting defaults, verify current limits in official docs before finalizing):** LinkedIn up to 3000 characters; X up to 280 characters; Instagram caption up to 2200 characters and at most 30 hashtags; Facebook is long (use a sensible cap like 2000 for quality). Hashtag counts also have quality caps (for example LinkedIn 3–5, X 1–2, Instagram 8–15).

**Acceptance criteria**
- AC-F3-01: `POST /api/runs` creates a run; calling `/step` three times runs idea, creative, campaign in order and ends with status `succeeded`.
- AC-F3-02: Each step saves input, output, provider, and timestamps in `agent_run_steps`. The UI shows these live.
- AC-F3-03: Calling `/step` twice for the same step does not create duplicate posts (idempotent). Test it.
- AC-F3-04: Every generated post obeys its channel limits (length, hashtag count). A pure function `validatePostForChannel()` enforces this; if the LLM breaks a rule, the text is shortened or regenerated once, and a final hard trim is applied as a last resort.
- AC-F3-05: Generated text follows brand kit: banned words from `donts` do not appear (test with the fake provider returning a banned word → post is cleaned or regenerated).
- AC-F3-06: `GET /api/creatives/:postId.png` returns a PNG (correct content type, correct size for the channel: for example 1080×1080 for Instagram, 1200×627 for LinkedIn). Text wraps and never overflows; text/background contrast passes AA. No image-generation model is used.
- AC-F3-07: At least 3 different image templates exist, chosen by idea type.
- AC-F3-08: If Gemini is rate limited or the daily budget is used (F11), the run still finishes using the fallback provider (template-based writing using brand kit keywords). The UI shows a small note: "Written with the offline writer because the AI quota is used up."
- AC-F3-09: Scheduled times are in the future, within the next 7 days, and spread out (no two posts on the same channel within 2 hours).
- AC-F3-10: If a step fails, run status is `failed`, the error is shown, and a "Retry step" button retries only the failed step.
- AC-F3-11: UI: run page shows a vertical step list with status icons (waiting, running, done, failed), animated gently, and a final "View posts in queue" action.

---

### F4 — Connector framework (P0)

A clean way to add platforms. This is the main "integrations" showcase.

**Connector interface (language-level contract; write it in TypeScript)**
```
interface Connector {
  provider: 'linkedin' | 'instagram' | 'x' | 'facebook'
  mode: 'sandbox' | 'live'
  capabilities: { maxChars, maxHashtags, supportsImage, supportsScheduling }
  connect(ctx): Promise<ConnectResult>          // sandbox: instant. live: start OAuth
  disconnect(ctx): Promise<void>
  healthCheck(ctx): Promise<HealthResult>
  publish(ctx, input: PublishInput): Promise<PublishResult>   // must support idempotencyKey
}
```
Errors from adapters are mapped to a small set of our own error types: `AUTH_EXPIRED`, `RATE_LIMITED` (with retry-after), `INVALID_CONTENT`, `TEMPORARY` (retryable), `PERMANENT` (not retryable).

**Adapters**
- **Sandbox adapters** for `instagram`, `x`, `facebook`, and also `linkedin` in sandbox mode. They simulate success, and can simulate failures for demos (a hidden "simulate failure" option in the connector settings: temporary error, rate limit, permanent error). They return a fake external ID and a URL clearly marked as sandbox.
- **LinkedIn live adapter** (optional, OFF by default): uses LinkedIn's free self-serve "Share on LinkedIn" product (scope `w_member_social`) to post to the connecting member's **own personal profile**. Use the current Posts API as described in the official docs, with the current required version header (read it from the docs; do not copy from memory). Tokens last about 60 days and cannot be refreshed in the background, so the connector must move to `needs_reconnect` when the token expires. LinkedIn has no scheduling API, so scheduling is always done by our scheduler. Company pages need partner approval and are out of scope.
- Live mode only works if the env flag `ENABLE_LIVE_LINKEDIN=true` and LinkedIn app credentials are set. Default is `false`, so the public demo can never post to anyone's real account by accident.

**Acceptance criteria**
- AC-F4-01: A registry returns the connector for a provider + mode. Unknown provider returns `NOT_FOUND`.
- AC-F4-02: A shared **contract test suite** runs against every adapter (sandbox and live with mocked HTTP): publish success, idempotent re-publish (same key returns the same result, no duplicate), rate limit mapping, auth expired mapping, invalid content mapping.
- AC-F4-03: Sandbox adapters can be told to fail in each way (temporary, rate limit, permanent) so the retry logic in F6 can be shown and tested.
- AC-F4-04: Connect/disconnect updates `connectors.status` and is visible on the Connectors page. Every sandbox card shows a "Sandbox" badge.
- AC-F4-05: Live LinkedIn adapter (tested with MSW only): builds the correct request (auth header, version header, author URN, text), handles 401 → `AUTH_EXPIRED`, 429 → `RATE_LIMITED`, 5xx → `TEMPORARY`, 4xx → `INVALID_CONTENT`/`PERMANENT`.
- AC-F4-06: OAuth uses a random `state` value stored server-side and verified in the callback (reject mismatch). Access tokens are encrypted at rest (AES-GCM with `ENCRYPTION_KEY`) and never sent to the browser or written to logs.
- AC-F4-07: When `ENABLE_LIVE_LINKEDIN` is not `true`, the live connect route returns a clear message and the UI hides or disables "Connect live".
- AC-F4-08: Before any live publish, the UI shows a confirm dialog: "This will post publicly to your LinkedIn profile."
- AC-F4-09: Adding a new sandbox provider requires only a new adapter file + registry entry + capability config (no changes in scheduler or UI logic). Document this in `docs/architecture.md`.

---

### F5 — Approval queue and calendar (P0)

Human stays in control.

**Acceptance criteria**
- AC-F5-01: Queue page lists posts with filters (status, channel) and shows channel badge, caption preview, image card, schedule time, status chip.
- AC-F5-02: Actions per post: Approve, Hold (with optional reason), Reject, Edit. Buttons call `/transition`. Invalid moves are blocked in the UI and by the server (`INVALID_TRANSITION`).
- AC-F5-03: The status machine (Section 7.1) is a pure function with a full test table: every allowed and every disallowed transition.
- AC-F5-04: Editing a post's caption or image text bumps `version`. If the post was `approved`, editing sends it back to `in_review` (approval is for the exact text that was approved). Test it.
- AC-F5-05: Edit form shows live character count and channel-limit warnings, and blocks save when over the hard limit.
- AC-F5-06: Bulk actions: "Approve all in review" and "Schedule approved".
- AC-F5-07: Calendar view shows posts by day for the current month (and next/previous month), color-coded by status; clicking a post opens it. Time display uses the visitor's local time zone, stored in UTC.
- AC-F5-08: Keyboard support: arrow keys move between posts, `A` approve, `H` hold, `E` edit (when focus is on the list, and not in a text field). Shortcuts are listed in a help dialog (`?`).
- AC-F5-09: Empty state explains the next step with a button ("Run the agent").
- AC-F5-10: Two quick approvals in a row do not conflict (optimistic UI + server truth; if the server rejects, the UI rolls back and shows a message).

---

### F6 — Scheduler and publisher (P0)

Sends approved posts, safely.

**Rules**
- `schedule-approved` creates one `publish_job` per approved post and connected connector, with a unique `idempotency_key` (`postId:version:provider`), and moves the post to `scheduled`.
- `run-due` picks jobs where `next_attempt_at <= now` and status in (`queued`, `retrying`), locks them (so two runs do not take the same job), publishes, and updates status.
- Retry policy (pure function): retry only `TEMPORARY` and `RATE_LIMITED`. Exponential backoff with jitter (starting around 1 minute, capped), honor `retry-after`, max 4 attempts, then `failed`. `PERMANENT`, `INVALID_CONTENT`, and `AUTH_EXPIRED` fail at once (and `AUTH_EXPIRED` sets the connector to `needs_reconnect`).

**Acceptance criteria**
- AC-F6-01: `schedule-approved` only touches posts in `approved`. Posts in other states are untouched and reported.
- AC-F6-02: A post whose channel has no connected connector is not scheduled and the response says why.
- AC-F6-03: Running `run-due` twice at the same time publishes each job exactly once (test with two concurrent calls).
- AC-F6-04: Retry policy table test: each error type → retry or not, delay range, attempt cap, `retry-after` respected. Use a fake clock.
- AC-F6-05: After success, the post is `published`, `external_id` and `external_url` are saved, and a `post.published` event is written. After final failure, the post is `failed` and a `post.failed` event is written.
- AC-F6-06: Idempotency: if the adapter was called but our DB update failed, the next attempt reuses the same idempotency key and does not create a duplicate (sandbox adapter proves it).
- AC-F6-07: "Publish now" in the UI schedules for now and runs `run-due` for the current workspace, then updates the UI.
- AC-F6-08: The cron endpoint requires `CRON_SECRET` and also runs cleanup (F1) and quota counters cleanup. The scheduler is a plain function `runDueJobs(clock, deps)` so it can run from cron, from the button, or from tests. Free hosting limits how often cron can run; check current limits in Vercel docs, and rely on the manual button plus an in-page auto-poll (every ~15 seconds while the page is open) for the demo.
- AC-F6-09: Failed posts show a readable reason and a "Retry" button that moves `failed → scheduled`.

---

### F7 — Connectors page (P0)

**Acceptance criteria**
- AC-F7-01: Page shows one card per provider with logo-free text icon, mode badge (Sandbox/Live), status, last check time, and actions.
- AC-F7-02: "Run health check" calls `healthCheck` and shows result.
- AC-F7-03: Sandbox failure simulator control is visible only inside an "Advanced" section.
- AC-F7-04: `needs_reconnect` state shows a clear banner and a reconnect button.
- AC-F7-05: Default state for a new workspace: all four sandbox connectors are connected, so the golden path works with zero setup.

---

### F8 — Webhooks and activity log (P0)

**Incoming webhooks**
- Each workspace has one incoming URL: `/api/hooks/in/:publicToken` with a secret.
- Caller sends header `X-PostPilot-Signature: sha256=<hex>`, which is an HMAC-SHA256 of the **raw body** with the secret, plus header `X-PostPilot-Timestamp`. Reject if the timestamp is older than 5 minutes (replay protection).

**Outgoing webhooks**
- Sent on events like `post.published`, `post.failed`, `post.approved`. Body is JSON, signed the same way.
- Delivery has a timeout, retries with backoff (max 3), and each attempt is logged.
- Built-in receiver route lets the demo work without any third party service.

**Acceptance criteria**
- AC-F8-01: Valid signature + fresh timestamp → 202 and an `incoming` event is stored. Invalid signature → 401 `SIGNATURE_INVALID`. Old timestamp → 401. Unknown token → 404.
- AC-F8-02: Signature check uses constant-time comparison and the raw body (test with a body that has odd spacing, to prove the raw body is used).
- AC-F8-03: Payload is validated with Zod. Bad JSON → 400 `VALIDATION_ERROR`. Body size is capped.
- AC-F8-04: Duplicate delivery with the same `event_id` in the payload is stored once (idempotent).
- AC-F8-05: Outgoing webhook URLs go through the same SSRF guard as F2, except for the built-in receiver URL.
- AC-F8-06: Outgoing delivery retries on network error / 5xx, not on 4xx. Each attempt is an event with status and response code.
- AC-F8-07: The Webhooks page shows the incoming URL, a masked secret with copy buttons, a ready-to-copy `curl` example that includes how to compute the signature, and a **"Send test event"** button that signs and sends a sample from the server.
- AC-F8-08: Activity page lists events (newest first) with filters (source, type, status), expandable JSON payload viewer (pretty printed, secrets never shown), and pagination.
- AC-F8-09: Secrets can be rotated. After rotation the old secret stops working immediately.

---

### F9 — Automations (P1, but build right after F8)

Simple rules: **trigger → conditions → actions.** This shows "trigger-based actions, simple decision flows, data handling between systems."

**Triggers:** `webhook.received` (with event name), `post.published`, `post.failed`, `post.approved`.
**Conditions:** list of simple checks on the event JSON (`path`, `operator` in `eq`, `neq`, `contains`, `gt`, `lt`, `exists`, `value`), all must match (AND). Plus one AI condition: `ai_on_brand_check` (LLM answers yes/no + reason against the brand kit; fallback is a keyword/`donts` check).
**Actions:** `create_ai_draft` (make a post draft from event data), `send_webhook`, `hold_post`, `set_post_status` (only via the status machine).

**Preset examples (one click to add):**
1. "When a webhook `product.launched` arrives, create an AI LinkedIn draft from its `title` and `url`."
2. "When a post fails, hold it and send an outgoing webhook."
3. "When a post is published, send an outgoing webhook."

**Acceptance criteria**
- AC-F9-01: Rule engine is pure: `evaluate(automation, event) → { matched, actions }`. Table tests for each operator, missing paths, nested paths, AND logic.
- AC-F9-02: Matching events run actions in order. Each automation run stores a step log (condition results, action results, errors). One failed action does not hide the log of earlier actions.
- AC-F9-03: Loop protection: an automation cannot trigger itself or form a chain longer than a small limit (for example depth 3). Test with a rule that triggers on `post.approved` and approves another post.
- AC-F9-04: Actions use the status machine; an invalid move is logged as a failed action, not forced.
- AC-F9-05: Create/edit/enable/disable/delete automation in the UI with a form (trigger select, condition rows, action rows) and Zod validation with inline errors.
- AC-F9-06: "Test" button runs the automation on a sample event in dry-run mode (no side effects) and shows what would happen.
- AC-F9-07: End to end: send a signed `product.launched` webhook → automation matches → a new draft post appears in the queue in `in_review` → an `automation.run` event appears in Activity.
- AC-F9-08: `create_ai_draft` respects the LLM quota and fallback rules (F11).
- AC-F9-09: Maximum number of automations per workspace (for example 10) to protect free tier limits.

---

### F10 — Home, one-click demo, README (P0)

**Acceptance criteria**
- AC-F10-01: Home page has: short headline, URL input, example chips, "Use sample brand", and a clear "Run full demo" button that does: brand kit → agent run → approve all → schedule → publish in sandbox, showing progress.
- AC-F10-02: Full demo works end to end with the fake/fallback providers (offline), so the demo never depends on the AI quota or the internet.
- AC-F10-03: Footer text: "Portfolio project. Not affiliated with any company." Plus a link to the GitHub repo.
- AC-F10-04: A short "How it works" section (3 steps) and a "Tech" section listing the stack.
- AC-F10-05: README includes: what it is, a GIF or screenshots (light and dark), live link, how to run locally, env vars, architecture diagram (simple), test commands, "TDD and review log" note, the free-tier design notes, and the skills table from Section 1.1.
- AC-F10-06: `docs/architecture.md` explains: step-machine agent runs, connector interface, status machine, scheduler, webhooks, and free-tier guardrails.
- AC-F10-07: Page metadata: title, description, Open Graph image (can be generated by the same image route), favicon.
- AC-F10-08: Accessibility: all interactive elements reachable by keyboard, visible focus ring, labels on inputs, `prefers-reduced-motion` respected, color contrast AA in both themes. An automated accessibility check (for example axe through Playwright) passes on Home, Brand Kit, Queue, Connectors, Webhooks, Activity.

---

### F11 — Quota, rate limits, fallbacks (P0)

Needed because the demo is public, has no login, and runs on free tiers.

**Acceptance criteria**
- AC-F11-01: `LlmProvider` interface has implementations: `GeminiProvider` (real), `FallbackProvider` (template-based, no AI, deterministic), `FakeProvider` (tests). A wrapper tries Gemini first and falls back on: missing key, 429, timeout, 5xx, invalid output after one repair, or exhausted budget.
- AC-F11-02: A daily global budget counter (`llm_usage`) caps Gemini calls per UTC day (env `LLM_DAILY_BUDGET`, default well under the free limit). When reached, all calls use the fallback.
- AC-F11-03: Per-IP and per-workspace rate limits (stored in `rate_limit_counters`, no paid Redis) apply to expensive routes: brand kit creation, run creation, test event sending. Over limit → 429 `RATE_LIMITED` with `Retry-After`.
- AC-F11-04: Gemini calls are made one at a time per request path and respect the provider's rate limit (free tier limits are low; read the current numbers in the Gemini docs and the AI Studio rate limit page). On 429 use backoff, then fall back.
- AC-F11-05: Response cache (`llm_cache`) by hash of prompt + inputs, with expiry.
- AC-F11-06: Data caps per workspace (for example max 60 posts, 5 brand kits, 10 automations, 200 events). Over the cap → `VALIDATION_ERROR` with a clear message. Old events are trimmed.
- AC-F11-07: The UI shows a small, calm banner when fallback mode is active, and never shows raw errors from Gemini.
- AC-F11-08: The Gemini API key is read from env only, never sent to the client, never logged.

---

## 10. Design system

Style target: modern, clean, calm, dense but readable, in the spirit of Linear. Do not copy any brand's assets; build your own tokens.

### 10.1 Principles
- Quiet UI: neutral surfaces, one accent color, very few shadows, thin 1px borders.
- Dense information with good spacing (4px base grid).
- Fast: subtle transitions only (100–180 ms), no bouncing.
- Keyboard first: visible focus, shortcuts, command palette (P1: `Cmd/Ctrl + K` to jump to pages and run actions).
- Content first: the posts and cards are the stars; chrome is minimal.

### 10.2 Tokens (CSS variables; starting values, adjust to taste but keep contrast AA)

Light theme
- `--bg`: #FAFAFB, `--surface`: #FFFFFF, `--surface-2`: #F4F4F6, `--border`: #E6E6EA
- `--text`: #1B1B1F, `--text-muted`: #6B6B76, `--text-faint`: #9A9AA5
- `--accent`: #5E6AD2, `--accent-hover`: #4F5BC4, `--accent-soft`: #ECEDFB, `--on-accent`: #FFFFFF
- Status: `--success`: #1F9D6B, `--warning`: #C77D0A, `--danger`: #D14343, `--info`: #2F7FD1

Dark theme
- `--bg`: #0E0F11, `--surface`: #141518, `--surface-2`: #1B1C20, `--border`: #26272C
- `--text`: #ECECEF, `--text-muted`: #A0A0AB, `--text-faint`: #6F707A
- `--accent`: #7C86F0, `--accent-hover`: #909AF5, `--accent-soft`: #23253F, `--on-accent`: #0E0F11
- Status colors: lighter versions of the above that still pass AA on dark surfaces

Other tokens
- Radius: 6px (controls), 8px (cards), 12px (dialogs).
- Font: Inter; base size 14px, small 12–13px, headings 16/20/28px; tight letter spacing on headings; tabular numbers for counts and times.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Shadows: almost none in dark; very light in light (popovers and dialogs only).
- Motion: ease-out, 120–160 ms; disable when `prefers-reduced-motion`.

### 10.3 Components to build (in `/components/ui`)
Button (primary, secondary, ghost, danger), IconButton, Input, Textarea, Select, Switch, Checkbox, Badge/StatusChip, Card, Tabs, Dialog, Popover, Tooltip, Toast, Dropdown menu, Command palette (P1), Skeleton loader, Empty state, Table/List row, Stepper (for agent steps), Code/JSON viewer, Calendar grid, Copy button.

### 10.4 Layout
- Left sidebar (collapsible): Home, Brand kit, Agent, Queue, Calendar, Connectors, Automations, Webhooks, Activity. Bottom of sidebar: theme toggle, Reset demo.
- Top bar: page title, breadcrumbs, primary action for the page.
- Content max width ~1200px, with comfortable reading width for text blocks.
- Responsive: sidebar becomes a bottom/hamburger menu on phones.

### 10.5 Status chip colors
draft (neutral), in_review (info), approved (success), held (warning), rejected (danger), scheduled (accent), publishing (accent with subtle pulse), published (success, filled), failed (danger, filled).

### 10.6 Design acceptance criteria
- AC-F10-D1: Both themes are complete: no hard-coded colors in components (only tokens), no unreadable text in either theme (automated contrast check on key screens).
- AC-F10-D2: No layout shift when the theme loads (no flash of wrong theme).
- AC-F10-D3: Every page has loading (skeleton), empty, and error states.
- AC-F10-D4: Visual consistency checklist in `docs/review-log.md` for each UI feature: spacing on grid, one accent only, focus ring present, motion within limits.

---

## 11. Security, privacy, and abuse rules

1. **SSRF protection** on every server-side fetch of a user-given URL (brand kit fetch, outgoing webhooks): block private/loopback/link-local/metadata ranges, validate after DNS resolution and after each redirect, limit size and time.
2. **Webhook security:** HMAC-SHA256 over the raw body, timestamp window, constant-time compare, replay protection by event ID.
3. **Secrets:** env only. Tokens and webhook secrets encrypted at rest with AES-GCM. Never logged, never in API responses (show masked).
4. **Cookies:** `httpOnly`, `secure`, `sameSite`.
5. **Input validation:** Zod on all inputs; reject unknown fields where it matters; cap sizes.
6. **LLM safety:** treat website text as untrusted. It is data, not instructions. The prompt must say so. Never let page content change tool behavior or reveal system prompts. Validate output shape with Zod.
7. **Output safety:** escape/sanitize any user or LLM text rendered in HTML and in SVG image cards (no raw HTML injection).
8. **Live posting safety:** off by default; explicit confirm; only the visitor's own account via their own OAuth.
9. **Rate limits and quotas:** F11.
10. **Privacy:** no analytics trackers, no third-party scripts. A short privacy note on the site: data is anonymous, deleted after N days, and can be reset anytime.
11. **Logging:** structured logs with request ID; no personal data or secrets.
12. **Dependencies:** run the package manager's audit in CI and fix high issues.

---

## 12. Testing strategy

- **Unit tests (Vitest):** all pure logic: status machine, channel validation, retry policy, rule engine, HMAC, SSRF IP checks, contrast helper, hashtag rules.
- **Integration tests:** route handlers + real Postgres (use a Neon branch or a local Postgres container for CI; do not hit production data). Cover workspace isolation, transitions, scheduler concurrency, webhooks, automations.
- **Contract tests:** one shared suite run against every connector adapter (F4).
- **Component tests (React Testing Library):** forms, queue actions, status chips, theme toggle.
- **E2E (Playwright):** the golden path (Section 5.2) with the fake/fallback providers, in both themes; plus webhook → automation → draft path; plus accessibility checks.
- **No internet in tests.** Use MSW and the `FakeProvider`. A fake clock (`Clock` interface) for anything time based.
- **Naming:** every test that proves an AC has the AC ID in its name.
- **Coverage:** target 85%+ for `src/server` and `src/lib`. Coverage is a guide; the AC list is the real contract.
- **TDD proof:** for each feature, the first commit (or the review log) must show the failing run before the passing run.

---

## 13. Environment variables and deployment

### 13.1 Env vars (document all in `.env.example`; no real values)

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (set by Vercel integration) |
| `DATABASE_URL_UNPOOLED` | Direct connection for migrations (set by integration) |
| `GEMINI_API_KEY` | Free tier key from Google AI Studio (optional; app works without it via fallback) |
| `LLM_DAILY_BUDGET` | Max Gemini calls per day |
| `ENCRYPTION_KEY` | 32-byte key for AES-GCM (generate locally) |
| `CRON_SECRET` | Secret for the cron endpoint |
| `WORKSPACE_TTL_DAYS` | Days before inactive workspaces are deleted |
| `ENABLE_LIVE_LINKEDIN` | `true` only if you want real LinkedIn posting |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_REDIRECT_URI` | Only for live LinkedIn |
| `APP_URL` | Public base URL |

### 13.2 Deployment
- Connect the GitHub repo to Vercel (Hobby). Add the Neon integration from the Vercel Marketplace.
- Run migrations in the build step or via a one-time script. Use preview branches of the database for preview deployments if the integration supports it.
- Add the cron job in Vercel config for `/api/publish/run-due` (respect the free-plan cron limits; verify them in current docs).
- Check Vercel Hobby terms: it is meant for personal, non-commercial use, which matches a portfolio project. Verify current terms.

---

## 14. Build order (milestones)

Follow the loop in Section 0.1 for each item. Do not start an item until the previous item's review log says "Open items: none".

1. **F0** Foundation
2. **F1** Anonymous workspace
3. **F11** (part 1) LLM provider interface + fake + fallback + rate limit helpers (needed by the agents)
4. **F2** Brand kit agent
5. **F3** Content agent + creatives
6. **F5** Approval queue + calendar (status machine first)
7. **F4** Connector framework + sandbox adapters (+ LinkedIn live adapter with mocked tests)
8. **F6** Scheduler and publisher
9. **F7** Connectors page
10. **F8** Webhooks and activity log
11. **F9** Automations
12. **F11** (part 2) budgets, caps, banners; final pass on all F11 ACs
13. **F10** Home, one-click demo, README, docs, accessibility pass
14. **Final review:** go through every AC in this document one by one, check there is a passing test with that ID, check Sections 3, 10, 11 again, fix gaps, then deploy.

---

## 15. Definition of Done (whole project)

- [ ] Every AC in Section 9 has a passing automated test named with its ID.
- [ ] `docs/review-log.md` has an entry for every feature, each ending with "Open items: none".
- [ ] Lint, typecheck, unit, integration, e2e, and accessibility checks all pass in CI.
- [ ] Golden path works on the deployed site in both themes, on desktop and phone width, with no login.
- [ ] App still completes the golden path with no `GEMINI_API_KEY` and with the quota exhausted.
- [ ] No paid service is used anywhere. No secrets in the repo.
- [ ] Live LinkedIn is off by default; sandbox labels are visible everywhere they apply.
- [ ] README, architecture doc, and decisions doc are complete.
- [ ] All dependencies are latest stable versions verified from official docs at build time.

---

## 16. Facts checked on 27 October 2026 (re-verify when building)

These facts shaped the design. The agent must re-check them in official docs before relying on them, because they change.

| Topic | What was found | Design effect |
|---|---|---|
| Gemini API free tier | A Free tier exists and needs no billing to start. Limits are per project and low (reports mention roughly 5–10 requests per minute on free models). Exact numbers depend on model; check Google AI Studio. | Strict rate limit handling, daily budget, cache, offline fallback (F11) |
| Neon Free plan | Free plan includes 0.5 GB storage per project, 100 CU-hours per month per project, 10 branches, scale to zero after idle. Vercel Marketplace integration sets pooled and unpooled connection strings. | Keep data small, caps, cleanup, use pooled URL on Vercel |
| X (Twitter) API | The free tier closed to new projects in February 2026; the API is pay-per-use now. | X is **sandbox only** (no paid service allowed) |
| LinkedIn API | "Share on LinkedIn" (`w_member_social`) and Sign In with OpenID Connect are self-serve and free for posting to a member's own profile. Tokens last about 60 days; refresh tokens are only for approved partners. No scheduling API. Company Pages need the Community Management API with review. | Live LinkedIn is optional, personal-profile only, `needs_reconnect` state, own scheduler |
| Instagram / Facebook publishing | Not verified as free self-serve for this project. | Sandbox adapters only |
| Vercel Hobby | Free plan; cron and function time limits are limited. Not verified in detail. | Short steps, manual run button, in-page polling |

Sources used for these checks: Google Gemini API rate limits docs (ai.google.dev), Neon FAQs and Vercel transition guide (neon.com / neon.tech), public 2026 write-ups on X API pricing and on LinkedIn self-serve API access.
