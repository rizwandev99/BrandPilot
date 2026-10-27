import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F11 Quota & Fallbacks: Daily Global Budget Tracking (AC-F11-02)', () => {
  beforeEach(() => {
    vi.doUnmock('@/server/llm/usage');
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('AC-F11-02: tracks daily calls in llm_usage table and permits calls within LLM_DAILY_BUDGET', async () => {
    let mockCalls = 0;
    const TEST_BUDGET = 5;

    vi.doMock('@/server/db', () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => Promise.resolve([{ day: '2026-10-27', calls: mockCalls }])),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockImplementation(() => {
              mockCalls += 1;
              return Promise.resolve([{ day: '2026-10-27', calls: mockCalls }]);
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              mockCalls += 1;
              return Promise.resolve([{ day: '2026-10-27', calls: mockCalls }]);
            }),
          }),
        }),
      },
    }));

    const { checkAndIncrementDailyBudget } = await import('@/server/llm/usage');

    // First 5 calls are permitted
    for (let i = 1; i <= TEST_BUDGET; i++) {
      const status = await checkAndIncrementDailyBudget({ budgetLimit: TEST_BUDGET });
      expect(status.allowed, `Call #${i} should be allowed within budget of ${TEST_BUDGET}`).toBe(true);
      expect(status.currentCalls).toBe(i);
    }

    // 6th call exceeds budget
    const exceeded = await checkAndIncrementDailyBudget({ budgetLimit: TEST_BUDGET });
    expect(exceeded.allowed, 'Call exceeding daily budget must be rejected').toBe(false);
    expect(exceeded.currentCalls).toBe(TEST_BUDGET);
  });

  it('AC-F11-02: switches to fallback provider when daily budget is exhausted', async () => {
    // Mock daily budget returning budget exceeded
    vi.doMock('@/server/llm/usage', () => ({
      checkAndIncrementDailyBudget: vi.fn().mockResolvedValue({
        allowed: false,
        currentCalls: 100,
        budgetLimit: 100,
      }),
    }));

    const mockGemini = {
      name: 'gemini' as const,
      generateBrandKit: vi.fn(),
    };

    const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
    const resilient = new ResilientLlmProvider({ geminiProvider: mockGemini as any });

    const result = await resilient.generateBrandKit({
      url: 'https://example.com',
      scrapedData: { title: 'Budget Test', description: '', headings: [], sampleText: '', colors: [] },
    });

    // Should NOT have called Gemini at all
    expect(mockGemini.generateBrandKit).not.toHaveBeenCalled();

    // Should return fallback result with budget_exceeded reason
    expect(result.provider).toBe('fallback');
    expect(result.fallbackReason).toMatch(/budget_exceeded|daily_budget/i);
  });

  it('AC-F11-02: rolls over daily budget cleanly at UTC midnight', async () => {
    const usageRecords: Record<string, number> = {
      '2026-10-27': 50, // exhausted on day 1
    };

    vi.doMock('@/server/db', () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((cond) => {
              // Extract date if requested
              return Promise.resolve([]);
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((val) => {
            usageRecords[val.day] = 1;
            return {
              onConflictDoUpdate: vi.fn().mockResolvedValue([{ day: val.day, calls: 1 }]),
            };
          }),
        }),
      },
    }));

    const { checkAndIncrementDailyBudget } = await import('@/server/llm/usage');

    // On new UTC day 2026-10-28
    const newDayStatus = await checkAndIncrementDailyBudget({
      dateStr: '2026-10-28',
      budgetLimit: 50,
    });

    expect(newDayStatus.allowed).toBe(true);
    expect(newDayStatus.currentCalls).toBe(1);
  });
});
