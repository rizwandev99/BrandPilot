## 2026-10-27T07:34:41Z
You are worker_f0_foundation (role: Full-Stack Architect & Foundation Worker).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_f0_foundation
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own root configuration files (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `.env.example`, `.github/workflows/ci.yml`), `src/app/layout.tsx`, `src/app/globals.css`, `src/app/api/health/route.ts`, `src/server/db/schema.ts`, `src/server/db/index.ts`, and `drizzle/` migrations.

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and Spec Miner 1 handoff.
2. Initialize production-grade Next.js App Router project in TypeScript strict mode at project root:
   - Configure root `package.json` with scripts: `lint`, `typecheck`, `test`, `test:e2e`, `dev`, `build`, `start`, `db:generate`, `db:migrate`, `db:push`.
   - Install all required dependencies using `pnpm add`:
     `next react react-dom next-themes lucide-react clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-switch`
     `drizzle-orm @neondatabase/serverless postgres zod cheerio @resvg/resvg-js @google/genai`
   - Dev dependencies: `typescript @types/node @types/react @types/react-dom @types/pg tailwindcss postcss autoprefixer drizzle-kit vitest @vitejs/plugin-react @playwright/test eslint eslint-config-next`
3. Configure `tsconfig.json` with `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, paths mapping `@/*` to `./src/*`.
4. Configure Tailwind CSS with CSS variable design tokens in `src/app/globals.css` (clean Linear-grade styling, slate/zinc neutrals, semantic tokens for `--bg`, `--surface`, `--accent`, `--border`, light and dark theme classes).
5. Implement `src/app/layout.tsx` with Inter font, `ThemeProvider` (`next-themes`, `attribute="class"`, `suppressHydrationWarning`), and root metadata.
6. Implement `src/server/db/schema.ts` with all 15 relational tables exactly as defined in Spec Miner 1 §6 (workspaces, brand_kits, agent_runs, agent_run_steps, posts, connectors, publish_jobs, incoming_endpoints, outgoing_webhooks, events, automations, automation_runs, rate_limit_counters, llm_usage, llm_cache).
7. Implement `src/server/db/index.ts` initializing Drizzle ORM client connecting to `process.env.DATABASE_URL` (with fallback mock/sqlite support or neon serverless connection wrapper).
8. Run `pnpm drizzle-kit generate` to generate migration SQL in `drizzle/`.
9. Implement `GET /api/health` in `src/app/api/health/route.ts` checking DB connectivity (`SELECT 1`), returning 200 `{ ok: true, db: true }` or 503 `{ ok: false, db: false }`.
10. Create `.env.example` with all 12 env variables.
11. Create `.github/workflows/ci.yml`.
12. Verify implementation: run `pnpm typecheck` and `pnpm lint`. Ensure 0 errors.
13. Write self-contained `handoff.md` in your working directory summarizing: Observation, Logic Chain, Files Created, Verification Commands & Output. Include pass verdict.
