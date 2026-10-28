# Scope: BrandPilot Production-Grade Modernization

## Architecture
- Framework: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS with semantic tokens.
- Live Extraction & Scraping: Cheerio HTML parsing with SSRF protection (guarding private/loopback/metadata IPs).
- AI Pipeline: Gemini 2.5 Flash API with enterprise SLA fallback resilience (FallbackProvider).
- Vector Card Rendering: Resvg SVG->PNG dynamic branded image generation.
- Publishing Connectors: Safe Developer Sandboxes & Live LinkedIn OAuth adapter.
- Storage: Neon Postgres with Drizzle ORM, anonymous cookie workspace isolation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Production Landing Page & Hero Modernization | Rebrand all "100% offline guarantee" to enterprise high-availability SLA messaging; make live website URL input the primary hero CTA; rebrand sample demo into "Quick Start Templates". | M1 | ORIGINAL_REQUEST R1, R2 |
| 2 | Navigation & AppShell Copy Modernization | Modernize sidebar, navigation items, tooltips, and badges across workspace views to eliminate mock/demo references (e.g. "Reset Workspace" instead of "Reset Demo"). | M1 | ORIGINAL_REQUEST R1 |
| 3 | Brand Kit & Content Agent Presentation | Frame live URL extraction as primary CTA, rebrand sample brand kits to Quick Start Templates, format provider status badges as "Live Gemini 2.5 Flash" / "High-Availability Engine (SLA Fallback)". | M1 | ORIGINAL_REQUEST R1, R2 |
| 4 | Safe Developer Sandboxes & Connector UI | Present social platform connectors as industry-standard safe developer sandboxes (like Stripe/PayPal) alongside live OAuth; frame simulated failures as chaos resilience testing. | M2 | ORIGINAL_REQUEST R2 |
| 5 | Provider & SLA Resilience Messaging | Reframe fallback provider and graceful degradation as enterprise SLA protection & business continuity rather than offline mock mode. Highlight live Cheerio + SSRF, live Gemini, dynamic Resvg. | M2 | ORIGINAL_REQUEST R2 |
| 6 | Test Suite Assertion Updates & 100% Verification | Synchronize unit, integration, and E2E test assertions with modernized copy; verify all 406+ tests pass with 0 errors, 0 type errors, 0 lint warnings. | M3 | ORIGINAL_REQUEST R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI & Onboarding Modernization + Baseline Tests | Landing page, Hero, Stepper, Sidebar, Brand Kit, Agent onboarding, and synchronized unit/e2e assertions (`f0-app-shell`, `f10-home-demo`, `02-home-demo`, `03-brand-kit`) | none | DONE |
| M2 | Connectors, Safe Developer Sandboxes & Provider Messaging | Connectors page, ConnectorCard, FailureSimulatorModal, Explainer, Webhooks UI, StackBreakdown | M1 | IN_PROGRESS |
| M3 | Full Verification Suite & Production Gate | `pnpm test` (406+ tests), `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` execution, 2 Reviewers, 2 Challengers, and Forensic Auditor | M1, M2 | PLANNED |

## Interface Contracts
- All UI routes (`/`, `/brand-kit`, `/runs`, `/queue`, `/calendar`, `/connectors`, `/webhooks`) remain strictly functional and accessible.
- Primary CTA on `/` triggers live URL extraction (`/api/brand-kit/extract`) with smooth fallback to Quick Start Templates.
- Test suites (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`) maintain 100% pass rate.
