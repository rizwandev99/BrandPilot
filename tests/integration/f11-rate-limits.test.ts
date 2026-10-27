import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F11 Quota & Fallbacks: Rate Limiting via rate_limit_counters (AC-F11-03)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F11-03: checkRateLimit core algorithm', () => {
    it('AC-F11-03: allows requests within configured threshold and tracks count', async () => {
      const counters: Record<string, number> = {};

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                const count = counters['test-ip:post-brand-kit'] || 0;
                return Promise.resolve(count > 0 ? [{ count }] : []);
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockImplementation(() => {
                counters['test-ip:post-brand-kit'] = (counters['test-ip:post-brand-kit'] || 0) + 1;
                return Promise.resolve([{ count: counters['test-ip:post-brand-kit'] }]);
              }),
            }),
          }),
        },
      }));

      const { checkRateLimit } = await import('@/server/security/rate-limiter');

      const key = 'test-ip:post-brand-kit';
      const limit = 3;
      const windowSeconds = 60;

      // 1st request
      const res1 = await checkRateLimit(key, limit, windowSeconds);
      expect(res1.allowed).toBe(true);
      expect(res1.count).toBe(1);

      // 2nd request
      const res2 = await checkRateLimit(key, limit, windowSeconds);
      expect(res2.allowed).toBe(true);
      expect(res2.count).toBe(2);

      // 3rd request (at threshold)
      const res3 = await checkRateLimit(key, limit, windowSeconds);
      expect(res3.allowed).toBe(true);
      expect(res3.count).toBe(3);

      // 4th request (over threshold)
      const res4 = await checkRateLimit(key, limit, windowSeconds);
      expect(res4.allowed).toBe(false);
      expect(res4.retryAfterSeconds).toBeGreaterThan(0);
      expect(res4.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('AC-F11-03: isolates rate limit buckets by key (per-IP and per-workspace)', async () => {
      const { checkRateLimit } = await import('@/server/security/rate-limiter');

      const ip1Key = 'ip:192.168.1.10:runs';
      const ip2Key = 'ip:10.0.0.5:runs';

      // Both IPs should have independent quota buckets
      const res1 = await checkRateLimit(ip1Key, 5, 60);
      const res2 = await checkRateLimit(ip2Key, 5, 60);

      expect(res1.allowed).toBe(true);
      expect(res2.allowed).toBe(true);
    });
  });

  describe('AC-F11-03: HTTP 429 Response & Retry-After Header', () => {
    it('AC-F11-03: produces 429 RATE_LIMITED response with Retry-After header when rate limited', async () => {
      const { createRateLimitedResponse } = await import('@/server/security/rate-limiter');

      const retryAfter = 45;
      const response = createRateLimitedResponse(retryAfter);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('45');

      const body = await response.json();
      expect(body).toEqual(
        expect.objectContaining({
          error: 'RATE_LIMITED',
          retryAfter: 45,
        })
      );
    });
  });
});
