import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

describe('F11 Quota & Fallbacks: Response Cache via llm_cache (AC-F11-05)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F11-05: Deterministic SHA-256 Cache Key Generation', () => {
    it('AC-F11-05: generates identical SHA-256 key for identical inputs regardless of key ordering', async () => {
      const { generateLlmCacheKey } = await import('@/server/llm/cache');

      const inputA = { url: 'https://example.com', tone: 'friendly', count: 3 };
      const inputB = { count: 3, tone: 'friendly', url: 'https://example.com' };

      const keyA = generateLlmCacheKey('brand-kit', inputA);
      const keyB = generateLlmCacheKey('brand-kit', inputB);

      expect(keyA).toBe(keyB);
      expect(keyA).toMatch(/^[0-9a-f]{64}$/); // Standard SHA-256 hex string
    });

    it('AC-F11-05: generates different keys for distinct inputs', async () => {
      const { generateLlmCacheKey } = await import('@/server/llm/cache');

      const key1 = generateLlmCacheKey('brand-kit', { url: 'https://site-a.com' });
      const key2 = generateLlmCacheKey('brand-kit', { url: 'https://site-b.com' });

      expect(key1).not.toBe(key2);
    });
  });

  describe('AC-F11-05: Cache Retrieval, Persistence, and 24h Expiry', () => {
    it('AC-F11-05: returns cached response when entry is fresh (< 24 hours)', async () => {
      const mockKey = crypto.createHash('sha256').update('test-key').digest('hex');
      const cachedData = { name: 'Cached Brand', colors: { primary: '#111' } };
      const freshCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours old (< 24h)

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  key: mockKey,
                  response: cachedData,
                  createdAt: freshCreatedAt,
                },
              ]),
            }),
          }),
        },
      }));

      const { getCachedLlmResponse } = await import('@/server/llm/cache');
      const result = await getCachedLlmResponse(mockKey);

      expect(result).toEqual(cachedData);
    });

    it('AC-F11-05: returns null when cached entry is older than 24 hours (86,400 seconds)', async () => {
      const mockKey = crypto.createHash('sha256').update('expired-key').digest('hex');
      const expiredCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours old (> 24h)

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  key: mockKey,
                  response: { name: 'Stale Brand' },
                  createdAt: expiredCreatedAt,
                },
              ]),
            }),
          }),
        },
      }));

      const { getCachedLlmResponse } = await import('@/server/llm/cache');
      const result = await getCachedLlmResponse(mockKey);

      expect(result).toBeNull();
    });

    it('AC-F11-05: writes new response into llm_cache on cache miss', async () => {
      const mockKey = 'new-key-12345';
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.doMock('@/server/db', () => ({
        db: {
          insert: insertMock,
        },
      }));

      const { setCachedLlmResponse } = await import('@/server/llm/cache');
      await setCachedLlmResponse(mockKey, { generated: true });

      expect(insertMock).toHaveBeenCalled();
    });
  });
});
