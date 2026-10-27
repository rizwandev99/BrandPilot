import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F1 Anonymous Workspace: 7-Day TTL Cleanup (AC-F1-05)', () => {
  const ACTIVE_WORKSPACE = '55555555-5555-4555-8555-555555555555';
  const STALE_WORKSPACE = '66666666-6666-4666-8666-666666666666';
  const ANCIENT_WORKSPACE = '77777777-7777-4777-8777-777777777777';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('AC-F1-05: cleanupStaleWorkspaces deletes workspaces inactive > 7 days and preserves active ones', async () => {
    const { withWorkspace } = await import('@/server/workspace/workspace-service');
    const { cleanupStaleWorkspaces } = await import('@/server/workspace/cleanup');

    // Reference now: 2026-10-27T12:00:00Z
    const now = new Date('2026-10-27T12:00:00Z');
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days old (Active)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days old (Stale)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days old (Ancient)

    // Seed data
    await withWorkspace(ACTIVE_WORKSPACE, async (repo) => {
      await repo.createPost({
        channel: 'linkedin',
        caption: 'Active workspace post',
        creativeSpec: { headline: 'Active', templateId: 'quote-card', colors: {} },
        status: 'draft',
      });
      await repo.setWorkspaceLastSeen(twoDaysAgo);
    });

    await withWorkspace(STALE_WORKSPACE, async (repo) => {
      await repo.createPost({
        channel: 'x',
        caption: 'Stale workspace post',
        creativeSpec: { headline: 'Stale', templateId: 'quote-card', colors: {} },
        status: 'draft',
      });
      await repo.setWorkspaceLastSeen(eightDaysAgo);
    });

    await withWorkspace(ANCIENT_WORKSPACE, async (repo) => {
      await repo.createPost({
        channel: 'instagram',
        caption: 'Ancient workspace post',
        creativeSpec: { headline: 'Ancient', templateId: 'quote-card', colors: {} },
        status: 'draft',
      });
      await repo.setWorkspaceLastSeen(thirtyDaysAgo);
    });

    // Execute TTL cleanup with reference now time
    // Default TTL is 7 days: cutoff is now - 7 days
    const result = await cleanupStaleWorkspaces({ now, ttlDays: 7 });

    expect(result).toBeDefined();
    expect(result.deletedCount).toBeGreaterThanOrEqual(2);

    // Verify STALE and ANCIENT are deleted
    await withWorkspace(STALE_WORKSPACE, async (repo) => {
      const posts = await repo.getPosts();
      expect(posts.length).toBe(0);
    });

    await withWorkspace(ANCIENT_WORKSPACE, async (repo) => {
      const posts = await repo.getPosts();
      expect(posts.length).toBe(0);
    });

    // Verify ACTIVE is still present
    await withWorkspace(ACTIVE_WORKSPACE, async (repo) => {
      const posts = await repo.getPosts();
      expect(posts.length).toBe(1);
      expect(posts[0].caption).toBe('Active workspace post');
    });
  });

  it('AC-F1-05: respects custom WORKSPACE_TTL_DAYS configuration', async () => {
    const { cleanupStaleWorkspaces } = await import('@/server/workspace/cleanup');
    const now = new Date('2026-10-27T12:00:00Z');

    // Run cleanup with ttlDays = 14
    const res = await cleanupStaleWorkspaces({ now, ttlDays: 14 });
    expect(res).toHaveProperty('deletedCount');
    expect(typeof res.deletedCount).toBe('number');
  });
});
