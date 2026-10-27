## 2026-10-27T08:03:04Z
You are worker_m4_connectors (role: Connector Framework & Social Publishing Specialist).
Your working directory is: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\worker_m4_connectors
Project Root: c:\Users\rizwan\Desktop\projects\BrandPilot
Original Request Path: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md Path: c:\Users\rizwan\Desktop\projects\BrandPilot\PROJECT.md
Spec Miner Handoff: c:\Users\rizwan\Desktop\projects\BrandPilot\.agents\teamwork\teamwork_preview_spec_miner_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
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

TASKS:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and Spec Miner 3 handoff.
2. Implement `src/lib/connectors/types.ts`:
   - `SocialProvider` ('linkedin' | 'instagram' | 'x' | 'facebook'), `ConnectorMode` ('sandbox' | 'live'), `ConnectorStatus` ('connected' | 'disconnected' | 'needs_reconnect' | 'error').
   - `ConnectorCapabilities`, `PublishInput`, `PublishResult`, `ConnectorErrorCode` ('AUTH_EXPIRED' | 'RATE_LIMITED' | 'INVALID_CONTENT' | 'TEMPORARY' | 'PERMANENT'), `ConnectorError`, and `Connector` interface (AC-F4-01, AC-F4-02).
3. Implement `src/lib/security/aes-gcm.ts`:
   - AES-256-GCM token encryption and decryption at rest using `ENCRYPTION_KEY`. Generates random 12-byte IV for every encryption. Tamper detection on ciphertext, IV, and auth tag (AC-F4-06).
4. Implement `src/lib/connectors/base-sandbox.adapter.ts` & sandbox adapters:
   - Configurable failure simulation: `none`, `temporary` (500), `rate_limit` (429 with Retry-After), `permanent` (400), `auth_expired` (401).
   - Idempotency support: identical `idempotencyKey` returns previous `externalId` without duplicating publish (AC-F4-02, AC-F4-03).
   - Adapters for LinkedIn, X, Instagram, Facebook (AC-F4-01..03, AC-F4-09).
5. Implement `src/lib/connectors/adapters/linkedin-live.ts`:
   - LinkedIn Posts API integration with `w_member_social`. State verification on OAuth callback. Gated by `ENABLE_LIVE_LINKEDIN=true` (AC-F4-05, AC-F4-06, AC-F4-07).
6. Implement `src/lib/connectors/registry.ts`:
   - Central registry for connector lookup by provider and mode (AC-F4-01, AC-F4-09).
7. Implement API routes:
   - `GET /api/connectors`: Lists all 4 connectors for workspace with status and mode (AC-F7-01).
   - `POST /api/connectors/[provider]/connect`: Connects connector.
   - `POST /api/connectors/[provider]/disconnect`: Disconnects connector.
   - `POST /api/connectors/[provider]/health`: Runs health check returning latency and status (AC-F7-02).
   - `PATCH /api/connectors/[provider]/settings`: Configures simulation failures (AC-F7-03).
   - `GET /api/connectors/linkedin/callback`: OAuth callback handler.
8. Run targeted tests:
   `pnpm vitest run tests/unit/f4-connector-contract.test.ts tests/unit/f4-token-encryption.test.ts tests/integration/f7-connectors-api.test.ts`
   Ensure all tests turn GREEN with 0 errors. Run `pnpm typecheck`.
9. Write `handoff.md` in your working directory and message the orchestrator.
