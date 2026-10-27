# BrandPilot Technical Architecture

## 1. System Overview

BrandPilot is an autonomous AI marketing agent platform engineered to convert arbitrary website URLs into structured brand kits, generate multi-channel social media campaigns, render high-resolution branded image cards, enforce a strict human-in-the-loop approval gate, and publish posts via resilient concurrency schedulers and webhooks.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 Web UI                                    │
│  Home / Demo (F10) │ Brand Kit (F2) │ Agent (F3) │ Queue & Calendar (F5)  │
│  Connectors UI (F7) │ Webhooks (F8) │ Automations (F9) │ Activity Log (F8)│
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                       Anonymous Workspace Layer (F1)                      │
│     Cookie-based UUID v4 session │ Scoped Database Query Boundary         │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│          Core Business Engine       │        Integration & Events         │
│  • Brand Kit Extraction & SSRF (F2) │  • Connector Framework & OAuth (F4) │
│  • 3-Step Content Pipeline (F3)     │  • Idempotent Concurrency Scheduler │
│  • Resvg Branded Card Engine (F3)   │    with Exponential Backoff (F6)    │
│  • Strict Status State Machine (F5) │  • HMAC-SHA256 Webhooks (F8)        │
│  • Rule Automation Engine (F9)      │  • Event Activity Feed (F8)         │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                    Reliability & Infrastructure Guardrails                │
│  • Resilient LlmProvider (Gemini -> Fallback -> Fake) (F11)               │
│  • Daily Budget (llm_usage) & Postgres Rate Limiter (rate_limit_counters) │
│  • 24h Response Cache (llm_cache) & Resource Caps (F11)                   │
│  • Drizzle ORM Relational Schema (15 Tables) on Neon Postgres (F0)        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Subsystem State Machines

### 2.1 Post Status (`PostStatus`) Strict State Machine (F5)
The post publishing lifecycle strictly enforces human review prior to scheduling or external transmission.

```
                  ┌─────────┐
                  │  draft  │
                  └────┬────┘
                       │ submit_for_review
                       ▼
┌─────────┐  hold  ┌───────────┐  approve   ┌──────────┐
│  held   │◄───────┤ in_review ├───────────►│ approved │
└────┬────┘        └─────┬─────┘            └────┬─────┘
     │ release           │ reject                │ schedule
     ▼                   ▼                       ▼
┌───────────┐      ┌───────────┐            ┌───────────┐
│ in_review │      │ rejected  │            │ scheduled │
└───────────┘      └───────────┘            └─────┬─────┘
                                                  │ publish_start
                                                  ▼
                                            ┌───────────┐
                                            │ publishing│
                                            └─────┬─────┘
                                   succeed        │        fail
                            ┌─────────────────────┴─────────────────────┐
                            ▼                                           ▼
                     ┌───────────┐                               ┌───────────┐
                     │ published │                               │  failed   │
                     └───────────┘                               └─────┬─────┘
                                                                       │ retry
                                                                       ▼
                                                                 ┌───────────┐
                                                                 │ scheduled │
                                                                 └───────────┘
```

**State Transition Invariants:**
1. **Human Gate:** Direct transition from `draft` or `in_review` to `scheduled` or `published` is strictly forbidden.
2. **Version Invalidation:** Modifying post copy or image assets on an `approved` post increments the post `version` and automatically reverts status to `in_review`.
3. **Audit Trail:** Every transition records `updatedAt` and writes an event to the `events` table.

---

### 2.2 Content Agent 3-Step Pipeline (F3)
Generating marketing content follows a deterministic 3-step state pipeline:

```
[queued] ──> [idea] ──> [creative] ──> [campaign] ──> [succeeded]
               │            │              │
               ▼ (fail)     ▼ (fail)       ▼ (fail)
           [failed]     [failed]       [failed]
               │            │              │
               └── retry ───┴── retry ─────┘
```

1. **Idea Step:** Generates distinct marketing themes, hooks, and content angles based on brand voice, dos/donts, and target audience.
2. **Creative Step:** Produces channel-specific captions (LinkedIn, X, Instagram, Facebook), hashtags, and SVG card templates.
3. **Campaign Step:** Validates character constraints, scans and strips brand `donts` banned words, schedules spacing algorithm (>= 2h between posts on same channel), generates Resvg PNG images, and inserts posts into `in_review`.

---

### 2.3 Scheduler & Concurrency Lock (`SKIP LOCKED`) (F6)
The scheduler processes due publishing jobs using Postgres row-level locking:

1. **Job Selection:** Executes `SELECT * FROM publish_jobs WHERE status = 'queued' AND next_attempt_at <= NOW() FOR UPDATE SKIP LOCKED LIMIT 10`.
2. **Worker Isolation:** Concurrent workers automatically skip locked rows without deadlock or duplicate execution.
3. **Idempotency Guarantee:** Jobs enforce a composite idempotency key `${postId}:${version}:${provider}`.
4. **Retry Backoff:** Failures classified as `TEMPORARY` or `RATE_LIMITED` schedule a retry using exponential backoff with full jitter:
   $$t_{\text{wait}} = \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}} \pm \text{jitter})$$

---

## 3. Multi-Tenancy & Workspace Isolation (F1)

BrandPilot delivers instant, zero-login onboarding with strict tenant isolation:
- **Anonymous Session:** Generates a cryptographically random UUID v4 on first hit stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`brandpilot_workspace_id`).
- **Repository Boundary:** All database operations execute through a scoped repository layer that automatically binds `WHERE workspace_id = :workspaceId` across all 15 relational tables.
- **Data Lifecycle (TTL):** Inactive workspaces are automatically purged after 7 days via database cascading deletion (`ON DELETE CASCADE`), leaving zero orphaned rows.

---

## 4. Security & Guardrails

### 4.1 Strict SSRF Guard (F2)
All external URL requests (e.g., Brand Kit scraping) pass through a hardened fetch client:
- **IP Range Disallowlist:** Resolves DNS before connection and rejects private RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), and cloud metadata services (`169.254.169.254`).
- **Redirect Re-Resolution:** Re-validates the IP blocklist on every HTTP redirect (up to 3 hops maximum).
- **Protocol Restriction:** Enforces `http:` or `https:` protocols only.

### 4.2 Webhook Verification & Replay Protection (F8)
Incoming webhooks require HMAC-SHA256 signature verification:
- Computes signature over the raw unparsed request buffer using the endpoint secret.
- Constant-time comparison via `crypto.timingSafeEqual` prevents timing attacks.
- Enforces a 5-minute timestamp freshness window to eliminate replay attacks.

---

## 5. Resilient LLM Hierarchy & 100% Offline Guarantee (F11, F10)

BrandPilot ensures uninterrupted operation in any deployment scenario:

```
┌──────────────────────────────────────────────┐
│             ResilientLlmProvider             │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│  Gemini LLM  ││   Fallback   ││ FakeProvider │
│ (Live API)   ││(Deterministic││ (Test Suite) │
│              ││   Offline)   ││              │
└──────────────┘└──────────────┘└──────────────┘
```

- **Live Mode:** Connects to Google Gemini API when `GEMINI_API_KEY` is configured.
- **Budget & Rate Limit:** Enforces daily call quotas via `llm_usage` and sliding-window rate limits via `rate_limit_counters`.
- **Offline Fallback Guarantee:** When unconfigured, rate-limited, or quota-exhausted, the system seamlessly transitions to the `FallbackProvider`, synthesizing high-quality on-brand marketing copy and SVG cards deterministically with zero external network requests.
