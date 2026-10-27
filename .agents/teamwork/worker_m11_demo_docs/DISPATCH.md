## 2026-10-27T09:15:43Z
You are worker_m11_demo_docs, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M11 (Feature F10): Home Page, 100% Offline One-Click Demo, Documentation & WCAG AA Accessibility.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/app/globals.css`, `src/components/layout/app-shell.tsx`, `src/server/workspace/workspace-service.ts`, `src/server/llm/fallback-provider.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m11_demo_docs

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/app/(workspace)/page.tsx`
- `src/components/demo/**` (`one-click-demo-stepper.tsx`, `hero.tsx`, `explainer.tsx`, `stack-breakdown.tsx`, `footer-disclaimer.tsx`, etc.)
- `docs/architecture.md`
- `docs/decisions.md`
- `docs/review-log.md`
- `README.md`
- `tests/unit/f10-home-demo.test.ts` (or accessibility / demo unit tests)

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F10-01: Home page landing experience:
   - Hero section with URL input, example brand chips (e.g. Acme SaaS, DevFlow, CoffeeCo), and a prominent "Load Sample Brand Kit" button.
   - Interactive One-Click Demo Stepper that visually guides the user through the 4-step autonomous marketing loop:
     1. Brand Extraction -> 2. Agent Run -> 3. Human Approval -> 4. Publish / Scheduled.
2. AC-F10-02: 100% Offline Demo Guarantee:
   - Clicking "Run One-Click Demo" executes the full workflow (loads built-in sample brand kit, triggers agent run via FallbackProvider, generates posts in `in_review`, approves posts, and schedules/publishes to sandbox connector) in under 3 minutes with zero network calls and zero external API keys!
   - Must handle offline/unconfigured environments gracefully with informative UI banners.
3. AC-F10-03: Mandatory portfolio disclaimer in the footer:
   "BrandPilot is an open-source demonstration platform for autonomous AI marketing agents. Built by [Author] as a production-grade portfolio project." with a link to the GitHub repository.
4. AC-F10-04: Explainer section ("How it works") and technology stack breakdown detailing Next.js, Drizzle, Neon, Resvg, and Gemini.
5. AC-F10-05: Comprehensive, production-grade `README.md`:
   - Feature summary, architecture diagram, offline demo instructions, local setup, test commands (`pnpm test`, `pnpm test:e2e`), and environment variable reference.
6. AC-F10-06: Documentation package:
   - `docs/architecture.md`: In-depth breakdown of state machines (BrandKit, ContentAgent, PostStatus, Scheduler, Webhooks), multi-tenancy workspace isolation, SSRF security, and LLM fallback strategy.
   - `docs/decisions.md`: Architecture Decision Records (ADRs) explaining key tradeoffs (Drizzle vs Prisma, Resvg vs headless Chrome, Resilient LLM hierarchy, cookie workspace isolation).
   - `docs/review-log.md`: PRD Section 11 review gate compliance log for all milestones F0 through F11, completed with "Open items: none".
7. AC-F10-07: Dynamic metadata, Open Graph cards, favicon, and semantic HTML tags.
8. AC-F10-08: WCAG AA Accessibility verification across all pages:
   - Contrast ratio >= 4.5:1 for all text.
   - Visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-accent`).
   - Semantic HTML, proper ARIA labels, and keyboard navigability.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Semantic tokens only: no hardcoded hex values in UI components. Use CSS variables (`var(--bg)`, `var(--text)`, `var(--border)`, `var(--accent)`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run f0- f1- f2- f3- f4- f5- f6- f7- f8- f9- f11-`
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m11_demo_docs\handoff.md` and send a message back.
