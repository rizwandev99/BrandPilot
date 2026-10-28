# Project Memory & Guidelines

<!-- === ZONE 1: USER-OWNED (DO NOT MODIFY BY AGENT) === -->
## Project Overview & Directives
BrandPilot (PostPilot) is an autonomous AI marketing agent platform for multi-channel social media management.
Core capabilities:
- Website URL to structured Brand Kit extraction (Cheerio facts scraper + Gemini LLM / deterministic fallback) with SSRF guard and WCAG AA contrast adjustment.
- 3-step content agent pipeline (idea -> creative -> campaign) producing multi-channel captions, hashtags, and SVG->PNG branded image cards via Resvg without external AI image services.
- Multi-provider connector framework (LinkedIn, Instagram, X, Facebook) with sandbox failure simulator and optional live LinkedIn OAuth adapter.
- Human-in-the-loop approval queue and content calendar with strict post status state machine.
- Idempotent concurrency scheduler with Postgres `SKIP LOCKED`, exponential backoff with jitter, and cron route.
- HMAC-SHA256 verified webhooks (raw body verification, replay protection) and trigger-condition-action rule automation engine.
- Anonymous workspace data isolation via HttpOnly cookies (no login required, 7-day TTL cleanup).
- 100% offline one-click demo guarantee via deterministic fallback provider.

<!-- === ZONE 2: AGENT-MAINTAINED (UPDATED BY AGENT) === -->
## Architecture & Active Context
### Key Architectural Decisions
- Next.js App Router with TypeScript strict mode (`noImplicitAny: true`, `strictNullChecks: true`).
- Neon Postgres with Drizzle ORM (15 relational tables with cascading foreign keys).
- Tailwind CSS with semantic CSS variables (`--bg`, `--surface`, `--accent`, `--border`) supporting light and dark themes without FOUC.
- Modular server architecture: scoped repository enforcing `workspaceId` boundary on all queries.

### Technical Gotchas & Traps
- Neon serverless connection pooling: use pooled `DATABASE_URL` for web requests and direct `DATABASE_URL_UNPOOLED` for migrations.
- Always use constant-time comparison (`crypto.timingSafeEqual`) for HMAC webhook verification over raw request buffers.
- Offline demo guarantee: `FallbackProvider` and sample brand kit must execute without network calls or external API keys.

### Active Milestone & Next Steps
- Status: Project 100% Complete & Certified in Production.
- All milestones M0–M12 verified and passed review gates with "Open items: none". 406/406 automated tests passing with 0 type errors and 0 lint warnings.
- Production Deployment: Successfully deployed to Vercel with Neon Postgres production database credentials configured (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CRON_SECRET`).
- Third-Party AI Integrations: Live Gemini API key configured (`GEMINI_API_KEY`), enabling real-time LLM extraction and copy generation alongside the deterministic fallback safety net.
- Remaining Optional Items: Live LinkedIn OAuth credentials (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `ENABLE_LIVE_LINKEDIN=true`) if personal LinkedIn profile live posting is desired, and Playwright E2E suite (`pnpm test:e2e`).
