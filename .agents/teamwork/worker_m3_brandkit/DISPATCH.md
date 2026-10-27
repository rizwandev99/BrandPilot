## 2026-10-27T08:03:04Z
You are worker_m3_brandkit (role: Brand Kit Agent & SSRF Security Specialist).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m3_brandkit
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- `src/server/security/ssrf.ts`
- `src/server/scraper/facts-extractor.ts`
- `src/lib/color-contrast.ts`
- `src/lib/validation/brand-kit.ts`
- `src/app/api/brand-kits/route.ts`
- `src/app/api/brand-kits/[id]/route.ts`

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and Spec Miner 2 handoff.
2. Implement `src/server/security/ssrf.ts`:
   - Strict SSRF protection: reject non-http(s) schemes. Resolve DNS via `dns.promises.lookup({ all: true })`. Reject loopback (`127.0.0.0/8`, `::1`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), carrier-grade NAT (`100.64.0.0/10`), and cloud metadata (`169.254.169.254`).
   - Check redirects: disable automatic redirect following; on 3xx check Location header, re-resolve DNS, re-validate IP (max 3 redirects).
   - Enforce 2MB response size limit and 8000ms timeout abort. Return `SSRF_BLOCKED` or `UPSTREAM_ERROR` (AC-F2-02, AC-F2-03).
3. Implement `src/lib/color-contrast.ts`:
   - Hex color parser and validator. WCAG 2.1 relative luminance calculation. Contrast ratio formula `(L1 + 0.05) / (L2 + 0.05)`.
   - Automated adjustment: if text/background contrast < 4.5:1, adjust text luminance towards black or white until contrast >= 4.5:1 (AC-F2-05).
4. Implement `src/server/scraper/facts-extractor.ts`:
   - Fetches HTML using SSRF client. Cheerio extraction of title, meta description, OG tags, headings, visible text sample, and theme-color (AC-F2-01).
5. Implement `src/lib/validation/brand-kit.ts`:
   - Zod schemas for BrandKit, BrandColors, CreateBrandKitRequest, PatchBrandKitRequest (AC-F2-01, AC-F2-04, AC-F2-08).
6. Implement API routes:
   - `POST /api/brand-kits`: Handles `{ sample: true }` (instant sample brand with zero network/AI calls, AC-F2-06), URL scraping with SSRF guard, LLM generation with Zod validation + repair prompt + fallback, 24h caching in `llm_cache` (AC-F2-01, AC-F2-04, AC-F2-07).
   - `GET /api/brand-kits/[id]`: Returns brand kit scoped to workspace.
   - `PATCH /api/brand-kits/[id]`: Edits brand kit fields with validation (inline errors on invalid hex or empty name, AC-F2-08).
7. Run targeted tests:
   `pnpm vitest run tests/unit/f2-ssrf-guard.test.ts tests/unit/f2-color-contrast.test.ts tests/integration/f2-brand-kits-api.test.ts`
   Ensure all tests turn GREEN with 0 errors. Run `pnpm typecheck`.
8. Write `handoff.md` in your working directory and message the orchestrator.
