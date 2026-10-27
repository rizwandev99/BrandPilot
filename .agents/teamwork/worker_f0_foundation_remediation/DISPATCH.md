## 2026-10-27T08:15:00Z
You are worker_f0_foundation_remediation (role: Full-Stack Remediation Worker for M0 Foundation).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_f0_foundation_remediation
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Reviewer 2 Findings Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\reviewer_m0_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/top-bar.tsx`
- `src/app/api/health/route.ts`
- `src/app/globals.css`
- `tests/unit/f0-app-shell.test.ts`
- `tests/unit/f0-ci-workflow.test.ts`

TASKS:
1. Read reviewer_m0_2/handoff.md carefully.
2. Implement responsive App Shell components in `src/components/layout/` (`app-shell.tsx`, `sidebar.tsx`, `top-bar.tsx`) with left sidebar, top bar, content area, theme toggle, and mobile collapsible layout (AC-F0-06). Use Radix UI / Lucide icons and semantic CSS tokens.
3. Write `tests/unit/f0-app-shell.test.ts` verifying AC-F0-06 (sidebar, topbar, mobile responsiveness, navigation links).
4. Write `tests/unit/f0-ci-workflow.test.ts` verifying AC-F0-07 (verifies `.github/workflows/ci.yml` steps for lint, typecheck, test).
5. Fix `src/app/api/health/route.ts`: sanitize error message before `console.error()` by redacting connection strings / passwords (`error.message.replace(/postgres:\/\/[^:]+:[^@]+@/gi, 'postgres://[REDACTED]@[REDACTED]')`) so server stderr never leaks credentials.
6. Fix `src/app/globals.css`: change `:root` `--text-faint` from `#9A9AA5` to `#71717A` so contrast ratio against `--bg: #FAFAFB` is 4.62:1 (>= 4.5:1, passing WCAG AA).
7. Run verification commands:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm vitest run f0-`
   Ensure all F0 test suites pass with 0 errors.
8. Write `handoff.md` in your working directory and message the orchestrator.
