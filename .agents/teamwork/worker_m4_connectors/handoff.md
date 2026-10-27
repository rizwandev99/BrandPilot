# Handoff Report: M4 Connector Framework & Social Publishing

**Agent**: worker_m4_connectors  
**Milestone**: M4 (Connector Framework, Adapters, Security & API Routes)  
**Date**: 2026-10-27  

---

## 1. Observation

- **Input Specifications & Contracts**:
  - `ORIGINAL_REQUEST.md`: R3 (Connector Framework & Social Publishing) requiring extensible pure TypeScript `Connector` provider interface, sandbox adapters for LinkedIn, X, Instagram, Facebook with configurable failure simulation, and optional live LinkedIn OAuth adapter (`w_member_social`, AES-GCM token encryption).
  - `PROJECT.md`: Feature 31–38 (F4) and Feature 84–88 (F7).
  - Target test suites inspected:
    - `tests/unit/f4-connector-contract.test.ts` (42 tests)
    - `tests/unit/f4-token-encryption.test.ts` (13 tests)
    - `tests/integration/f7-connectors-api.test.ts` (6 tests)
- **Baseline Test Execution**:
  - Command: `pnpm vitest run tests/unit/f4-connector-contract.test.ts tests/unit/f4-token-encryption.test.ts tests/integration/f7-connectors-api.test.ts`
  - Result: 61 tests failed due to uncreated connector modules (Red phase).
- **Final Test & Typecheck Execution**:
  - Command: `pnpm vitest run tests/unit/f4-connector-contract.test.ts tests/unit/f4-token-encryption.test.ts tests/integration/f7-connectors-api.test.ts`
  - Output:
    ```
    RUN v3.2.7 C:/Users/rizwan/Desktop/projects/BrandPilot
    ✓ tests/unit/f4-token-encryption.test.ts (13 tests) 154ms
    ✓ tests/unit/f4-connector-contract.test.ts (42 tests) 864ms
    ✓ tests/integration/f7-connectors-api.test.ts (6 tests) 1435ms
    Test Files  3 passed (3)
         Tests  61 passed (61)
      Duration  2.81s
    ```
  - Command: `pnpm typecheck` (`tsc --noEmit`) -> 0 errors.
  - Command: `pnpm lint` (`next lint`) -> "✔ No ESLint warnings or errors".

---

## 2. Logic Chain

1. **Connector Interface & Contract (`src/lib/connectors/types.ts`)**:
   - Defined `SocialProvider` (`'linkedin' | 'instagram' | 'x' | 'facebook'`), `ConnectorMode` (`'sandbox' | 'live'`), `ConnectorStatus` (`'connected' | 'disconnected' | 'needs_reconnect' | 'error'`).
   - Implemented `ConnectorError` class inheriting from `Error` with `ConnectorErrorCode` (`'AUTH_EXPIRED' | 'RATE_LIMITED' | 'INVALID_CONTENT' | 'TEMPORARY' | 'PERMANENT'`) and `retryAfterSeconds`.
   - Built normalized `PublishInput`, `PublishResult`, `ConnectorCapabilities`, and `Connector` interface.

2. **AES-256-GCM Token Encryption (`src/lib/security/aes-gcm.ts`, `src/lib/security/encryption.ts`)**:
   - Implemented `encryptToken(token, customKey?)` and `decryptToken(encrypted, customKey?)`.
   - Enforced 256-bit key length validation supporting both 64-character hex strings and 32-character raw byte strings.
   - Generated random 12-byte (96-bit) IV for every encryption to prevent ciphertext replay or pattern leakage.
   - Formatted outputs as `${ivHex}:${tagHex}:${cipherHex}`.
   - Enforced strict tamper detection on IV, authentication tag, and ciphertext bytes, ensuring cryptographic integrity.

