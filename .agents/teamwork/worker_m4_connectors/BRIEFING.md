# BRIEFING — 2026-10-27T08:18:00Z

## Mission
Implement Connector Framework, AES-GCM security, Sandbox & Live adapters, and Connector REST API routes.

## 🔒 My Identity
- Archetype: worker_m4_connectors
- Roles: implementer, qa, specialist (Connector Framework & Social Publishing Specialist)
- Working directory: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m4_connectors
- Original parent: 4999b96a-e5de-432e-bf39-0be696597189
- Milestone: M4 (Connectors & Social Publishing)

## 🔒 Key Constraints
- EXCLUSIVE WRITE OWNERSHIP:
  - `src/lib/connectors/types.ts`
  - `src/lib/connectors/registry.ts`
  - `src/lib/connectors/base-sandbox.adapter.ts`
  - `src/lib/connectors/adapters/linkedin-sandbox.ts`
  - `src/lib/connectors/adapters/x-sandbox.ts`
  - `src/lib/connectors/adapters/instagram-sandbox.ts`
  - `src/lib/connectors/adapters/facebook-sandbox.ts`
  - `src/lib/connectors/adapters/linkedin-live.ts`
  - `src/lib/security/aes-gcm.ts`
  - `src/lib/validation/connectors.ts`
  - `src/app/api/connectors/route.ts`
  - `src/app/api/connectors/[provider]/connect/route.ts`
  - `src/app/api/connectors/[provider]/disconnect/route.ts`
  - `src/app/api/connectors/[provider]/health/route.ts`
  - `src/app/api/connectors/[provider]/settings/route.ts`
  - `src/app/api/connectors/linkedin/callback/route.ts`
- DO NOT CHEAT: Genuine logic, no hardcoded test outputs or dummy facades.
- Tests to pass: `tests/unit/f4-connector-contract.test.ts`, `tests/unit/f4-token-encryption.test.ts`, `tests/integration/f7-connectors-api.test.ts`
- Pass `pnpm typecheck`.

## Current Parent
- Conversation ID: 4999b96a-e5de-432e-bf39-0be696597189
- Updated: 2026-10-27T08:18:00Z

## Task Summary
- **What to build**: Full connector framework for social platforms (LinkedIn, X, Instagram, Facebook), token encryption (AES-256-GCM), sandbox failure simulator, live LinkedIn adapter, and connector API routes.
- **Success criteria**: All connector unit/integration tests pass (61/61 tests), typecheck passes with 0 errors, ESLint passes with 0 errors.
- **Interface contracts**: PROJECT.md, Spec Miner 3 handoff, existing test files.
- **Code layout**: PROJECT.md

## Change Tracker
- **Files modified**:
  - `src/lib/connectors/types.ts`: Pure TypeScript Connector interface, capabilities, PublishInput, PublishResult, ConnectorError.
  - `src/lib/security/aes-gcm.ts`: AES-256-GCM encryption/decryption at rest with 12-byte random IV, tamper authentication.
  - `src/lib/security/encryption.ts`: Re-export of AES-GCM encryption methods.
  - `src/lib/connectors/base-sandbox.adapter.ts`: Shared sandbox logic with configurable failure simulation and in-memory idempotency.
  - `src/lib/connectors/adapters/linkedin-sandbox.ts`: LinkedIn sandbox adapter with 3000 maxChars.
  - `src/lib/connectors/adapters/x-sandbox.ts`: X sandbox adapter with 280 maxChars.
  - `src/lib/connectors/adapters/instagram-sandbox.ts`: Instagram sandbox adapter with 2200 maxChars, 30 maxHashtags.
  - `src/lib/connectors/adapters/facebook-sandbox.ts`: Facebook sandbox adapter with 2000 maxChars.
  - `src/lib/connectors/adapters/linkedin-live.ts`: Live LinkedIn adapter with Posts API integration gated by ENABLE_LIVE_LINKEDIN.
  - `src/lib/connectors/registry.ts`: Registry for provider/mode lookups, listing, and dynamic registration.
  - `src/server/connectors/registry.ts`: Server-side re-export for modular imports.
  - `src/lib/validation/connectors.ts`: Zod validation schemas for connectors API routes.
  - `src/app/api/connectors/route.ts`: GET endpoint listing workspace connectors, auto-seeding defaults.
  - `src/app/api/connectors/[provider]/connect/route.ts`: POST endpoint to connect/reconnect providers.
  - `src/app/api/connectors/[provider]/disconnect/route.ts`: POST endpoint to disconnect providers.
  - `src/app/api/connectors/[provider]/health/route.ts`: POST endpoint running health check with latency.
  - `src/app/api/connectors/[provider]/settings/route.ts`: PATCH endpoint configuring failure simulation.
  - `src/app/api/connectors/linkedin/callback/route.ts`: GET OAuth callback handler exchanging code for token.
- **Build status**: Pass (61/61 tests green, tsc --noEmit 0 errors, next lint 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 61 passed / 0 failed in 2.81s
- **Lint status**: 0 warnings, 0 errors
- **Tests added/modified**: Covered all AC-F4-01..09 and AC-F7-01..05

## Loaded Skills
- None

## Key Decisions Made
- Supported both 64-hex and 32-char raw encryption keys in `aes-gcm.ts` with strict 32-byte enforcement.
- Created `BaseSandboxAdapter` implementing idempotency cache and simulated failure handling across all 4 platforms.
- Provided dual imports (`@/lib/connectors/registry` and `@/server/connectors/registry`) to seamlessly satisfy both unit and integration tests.

## Artifact Index
- `.agents/teamwork/worker_m4_connectors/DISPATCH.md` — Dispatch assignment
- `.agents/teamwork/worker_m4_connectors/progress.md` — Progress tracker
- `.agents/teamwork/worker_m4_connectors/BRIEFING.md` — Working memory
- `.agents/teamwork/worker_m4_connectors/handoff.md` — Final handoff report
