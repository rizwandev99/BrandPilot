# BrandPilot

> **Autonomous AI Marketing Agent Platform for Multi-Channel Social Media Management**

BrandPilot is an open-source demonstration platform engineered to convert arbitrary website URLs into structured brand kits, generate multi-channel social media campaigns, render high-resolution branded image cards, enforce a strict human-in-the-loop approval gate, and schedule/publish posts via resilient concurrency schedulers and webhooks.

Built with a **100% Offline Guarantee**: the entire platform runs out-of-the-box with zero external API keys and zero internet access required.

---

## Architecture Diagram

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

## Key Features

1. **Website-to-Brand-Kit Extraction (F2):**
   - High-precision Cheerio fact scraping (title, description, headings, sample copy, theme colors).
   - Strict SSRF guard: validates DNS resolution, rejects loopback, private RFC 1918, link-local, and cloud metadata IPs across all HTTP redirects.
   - Automated WCAG AA contrast adjustment mathematically shifting palette luminance to >= 4.5:1.
   - Built-in instant sample brand kit without network calls.

2. **3-Step Content Agent Pipeline (F3):**
   - Deterministic execution state machine: `idea` -> `creative` -> `campaign`.
   - Strict channel limits enforcement (LinkedIn 3000 chars, X 280 chars, Instagram 2200 chars / 30 hashtags, Facebook 63206 chars).
   - Brand `donts` keyword scanning and filtering.
   - Schedule spacing algorithm ensuring >= 2h intervals between posts on the same channel.
   - Server-side Resvg PNG image card engine compiling branded graphics at `/api/creatives/:postId.png` across 3+ templates without external AI image services.

3. **Human-in-the-Loop Approval Queue & Calendar (F5):**
   - Pure post status state machine: `draft` -> `in_review` -> `approved` | `held` | `rejected`; `approved` -> `scheduled` -> `publishing` -> `published`.
   - Mandatory human approval gate before scheduling or external transmission.
   - Live character counter with warning thresholds; disables saving on overflow.
   - Edit version bumping: editing an approved post increments its version and automatically reverts status to `in_review`.
   - Calendar month grid view with local time mapping.
   - Keyboard triage shortcuts (`A` approve, `H` hold, `E` edit, `?` shortcuts cheat sheet).

4. **Multi-Channel Social Connectors & Simulator (F4, F7):**
   - Unified connector interface with sandbox adapters for LinkedIn, X, Instagram, and Facebook.
   - Configurable failure simulator (inject temporary 500s, rate limits, or expired tokens) to test retry behavior.
   - Optional live LinkedIn OAuth adapter (`w_member_social`) with AES-256-GCM token encryption and safety confirmation guard.

5. **Concurrency Scheduler & Concurrency Lock (F6):**
   - Atomic Postgres row locking via `FOR UPDATE SKIP LOCKED` preventing duplicate job processing.
   - Pure exponential backoff with full jitter and `Retry-After` header adherence for transient failures.
   - Strict idempotency key enforcement (`${postId}:${version}:${provider}`).

6. **Webhooks & Trigger-Condition-Action Automation (F8, F9):**
   - Inbound HMAC-SHA256 signature verification over raw request buffers with constant-time equality check (`crypto.timingSafeEqual`) and 5-minute replay window.
   - Pure automation engine supporting dot-notation nested condition paths, AI/keyword brand checks, and recursion loop depth protection (halts at depth >= 3).
   - Real-time audit event activity feed.

7. **Zero-Login Anonymous Workspace Isolation (F1):**
   - Instant onboarding via cryptographically random UUID v4 stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
   - Scoped database repository boundary enforcing `workspace_id` isolation across all tables.
   - 7-day TTL cleanup cron purging inactive workspace data with cascading foreign key deletion.

---

## 100% Offline Demo Guarantee

BrandPilot is guaranteed to run **100% offline without any external API keys or network calls**:

1. Clone the repository and install dependencies (`pnpm install`).
2. Run database migrations or start the dev server (`pnpm dev`).
3. Open `http://localhost:3000` in your browser.
4. Click **"Run One-Click Demo"** on the home page.
5. In under 60 seconds, the platform will:
   - Load the built-in sample brand kit.
   - Trigger the 3-step agent run via `FallbackProvider` to draft 4 multi-channel posts with Resvg cards.
   - Route posts to the approval queue in `in_review`.
   - Batch-approve the posts through the human review gate.
   - Schedule and execute publish jobs via multi-channel sandbox connectors.

---

## Getting Started

### Prerequisites
- Node.js >= 18.18.0
- pnpm >= 9.0.0
- Neon Postgres database (or local Postgres)

### Installation
```bash
# Clone the repository
git clone https://github.com/rizwan/BrandPilot.git
cd BrandPilot

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection URL for queries | `postgres://user:pass@ep-pooler.neon.tech/brandpilot?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Yes | Direct Postgres connection URL for migrations | `postgres://user:pass@ep.neon.tech/brandpilot?sslmode=require` |
| `GEMINI_API_KEY` | No | Google Gemini API key (optional; fallback active if omitted) | `AIzaSy...` |
| `LLM_DAILY_BUDGET` | No | Daily global LLM call cap before falling back (default: 100) | `100` |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM token encryption | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| `CRON_SECRET` | Yes | Bearer token for authenticating `/api/publish/run-due` | `super_secret_cron_token` |
| `WORKSPACE_TTL_DAYS` | No | Days of inactivity before workspace cleanup (default: 7) | `7` |
| `ENABLE_LIVE_LINKEDIN` | No | Safety flag enabling live LinkedIn publishing (default: false) | `false` |
| `LINKEDIN_CLIENT_ID` | Conditional | LinkedIn Developer App Client ID | `78...` |
| `LINKEDIN_CLIENT_SECRET` | Conditional | LinkedIn Developer App Client Secret | `secret...` |
| `LINKEDIN_REDIRECT_URI` | Conditional | OAuth callback URL | `http://localhost:3000/api/connectors/linkedin/callback` |
| `APP_URL` | No | Base application URL (default: http://localhost:3000) | `http://localhost:3000` |

---

## Verification & Testing Suite

BrandPilot features an exhaustive 4-tier verification test suite with 100% acceptance criteria coverage:

```bash
# Run unit & integration tests
pnpm test

# Run tests in watch mode
pnpm vitest

# Run Playwright end-to-end tests
pnpm test:e2e

# Run TypeScript typecheck
pnpm typecheck

# Run ESLint linter
pnpm lint
```

---

## Documentation Package

- [Architecture & State Machines (`docs/architecture.md`)](./docs/architecture.md): Deep-dive into subsystem state machines, multi-tenant workspace isolation, SSRF security, and LLM fallbacks.
- [Architecture Decision Records (`docs/decisions.md`)](./docs/decisions.md): Tradeoff analyses for Drizzle ORM, Resvg, LLM hierarchies, and cookie isolation.
- [Milestone Review Log (`docs/review-log.md`)](./docs/review-log.md): Formal PRD Section 11 compliance sign-off across all milestones F0–F11 with zero open items.

---

## Portfolio Disclaimer

BrandPilot is an open-source demonstration platform for autonomous AI marketing agents. Built by **Rizwan** as a production-grade portfolio project.

- GitHub Repository: [https://github.com/rizwan/BrandPilot](https://github.com/rizwan/BrandPilot)
- License: MIT
