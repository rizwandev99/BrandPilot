import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConnectorErrorCode } from '@/lib/connectors/types';
import type { RetryPolicyConfig } from '@/lib/scheduler/retry-policy';

describe('F6 Scheduler: Pure Retry Policy & Exponential Backoff with Jitter (AC-F6-04)', () => {
  const FIXED_NOW = 1700000000000; // Fixed timestamp for deterministic tests

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AC-F6-04: Error Code Retryability Truth Table', () => {
    it('AC-F6-04: retries TEMPORARY errors on attempts < maxAttempts', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const result = calculateNextRetry(1, 'TEMPORARY', undefined, undefined, () => 0);
      expect(result.shouldRetry).toBe(true);
      expect(result.nextAttemptAt).toBeInstanceOf(Date);
      expect(result.nextAttemptAt!.getTime()).toBeGreaterThan(FIXED_NOW);
    });

    it('AC-F6-04: retries RATE_LIMITED errors on attempts < maxAttempts', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const result = calculateNextRetry(1, 'RATE_LIMITED', undefined, undefined, () => 0);
      expect(result.shouldRetry).toBe(true);
      expect(result.nextAttemptAt).toBeInstanceOf(Date);
      expect(result.nextAttemptAt!.getTime()).toBeGreaterThan(FIXED_NOW);
    });

    it('AC-F6-04: does NOT retry AUTH_EXPIRED errors', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const result = calculateNextRetry(1, 'AUTH_EXPIRED');
      expect(result.shouldRetry).toBe(false);
      expect(result.nextAttemptAt).toBeUndefined();
    });

    it('AC-F6-04: does NOT retry INVALID_CONTENT errors', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const result = calculateNextRetry(1, 'INVALID_CONTENT');
      expect(result.shouldRetry).toBe(false);
      expect(result.nextAttemptAt).toBeUndefined();
    });

    it('AC-F6-04: does NOT retry PERMANENT errors', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const result = calculateNextRetry(1, 'PERMANENT');
      expect(result.shouldRetry).toBe(false);
      expect(result.nextAttemptAt).toBeUndefined();
    });
  });

  describe('AC-F6-04: Max Attempts Cap (4 Attempts)', () => {
    it('AC-F6-04: allows retries for attempts 1, 2, and 3', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = calculateNextRetry(attempt, 'TEMPORARY', undefined, undefined, () => 0);
        expect(result.shouldRetry, `Attempt ${attempt} must be retryable`).toBe(true);
        expect(result.nextAttemptAt).toBeDefined();
      }
    });

    it('AC-F6-04: rejects retry when attempt reaches or exceeds 4 (maxAttempts)', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const attempt4 = calculateNextRetry(4, 'TEMPORARY');
      expect(attempt4.shouldRetry).toBe(false);
      expect(attempt4.nextAttemptAt).toBeUndefined();

      const attempt5 = calculateNextRetry(5, 'TEMPORARY');
      expect(attempt5.shouldRetry).toBe(false);

      const attempt10 = calculateNextRetry(10, 'RATE_LIMITED');
      expect(attempt10.shouldRetry).toBe(false);
    });

    it('AC-F6-04: honors custom maxAttempts configuration if provided', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const customConfig: RetryPolicyConfig = {
        maxAttempts: 2,
        baseDelayMs: 10_000,
        maxDelayMs: 60_000,
        jitterFactor: 0.1,
      };

      expect(calculateNextRetry(1, 'TEMPORARY', undefined, customConfig).shouldRetry).toBe(true);
      expect(calculateNextRetry(2, 'TEMPORARY', undefined, customConfig).shouldRetry).toBe(false);
    });
  });

  describe('AC-F6-04: Upstream Retry-After Header Handling', () => {
    it('AC-F6-04: honors explicit retryAfterSeconds from rate limited upstream', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const retryAfterSec = 120; // 2 minutes
      const result = calculateNextRetry(1, 'RATE_LIMITED', retryAfterSec);

      expect(result.shouldRetry).toBe(true);
      // Explicit retry-after overrides formula: now + 120s
      const expectedTime = FIXED_NOW + retryAfterSec * 1000;
      expect(result.nextAttemptAt!.getTime()).toBe(expectedTime);
    });

    it('AC-F6-04: ignores zero or negative retryAfterSeconds and falls back to exponential backoff', async () => {
      const { calculateNextRetry, DEFAULT_RETRY_POLICY } = await import('@/lib/scheduler/retry-policy');

      const resultZero = calculateNextRetry(1, 'RATE_LIMITED', 0, undefined, () => 0);
      expect(resultZero.shouldRetry).toBe(true);
      expect(resultZero.nextAttemptAt!.getTime()).toBe(FIXED_NOW + DEFAULT_RETRY_POLICY.baseDelayMs);

      const resultNeg = calculateNextRetry(1, 'RATE_LIMITED', -15, undefined, () => 0);
      expect(resultNeg.shouldRetry).toBe(true);
      expect(resultNeg.nextAttemptAt!.getTime()).toBe(FIXED_NOW + DEFAULT_RETRY_POLICY.baseDelayMs);
    });
  });

  describe('AC-F6-04: Exponential Progression & Jitter Bounds', () => {
    it('AC-F6-04: calculates exact exponential backoff progression with zero jitter', async () => {
      const { calculateNextRetry, DEFAULT_RETRY_POLICY } = await import('@/lib/scheduler/retry-policy');
      const base = DEFAULT_RETRY_POLICY.baseDelayMs; // e.g. 60,000 ms

      // attempt 1: base * 2^0 = base
      const r1 = calculateNextRetry(1, 'TEMPORARY', undefined, undefined, () => 0);
      expect(r1.nextAttemptAt!.getTime()).toBe(FIXED_NOW + base);

      // attempt 2: base * 2^1 = 2 * base
      const r2 = calculateNextRetry(2, 'TEMPORARY', undefined, undefined, () => 0);
      expect(r2.nextAttemptAt!.getTime()).toBe(FIXED_NOW + 2 * base);

      // attempt 3: base * 2^2 = 4 * base
      const r3 = calculateNextRetry(3, 'TEMPORARY', undefined, undefined, () => 0);
      expect(r3.nextAttemptAt!.getTime()).toBe(FIXED_NOW + 4 * base);
    });

    it('AC-F6-04: bounds jitter strictly within [0, cappedDelay * jitterFactor]', async () => {
      const { calculateNextRetry, DEFAULT_RETRY_POLICY } = await import('@/lib/scheduler/retry-policy');
      const base = DEFAULT_RETRY_POLICY.baseDelayMs;
      const jitterFactor = DEFAULT_RETRY_POLICY.jitterFactor; // e.g. 0.2 (20%)

      // Test with max jitter: randomFn = () => 1.0
      const rMaxJitter = calculateNextRetry(1, 'TEMPORARY', undefined, undefined, () => 1.0);
      const maxExpectedDelay = Math.round(base + base * jitterFactor);
      expect(rMaxJitter.nextAttemptAt!.getTime()).toBe(FIXED_NOW + maxExpectedDelay);

      // Test with half jitter: randomFn = () => 0.5
      const rHalfJitter = calculateNextRetry(1, 'TEMPORARY', undefined, undefined, () => 0.5);
      const halfExpectedDelay = Math.round(base + base * jitterFactor * 0.5);
      expect(rHalfJitter.nextAttemptAt!.getTime()).toBe(FIXED_NOW + halfExpectedDelay);
    });

    it('AC-F6-04: caps delay at maxDelayMs regardless of attempt level', async () => {
      const { calculateNextRetry } = await import('@/lib/scheduler/retry-policy');

      const customConfig: RetryPolicyConfig = {
        maxAttempts: 10,
        baseDelayMs: 100_000,
        maxDelayMs: 300_000, // max 300s
        jitterFactor: 0.1,
      };

      // attempt 6: 100_000 * 2^5 = 3,200,000, capped at 300,000
      const res = calculateNextRetry(6, 'TEMPORARY', undefined, customConfig, () => 0);
      expect(res.shouldRetry).toBe(true);
      expect(res.nextAttemptAt!.getTime()).toBe(FIXED_NOW + 300_000);
    });
  });
});
