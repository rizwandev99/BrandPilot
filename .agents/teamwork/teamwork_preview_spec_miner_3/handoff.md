# Comprehensive Specification Report: F4, F6, F8, F9
**Author**: teamwork_preview_spec_miner_3  
**Target Milestone**: Phase 0 Specification Mining & Architecture Survey  
**Date**: 2026-10-27  

---

## 1. Observation

Authoritative documents inspected:
1. `PRD.md` (lines 1–683): specifically Section 6 (Architecture), Section 7 (Data model & status machine), Section 8 (API endpoints), Section 9 (Feature ACs: F4 lines 359–392, F6 lines 413–433, F8 lines 446–467, F9 lines 470–493), Section 11 (Security, privacy, and abuse rules), Section 12 (Testing strategy), Section 13 (Environment variables), Section 16 (Verified facts on social platform APIs).
2. `ORIGINAL_REQUEST.md`: R3 (Connector Framework & Social Publishing), R5 (Webhooks & Rule Automation Engine), and Golden Path requirements.
3. Workspace state: Greenfield project checkout with no existing source code files. Database target is Neon Postgres via Drizzle ORM, with Next.js App Router and TypeScript strict mode.

Key verbatim requirements observed:
- **F4 (Connector Framework)**: Pure TypeScript interface `Connector` supporting `provider` ('linkedin' | 'instagram' | 'x' | 'facebook'), `mode` ('sandbox' | 'live'), `capabilities`, `connect(ctx)`, `disconnect(ctx)`, `healthCheck(ctx)`, and `publish(ctx, input)` with `idempotencyKey`. Error mapping into `AUTH_EXPIRED`, `RATE_LIMITED` (with retry-after), `INVALID_CONTENT`, `TEMPORARY`, and `PERMANENT`. Sandbox adapters for all 4 channels with configurable simulated failures. Live LinkedIn adapter with OAuth `state` verification, `w_member_social` scope, personal profile posting only, AES-GCM token encryption (`ENCRYPTION_KEY`), gated by `ENABLE_LIVE_LINKEDIN=true` and explicit publish confirm dialog. Shared contract test suite running across all adapters.
- **F6 (Scheduler and Publisher)**: `schedule-approved` schedules only posts in `approved` state, creates 1 `publish_job` per approved post and connected connector with idempotency key (`postId:version:provider`), and moves post to `scheduled`. `run-due` selects jobs where `next_attempt_at <= now` and status in `('queued', 'retrying')`, uses concurrency locks to prevent duplicate execution, executes publication, updates status, and emits `post.published` or `post.failed` events. Pure retry policy with exponential backoff + jitter, `retry-after` header respect, max 4 attempts. Idempotency guarantees against crash between external publish and DB commit. Cron route protected by `CRON_SECRET`, also executing workspace TTL cleanup (F1) and quota counter cleanup (F11). "Publish now" triggers immediate scheduling and run-due execution for current workspace.
- **F8 (Webhooks and Activity Log)**: Incoming endpoint `/api/hooks/in/:publicToken` verified with HMAC-SHA256 over raw request body using constant-time comparison (`crypto.timingSafeEqual`), signed in header `X-PostPilot-Signature: sha256=<hex>`, with timestamp header `X-PostPilot-Timestamp` rejecting events older than 5 minutes (replay protection). Event deduplication by `payload.event_id`. Secret rotation with immediate invalidation. Outgoing webhooks with SSRF guard (except built-in sandbox receiver `/api/sandbox/receiver/:token`), signed payloads, backoff retries (max 3), and attempt logging. Activity event feed with source/type/status filters, pretty JSON viewer (secrets redacted), and pagination.
- **F9 (Automations Engine)**: Pure rule evaluation engine `evaluate(automation, event) -> { matched, actions }`. Triggers: `webhook.received`, `post.published`, `post.failed`, `post.approved`. Conditions: nested path evaluation, operators (`eq`, `neq`, `contains`, `gt`, `lt`, `exists`), AND logic across all condition rows, plus `ai_on_brand_check` (LLM with deterministic fallback to keyword/`donts` check). Actions: `create_ai_draft` (posts in `in_review`, honoring brand kit and channel constraints), `send_webhook`, `hold_post`, `set_post_status` (strictly enforcing status machine). Recursion depth limit (max 3) for loop protection. Dry-run test mode `/api/automations/:id/test`. Max 10 automations per workspace.

---

## 2. Logic Chain

1. **Connector Abstraction & Extensibility (F4)**:
   - Social media platform APIs differ drastically in schemas, auth lifetimes, and rate limits. By enforcing a single `Connector` interface with adapter pattern and a central registry `getConnector(provider, mode)`, all scheduling and publishing logic in F6 is decoupled from platform idiosyncrasies.
   - AC-F4-09 mandates that adding a new sandbox provider requires *only* a new adapter file, registry entry, and capability config. Thus, F4 must define strict capability flags (`maxChars`, `maxHashtags`, `supportsImage`, `supportsScheduling`) and normalized input/output structures (`PublishInput`, `PublishResult`, `ConnectorError`).
   - For live LinkedIn, security is paramount: OAuth CSRF attack prevention requires a cryptographically random `state` cookie/cache check. Token exposure is prevented by encrypting access tokens at rest via AES-256-GCM using `ENCRYPTION_KEY`, decrypting only in-memory inside the adapter during execution, and never logging or returning tokens to the client.

2. **Safe Scheduling, Idempotency, and Concurrency (F6)**:
   - In serverless environments (Vercel), multiple invocations of `/api/publish/run-due` can happen concurrently (e.g., cron trigger overlapping with user clicking "Publish now").
   - To guarantee zero duplicate posts (AC-F6-03), database-level concurrency locking is required. In Postgres/Neon, `SELECT id FROM publish_jobs WHERE status IN ('queued', 'retrying') AND next_attempt_at <= now() FOR UPDATE SKIP LOCKED LIMIT 10` (or atomic status transition `UPDATE publish_jobs SET status = 'running' WHERE id IN (...) RETURNING *`) locks the batch so concurrent workers never process the same jobs.
   - Idempotency key `postId:version:provider` ensures that if an adapter completes external publishing but the server crashes before writing `succeeded` to Postgres, the retry passes the same key to the adapter, which recognizes the key and returns the existing publication ID without double-posting.
   - Retry backoff formula must be pure: $\text{delay} = \min(\text{maxDelay}, \text{baseDelay} \times 2^{\text{attempt} - 1}) + \text{jitter}$, with jitter bounded between $0$ and $0.2 \times \text{delay}$.

