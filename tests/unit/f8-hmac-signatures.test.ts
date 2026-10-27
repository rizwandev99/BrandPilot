import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

describe('F8 Webhooks: Cryptographic HMAC-SHA256 & Timestamp Verification (AC-F8-01, AC-F8-02)', () => {
  const TEST_SECRET = 'whsec_9876543210abcdef0123456789abcdef';
  const FIXED_NOW = 1700000000000; // ms epoch

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F8-02: Timing-Safe HMAC-SHA256 Verification over Raw Buffer', () => {
    it('AC-F8-02: computes correct HMAC-SHA256 hex digest for string and Buffer inputs', async () => {
      const { computeHmacSha256 } = await import('@/lib/security/hmac');

      const rawString = '{"event":"product.launched","id":"evt-123"}';
      const rawBuffer = Buffer.from(rawString, 'utf8');

      const expectedDigest = crypto.createHmac('sha256', TEST_SECRET).update(rawBuffer).digest('hex');

      expect(computeHmacSha256(TEST_SECRET, rawString)).toBe(expectedDigest);
      expect(computeHmacSha256(TEST_SECRET, rawBuffer)).toBe(expectedDigest);
    });

    it('AC-F8-02: verifyHmacTimingSafe validates matching signature with sha256= prefix', async () => {
      const { computeHmacSha256, verifyHmacTimingSafe } = await import('@/lib/security/hmac');

      const body = Buffer.from('{"hello":"world"}');
      const signatureHex = computeHmacSha256(TEST_SECRET, body);
      const signatureHeader = `sha256=${signatureHex}`;

      const isValid = verifyHmacTimingSafe(TEST_SECRET, body, signatureHeader);
      expect(isValid).toBe(true);
    });

    it('AC-F8-02: verifyHmacTimingSafe validates matching signature without sha256= prefix', async () => {
      const { computeHmacSha256, verifyHmacTimingSafe } = await import('@/lib/security/hmac');

      const body = Buffer.from('{"hello":"world"}');
      const signatureHex = computeHmacSha256(TEST_SECRET, body);

      const isValid = verifyHmacTimingSafe(TEST_SECRET, body, signatureHex);
      expect(isValid).toBe(true);
    });

    it('AC-F8-02: timing-safe comparison rejects mismatched signature safely', async () => {
      const { verifyHmacTimingSafe } = await import('@/lib/security/hmac');

      const body = Buffer.from('{"hello":"world"}');
      const badSignature = 'sha256=' + 'a'.repeat(64);

      const isValid = verifyHmacTimingSafe(TEST_SECRET, body, badSignature);
      expect(isValid).toBe(false);
    });

    it('AC-F8-02: rejects invalid signature length without throwing RangeError (timingSafeEqual guard)', async () => {
      const { verifyHmacTimingSafe } = await import('@/lib/security/hmac');

      const body = Buffer.from('{"hello":"world"}');

      // Shorter signature
      expect(verifyHmacTimingSafe(TEST_SECRET, body, 'sha256=short')).toBe(false);
      // Empty signature
      expect(verifyHmacTimingSafe(TEST_SECRET, body, '')).toBe(false);
      // Longer signature
      expect(verifyHmacTimingSafe(TEST_SECRET, body, 'sha256=' + 'b'.repeat(128))).toBe(false);
    });

    it('AC-F8-02: whitespace invariance: raw body with irregular spacing matches HMAC, proving raw buffer is used', async () => {
      const { computeHmacSha256, verifyHmacTimingSafe } = await import('@/lib/security/hmac');

      // Raw body with non-standard whitespace, tabs, and linebreaks
      const irregularRawBody = Buffer.from(
        '{\n  "event" :   "campaign.created"  ,\n\t"workspaceId":\t"ws-123"\n}'
      );

      // Sign the verbatim raw buffer
      const rawSignature = computeHmacSha256(TEST_SECRET, irregularRawBody);

      // 1. Verification with raw buffer MUST succeed
      expect(verifyHmacTimingSafe(TEST_SECRET, irregularRawBody, `sha256=${rawSignature}`)).toBe(true);

      // 2. If an implementation had improperly parsed JSON and re-stringified with JSON.stringify(),
      // the spacing would change, producing a DIFFERENT hash:
      const parsed = JSON.parse(irregularRawBody.toString('utf8'));
      const reStringified = Buffer.from(JSON.stringify(parsed));
      const reStringifiedSignature = computeHmacSha256(TEST_SECRET, reStringified);

      expect(reStringifiedSignature).not.toBe(rawSignature);
      // This proves that verifyHmacTimingSafe over raw body preserves whitespace fidelity
    });
  });

  describe('AC-F8-01: Replay Protection & Timestamp Freshness (300s Window)', () => {
    it('AC-F8-01: accepts fresh timestamp within 300 seconds window', async () => {
      const { isTimestampFresh } = await import('@/lib/security/hmac');

      // Exactly now (in seconds or ms)
      expect(isTimestampFresh(FIXED_NOW / 1000, 300, FIXED_NOW)).toBe(true);
      expect(isTimestampFresh(FIXED_NOW, 300, FIXED_NOW)).toBe(true);

      // 100 seconds in the past
      const past100s = (FIXED_NOW - 100 * 1000) / 1000;
      expect(isTimestampFresh(past100s, 300, FIXED_NOW)).toBe(true);

      // 299 seconds in the past (just inside 5 min limit)
      const past299s = (FIXED_NOW - 299 * 1000) / 1000;
      expect(isTimestampFresh(past299s, 300, FIXED_NOW)).toBe(true);
    });

    it('AC-F8-01: rejects expired timestamp older than 300 seconds (replay attack prevention)', async () => {
      const { isTimestampFresh } = await import('@/lib/security/hmac');

      // 301 seconds ago
      const expired301s = (FIXED_NOW - 301 * 1000) / 1000;
      expect(isTimestampFresh(expired301s, 300, FIXED_NOW)).toBe(false);

      // 1 hour ago
      const expired1Hour = (FIXED_NOW - 3600 * 1000) / 1000;
      expect(isTimestampFresh(expired1Hour, 300, FIXED_NOW)).toBe(false);

      // 1 day ago
      const expired1Day = (FIXED_NOW - 86400 * 1000) / 1000;
      expect(isTimestampFresh(expired1Day, 300, FIXED_NOW)).toBe(false);
    });

    it('AC-F8-01: rejects timestamps too far in the future (> 300s clock skew)', async () => {
      const { isTimestampFresh } = await import('@/lib/security/hmac');

      // 301 seconds into the future
      const future301s = (FIXED_NOW + 301 * 1000) / 1000;
      expect(isTimestampFresh(future301s, 300, FIXED_NOW)).toBe(false);
    });

    it('AC-F8-01: rejects non-numeric or malformed timestamp strings', async () => {
      const { isTimestampFresh } = await import('@/lib/security/hmac');

      expect(isTimestampFresh('not-a-timestamp', 300, FIXED_NOW)).toBe(false);
      expect(isTimestampFresh('', 300, FIXED_NOW)).toBe(false);
      expect(isTimestampFresh(NaN, 300, FIXED_NOW)).toBe(false);
    });
  });
});
