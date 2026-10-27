## 2026-10-27T08:35:31Z
You are worker_m5_content, a high-precision implementation specialist for BrandPilot.
Your mission is to implement M5 (Feature F3): Content Agent Pipeline & Branded Image Cards.

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- Existing code: `src/server/db/schema.ts`, `src/server/workspace/workspace-service.ts`, `src/server/llm/interface.ts`, `src/server/llm/fallback-provider.ts`

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m5_content

EXCLUSIVE FILE OWNERSHIP:
You own and write ONLY to these files (do NOT touch other files):
- `src/server/agents/run-orchestrator.ts`
- `src/server/agents/idea-step.ts`
- `src/server/agents/creative-step.ts`
- `src/server/agents/campaign-step.ts`
- `src/server/agents/schedule-planner.ts`
- `src/server/creatives/card-renderer.ts`
- `src/server/creatives/templates/minimal-quote.ts`
- `src/server/creatives/templates/feature-card.ts`
- `src/server/creatives/templates/editorial-tip.ts`
- `src/lib/channels.ts`
- `src/lib/banned-words.ts`
- `src/app/api/runs/route.ts`
- `src/app/api/runs/[id]/route.ts`
- `src/app/api/runs/[id]/retry/route.ts`
- `src/app/api/creatives/[postId].png/route.ts`
- `src/app/(workspace)/agent/page.tsx` (or supporting agent UI components in `src/components/agent/` if needed)

REQUIREMENTS & ACCEPTANCE CRITERIA:
1. AC-F3-01: 3-step state machine (`idea` -> `creative` -> `campaign`) storing step logs and provider in database `agent_runs` and `agent_run_steps`.
2. AC-F3-02: Step logging: inputs, outputs, timestamps, and provider name ('gemini', 'fallback', or 'fake').
3. AC-F3-03: Idempotent step execution: if a step is already complete, reuse output unless explicitly retrying.
4. AC-F3-04: Channel limit enforcement (`src/lib/channels.ts`):
   - LinkedIn: 3000 chars, no max hashtags
   - X: 280 chars, no max hashtags
   - Instagram: 2200 chars, max 30 hashtags
   - Facebook: 5000 chars
   Validate captions and hashtags per channel.
5. AC-F3-05: Banned word filtering (`src/lib/banned-words.ts`): scan copy against brand kit `donts` / negative keywords and strip or flag them.
6. AC-F3-06 & AC-F3-07: Resvg SVG->PNG card renderer (`src/server/creatives/card-renderer.ts`, `/api/creatives/[postId].png/route.ts`) using `@resvg/resvg-js`. Implement 3+ distinct templates:
   - `minimal-quote`
   - `feature-card`
   - `editorial-tip`
   Must output valid image/png buffer with brand colors and fonts.
7. AC-F3-09: Schedule planner (`src/server/agents/schedule-planner.ts`): spreads generated posts across 7 days, maintaining at least 2 hours spacing between posts on the same channel.
8. AC-F3-10 & AC-F3-11: Agent runs API (`POST /api/runs`, `GET /api/runs/:id`, `POST /api/runs/:id/retry`): retry step handler that updates run status and resumes pipeline.
9. Offline guarantee: Seamlessly work with `FallbackProvider` and sample brand kit when Gemini API key is absent.

STRICT CODE CONSTRAINTS:
- ZERO uncommented `any`. If you ever need `any`, add `// intentional any: <reason>`. Use strict TypeScript types.
- Multi-tenancy: always scope queries using `withWorkspace(workspaceId, ...)` or scoped repository.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION:
Run and verify with 0 errors:
- `pnpm vitest run f3-` (runs all unit & integration tests for F3: `f3-channel-validation.test.ts`, `f3-banned-words.test.ts`, `f3-schedule-planner.test.ts`, `f3-agent-runs-api.test.ts`, `f3-creatives-png-api.test.ts`)
- `pnpm typecheck`
- `pnpm lint`

When done, write your report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m5_content\handoff.md` and send a message back.