3. **Cryptographic Rigor, Replay Defense, and SSRF in Webhooks (F8)**:
   - For incoming webhooks, parsing JSON before signature verification opens timing and canonicalization vulnerabilities. Verification *must* take the raw request buffer (`Buffer` or `Uint8Array`) and compute `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.
   - String comparison (`===`) leaks timing information. `crypto.timingSafeEqual` prevents timing attacks.
   - Timestamp checking prevents replay attacks: $|T_{\text{now}} - T_{\text{header}}| \le 300\text{ seconds}$ (5 minutes).
   - Outgoing webhooks execute HTTP requests to user-provided URLs. Without SSRF protection, malicious actors could probe internal cloud metadata (`169.254.169.254`), localhost (`127.0.0.1`), or VPC services. The shared SSRF guard blocks these IP ranges both before connect and on redirects. The only exception is the internal demo receiver `/api/sandbox/receiver/:token`.

4. **Deterministic Rule Engine with Loop Defense (F9)**:
   - Automations react to asynchronous events (`webhook.received`, `post.*`). If an automation action creates or modifies a post, that action could emit another event, which could trigger another automation, causing unbounded recursion and database exhaustion.
   - To prevent recursion (AC-F9-03), every event and execution context must carry a recursion counter `depth: number` (initialized to 0). If an action emits a new event, the child event receives `depth = parent.depth + 1`. If `depth >= 3`, execution is aborted and logged as `LOOP_DETECTED`.
   - All rule conditions use pure evaluation: dot-notation object navigation (`event.payload.item.price`), strict typing, and pure comparator functions (`eq`, `neq`, `contains`, `gt`, `lt`, `exists`). AI brand condition (`ai_on_brand_check`) delegates to `LlmProvider` with a strict fallback to brand kit `donts` keyword check if quota is depleted (AC-F9-08, F11).

---

## 3. Caveats

1. **LinkedIn Live OAuth Limitations**:
   - LinkedIn free self-serve API (`w_member_social`) only permits publishing to personal member profiles, not company pages (company pages require Community Management API partner approval).
   - LinkedIn member access tokens expire in ~60 days and do not support background refresh tokens for self-serve apps. The system must transition connectors to `needs_reconnect` when expired or on 401 `AUTH_EXPIRED`.
   - In production CI/CD and default development, live mode must be disabled (`ENABLE_LIVE_LINKEDIN=false`). All live adapter tests must execute against mocked HTTP (MSW).
2. **Serverless Cron Cadence**:
   - Vercel Hobby free tier limits cron invocations (often daily or once per hour). The scheduler design cannot rely solely on Vercel cron for sub-minute publishing. AC-F6-08 explicitly provides for this: in-page auto-polling (~15s) while the queue/connectors page is open, plus the manual "Publish now" / "Run due jobs" button.
3. **Database Concurrency in SQLite vs Postgres**:
   - In Postgres/Neon, `FOR UPDATE SKIP LOCKED` is native. If local unit tests run against in-memory SQLite or mock DB, an atomic compare-and-swap update (`WHERE status = 'queued' AND id = ?`) or simulated mutex is required. In production Neon Postgres, `SKIP LOCKED` must be used.

---

## 4. Conclusion

Features F4, F6, F8, and F9 form the operational integration backbone of BrandPilot. They provide an end-to-end reliable, idempotent, and secure pipeline connecting content creation to multi-channel distribution and external event-driven automations.

All 36 Acceptance Criteria across these four features (AC-F4-01..09, AC-F6-01..09, AC-F8-01..09, AC-F9-01..09) are fully mapped with inputs, outputs, error behaviors, edge cases, and verifiable test assertions.

---

## 5. Verification Method

To independently verify the completeness and compliance of these specifications:
1. **Schema Check**: Inspect Section 7 & 8 below to ensure every required Drizzle table, column, index, and REST route is accounted for.
2. **Contract Suite Verification**:
   - Run Vitest contract tests covering all 4 sandbox adapters + mock LinkedIn adapter.
   - Check that `AC-F4-01` through `AC-F4-09` test IDs are present in test descriptions.
3. **Scheduler Concurrency Verification**:
   - Execute parallel execution test for `runDueJobs()` with two concurrent promises resolving against the same queue; verify each job is published exactly once.
4. **Security & Cryptography Audit**:
   - Verify HMAC raw body hashing test with non-standard whitespace in JSON payload.
   - Verify SSRF guard test with loopback, private IPv4/IPv6, and redirect to AWS metadata IP.
   - Verify constant-time comparison test.
5. **Loop Protection Verification**:
   - Execute automation engine test with circular trigger-action setup (`post.approved -> set_post_status(approved)`); verify execution halts at depth 3 with `LOOP_DETECTED`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | F4: Connector | Connector Interface & Registry | Registry for multi-channel adapters with capability querying | `provider: string, mode: 'sandbox' \| 'live'` | `Connector` instance or registry entry | Throws `NOT_FOUND` on unknown provider/mode | PRD §9 AC-F4-01 |
| 2 | F4: Connector | Shared Contract Test Suite | Standard test contract ensuring all adapters implement uniform publishing, idempotency, and error mapping | Mocked publish inputs with identical idempotencyKey | Uniform `PublishResult` or mapped `ConnectorError` | Standard error codes: `RATE_LIMITED`, `AUTH_EXPIRED`, `INVALID_CONTENT`, `TEMPORARY`, `PERMANENT` | PRD §9 AC-F4-02 |
| 3 | F4: Connector | Sandbox Adapters with Failure Simulation | Sandbox implementations for LinkedIn, X, Instagram, Facebook with configurable error injection | `PublishInput`, simulated failure config (`none`, `temporary`, `rate_limit`, `permanent`) | `{ externalId: string, externalUrl: string }` | Returns simulated `ConnectorError` matching config | PRD §9 AC-F4-03 |
| 4 | F4: Connector | Connector Status Management | Connect and disconnect endpoints updating connector state in database | `POST /api/connectors/:provider/connect`, `.../disconnect` | `{ id, provider, mode, status, accountLabel }` | Returns `INVALID_STATE` or `NOT_FOUND` | PRD §9 AC-F4-04 |
| 5 | F4: Connector | Live LinkedIn OAuth Adapter | LinkedIn Posts API integration for personal profile posting with `w_member_social` | OAuth authorization code, post payload | Formatted LinkedIn Posts API request with version header | 401 $\to$ `AUTH_EXPIRED`, 429 $\to$ `RATE_LIMITED`, 5xx $\to$ `TEMPORARY`, 4xx $\to$ `INVALID_CONTENT` | PRD §9 AC-F4-05 |
| 6 | F4: Connector | OAuth State & AES-GCM Encryption | Random state generation/verification; AES-256-GCM token encryption at rest | Plaintext token, random IV, `ENCRYPTION_KEY` | Encrypted token string (`iv:tag:ciphertext`) | Auth mismatch $\to$ `OAUTH_STATE_MISMATCH`, crypto failure $\to$ `INTERNAL` | PRD §9 AC-F4-06 |
| 7 | F4: Connector | Live Mode Safety Flag Guard | Enforce that live posting can only occur when `ENABLE_LIVE_LINKEDIN=true` | Request to initiate live connection | Connect redirect URL or disabled warning | 403 `LIVE_MODE_DISABLED` if flag not set | PRD §9 AC-F4-07 |
| 8 | F4: Connector | Live Publish Confirmation Contract | Explicit client confirmation required before live posting | Confirmation flag / modal acknowledge | Publish proceeds to live connector | Blocked if unconfirmed | PRD §9 AC-F4-08 |
| 9 | F4: Connector | Extensible Adapter Architecture | Pluggable design where new adapters require only adapter file + registry config | New adapter file implementing `Connector` | Registered provider in system | Zero changes to scheduler or UI core | PRD §9 AC-F4-09 |
| 10 | F6: Scheduler | Schedule Approved Endpoint | Batch transition of approved posts into scheduled jobs | `POST /api/posts/schedule-approved` `{ scheduledAt? }` | `{ scheduledCount, skippedCount, errors: [] }` | Posts not in `approved` are skipped; missing connectors reported | PRD §9 AC-F6-01, 02 |
| 11 | F6: Scheduler | Run Due Jobs Runner | Batch processor selecting and executing due publish jobs | `POST /api/publish/run-due` (cron or manual) | `{ processedCount, succeededCount, failedCount, retriedCount }` | Job failure triggers retry policy or moves to `failed` | PRD §9 AC-F6-03 |
| 12 | F6: Scheduler | Concurrency Locking | Database locking ensuring concurrent runners do not duplicate jobs | Concurrent `runDueJobs()` calls | Exactly one worker locks and processes each job | Other workers skip locked jobs; no double publishing | PRD §9 AC-F6-03 |
| 13 | F6: Scheduler | Pure Exponential Backoff with Jitter | Deterministic retry delay calculation with jitter and retry-after support | `attempt: number, errorCode: string, retryAfter?: number` | `{ shouldRetry: boolean, nextAttemptAt?: Date }` | Max 4 attempts; non-retryable errors return `shouldRetry: false` | PRD §9 AC-F6-04 |
| 14 | F6: Scheduler | Publish Status & Event Emission | Updates post/job status on completion and writes audit events | Adapter result (`PublishResult` or `ConnectorError`) | Updated post status (`published` / `failed`), event in `events` table | Writes `post.published` or `post.failed` event | PRD §9 AC-F6-05 |
| 15 | F6: Scheduler | Idempotency Key Handling | Unique key `postId:version:provider` preventing duplicate publishing across retries | Idempotency key passed to connector | Adapter checks key and returns existing result if already processed | Prevents duplicate posts on crash between publish and DB save | PRD §9 AC-F6-06 |
| 16 | F6: Scheduler | "Publish Now" Immediate Execution | UI action to immediately schedule and execute publication for current workspace | `POST /api/posts/:id/publish-now` or bulk | Updated post record (`publishing` $\to$ `published`) | Concurrency or connector error mapped to user-friendly message | PRD §9 AC-F6-07 |
| 17 | F6: Scheduler | Cron Endpoint & Maintenance Suite | Secure endpoint for periodic job running and workspace maintenance | `POST /api/publish/run-due` with `Authorization: Bearer <CRON_SECRET>` | Maintenance summary `{ jobs, workspacesCleaned, quotaCountersCleaned }` | 401 `UNAUTHORIZED` if secret missing/invalid | PRD §9 AC-F6-08 |
| 18 | F6: Scheduler | Failed Post Retry Action | User-triggered retry moving post from `failed` back to `scheduled` | `POST /api/posts/:id/transition` `{ to: 'scheduled' }` | Updated post record in `scheduled` state | `INVALID_TRANSITION` if post is not in `failed` | PRD §9 AC-F6-09 |
| 19 | F8: Webhooks | Incoming Webhook Endpoint | Public webhook receiver verifying HMAC signature and timestamp | `POST /api/hooks/in/:publicToken`, body, headers `X-PostPilot-*` | 202 Accepted `{ ok: true, eventId }` | 401 `SIGNATURE_INVALID`, 401 `TIMESTAMP_EXPIRED`, 404 `NOT_FOUND` | PRD §9 AC-F8-01 |
| 20 | F8: Webhooks | Raw Body Timing-Safe HMAC | Cryptographic verification over raw body buffer using `crypto.timingSafeEqual` | Raw Buffer, header signature, stored secret | Boolean match result | Rejects mismatched signatures in constant time | PRD §9 AC-F8-02 |
| 21 | F8: Webhooks | Payload Zod Validation & Size Cap | Validation of incoming JSON against strict schema and byte limit (e.g. 1MB) | Incoming request body | Validated event payload object | 400 `VALIDATION_ERROR` on malformed JSON or schema failure | PRD §9 AC-F8-03 |
| 22 | F8: Webhooks | Incoming Event Deduplication | Idempotent ingestion rejecting duplicate deliveries with same `event_id` | `payload.event_id: string` | Returns 202 with existing event reference | Duplicate delivery does not re-trigger automations or re-insert | PRD §9 AC-F8-04 |
| 23 | F8: Webhooks | Outgoing Webhook Delivery & SSRF Guard | Dispatcher sending signed events to subscriber URLs with SSRF protection | Outgoing event, webhook subscriber URL, secret | HTTP response status and body from destination | SSRF blocked $\to$ `SSRF_BLOCKED`; non-retryable 4xx $\to$ failure logged | PRD §9 AC-F8-05, 06 |
| 24 | F8: Webhooks | Outgoing Retry with Backoff | Exponential backoff delivery retry on network errors or 5xx responses | Failed delivery attempt, attempt counter (max 3) | Queued retry attempt with timestamp | Fails permanently after 3 attempts; logged in `events` | PRD §9 AC-F8-06 |
| 25 | F8: Webhooks | Built-in Sandbox Receiver | Dedicated local receiver endpoint for end-to-end testing without external services | `POST /api/sandbox/receiver/:token` | 200 OK `{ received: true, timestamp }` | Validates token; exempted from SSRF loopback block | PRD §9 AC-F8-05 |
| 26 | F8: Webhooks | Webhook Management & Test Dispatch | UI management for incoming endpoint and outgoing webhooks + test dispatch | `POST /api/hooks/in/test`, `GET/POST /api/outgoing-webhooks` | Secret, copyable curl with HMAC command, test dispatch result | 429 `RATE_LIMITED` on excessive test triggers | PRD §9 AC-F8-07 |
| 27 | F8: Webhooks | Secret Rotation | Instant rotation of incoming endpoint secret | `POST /api/hooks/in/rotate-secret` | `{ newSecretMasked: string }` | Old secret immediately deactivated | PRD §9 AC-F8-09 |
| 28 | F8: Webhooks | Activity Feed & Event Log | Audited event list with filtering, pagination, and secret redaction | `GET /api/events?source=...&type=...&status=...&page=...` | `{ events: [], total, page, pageSize }` | Redacts sensitive headers and tokens from payloads | PRD §9 AC-F8-08 |
| 29 | F9: Automations | Pure Rule Evaluation Engine | Pure function evaluating triggers and compound conditions against event data | `evaluate(automation, event)` | `{ matched: boolean, actionsToRun: RuleAction[] }` | Invalid operator or path error handled gracefully | PRD §9 AC-F9-01 |
| 30 | F9: Automations | Compound Conditions & Path Evaluation | Deep property resolution (`a.b.c`) and operators (`eq`, `neq`, `contains`, `gt`, `lt`, `exists`) | Event JSON payload, condition descriptors | Boolean evaluation (all conditions must match: AND logic) | Missing path resolves to `undefined`; `exists` checks presence | PRD §9 AC-F9-01 |
| 31 | F9: Automations | AI On-Brand Condition with Fallback | Semantic verification of event content against brand kit with deterministic fallback | Event payload, brand kit, `LlmProvider` | `{ onBrand: boolean, reason: string }` | Quota exceeded $\to$ falls back to `donts` keyword search | PRD §9 AC-F9-01, 08 |
| 32 | F9: Automations | Sequential Action Execution & Step Logging | Executes actions in order and persists execution traces in `automation_runs` | Matched actions list, execution context | `{ runId, status: 'succeeded' \| 'failed', log: StepLog[] }` | Action failure does not truncate previous logs; recorded in DB | PRD §9 AC-F9-02 |
| 33 | F9: Automations | Recursion Loop Protection | Depth tracking preventing infinite automation trigger cascades | `event.depth: number` (limit 3) | Allows execution if `depth < 3`, aborts if $\ge 3$ | Logs `LOOP_DETECTED`; stops execution cascade | PRD §9 AC-F9-03 |
| 34 | F9: Automations | Status Machine Enforcement in Actions | Ensures post status actions (`hold_post`, `set_post_status`) obey legal transitions | Target post ID, requested status | Post status updated or action marked failed | `INVALID_TRANSITION` logged in action step log; not forced | PRD §9 AC-F9-04 |
| 35 | F9: Automations | Create AI Draft Action | Generates a new post draft from event data in `in_review` status | Event payload (`title`, `url`, etc.), target channel | New post inserted with status `in_review` | Uses fallback writer if LLM quota is exhausted (AC-F11-01) | PRD §9 AC-F9-07, 08 |
| 36 | F9: Automations | Dry-Run Test Endpoint | Simulates automation execution against sample payload without committing side effects | `POST /api/automations/:id/test` with sample event | `{ matched: boolean, conditionsSummary: [], plannedActions: [] }` | Returns evaluation trace without DB writes or external calls | PRD §9 AC-F9-06 |
| 37 | F9: Automations | Workspace Automation Quota | Caps total automations per workspace at 10 to protect resources | Create automation request | New automation or 400 rejection | 400 `QUOTA_EXHAUSTED` when workspace has 10 automations | PRD §9 AC-F9-09 |

---

## Edge Cases

| # | Feature | Input / Condition | Observed Behavior |
|---|---------|-------------------|-------------------|
| 1 | F4: Connector | Token expires during scheduled publish | Live LinkedIn adapter receives 401 Unauthorized; maps to `AUTH_EXPIRED`; connector status updated to `needs_reconnect`; job fails without retry; banner displayed in UI. |
| 2 | F4: Connector | Publish with identical `idempotencyKey` | Sandbox & live connectors detect previously processed key; return exact previous `externalId` and `externalUrl` without issuing new social post. |
| 3 | F4: Connector | Rate limited with `Retry-After: 120` | Adapter returns `RATE_LIMITED` error with `retryAfter = 120`; scheduler sets `next_attempt_at = now + 120s`, overriding standard exponential backoff. |
| 4 | F4: Connector | Unknown provider requested | Connector registry throws `NOT_FOUND` error; API returns 404 with standard error format `{ error: { code: 'NOT_FOUND', ... } }`. |
| 5 | F6: Scheduler | Approved post edited before publish | Editing caption or creative bumps `version` and automatically resets post status to `in_review` (AC-F5-04). Post is excluded from `schedule-approved` until re-approved. |
| 6 | F6: Scheduler | Two concurrent `run-due` requests | Both workers query database using `FOR UPDATE SKIP LOCKED`; worker A acquires jobs 1–5; worker B acquires jobs 6–10; no job is processed twice. |
| 7 | F6: Scheduler | Adapter publish succeeds but DB crashes | Job remains in `running` or `retrying`; next `run-due` execution picks up job with same `idempotencyKey`; adapter returns existing external ID; DB updates to `published` without duplicate post. |
| 8 | F6: Scheduler | 4th retry attempt fails | Job attempt counter reaches 4; scheduler marks job status `failed`; post status transitions to `failed`; `post.failed` event written to `events` table; UI shows "Retry" button. |
| 9 | F6: Scheduler | Post approved for channel with disconnected connector | `schedule-approved` evaluates channel connectivity; skips post; leaves status as `approved`; response includes `{ skipped: [{ postId, reason: 'CONNECTOR_NOT_CONNECTED' }] }`. |
| 10 | F8: Webhooks | Incoming webhook timestamp is 5 minutes and 1 second old | Server checks $|T_{\text{now}} - T_{\text{header}}| = 301 > 300\text{s}$; rejects immediately with 401 `TIMESTAMP_EXPIRED`; raw body signature not even computed. |
| 11 | F8: Webhooks | Incoming JSON body has erratic spacing / indentation | Signature verified against verbatim raw request buffer before JSON parsing; signature matches; body then parsed to JSON; passes without false signature rejection. |
| 12 | F8: Webhooks | Duplicate webhook payload with same `event_id` | Server checks `events` table for existing `payload->>'event_id'`; finds existing record; returns 202 Accepted without re-triggering automations or inserting duplicate row. |
| 13 | F8: Webhooks | Outgoing webhook subscriber points to `http://169.254.169.254/latest/meta-data` | SSRF guard resolves IP, detects AWS metadata link-local address; rejects request with `SSRF_BLOCKED`; delivery logged as failed. |
| 14 | F8: Webhooks | Outgoing webhook subscriber points to built-in receiver `/api/sandbox/receiver/:token` | SSRF guard explicitly checks and permits local sandbox receiver path; delivery proceeds and logs 200 OK. |
| 15 | F8: Webhooks | Secret rotated while in-flight webhook arrives with old secret | Verification uses currently stored secret in `incoming_endpoints`; old secret signature fails constant-time comparison; returns 401 `SIGNATURE_INVALID`. |
| 16 | F9: Automations | Automation A triggers on `post.approved` and executes `set_post_status(approved)` on another post | Event emitted with `depth = 1`; triggers second automation with `depth = 2`; third triggers with `depth = 3`; engine checks `depth >= 3` and halts with `LOOP_DETECTED`. |
| 17 | F9: Automations | Automation condition references non-existent JSON path `payload.data.missing.field` | Path resolver safely returns `undefined`; condition `eq` fails; automation evaluation returns `{ matched: false, actions: [] }` without throwing runtime exception. |
| 18 | F9: Automations | Action attempts illegal transition `draft -> published` | Engine invokes `validateTransition('draft', 'published')`; transition rejected; action marked `failed` with `INVALID_TRANSITION` in `automation_runs.log`; earlier actions remain intact. |
| 19 | F9: Automations | `create_ai_draft` action triggered when Gemini API quota is 100% exhausted | Engine detects exhausted quota; invokes `FallbackProvider` to generate deterministic draft based on brand kit keywords; creates draft post in `in_review` with note. |
| 20 | F9: Automations | Workspace attempts to create 11th automation | Server counts existing automations for `workspace_id`; count is 10; rejects with 400 `QUOTA_EXHAUSTED` ("Maximum of 10 automations per workspace reached"). |

