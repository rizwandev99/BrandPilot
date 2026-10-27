# Architecture Decision Records (ADRs)

This document records the architectural and design decisions made for BrandPilot, following the standard ADR structure (Context, Decision, Consequences, and Alternatives Considered).

---

## ADR-001: Drizzle ORM over Prisma for Relational Persistence

### Context
BrandPilot requires a type-safe relational database layer interacting with Neon Postgres (serverless connection pooling and direct connection for migrations). The database contains 15 interconnected tables with cascading foreign keys, complex JSON columns, and high-frequency concurrency locks.

### Decision
We adopted **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) as the primary ORM instead of Prisma.

### Consequences
- **Positive:**
  - Zero heavy binary engines: eliminates slow cold-starts and large bundle sizes in Next.js Server Components.
  - Native SQL dialect: seamless support for Postgres-specific features like `FOR UPDATE SKIP LOCKED` and connection pooling via `@neondatabase/serverless`.
  - Superior type inference: schema types (`$inferSelect`, `$inferInsert`) map directly to TypeScript types without code-generation sync delays.
- **Negative:**
  - Manual relationship querying syntax compared to Prisma's nested `include`.

### Alternatives Considered
- *Prisma ORM*: Rejected due to high engine binary overhead, cold-start latency in serverless environments, and slower DDL generation.

---

## ADR-002: Resvg Server-Side Rendering over Headless Chrome for Branded Cards

### Context
Marketing campaigns require branded visual assets (1200x630 Open Graph cards, square Instagram visuals). Running headless Chrome (Puppeteer or Playwright) in production introduces significant memory footprints (300MB+ per instance), process startup latency (>1.5s), and fragile container dependencies.

### Decision
We adopted **Resvg** (`@resvg/resvg-js`) to render SVG templates to PNG directly in Node.js server routes.

### Consequences
- **Positive:**
  - Sub-50ms rendering performance: SVG strings are compiled to high-DPI PNGs in native Rust bindings.
  - Minimal memory footprint: less than 15MB overhead under concurrent load.
  - 100% deterministic: pixel-perfect SVG typography and geometric layout across all environments.
  - Zero external AI image API costs or rate-limit failures.
- **Negative:**
  - Complex CSS layout features (e.g. CSS Grid) are limited in SVG; layouts use SVG `<foreignObject>` or flexbox calculations.

### Alternatives Considered
- *Puppeteer / Chromium*: Rejected due to resource bloat, cold-start times, and serverless bundle size limits.
- *External AI Image Generators (DALL-E, Midjourney)*: Rejected due to API latency, unpredictable brand adherence, and cost per post.

---

## ADR-003: Multi-Tiered Resilient LLM Hierarchy & Offline Demo Guarantee

### Context
Social media copy generation and Brand Kit synthesis rely on Large Language Models (LLMs). Production deployments face external network outages, rate limits (HTTP 429), API quota exhaustion, and local development environments without configured credentials.

### Decision
We engineered a resilient 3-tiered provider pattern (`ResilientLlmProvider`):
1. **Primary (`GeminiProvider`):** Google Gemini 1.5 Flash when `GEMINI_API_KEY` is present and budget is available.
2. **Fallback (`FallbackProvider`):** Deterministic fact-based synthesis utilizing Cheerio extracted facts and heuristics with WCAG AA contrast adjustments.
3. **Fake (`FakeProvider`):** Deterministic mock provider utilized in unit and contract test suites.

### Consequences
- **Positive:**
  - 100% offline demonstration guarantee: the entire platform runs out-of-the-box without network calls or API keys.
  - Zero unhandled exceptions: automatic transition on HTTP 429, timeouts, or missing keys.
  - 24-hour SHA-256 caching in `llm_cache` drastically reduces token usage.
- **Negative:**
  - Deterministic fallback copy is less creative than LLM output, though always on-brand and structurally valid.

---

## ADR-004: Anonymous HttpOnly Cookie Workspace Isolation

### Context
BrandPilot targets frictionless evaluation by developers, investors, and potential users. Requiring user sign-up or OAuth authentication before testing creates onboarding friction. However, multi-user isolation must still be rigorously enforced.

### Decision
We implemented an **Anonymous Workspace Architecture**:
- Each visitor receives a cryptographically secure UUID v4 session token via an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
- All database queries are scoped via a repository boundary to the active workspace ID.
- Workspaces and all associated resources are purged after 7 days of inactivity via automated TTL cleanup.

### Consequences
- **Positive:**
  - Instant zero-click onboarding: landing page immediately functions without forms or credentials.
  - Complete data privacy: workspaces cannot read or mutate entities belonging to other cookies.
  - Clean database hygiene: cascading deletions remove abandoned demo data.
- **Negative:**
  - Clearing browser cookies starts a new workspace session unless exported.

---

## ADR-005: Postgres SKIP LOCKED Concurrency over Redis / External Queues

### Context
Social post publishing requires background job scheduling with at-least-once delivery, retry backoff with jitter, and protection against duplicate concurrent dispatch.

### Decision
We implemented background publish scheduling using Postgres `FOR UPDATE SKIP LOCKED` inside Neon Postgres rather than introducing Redis or BullMQ.

### Consequences
- **Positive:**
  - Zero additional infrastructure: eliminates Redis hosting, connection management, and VPC peering complexity.
  - Strong ACID guarantees: job status transitions, post updates, and event logging commit atomically in a single transaction.
  - High concurrency throughput: worker processes lock distinct rows without contention.
- **Negative:**
  - Polling interval overhead via cron (`/api/publish/run-due`).

---

## ADR-006: Tailwind Semantic CSS Variable Design Tokens

### Context
The user interface requires dual light and dark theme support, strict WCAG AA contrast (minimum 4.5:1 for normal text), and visual consistency without Flash of Unstyled Content (FOUC).

### Decision
We configured Tailwind CSS to bind entirely to semantic CSS variables (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-soft`, `--on-accent`, `--success`, `--warning`, `--danger`).

### Consequences
- **Positive:**
  - Seamless theme toggling with zero FOUC using `next-themes`.
  - Zero hardcoded hex values in component code.
  - Enforced accessibility compliance with verified contrast ratios across both modes.