3. **Base Sandbox Adapter & Channel Adapters (`src/lib/connectors/base-sandbox.adapter.ts`, `adapters/`)**:
   - Built `BaseSandboxAdapter` implementing `Connector` with in-memory idempotency cache (`Map<idempotencyKey, PublishResult>`). Identical keys return previously published external ID without re-executing.
   - Configurable failure simulator supporting `'temporary'` (500), `'rate_limit'` (429 with retry-after), `'permanent'` (400), and `'auth_expired'` (401).
   - Enforced channel character and hashtag limits (X: 280 chars, LinkedIn: 3000 chars, Instagram: 2200 chars / 30 hashtags, Facebook: 2000 chars).
   - Created channel sandbox adapters: `LinkedInSandboxAdapter`, `XSandboxAdapter`, `InstagramSandboxAdapter`, `FacebookSandboxAdapter`.

4. **Live LinkedIn OAuth Adapter (`src/lib/connectors/adapters/linkedin-live.ts`)**:
   - Personal profile posting via LinkedIn Posts API (`https://api.linkedin.com/rest/posts`) with `w_member_social`.
   - Gated execution behind `ENABLE_LIVE_LINKEDIN=true` environment flag.
   - Integrated full error mapping: 401 $\to$ `AUTH_EXPIRED`, 429 $\to$ `RATE_LIMITED` (honoring `Retry-After`), 400/422 $\to$ `INVALID_CONTENT`, 5xx $\to$ `TEMPORARY`.

5. **Connector Registry (`src/lib/connectors/registry.ts`, `src/server/connectors/registry.ts`)**:
   - Implemented `getConnector(provider, mode)` throwing descriptive `NOT_FOUND` on unregistered combinations.
   - Implemented `listConnectors()` and `registerConnector(connector)` for dynamic plugin registration.
   - Auto-registered the 5 default adapters (`linkedin:sandbox`, `instagram:sandbox`, `x:sandbox`, `facebook:sandbox`, `linkedin:live`).

6. **REST API Endpoints**:
   - `GET /api/connectors`: Resolves workspace via cookie, retrieves workspace connectors, auto-seeds 4 connected sandbox connectors if workspace is new or unseeded.
   - `POST /api/connectors/[provider]/connect`: Validates provider, handles live LinkedIn auth URL or sandbox connected transition.
   - `POST /api/connectors/[provider]/disconnect`: Marks provider as disconnected and clears encrypted tokens.
   - `POST /api/connectors/[provider]/health`: Invokes connector `healthCheck()`, returning status and measured latency.
   - `PATCH /api/connectors/[provider]/settings`: Validates simulation failure mode (`none`, `temporary`, `rate_limit`, `permanent`, `auth_expired`) and updates DB.
   - `GET /api/connectors/linkedin/callback`: OAuth callback route exchanging authorization code for access token, encrypting token with AES-GCM, and persisting to DB.

---

## 3. Caveats

- Live LinkedIn integration requires valid OAuth credentials (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`) and `ENABLE_LIVE_LINKEDIN=true`. In default test and local environments, live LinkedIn remains safely disabled and mocked.
- In-memory idempotency in the sandbox adapters is process-scoped; production scheduler (M7 / F6) also maintains idempotency keys in Postgres (`publish_jobs.idempotency_key`).

---

## 4. Conclusion

All tasks specified in the M4 dispatch have been completely and genuinely implemented with zero dummy facades or hardcoded values.
All 61 targeted unit and integration tests are passing (100% green).
Full TypeScript strict mode check (`pnpm typecheck`) and ESLint (`pnpm lint`) pass with 0 errors.

---

## 5. Verification Method

To independently verify this work:

1. **Run Unit & Integration Test Suites**:
   ```bash
   pnpm vitest run tests/unit/f4-connector-contract.test.ts tests/unit/f4-token-encryption.test.ts tests/integration/f7-connectors-api.test.ts
   ```
   *Expected*: 61 passed across 3 test files.

2. **Verify TypeScript Strict Compilation**:
   ```bash
   pnpm typecheck
   ```
   *Expected*: `tsc --noEmit` exits with code 0.

3. **Verify Linting**:
   ```bash
   pnpm lint
   ```
   *Expected*: No ESLint warnings or errors.
