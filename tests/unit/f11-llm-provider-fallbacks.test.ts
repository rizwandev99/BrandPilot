import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  BrandKitGenerationInput,
  IdeasGenerationInput,
  CreativeGenerationInput,
  ConditionEvaluationInput,
} from '@/server/llm/interface';

describe('F11 Quota & Fallbacks: LlmProvider Implementations & Resilient Orchestrator (AC-F11-01)', () => {
  const sampleBrandKitInput: BrandKitGenerationInput = {
    url: 'https://example.com',
    scrapedData: {
      title: 'Acme Cloud Platform',
      description: 'Enterprise workflow automation for developers',
      headings: ['Automate everything', 'Fast and secure'],
      sampleText: 'Deploy in seconds. Scale globally with confidence.',
      colors: ['#0066cc', '#112233'],
    },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F11-01: FallbackProvider (Deterministic, Zero AI, 100% Offline)', () => {
    it('AC-F11-01: FallbackProvider implements LlmProvider with name="fallback"', async () => {
      const { FallbackProvider } = await import('@/server/llm/fallback-provider');
      const provider = new FallbackProvider();

      expect(provider.name).toBe('fallback');
    });

    it('AC-F11-01: FallbackProvider generates valid BrandKitOutput with WCAG compliant colors', async () => {
      const { FallbackProvider } = await import('@/server/llm/fallback-provider');
      const provider = new FallbackProvider();

      const result = await provider.generateBrandKit(sampleBrandKitInput);

      expect(result.provider).toBe('fallback');
      expect(result.data).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(Array.isArray(result.data.tone)).toBe(true);
      expect(Array.isArray(result.data.dos)).toBe(true);
      expect(Array.isArray(result.data.donts)).toBe(true);
      expect(result.data.colors).toHaveProperty('primary');
      expect(result.data.colors).toHaveProperty('secondary');
      expect(result.data.colors).toHaveProperty('background');
      expect(result.data.colors).toHaveProperty('text');
    });

    it('AC-F11-01: FallbackProvider generates ideas, creatives, and evaluates conditions deterministically', async () => {
      const { FallbackProvider } = await import('@/server/llm/fallback-provider');
      const provider = new FallbackProvider();

      const kit = (await provider.generateBrandKit(sampleBrandKitInput)).data;

      // Ideas
      const ideasInput: IdeasGenerationInput = {
        brandKit: kit,
        goal: 'Increase signups',
        channels: ['linkedin', 'x'],
        postCount: 2,
      };
      const ideasResult = await provider.generateIdeas(ideasInput);
      expect(ideasResult.provider).toBe('fallback');
      expect(ideasResult.data.length).toBeGreaterThanOrEqual(1);

      // Creative
      const creativeInput: CreativeGenerationInput = {
        brandKit: kit,
        idea: ideasResult.data[0],
      };
      const creativeResult = await provider.generateCreative(creativeInput);
      expect(creativeResult.provider).toBe('fallback');
      expect(creativeResult.data.caption).toBeDefined();
      expect(creativeResult.data.creativeSpec.templateId).toBeDefined();

      // Condition
      const condInput: ConditionEvaluationInput = {
        brandKit: kit,
        eventPayload: { feature: 'release-v2' },
        prompt: 'Check if this event matches developer tools',
      };
      const condResult = await provider.evaluateCondition(condInput);
      expect(condResult.provider).toBe('fallback');
      expect(typeof condResult.data.matched).toBe('boolean');
    });
  });

  describe('AC-F11-01: FakeProvider (Test Double)', () => {
    it('AC-F11-01: FakeProvider supports mock responses and tracks call counts', async () => {
      const { FakeProvider } = await import('@/server/llm/fake-provider');
      const fake = new FakeProvider();

      expect(fake.name).toBe('fake');

      fake.setBrandKitMock({
        name: 'Mock Brand',
        summary: 'Mock Summary',
        tone: ['friendly'],
        dos: ['be nice'],
        donts: ['be rude'],
        audience: 'Devs',
        colors: { primary: '#111111', secondary: '#222222', background: '#ffffff', text: '#000000' },
        keywords: ['mock'],
      });

      const res = await fake.generateBrandKit(sampleBrandKitInput);
      expect(res.data.name).toBe('Mock Brand');
      expect(fake.getCallCount('generateBrandKit')).toBe(1);
    });

    it('AC-F11-01: FakeProvider can simulate rate limits and network errors', async () => {
      const { FakeProvider } = await import('@/server/llm/fake-provider');
      const fake = new FakeProvider();

      fake.simulateError('rate_limit');
      await expect(fake.generateBrandKit(sampleBrandKitInput)).rejects.toThrow(/429|rate limit/i);
    });
  });

  describe('AC-F11-01: ResilientLlmProvider Fallback Triggering', () => {
    it('AC-F11-01: falls back to FallbackProvider when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
      const resilient = new ResilientLlmProvider();

      const result = await resilient.generateBrandKit(sampleBrandKitInput);
      expect(result.provider).toBe('fallback');
      expect(result.fallbackReason).toMatch(/missing_api_key|no_api_key/i);
      expect(result.data.name).toBeDefined();
    });

    it('AC-F11-01: falls back when primary Gemini provider throws HTTP 429', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      // Mock Gemini provider throwing 429
      const mockGemini = {
        name: 'gemini' as const,
        generateBrandKit: vi.fn().mockRejectedValue(new Error('HTTP 429: Resource exhausted / rate limited')),
      };

      const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
      const resilient = new ResilientLlmProvider({ geminiProvider: mockGemini as any });

      const result = await resilient.generateBrandKit(sampleBrandKitInput);
      expect(result.provider).toBe('fallback');
      expect(result.fallbackReason).toMatch(/rate_limit|429/i);
    });

    it('AC-F11-01: falls back when primary Gemini provider times out', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const mockGemini = {
        name: 'gemini' as const,
        generateBrandKit: vi.fn().mockRejectedValue(new Error('Request timeout after 15000ms')),
      };

      const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
      const resilient = new ResilientLlmProvider({ geminiProvider: mockGemini as any });

      const result = await resilient.generateBrandKit(sampleBrandKitInput);
      expect(result.provider).toBe('fallback');
      expect(result.fallbackReason).toMatch(/timeout/i);
    });

    it('AC-F11-01: falls back when primary Gemini provider throws HTTP 5xx', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const mockGemini = {
        name: 'gemini' as const,
        generateBrandKit: vi.fn().mockRejectedValue(new Error('HTTP 503: Service Unavailable')),
      };

      const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
      const resilient = new ResilientLlmProvider({ geminiProvider: mockGemini as any });

      const result = await resilient.generateBrandKit(sampleBrandKitInput);
      expect(result.provider).toBe('fallback');
      expect(result.fallbackReason).toMatch(/server_error|503/i);
    });

    it('AC-F11-01: returns Gemini result when Gemini succeeds without errors', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const mockGemini = {
        name: 'gemini' as const,
        generateBrandKit: vi.fn().mockResolvedValue({
          provider: 'gemini',
          data: {
            name: 'Gemini Brand',
            summary: 'Summary by Gemini',
            tone: ['bold'],
            dos: ['innovate'],
            donts: ['stagnate'],
            audience: 'Creators',
            colors: { primary: '#445566', secondary: '#778899', background: '#000000', text: '#ffffff' },
            keywords: ['gemini', 'ai'],
          },
        }),
      };

      const { ResilientLlmProvider } = await import('@/server/llm/resilient-provider');
      const resilient = new ResilientLlmProvider({ geminiProvider: mockGemini as any });

      const result = await resilient.generateBrandKit(sampleBrandKitInput);
      expect(result.provider).toBe('gemini');
      expect(result.data.name).toBe('Gemini Brand');
    });
  });
});