---

## Technical Specifications & Schemas

### 1. Database Schemas (Drizzle ORM)

```typescript
// src/server/db/schema.ts (Relevant Tables for F4, F6, F8, F9)

import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Connectors table (F4)
export const connectors = pgTable('connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['linkedin', 'instagram', 'x', 'facebook'] }).notNull(),
  mode: text('mode', { enum: ['sandbox', 'live'] }).notNull().default('sandbox'),
  status: text('status', { enum: ['connected', 'disconnected', 'needs_reconnect', 'error'] }).notNull().default('connected'),
  accountLabel: text('account_label').notNull(),
  tokenEncrypted: text('token_encrypted'), // AES-GCM encrypted
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  simulationConfig: jsonb('simulation_config').$type<{
    simulatedError?: 'none' | 'temporary' | 'rate_limit' | 'permanent';
    retryAfterSeconds?: number;
  }>().default({ simulatedError: 'none' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Publish Jobs table (F6)
export const publishJobs = pgTable('publish_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').notNull().references(() => connectors.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull().unique(), // Format: `${postId}:${version}:${provider}`
  attempt: integer('attempt').notNull().default(0),
  status: text('status', { enum: ['queued', 'running', 'succeeded', 'failed', 'retrying'] }).notNull().default('queued'),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Incoming Endpoints table (F8)
export const incomingEndpoints = pgTable('incoming_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  publicToken: text('public_token').notNull().unique(), // Public identifier in URL
  secretEncrypted: text('secret_encrypted').notNull(), // AES-GCM encrypted HMAC secret
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Outgoing Webhooks table (F8)
export const outgoingWebhooks = pgTable('outgoing_webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secretEncrypted: text('secret_encrypted').notNull(), // AES-GCM encrypted signing secret
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Events Activity Feed table (F8)
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'post.published', 'post.failed', 'post.approved', 'webhook.received', 'automation.run'
  source: text('source', { enum: ['incoming', 'outgoing', 'system'] }).notNull(),
  payload: jsonb('payload').notNull(), // JSON event payload
  status: text('status').notNull().default('success'), // 'success', 'failed', 'pending'
  depth: integer('depth').notNull().default(0), // Loop protection depth tracker
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Automations table (F9)
export const automations = pgTable('automations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  trigger: jsonb('trigger').$type<{
    type: 'webhook.received' | 'post.published' | 'post.failed' | 'post.approved';
    eventName?: string; // e.g. 'product.launched' for webhook.received
  }>().notNull(),
  conditions: jsonb('conditions').$type<Array<{
    type: 'path_comparison' | 'ai_on_brand_check';
    path?: string;
    operator?: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'exists';
    value?: unknown;
  }>>().notNull().default([]),
  actions: jsonb('actions').$type<Array<{
    type: 'create_ai_draft' | 'send_webhook' | 'hold_post' | 'set_post_status';
    channel?: 'linkedin' | 'instagram' | 'x' | 'facebook';
    status?: string;
    reason?: string;
    webhookUrl?: string;
  }>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Automation Runs table (F9)
export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  automationId: uuid('automation_id').notNull().references(() => automations.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['succeeded', 'failed'] }).notNull(),
  log: jsonb('log').$type<Array<{
    step: string;
    status: 'passed' | 'failed' | 'skipped';
    details?: unknown;
    error?: string;
    durationMs?: number;
  }>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 2. Core TypeScript Interfaces & Contracts

```typescript
// src/lib/connectors/types.ts (F4)
export type SocialProvider = 'linkedin' | 'instagram' | 'x' | 'facebook';
export type ConnectorMode = 'sandbox' | 'live';
export type ConnectorStatus = 'connected' | 'disconnected' | 'needs_reconnect' | 'error';

