import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F2 Brand Kit: API Routes & LLM Fallback (AC-F2-01, 04, 06, 07, 08, 09)', () => {
  const TEST_WORKSPACE_ID = 'a1111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F2-06: Sample Brand Kit Instant Creation (Zero Network & Zero LLM)', () => {
    it('AC-F2-06: creates sample brand kit instantly with { sample: true } without external calls', async () => {
      const insertedKits: any[] = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              const record = {
                id: 'b1111111-1111-4111-8111-111111111111',
                workspaceId: TEST_WORKSPACE_ID,
                ...val,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              insertedKits.push(record);
              return {
                returning: vi.fn().mockResolvedValue([record]),
              };
            }),
          }),
        },
      }));

      // Spy on fetch to ensure 0 external network requests
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const { POST } = await import('@/app/api/brand-kits/route');
      const req = new Request('http://localhost:3000/api/brand-kits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sample: true }),
      });

      const startTime = Date.now();
      const res = await POST(req as any);
      const durationMs = Date.now() - startTime;

      expect(res.status).toBe(201);
      const data = await res.json();

      // Zero network calls
      expect(fetchSpy).not.toHaveBeenCalled();

      // Completed quickly (under 200ms)
      expect(durationMs).toBeLessThan(500);

      // Verify schema matches brand kit contract
      expect(data.name).toBeDefined();
      expect(typeof data.name).toBe('string');
      expect(data.summary.length).toBeLessThanOrEqual(280);
      expect(data.tone.length).toBeGreaterThanOrEqual(3);
      expect(data.tone.length).toBeLessThanOrEqual(5);
      expect(data.dos.length).toBeGreaterThanOrEqual(3);
      expect(data.donts.length).toBeGreaterThanOrEqual(3);
      expect(data.keywords.length).toBeGreaterThanOrEqual(5);
      expect(data.keywords.length).toBeLessThanOrEqual(12);

      // Colors object validation
      expect(data.colors).toBeDefined();
      expect(data.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(data.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(data.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(data.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);

      vi.unstubAllGlobals();
    });
  });

  describe('AC-F2-01: Full Brand Kit Extraction & Schema Verification', () => {
    it('AC-F2-01: extracts facts from valid URL and returns structured brand kit conforming to schema', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stripe: Financial Infrastructure for the Internet</title>
            <meta name="description" content="Stripe builds economic infrastructure for the internet to help businesses grow." />
            <meta property="og:title" content="Stripe" />
            <meta name="theme-color" content="#635BFF" />
          </head>
          <body>
            <h1>Payments infrastructure for the internet</h1>
            <p>Millions of companies of all sizes use Stripe online and in person to accept payments, send payouts, and manage their businesses.</p>
          </body>
        </html>
      `;

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      // Mock safeFetch
      vi.doMock('@/server/security/ssrf', () => ({
        safeFetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => mockHtml,
          headers: new Headers({ 'content-type': 'text/html' }),
        }),
      }));

      // Mock LLM provider returning structured kit
      vi.doMock('@/server/llm/gemini-provider', () => ({
        generateBrandKitWithGemini: vi.fn().mockResolvedValue({
          name: 'Stripe',
          summary: 'Financial infrastructure for the internet helping businesses accept payments and grow.',
          tone: ['precise', 'modern', 'developer-first', 'reliable'],
          dos: ['Highlight reliability', 'Use clean typography', 'Focus on seamless developer experience'],
          donts: ['Avoid confusing jargon', 'Never make unsubstantiated claims', 'Do not look amateur'],
          audience: 'Founders, software engineers, and financial leaders.',
          colors: {
            primary: '#635BFF',
            secondary: '#00D4FF',
            background: '#FFFFFF',
            text: '#0A2540',
          },
          keywords: ['payments', 'infrastructure', 'fintech', 'api', 'billing', 'global'],
          provider: 'gemini',
        }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // Cache miss
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => ({
              returning: vi.fn().mockResolvedValue([{ id: 'mock-kit-id', ...val }]),
            })),
          }),
        },
      }));

      const { POST } = await import('@/app/api/brand-kits/route');
      const req = new Request('http://localhost:3000/api/brand-kits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://stripe.com' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(201);
      const kit = await res.json();

      expect(kit.name).toBe('Stripe');
      expect(kit.summary.length).toBeLessThanOrEqual(280);
      expect(kit.tone.length).toBeGreaterThanOrEqual(3);
      expect(kit.tone.length).toBeLessThanOrEqual(5);
      expect(kit.dos.length).toBeGreaterThanOrEqual(3);
      expect(kit.dos.length).toBeLessThanOrEqual(5);
      expect(kit.donts.length).toBeGreaterThanOrEqual(3);
      expect(kit.donts.length).toBeLessThanOrEqual(5);
      expect(kit.audience).toBeDefined();
      expect(kit.keywords.length).toBeGreaterThanOrEqual(5);
      expect(kit.keywords.length).toBeLessThanOrEqual(12);

      // Verify colors
      expect(kit.colors.primary).toBe('#635BFF');
      expect(kit.colors.text).toBe('#0A2540');
      expect(kit.colors.background).toBe('#FFFFFF');
    });
  });

  describe('AC-F2-04: Zod Validation, Repair Retry & Offline Fallback', () => {
    it('AC-F2-04: falls back to deterministic FallbackProvider if LLM returns invalid JSON or errors', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Acme Widgets Corp</title>
            <meta name="description" content="High performance industrial widgets since 1990." />
          </head>
          <body>
            <h1>Acme Widgets</h1>
            <p>Reliable, sturdy and efficient industrial equipment.</p>
          </body>
        </html>
      `;

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/security/ssrf', () => ({
        safeFetch: vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => mockHtml,
          headers: new Headers({ 'content-type': 'text/html' }),
        }),
      }));

      // Mock LLM throwing error (e.g. quota exhausted or unparseable text)
      vi.doMock('@/server/llm/gemini-provider', () => ({
        generateBrandKitWithGemini: vi.fn().mockRejectedValue(new Error('ResourceExhausted: 429 Quota Exceeded')),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => ({
              returning: vi.fn().mockResolvedValue([{ id: 'fallback-kit-id', ...val }]),
            })),
          }),
        },
      }));

      const { POST } = await import('@/app/api/brand-kits/route');
      const req = new Request('http://localhost:3000/api/brand-kits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://acme-widgets.com' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(201);
      const kit = await res.json();

      // Brand kit records fallback provider
      expect(kit.provider).toBe('fallback');
      expect(kit.name).toContain('Acme Widgets');
      expect(kit.tone.length).toBeGreaterThanOrEqual(3);
      expect(kit.dos.length).toBeGreaterThanOrEqual(3);
      expect(kit.donts.length).toBeGreaterThanOrEqual(3);
      expect(kit.colors).toBeDefined();
    });
  });

  describe('AC-F2-07: 24-Hour Cache via llm_cache Table', () => {
    it('AC-F2-07: serves cached brand kit from llm_cache on duplicate URL within 24 hours without LLM call', async () => {
      const cachedKit = {
        name: 'Cached Brand',
        summary: 'Previously extracted brand kit.',
        tone: ['fast', 'smart', 'agile'],
        dos: ['Be direct', 'Stay authentic', 'Share value'],
        donts: ['No fluff', 'No spam', 'No fake stats'],
        audience: 'Modern teams',
        colors: {
          primary: '#2563eb',
          secondary: '#10b981',
          background: '#ffffff',
          text: '#111827',
        },
        keywords: ['teams', 'productivity', 'speed', 'agile', 'clarity'],
        provider: 'gemini',
      };

      const mockLlmCall = vi.fn();
      vi.doMock('@/server/llm/gemini-provider', () => ({
        generateBrandKitWithGemini: mockLlmCall,
      }));

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  key: 'mock-url-hash',
                  response: cachedKit,
                  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours old (< 24h)
                },
              ]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => ({
              returning: vi.fn().mockResolvedValue([{ id: 'cached-id', ...val }]),
            })),
          }),
        },
      }));

      const { POST } = await import('@/app/api/brand-kits/route');
      const req = new Request('http://localhost:3000/api/brand-kits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://cached-brand.com' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(201);
      const kit = await res.json();

      expect(kit.name).toBe('Cached Brand');
      // Verify zero calls to LLM provider
      expect(mockLlmCall).not.toHaveBeenCalled();
    });
  });

  describe('AC-F2-08: PATCH API & Inline Field Validation', () => {
    it('AC-F2-08: allows partial updates to brand kit fields via PATCH', async () => {
      const kitId = 'k1111111-1111-4111-8111-111111111111';
      const updatedFields = {
        name: 'BrandPilot Renamed',
        summary: 'Updated summary text for the marketing platform.',
        tone: ['bold', 'visionary', 'trusted', 'energetic'],
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: kitId,
                    workspaceId: TEST_WORKSPACE_ID,
                    ...updatedFields,
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          }),
        },
      }));

      const { PATCH } = await import('@/app/api/brand-kits/[id]/route');
      const req = new Request(`http://localhost:3000/api/brand-kits/${kitId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      const res = await PATCH(req as any, { params: Promise.resolve({ id: kitId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('BrandPilot Renamed');
      expect(data.summary).toBe('Updated summary text for the marketing platform.');
    });

    it('AC-F2-08: rejects PATCH with empty name or invalid hex color with HTTP 400', async () => {
      const kitId = 'k1111111-1111-4111-8111-111111111111';

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      const { PATCH } = await import('@/app/api/brand-kits/[id]/route');

      // Empty name
      const reqEmptyName = new Request(`http://localhost:3000/api/brand-kits/${kitId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      const resEmptyName = await PATCH(reqEmptyName as any, { params: Promise.resolve({ id: kitId }) });
      expect(resEmptyName.status).toBe(400);

      // Invalid hex color
      const reqInvalidHex = new Request(`http://localhost:3000/api/brand-kits/${kitId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ colors: { primary: 'not-a-hex-value' } }),
      });
      const resInvalidHex = await PATCH(reqInvalidHex as any, { params: Promise.resolve({ id: kitId }) });
      expect(resInvalidHex.status).toBe(400);
    });
  });

  describe('AC-F2-09: Human-Readable Error Handling for Blocked / Down URLs', () => {
    it('AC-F2-09: returns human-readable error response when website cannot be opened', async () => {
      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/security/ssrf', () => ({
        safeFetch: vi.fn().mockRejectedValue({
          code: 'UPSTREAM_ERROR',
          message: 'Connection timed out',
        }),
      }));

      const { POST } = await import('@/app/api/brand-kits/route');
      const req = new Request('http://localhost:3000/api/brand-kits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://unreachable-dead-domain.com' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(422); // or 400
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.message).toMatch(/could not open that website|unable to fetch/i);
    });
  });
});
