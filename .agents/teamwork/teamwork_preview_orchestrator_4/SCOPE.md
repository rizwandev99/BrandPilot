# Scope: BrandPilot Production-Grade Modernization

## Architecture
- Framework: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS with semantic tokens.
- Live Extraction & Scraping: Cheerio HTML parsing with SSRF protection (guarding private/loopback/metadata IPs).
- AI Pipeline: Gemini API integration with enterprise fallback resilience (FallbackProvider).
- Vector Card Rendering: Resvg SVG->PNG dynamic branded image generation.
- Publishing Connectors: Sandbox adapters (safe developer sandboxes) & Live LinkedIn OAuth adapter.
- Storage: Neon Postgres with Drizzle ORM, anonymous cookie workspace isolation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Production Landing Page & Hero Modernization | Rebrand all "100% offline guarantee" to enterprise high-availability SLA messaging; make live website URL input the primary hero CTA; rebrand sample demo into "Quick Start Templates". | M1 | ORIGINAL_REQUEST R1, R2 |
| 2 | Navigation & AppShell Copy Modernization | Modernize sidebar, navigation items, tooltips, and badges across workspace views to eliminate mock/demo references. | M1 | ORIGINAL_REQUEST R1 |
| 3 | Safe Developer Sandboxes & Connector UI | Present social platform connectors as industry-standard safe developer sandboxes (like Stripe/PayPal) alongside live OAuth; frame simulated failures as resilience testing. | M2 | ORIGINAL_REQUEST R2 |
| 4 | Provider & SLA Resilience Messaging | Reframe fallback provider and graceful degradation as enterprise SLA protection & business continuity rather than offline mock mode. Highlight live Cheerio + SSRF, live Gemini, dynamic Resvg. | M2 | ORIGINAL_REQUEST R2 |
| 5 | Test Suite Assertion Updates & Verification | Update unit, integration, and E2E test assertions to match modernized copy; verify all 406+ tests pass with 0 errors and 0 warnings. | M3 | ORIGINAL_REQUEST R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI & Onboarding Copy Modernization | Landing page, Hero, Navigation, Brand Kit onboarding | none | PLANNED |
| M2 | Connectors & Enterprise Resilience Messaging | Connectors page, sandbox modals, provider status badges, SLA resilience framing | M1 | PLANNED |
| M3 | Test Suite Alignment & 100% Verification | Update test assertions across unit/integration/E2E suites, verify `pnpm test`, `pnpm typecheck`, `pnpm lint` pass cleanly | M1, M2 | PLANNED |

## Interface Contracts
- All UI routes (`/`, `/brand-kit`, `/runs`, `/queue`, `/calendar`, `/connectors`, `/webhooks`) remain strictly functional and accessible.
- Primary CTA on `/` triggers live URL extraction (`/api/brand-kit/extract`) with smooth fallback to Quick Start Templates.
- Test suites (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`) maintain 100% pass rate.