export interface ConnectorCapabilities {
  maxChars: number;
  maxHashtags: number;
  supportsImage: boolean;
  supportsScheduling: boolean;
}

export interface PublishInput {
  postId: string;
  caption: string;
  hashtags: string[];
  creativeSpec?: {
    templateId: string;
    headline: string;
    subline?: string;
    colors: { primary: string; secondary: string; background: string; text: string };
  };
  mediaUrl?: string;
  idempotencyKey: string; // postId:version:provider
}

export interface PublishResult {
  externalId: string;
  externalUrl: string;
}

export type ConnectorErrorCode = 
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'INVALID_CONTENT'
  | 'TEMPORARY'
  | 'PERMANENT';

export class ConnectorError extends Error {
  constructor(
    public readonly code: ConnectorErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    public readonly rawError?: unknown
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

export interface ConnectorExecutionContext {
  workspaceId: string;
  accessToken?: string;
  simulationConfig?: {
    simulatedError?: 'none' | 'temporary' | 'rate_limit' | 'permanent';
    retryAfterSeconds?: number;
  };
}

export interface Connector {
  readonly provider: SocialProvider;
  readonly mode: ConnectorMode;
  readonly capabilities: ConnectorCapabilities;

  connect(ctx: ConnectorExecutionContext): Promise<{ status: ConnectorStatus; accountLabel: string; authUrl?: string }>;
  disconnect(ctx: ConnectorExecutionContext): Promise<void>;
  healthCheck(ctx: ConnectorExecutionContext): Promise<{ healthy: boolean; details?: string }>;
  publish(ctx: ConnectorExecutionContext, input: PublishInput): Promise<PublishResult>;
}
```

```typescript
// src/lib/scheduler/retry-policy.ts (F6)
export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 4,
  baseDelayMs: 60_000,    // 1 minute
  maxDelayMs: 1_800_000, // 30 minutes
  jitterFactor: 0.2,     // 20% jitter
};

export function calculateNextRetry(
  attempt: number,
  errorCode: ConnectorErrorCode,
  retryAfterSeconds?: number,
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY,
  randomFn = Math.random
): { shouldRetry: boolean; nextAttemptAt?: Date } {
  // Only TEMPORARY and RATE_LIMITED are retryable
  if (errorCode !== 'TEMPORARY' && errorCode !== 'RATE_LIMITED') {
    return { shouldRetry: false };
  }

  if (attempt >= config.maxAttempts) {
    return { shouldRetry: false };
  }

  // If upstream explicitly provided Retry-After, honor it
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return {
      shouldRetry: true,
      nextAttemptAt: new Date(Date.now() + retryAfterSeconds * 1000),
    };
  }

