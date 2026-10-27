import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F11 Quota & Fallbacks: Workspace Data Caps & Event Trimming (AC-F11-06)', () => {
  const TEST_WORKSPACE = '88888888-8888-4888-8888-888888888888';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F11-06: Strict Resource Caps (Brand Kits, Posts, Automations)', () => {
    it('AC-F11-06: rejects brand kit creation with VALIDATION_ERROR when workspace reaches cap of 5', async () => {
      const { withWorkspace } = await import('@/server/workspace/workspace-service');

      await withWorkspace(TEST_WORKSPACE, async (repo) => {
        // Pre-fill 5 brand kits
        for (let i = 1; i <= 5; i++) {
          await repo.createBrandKit({
            name: `Kit ${i}`,
            summary: `Summary ${i}`,
            tone: ['bold'],
            dos: [],
            donts: [],
            audience: 'Devs',
            colors: { primary: '#111', secondary: '#222', background: '#fff', text: '#000' },
            keywords: [`k${i}`],
          });
        }

        // 6th brand kit creation must fail with VALIDATION_ERROR
        await expect(
          repo.createBrandKit({
            name: 'Kit 6 (Over Cap)',
            summary: 'Should be blocked',
            tone: ['bold'],
            dos: [],
            donts: [],
            audience: 'Devs',
            colors: { primary: '#111', secondary: '#222', background: '#fff', text: '#000' },
            keywords: ['k6'],
          })
        ).rejects.toThrow(/limit|cap|max|5|VALIDATION_ERROR/i);
      });
    });

    it('AC-F11-06: rejects post creation with VALIDATION_ERROR when workspace reaches cap of 60', async () => {
      const { withWorkspace } = await import('@/server/workspace/workspace-service');

      await withWorkspace(TEST_WORKSPACE, async (repo) => {
        // Set post count to 60 via test helper or mock
        await repo.setMockResourceCount('posts', 60);

        await expect(
          repo.createPost({
            channel: 'linkedin',
            caption: '61st post exceeding cap',
            creativeSpec: { headline: 'Cap reached', templateId: 'quote-card', colors: {} },
            status: 'draft',
          })
        ).rejects.toThrow(/limit|cap|max|60|VALIDATION_ERROR/i);
      });
    });

    it('AC-F11-06: rejects automation creation with VALIDATION_ERROR when workspace reaches cap of 10', async () => {
      const { withWorkspace } = await import('@/server/workspace/workspace-service');

      await withWorkspace(TEST_WORKSPACE, async (repo) => {
        await repo.setMockResourceCount('automations', 10);

        await expect(
          repo.createAutomation({
            name: '11th Automation',
            enabled: true,
            trigger: { type: 'webhook.received' },
            conditions: [],
            actions: [],
          })
        ).rejects.toThrow(/limit|cap|max|10|VALIDATION_ERROR/i);
      });
    });
  });

  describe('AC-F11-06: Automatic Event Trimming at 200 Items', () => {
    it('AC-F11-06: automatically prunes oldest events to cap total events at 200', async () => {
      const { withWorkspace } = await import('@/server/workspace/workspace-service');

      await withWorkspace(TEST_WORKSPACE, async (repo) => {
        // Seed 200 events
        await repo.seedMockEvents(200);

        // Add 5 more events (total would be 205)
        for (let i = 1; i <= 5; i++) {
          await repo.createEvent({
            type: 'event.overflow',
            source: 'system',
            payload: { index: i },
          });
        }

        // Total count of events in workspace must remain exactly 200
        const events = await repo.getEvents();
        expect(events.length).toBe(200);
      });
    });
  });
});
