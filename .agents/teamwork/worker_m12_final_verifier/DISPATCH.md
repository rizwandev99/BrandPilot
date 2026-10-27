## 2026-10-27T09:47:32Z
You are worker_m12_final_verifier, the Lead Quality & Full-Suite Verification Worker for BrandPilot.
Your mission is to execute the comprehensive verification lifecycle for Milestone M12:

Read the authoritative project files before starting:
- c:\Users\rizwan\Desktop\projects\BrandPilot\ORIGINAL_REQUEST.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_INFRA.md
- c:\Users\rizwan\Desktop\projects\BrandPilot\docs\review-log.md

Your working directory is:
c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m12_final_verifier

VERIFICATION OBJECTIVES:
1. Execute `pnpm test` (or `pnpm vitest run`) across the entire repository. Verify that all 35+ test files pass 100% with 0 failures:
   - F0: `f0-scripts.test.ts`, `f0-health-api.test.ts`, `f0-schema-migrations.test.ts`, `f0-design-tokens-theme.test.ts`, `f0-env-example.test.ts`, `f0-app-shell.test.ts`, `f0-ci-workflow.test.ts`
   - F1: `f1-workspace-service.test.ts`, `f1-workspace-isolation.test.ts`, `f1-workspace-reset.test.ts`, `f1-workspace-ttl.test.ts`
   - F2: `f2-ssrf-guard.test.ts`, `f2-color-contrast.test.ts`, `f2-brand-kits-api.test.ts`
   - F3: `f3-channel-validation.test.ts`, `f3-banned-words.test.ts`, `f3-schedule-planner.test.ts`, `f3-agent-runs-api.test.ts`, `f3-creatives-png-api.test.ts`
   - F4: `f4-connector-contract.test.ts`, `f4-token-encryption.test.ts`
   - F5: `f5-status-machine.test.ts`, `f5-posts-api.test.ts`
   - F6: `f6-retry-policy.test.ts`, `f6-scheduler-concurrency.test.ts`
   - F7: `f7-connectors-api.test.ts`
   - F8: `f8-hmac-signatures.test.ts`, `f8-webhooks-api.test.ts`
   - F9: `f9-automation-engine.test.ts`, `f9-automations-api.test.ts`
   - F10: `f10-home-demo.test.ts`
   - F11: `f11-llm-provider-fallbacks.test.ts`, `f11-daily-budget.test.ts`, `f11-rate-limits.test.ts`, `f11-gemini-concurrency-backoff.test.ts`, `f11-response-cache.test.ts`, `f11-data-caps.test.ts`, `f11-secret-hygiene.test.ts`
2. If any test failure or subtle type error exists between module integrations, resolve it cleanly without compromising architecture or security.
3. In `tests/unit/f0-scripts.test.ts`, ensure the AST scan for uncommented `any` passes cleanly. Every single `any` across the codebase must have `// intentional any: <reason>`.
4. Run `pnpm typecheck` (`tsc --noEmit`) and verify 0 errors.
5. Run `pnpm lint` (`next lint`) and verify 0 warnings or errors.
6. Verify the 100% offline demo guarantee: verify that `POST /api/brand-kits` with `{ sample: true }`, `POST /api/runs`, `POST /api/posts/approve-all`, `POST /api/posts/schedule-approved`, and `POST /api/publish/run-due` can execute in sequence with zero external network calls.
7. Create `c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_READY.md` summarizing the test suites, commands, tier breakdown, and passing status.


## 2026-10-27T10:46:58Z
Server has restarted. Challenger M12 has reported APPROVE (15/15 tests passed), and Forensic Auditor M12 has reported CLEAN (39/39 test files passed, zero integrity violations).
Please complete the remaining M12 steps:
1. Verify `pnpm vitest run --testTimeout=15000` across all test files.
2. Verify `pnpm typecheck` (0 errors) and `pnpm lint` (0 errors).
3. Add `serverExternalPackages: ['@resvg/resvg-js']` to `next.config.ts` if not already present.
4. Verify the 100% offline demo execution sequence (sample brand kit -> agent run -> approve -> schedule -> publish).
5. Generate `c:\Users\rizwan\Desktop\projects\BrandPilot\TEST_READY.md` summarizing the test suites, commands, tier breakdown, and passing status.
6. Write your final handoff report to `c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m12_final_verifier\handoff.md`.
**Action**: Execute these steps and send a message when handoff is delivered.