  // Exponential backoff: base * 2^(attempt - 1)
  const exponentialDelay = config.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const cappedDelay = Math.min(config.maxDelayMs, exponentialDelay);
  const jitter = cappedDelay * config.jitterFactor * randomFn();
  const totalDelay = Math.round(cappedDelay + jitter);

  return {
    shouldRetry: true,
    nextAttemptAt: new Date(Date.now() + totalDelay),
  };
}
```

```typescript
// src/lib/security/hmac.ts (F8)
import crypto from 'node:crypto';

export function computeHmacSha256(secret: string, rawBody: Buffer | string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyHmacTimingSafe(secret: string, rawBody: Buffer | string, signatureHeader: string): boolean {
  const expectedSignature = computeHmacSha256(secret, rawBody);
  const normalizedReceived = signatureHeader.replace(/^sha256=/, '');

  if (expectedSignature.length !== normalizedReceived.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(normalizedReceived, 'hex')
  );
}

export function isTimestampFresh(timestampStr: string | number, maxWindowSeconds = 300, now = Date.now()): boolean {
  const parsedTime = typeof timestampStr === 'number' ? timestampStr : parseInt(timestampStr, 10);
  if (isNaN(parsedTime)) return false;
  
  // Normalize seconds vs milliseconds
  const timestampMs = parsedTime < 1e12 ? parsedTime * 1000 : parsedTime;
  const diffMs = Math.abs(now - timestampMs);
  return diffMs <= maxWindowSeconds * 1000;
}
```

```typescript
// src/lib/automations/engine.ts (F9)
export interface AutomationEvaluationResult {
  matched: boolean;
  conditionLogs: Array<{ conditionIndex: number; passed: boolean; reason?: string }>;
  actionsToRun: Array<automations.$inferSelect['actions'][number]>;
}

export function getNestedProperty(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export function evaluateCondition(
  condition: automations.$inferSelect['conditions'][number],
  eventPayload: Record<string, unknown>
): boolean {
  if (condition.type === 'path_comparison') {
    if (!condition.path || !condition.operator) return false;
    const value = getNestedProperty(eventPayload, condition.path);

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'contains':
        if (typeof value === 'string' && typeof condition.value === 'string') {
          return value.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.includes(condition.value);
        }
        return false;
      case 'gt':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'lt':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  // ai_on_brand_check handled via async evaluator
  return true;
}
```

---

### 3. REST API Endpoint Specification

#### F4: Connectors
- `GET /api/connectors`:
  - Auth: Workspace cookie.
  - Returns: Array of all 4 providers with mode (`sandbox` | `live`), status (`connected` | `disconnected` | `needs_reconnect`), capabilities, accountLabel.
- `POST /api/connectors/:provider/connect`:
  - Auth: Workspace cookie.
  - Body: `{ mode: 'sandbox' | 'live' }`
  - Sandbox: Instantly sets status to `connected`.
  - Live LinkedIn: Checks `ENABLE_LIVE_LINKEDIN=true`. Returns OAuth authorization URL with signed state.
- `POST /api/connectors/:provider/disconnect`:
  - Auth: Workspace cookie.
  - Updates status to `disconnected`, cleans encrypted tokens.
- `GET /api/connectors/linkedin/callback`:
  - Query: `code`, `state`, `error`.
  - Verifies state cookie/cache; exchanges code for access token via LinkedIn OAuth; encrypts token with AES-GCM; sets status to `connected`.
- `POST /api/connectors/:provider/simulate-failure`:
  - Body: `{ simulatedError: 'none' | 'temporary' | 'rate_limit' | 'permanent', retryAfterSeconds?: number }`
  - Updates `simulationConfig` for demo and retry testing.

#### F6: Scheduler and Publisher
- `POST /api/posts/schedule-approved`:
  - Auth: Workspace cookie.
  - Body: `{ scheduledAt?: string }` (optional ISO date).
  - Finds all posts for workspace with `status = 'approved'`.
  - For each post, checks connected connector for its channel. If connected, creates `publish_jobs` row with idempotency key `${postId}:${version}:${provider}` and transitions post to `scheduled`.
  - Returns: `{ scheduled: string[], skipped: Array<{ postId: string; reason: string }> }`.
- `POST /api/publish/run-due`:
  - Auth: Either `Authorization: Bearer <CRON_SECRET>` (global run) OR Workspace cookie (workspace-only run).
  - Selects due jobs (`status IN ('queued', 'retrying') AND next_attempt_at <= now()`) with `FOR UPDATE SKIP LOCKED`.
  - Runs jobs through corresponding connector; updates job status; applies retry backoff on `TEMPORARY`/`RATE_LIMITED`; emits `post.published` or `post.failed`.
  - If triggered via cron: also triggers workspace 7-day TTL cleanup and quota counter cleanup.
- `POST /api/posts/:id/publish-now`:
  - Auth: Workspace cookie.
  - Validates post is `approved` or `scheduled`. Sets `scheduled_at = now()` and triggers immediate publishing for this job.

#### F8: Webhooks and Activity Log
- `POST /api/hooks/in/:publicToken`:
  - Headers: `X-PostPilot-Signature: sha256=<hex>`, `X-PostPilot-Timestamp: <timestamp>`.
  - Body: Raw JSON.
  - Validates:
    1. Timestamp within 300 seconds.
    2. Lookup incoming endpoint by `publicToken`.
    3. Decrypt secret, compute HMAC-SHA256 over raw body, verify via `timingSafeEqual`.
    4. Zod validate JSON shape.
    5. Deduplicate by `payload.event_id`.
  - Inserts event into `events` table (source `incoming`). Triggers automation evaluation.
  - Response: 202 Accepted `{ ok: true, eventId: string }`.
- `POST /api/hooks/in/rotate-secret`:
  - Rotates HMAC secret, returns new masked secret.
- `GET/POST/PATCH/DELETE /api/outgoing-webhooks`:
  - CRUD for subscriber URLs.
  - Post body: `{ url: string, active?: boolean }`.
  - Validates URL through SSRF guard (rejects private/internal IPs, permits sandbox receiver).
- `POST /api/sandbox/receiver/:token`:
  - Internal webhook echo receiver for zero-dependency testing. Always returns 200 OK.
- `GET /api/events`:
  - Query: `source`, `type`, `status`, `page`, `pageSize`.
  - Returns paginated events with redacted secrets.

#### F9: Automations
- `GET /api/automations`: List workspace automations.
- `POST /api/automations`:
  - Body: `{ name, enabled, trigger, conditions, actions }`.
  - Checks workspace cap (max 10). Validates with Zod.
- `PATCH /api/automations/:id`: Update automation.
- `DELETE /api/automations/:id`: Remove automation.
- `POST /api/automations/:id/test`:
  - Body: `{ sampleEvent: Record<string, unknown> }`.
  - Dry-run simulation: evaluates triggers and conditions; returns matching summary and proposed actions without executing side effects.

---

### 4. Recommended Directory Structure

```
src/
  lib/
    connectors/
      types.ts                     # Connector, capabilities, errors, results
      registry.ts                  # Provider registration & lookup
      base-sandbox.adapter.ts      # Shared sandbox adapter logic
      adapters/
        instagram-sandbox.ts       # Instagram sandbox adapter
        x-sandbox.ts               # X (Twitter) sandbox adapter
        facebook-sandbox.ts        # Facebook sandbox adapter
        linkedin-sandbox.ts        # LinkedIn sandbox adapter
        linkedin-live.ts           # LinkedIn live OAuth adapter
      contract-tests/
        shared-contract.suite.ts   # Reusable contract test suite (Vitest)
    scheduler/
      retry-policy.ts              # Pure backoff + jitter calculator
      concurrency.ts               # DB job locking helper
      runner.ts                    # runDueJobs core loop
    security/
      hmac.ts                      # Timing-safe HMAC-SHA256 & timestamp check
      ssrf-guard.ts                # IP validation & DNS resolver checks
      encryption.ts                # AES-256-GCM token & secret encrypt/decrypt
    automations/
      engine.ts                    # Pure rule evaluation & condition matcher
      path-resolver.ts             # Nested dot-notation property extractor
      ai-brand-check.ts            # LLM brand compliance check with fallback
      action-dispatcher.ts         # Action execution with loop depth tracking
  server/
    db/
      schema.ts                    # Drizzle tables (connectors, publish_jobs, events, etc.)
  app/
    api/
      connectors/
        route.ts                   # List connectors
        [provider]/
          connect/route.ts         # Connect endpoint
          disconnect/route.ts      # Disconnect endpoint
          simulate-failure/route.ts# Failure simulation control
        linkedin/
          callback/route.ts        # OAuth callback
      posts/
        schedule-approved/route.ts # Batch scheduling of approved posts
        [id]/publish-now/route.ts  # Publish now trigger
      publish/
        run-due/route.ts           # Cron / manual run due jobs
      hooks/
        in/
          [publicToken]/route.ts   # Incoming webhook endpoint
          rotate-secret/route.ts   # Secret rotation
          test/route.ts            # Send test event
      outgoing-webhooks/
        route.ts                   # Outgoing webhooks CRUD
      sandbox/
        receiver/
          [token]/route.ts         # Built-in test webhook receiver
      events/
        route.ts                   # Activity log endpoint
      automations/
        route.ts                   # Automations CRUD
        [id]/
          test/route.ts            # Dry run test endpoint
```

---

## Detailed Acceptance Criteria Mapping & Verification Guide

### Feature F4: Connector Framework
- **AC-F4-01**: `getConnector(provider, mode)` returns adapter instance. Calling with invalid provider/mode throws or returns `NOT_FOUND`.
  - *Test*: `AC-F4-01: registry returns correct adapter and handles unknown providers`.
- **AC-F4-02**: Shared contract test suite verifies: (1) successful publish; (2) idempotency: repeat publish with same key returns identical externalId without duplicate action; (3) rate limit error maps to `RATE_LIMITED` with retryAfter; (4) auth failure maps to `AUTH_EXPIRED`; (5) bad content maps to `INVALID_CONTENT`.
  - *Test*: `AC-F4-02: contract test suite passes for all sandbox and mocked live adapters`.
- **AC-F4-03**: Sandbox adapters accept simulation configuration (`temporary`, `rate_limit`, `permanent`); publish calls throw corresponding `ConnectorError`.
  - *Test*: `AC-F4-03: sandbox adapter simulates temporary, rate_limit, and permanent failures`.
- **AC-F4-04**: Connect/disconnect endpoints update `connectors.status` in database; UI badges show "Sandbox" for sandbox connectors.
  - *Test*: `AC-F4-04: connect and disconnect cycle updates connector status`.
- **AC-F4-05**: Live LinkedIn adapter (MSW mocked) sends POST to `/rest/posts` with `LinkedIn-Version` header, `Authorization: Bearer`, author URN, maps 401 $\to$ `AUTH_EXPIRED`, 429 $\to$ `RATE_LIMITED`, 500 $\to$ `TEMPORARY`, 400 $\to$ `INVALID_CONTENT`.
  - *Test*: `AC-F4-05: live linkedin adapter crafts valid payload and maps http status codes`.
- **AC-F4-06**: OAuth flow generates cryptographically random `state` (32 bytes), validates on callback; access token encrypted with AES-256-GCM before storage; never present in client responses or logs.
  - *Test*: `AC-F4-06: oauth state validation and aes-gcm token encryption`.
- **AC-F4-07**: When `ENABLE_LIVE_LINKEDIN` is not `'true'`, `/api/connectors/linkedin/connect` returns 403 `LIVE_MODE_DISABLED`; UI disables live connect button.
  - *Test*: `AC-F4-07: live linkedin connection rejected when flag disabled`.
- **AC-F4-08**: Client requires explicit confirmation before live publishing (`"This will post publicly to your LinkedIn profile"`).
  - *Test*: `AC-F4-08: live publish requires explicit user confirmation`.
- **AC-F4-09**: New sandbox provider can be added by declaring single class implementing `Connector` and registering it; zero changes to scheduler or queue logic.
  - *Test*: `AC-F4-09: architecture allows registering new provider without scheduler changes`.

### Feature F6: Scheduler and Publisher
- **AC-F6-01**: `POST /api/posts/schedule-approved` processes only posts with `status = 'approved'`. Drafts, in_review, held, or rejected posts remain unchanged.
  - *Test*: `AC-F6-01: schedule-approved filters strictly for approved status`.
- **AC-F6-02**: Post whose channel connector is disconnected is not scheduled; response includes explanation.
  - *Test*: `AC-F6-02: posts with disconnected connectors are skipped with reason`.
- **AC-F6-03**: Two concurrent executions of `runDueJobs()` lock candidate jobs with `FOR UPDATE SKIP LOCKED`; all jobs are processed exactly once without double publication.
  - *Test*: `AC-F6-03: concurrent run-due executions prevent duplicate publishing`.
- **AC-F6-04**: Pure retry policy unit table test: `TEMPORARY` retries with backoff; `RATE_LIMITED` honors `retry-after`; `PERMANENT`/`INVALID_CONTENT`/`AUTH_EXPIRED` do not retry; max 4 attempts cap.
  - *Test*: `AC-F6-04: retry policy backoff, jitter, and error code handling`.
- **AC-F6-05**: Successful publish sets post status to `published`, saves `external_id` and `external_url`, emits `post.published` event; final failure sets status to `failed` and emits `post.failed`.
  - *Test*: `AC-F6-05: publish completion records external ids and emits audit events`.
- **AC-F6-06**: Crashes between external adapter call and DB commit resume on next run using identical `idempotencyKey`; adapter returns cached result without re-posting.
  - *Test*: `AC-F6-06: publish idempotency across simulated database failure`.
- **AC-F6-07**: UI "Publish now" action immediately schedules post for current timestamp and invokes `runDueJobs()` for the current workspace.
  - *Test*: `AC-F6-07: publish now triggers immediate execution for workspace`.
- **AC-F6-08**: `POST /api/publish/run-due` requires `CRON_SECRET` header when called without workspace session; invokes workspace TTL cleanup and quota counter cleanup.
  - *Test*: `AC-F6-08: cron endpoint enforces secret and triggers maintenance tasks`.
- **AC-F6-09**: Failed posts display readable error message in UI; "Retry" action triggers transition `failed -> scheduled`.
  - *Test*: `AC-F6-09: failed post retry button moves status to scheduled`.

### Feature F8: Webhooks and Activity Log
- **AC-F8-01**: Incoming webhook with valid signature and fresh timestamp returns 202 and creates event; bad signature returns 401 `SIGNATURE_INVALID`; timestamp older than 300s returns 401 `TIMESTAMP_EXPIRED`; unknown token returns 404.
  - *Test*: `AC-F8-01: incoming webhook auth, timestamp, and routing validation`.
- **AC-F8-02**: Signature verification uses `crypto.timingSafeEqual` and operates on the unmodified raw request buffer (tested with irregular JSON spacing).
  - *Test*: `AC-F8-02: constant-time hmac verification over raw body buffer`.
- **AC-F8-03**: Incoming webhook body validated with Zod; invalid JSON returns 400 `VALIDATION_ERROR`; body size capped.
  - *Test*: `AC-F8-03: incoming webhook zod validation and payload size limits`.
- **AC-F8-04**: Webhook with identical `payload.event_id` is ingested once; duplicate delivery returns 202 without duplicate event row.
  - *Test*: `AC-F8-04: idempotent incoming event deduplication by event_id`.
- **AC-F8-05**: Outgoing webhook URLs validated through SSRF guard; private/loopback/link-local/metadata IPs rejected; built-in sandbox receiver permitted.
  - *Test*: `AC-F8-05: outgoing webhook ssrf guard blocks internal ips and allows sandbox receiver`.
- **AC-F8-06**: Outgoing webhooks retry on 5xx or network errors with exponential backoff (max 3 attempts); non-retryable 4xx fails immediately; each attempt logged.
  - *Test*: `AC-F8-06: outgoing webhook retry backoff and attempt logging`.
- **AC-F8-07**: Webhooks UI displays incoming URL, masked secret with copy buttons, copyable curl script with HMAC generation, and functional "Send test event" button.
  - *Test*: `AC-F8-07: webhooks management ui and test event dispatch`.
- **AC-F8-08**: Activity log (`GET /api/events`) returns paginated events filtered by source, type, and status; JSON viewer renders pretty-printed payload with secrets redacted.
  - *Test*: `AC-F8-08: activity log filtering, pagination, and secret redaction`.
- **AC-F8-09**: Secret rotation replaces existing secret; requests using old secret immediately fail with 401.
  - *Test*: `AC-F8-09: secret rotation immediately invalidates previous secret`.

### Feature F9: Automations Engine
- **AC-F9-01**: Pure evaluation function `evaluate(automation, event)` tested with full truth table: operators `eq`, `neq`, `contains`, `gt`, `lt`, `exists`, missing paths, nested paths, AND conjunction.
  - *Test*: `AC-F9-01: pure rule engine condition evaluation and operators`.
- **AC-F9-02**: Matching automation runs actions in sequence; persists execution trace in `automation_runs.log`; failed action records error without deleting prior steps.
  - *Test*: `AC-F9-02: sequential action execution and step log persistence`.
- **AC-F9-03**: Execution context tracks event depth; cascades exceeding depth 3 halt with `LOOP_DETECTED`.
  - *Test*: `AC-F9-03: automation loop protection enforces max recursion depth 3`.
- **AC-F9-04**: Post status actions strictly validate against post status machine; invalid moves are logged as failed actions rather than forced.
  - *Test*: `AC-F9-04: automation post actions enforce status machine rules`.
- **AC-F9-05**: UI form for creating/editing automations validates trigger, conditions, and actions with Zod, showing inline errors.
  - *Test*: `AC-F9-05: automation builder form zod validation`.
- **AC-F9-06**: `POST /api/automations/:id/test` executes dry run simulation without DB writes or external side effects.
  - *Test*: `AC-F9-06: automation dry run test mode returns simulation trace`.
- **AC-F9-07**: End-to-end integration: `POST /api/hooks/in/:token` with `product.launched` event triggers matching automation, creates new post in `in_review` status, and logs `automation.run` event.
  - *Test*: `AC-F9-07: end-to-end webhook to automation to post creation`.
- **AC-F9-08**: `create_ai_draft` action uses `FallbackProvider` if Gemini quota is exhausted or API key is absent.
  - *Test*: `AC-F9-08: automation draft creation honors llm fallback rules`.
- **AC-F9-09**: Attempting to create an 11th automation in a workspace returns 400 `QUOTA_EXHAUSTED`.
  - *Test*: `AC-F9-09: workspace automation quota cap enforced at 10 rules`.

---
Report compiled and verified against PRD.md and ORIGINAL_REQUEST.md. Ready for orchestrator synthesis.
