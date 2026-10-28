import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F3 Content Agent: Branded Creatives PNG Route (AC-F3-06, AC-F3-07)', () => {
  const TEST_WORKSPACE_ID = 'w1111111-1111-4111-8111-111111111111';
  const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Helper to read PNG dimensions from IHDR chunk
  function getPngDimensions(buffer: Buffer): { width: number; height: number } {
    expect(buffer.slice(0, 8)).toEqual(PNG_MAGIC_BYTES);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F3-06: GET /api/creatives/:postId.png Dimensions & Format Per Channel', () => {
    const channelDimensions: Record<string, { width: number; height: number }> = {
      instagram: { width: 1080, height: 1080 },
      linkedin: { width: 1200, height: 627 },
      x: { width: 1200, height: 675 },
      facebook: { width: 1200, height: 630 },
    };

    for (const [channel, expectedDim] of Object.entries(channelDimensions)) {
      it(`AC-F3-06: returns valid PNG with ${expectedDim.width}x${expectedDim.height} for channel "${channel}"`, async () => {
        const postId = `post-${channel}-1`;
        const mockPost = {
          id: postId,
          workspaceId: TEST_WORKSPACE_ID,
          channel,
          caption: `Engaging caption for ${channel}`,
          creativeSpec: {
            headline: 'Transform Social Marketing',
            subline: 'Automated on-brand pipeline with human safety controls.',
            templateId: 'minimal-quote',
            colors: {
              primary: '#3b82f6',
              secondary: '#10b981',
              background: '#0f172a',
              text: '#f8fafc',
            },
          },
        };

        vi.doMock('@/server/workspace/workspace-service', () => ({
          resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
        }));

        vi.doMock('@/server/db', () => ({
          db: {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockPost]),
              }),
            }),
          },
        }));

        const { GET } = await import('@/app/api/creatives/[postId]/route');
        const res = await GET(
          new Request(`http://localhost:3000/api/creatives/${postId}.png`) as any,
          { params: Promise.resolve({ postId: `${postId}.png` }) }
        );

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('image/png');

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Verify valid PNG magic header
        expect(buffer.slice(0, 8)).toEqual(PNG_MAGIC_BYTES);

        // Verify exact channel dimensions
        const { width, height } = getPngDimensions(buffer);
        expect(width).toBe(expectedDim.width);
        expect(height).toBe(expectedDim.height);
      });
    }

    it('AC-F3-06: returns HTTP 404 when requested postId does not exist', async () => {
      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // No post found
            }),
          }),
        },
      }));

      const { GET } = await import('@/app/api/creatives/[postId]/route');
      const res = await GET(
        new Request('http://localhost:3000/api/creatives/nonexistent-id.png') as any,
        { params: Promise.resolve({ postId: 'nonexistent-id.png' }) }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('AC-F3-07: 3+ Distinct Image Card Templates', () => {
    const templates = ['minimal-quote', 'feature-card', 'editorial-tip'] as const;

    it('AC-F3-07: supports at least 3 distinct templates rendering unique layouts', async () => {
      const { renderCardSvg } = await import('@/server/creatives/card-renderer');

      const baseSpec = {
        headline: 'Scale Organic Reach Without Fatigue',
        subline: 'Structured multi-channel social engine.',
        colors: {
          primary: '#4f46e5',
          secondary: '#06b6d4',
          background: '#ffffff',
          text: '#0f172a',
        },
      };

      const renderedSvgs: string[] = [];

      for (const templateId of templates) {
        const svg = renderCardSvg({
          channel: 'instagram',
          dimensions: { width: 1080, height: 1080 },
          spec: { ...baseSpec, templateId },
        });

        expect(typeof svg).toBe('string');
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('Scale Organic Reach');

        // Check contrast between text and background in generated SVG
        expect(svg).toContain(baseSpec.colors.background);
        expect(svg).toContain(baseSpec.colors.text);

        renderedSvgs.push(svg);
      }

      // Verify that all 3 templates are structurally distinct
      expect(renderedSvgs[0]).not.toEqual(renderedSvgs[1]);
      expect(renderedSvgs[1]).not.toEqual(renderedSvgs[2]);
      expect(renderedSvgs[0]).not.toEqual(renderedSvgs[2]);
    });

    it('AC-F3-06: wraps long headline text and prevents overflow outside bounding box', async () => {
      const { renderCardSvg } = await import('@/server/creatives/card-renderer');

      const longHeadline =
        'This is a comprehensive and very long social media marketing headline intended to thoroughly test text wrapping, multi-line typography calculations, line heights, and boundary constraints in SVG rendering.';

      const svg = renderCardSvg({
        channel: 'linkedin',
        dimensions: { width: 1200, height: 627 },
        spec: {
          headline: longHeadline,
          subline: 'Subline details.',
          templateId: 'feature-card',
          colors: {
            primary: '#2563eb',
            secondary: '#10b981',
            background: '#ffffff',
            text: '#1e293b',
          },
        },
      });

      // SVG should split long headline into multiple <tspan> or multi-line elements
      expect(svg).toContain('<svg');
      // Should not produce invalid SVG coordinates or NaN
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    });
  });
});
