import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F1 Anonymous Workspace: Workspace Reset API (AC-F1-04)', () => {
  const TEST_WORKSPACE = '33333333-3333-4333-8333-333333333333';
  const OTHER_WORKSPACE = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('AC-F1-04: reset cascades deletions across child entities and re-seeds 4 default sandbox connectors', async () => {
    const { withWorkspace } = await import('@/server/workspace/workspace-service');

    // 1. Seed records in TEST_WORKSPACE
    await withWorkspace(TEST_WORKSPACE, async (repo) => {
      await repo.createBrandKit({
        name: 'Obsolete Kit',
        summary: 'To be wiped',
        tone: ['casual'],
        dos: [],
        donts: [],
        audience: 'General',
        colors: { primary: '#111111', secondary: '#222222', background: '#ffffff', text: '#000000' },
        keywords: ['temp'],
      });

      await repo.createPost({
        channel: 'x',
        caption: 'Ephemeral post to be wiped',
        creativeSpec: { headline: 'Bye', templateId: 'default', colors: {} },
        status: 'draft',
      });

      await repo.createEvent({
        type: 'test.event',
        source: 'system',
        payload: { message: 'event to wipe' },
      });
    });

    // Seed a record in OTHER_WORKSPACE to verify isolation
    await withWorkspace(OTHER_WORKSPACE, async (repo) => {
      await repo.createBrandKit({
        name: 'Preserved Other Kit',
        summary: 'Must NOT be wiped',
        tone: ['serious'],
        dos: [],
        donts: [],
        audience: 'Enterprise',
        colors: { primary: '#333333', secondary: '#444444', background: '#ffffff', text: '#000000' },
        keywords: ['keep'],
      });
    });

    // 2. Invoke POST /api/workspace/reset route
    const { POST } = await import('@/app/api/workspace/reset/route');
    const mockRequest = new Request('http://localhost:3000/api/workspace/reset', {
      method: 'POST',
      headers: {
        cookie: `brandpilot_workspace_id=${TEST_WORKSPACE}`,
      },
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    // 3. Verify TEST_WORKSPACE data was wiped
    await withWorkspace(TEST_WORKSPACE, async (repo) => {
      const kits = await repo.getBrandKits();
      expect(kits.length, 'All brand kits should be wiped on reset').toBe(0);

      const posts = await repo.getPosts();
      expect(posts.length, 'All posts should be wiped on reset').toBe(0);

      const events = await repo.getEvents();
      expect(events.length, 'All events should be wiped on reset').toBe(0);

      // Verify re-seeding of 4 sandbox connectors
      const connectors = await repo.getConnectors();
      expect(connectors.length, 'Must re-seed 4 default connectors').toBe(4);

      const providers = connectors.map((c: { provider: string }) => c.provider);
      expect(providers).toContain('linkedin');
      expect(providers).toContain('instagram');
      expect(providers).toContain('x');
      expect(providers).toContain('facebook');

      for (const conn of connectors) {
        expect(conn.mode).toBe('sandbox');
        expect(conn.status).toBe('connected');
      }
    });

    // 4. Verify OTHER_WORKSPACE data is untouched
    await withWorkspace(OTHER_WORKSPACE, async (repo) => {
      const otherKits = await repo.getBrandKits();
      expect(otherKits.length, "Other workspace's brand kits must remain intact").toBe(1);
      expect(otherKits[0].name).toBe('Preserved Other Kit');
    });
  });
});
