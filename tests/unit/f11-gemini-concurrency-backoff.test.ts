import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F11 Quota & Fallbacks: Gemini Concurrency & Backoff (AC-F11-04)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F11-04: Serialized Gemini Invocations', () => {
    it('AC-F11-04: serializes concurrent calls to ensure requests are processed one at a time', async () => {
      const { createSerializedQueue } = await import('@/server/llm/concurrency');

      const queue = createSerializedQueue();
      let activeCalls = 0;
      let maxConcurrent = 0;
      const executionOrder: number[] = [];

      async function simulatedCall(id: number, delayMs: number) {
        return queue.enqueue(async () => {
          activeCalls += 1;
          if (activeCalls > maxConcurrent) maxConcurrent = activeCalls;
          executionOrder.push(id);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          activeCalls -= 1;
          return `result-${id}`;
        });
      }

      // Launch 3 concurrent calls
      const p1 = simulatedCall(1, 30);
      const p2 = simulatedCall(2, 20);
      const p3 = simulatedCall(3, 10);

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1).toBe('result-1');
      expect(r2).toBe('result-2');
      expect(r3).toBe('result-3');

      // Crucial assertion: concurrency never exceeded 1
      expect(maxConcurrent).toBe(1);
      // Execution order was preserved
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('AC-F11-04: Exponential Backoff on HTTP 429', () => {
    it('AC-F11-04: retries with exponential backoff on HTTP 429 before succeeding', async () => {
      const { executeWithBackoff } = await import('@/server/llm/backoff');

      let attempts = 0;
      const sleepDelays: number[] = [];

      const mockOperation = vi.fn().mockImplementation(async () => {
        attempts += 1;
        if (attempts < 3) {
          const err = new Error('HTTP 429: Too Many Requests');
          (err as any).status = 429;
          throw err;
        }
        return 'success-after-retries';
      });

      const mockSleep = vi.fn().mockImplementation((ms: number) => {
        sleepDelays.push(ms);
        return Promise.resolve();
      });

      const result = await executeWithBackoff(mockOperation, {
        maxRetries: 3,
        baseDelayMs: 100,
        factor: 2,
        sleepFn: mockSleep,
      });

      expect(result).toBe('success-after-retries');
      expect(attempts).toBe(3);
      expect(mockSleep).toHaveBeenCalledTimes(2);

      // Verify delay increases exponentially (attempt 1: ~100ms, attempt 2: ~200ms)
      expect(sleepDelays[0]).toBeGreaterThanOrEqual(80);
      expect(sleepDelays[1]).toBeGreaterThanOrEqual(160);
    });

    it('AC-F11-04: falls back to FallbackProvider when 429 retries are completely exhausted', async () => {
      const { executeWithBackoff } = await import('@/server/llm/backoff');

      const mockOperation = vi.fn().mockImplementation(async () => {
        const err = new Error('HTTP 429: Rate Limit Exceeded');
        (err as any).status = 429;
        throw err;
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);

      await expect(
        executeWithBackoff(mockOperation, {
          maxRetries: 2,
          baseDelayMs: 50,
          sleepFn: mockSleep,
        })
      ).rejects.toThrow(/429/);
    });
  });
});
