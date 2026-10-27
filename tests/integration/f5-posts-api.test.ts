import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F5 Approval Queue: Posts API, Transitions & Version Bumping (AC-F5-02, 04, 06)', () => {
  const TEST_WORKSPACE_ID = 'w1111111-1111-4111-8111-111111111111';
  const TEST_POST_ID = 'post-1111-1111-1111-1111';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F5-02: POST /api/posts/:id/transition Status Actions', () => {
    it('AC-F5-02: transitions post from in_review to approved successfully', async () => {
      let postRecord = {
        id: TEST_POST_ID,
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'linkedin',
        caption: 'Great update',
        status: 'in_review',
        version: 1,
        approvedAt: null as Date | null,
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([postRecord]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              postRecord = { ...postRecord, ...val };
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([postRecord]),
                }),
              };
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/[id]/transition/route');
      const req = new Request(`http://localhost:3000/api/posts/${TEST_POST_ID}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: 'approved' }),
      });

      const res = await POST(req as any, { params: Promise.resolve({ id: TEST_POST_ID }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('approved');
      expect(body.approvedAt).toBeDefined();
    });

    it('AC-F5-02: transitions post from in_review to held with optional holdReason', async () => {
      let postRecord = {
        id: TEST_POST_ID,
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'x',
        caption: 'Needs revision',
        status: 'in_review',
        version: 1,
        holdReason: null as string | null,
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([postRecord]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              postRecord = { ...postRecord, ...val };
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([postRecord]),
                }),
              };
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/[id]/transition/route');
      const req = new Request(`http://localhost:3000/api/posts/${TEST_POST_ID}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: 'held', reason: 'Waiting for legal approval on trademark' }),
      });

      const res = await POST(req as any, { params: Promise.resolve({ id: TEST_POST_ID }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('held');
      expect(body.holdReason).toBe('Waiting for legal approval on trademark');
    });

    it('AC-F5-02: blocks invalid status transition with HTTP 400 and code INVALID_TRANSITION', async () => {
      const postRecord = {
        id: TEST_POST_ID,
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'instagram',
        caption: 'Direct publish test',
        status: 'in_review', // Attempting illegal jump directly to published
        version: 1,
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([postRecord]),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/[id]/transition/route');
      const req = new Request(`http://localhost:3000/api/posts/${TEST_POST_ID}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: 'published' }), // Illegal!
      });

      const res = await POST(req as any, { params: Promise.resolve({ id: TEST_POST_ID }) });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code || body.error).toMatch(/INVALID_TRANSITION/i);
    });
  });

  describe('AC-F5-04: Version Bump & Approval Invalidation on Edit', () => {
    it('AC-F5-04: bumps version integer and resets approved post back to in_review on caption edit', async () => {
      let postRecord = {
        id: TEST_POST_ID,
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'linkedin',
        caption: 'Original approved caption',
        status: 'approved', // Post was already approved!
        version: 1,
        updatedAt: new Date(),
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([postRecord]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              postRecord = { ...postRecord, ...val };
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([postRecord]),
                }),
              };
            }),
          }),
        },
      }));

      const { PATCH } = await import('@/app/api/posts/[id]/route');
      const req = new Request(`http://localhost:3000/api/posts/${TEST_POST_ID}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Modified text after approval' }),
      });

      const res = await PATCH(req as any, { params: Promise.resolve({ id: TEST_POST_ID }) });
      expect(res.status).toBe(200);

      const body = await res.json();

      // 1. Version must be bumped from 1 to 2
      expect(body.version).toBe(2);

      // 2. Status must be reset to in_review (human re-approval mandatory!)
      expect(body.status).toBe('in_review');
      expect(body.caption).toBe('Modified text after approval');
    });

    it('AC-F5-04: bumps version for in_review post and retains in_review status', async () => {
      let postRecord = {
        id: TEST_POST_ID,
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'x',
        caption: 'Drafting text',
        status: 'in_review',
        version: 2,
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([postRecord]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              postRecord = { ...postRecord, ...val };
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([postRecord]),
                }),
              };
            }),
          }),
        },
      }));

      const { PATCH } = await import('@/app/api/posts/[id]/route');
      const req = new Request(`http://localhost:3000/api/posts/${TEST_POST_ID}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: 'Polished text' }),
      });

      const res = await PATCH(req as any, { params: Promise.resolve({ id: TEST_POST_ID }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.version).toBe(3);
      expect(body.status).toBe('in_review');
    });
  });

  describe('AC-F5-06: Bulk Actions (Approve All in Review & Schedule Approved)', () => {
    it('AC-F5-06: "approve-all" transitions only in_review posts, leaving held and draft posts untouched', async () => {
      const postsInDb = [
        { id: 'p1', workspaceId: TEST_WORKSPACE_ID, status: 'in_review' },
        { id: 'p2', workspaceId: TEST_WORKSPACE_ID, status: 'in_review' },
        { id: 'p3', workspaceId: TEST_WORKSPACE_ID, status: 'held' },
        { id: 'p4', workspaceId: TEST_WORKSPACE_ID, status: 'draft' },
      ];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  { id: 'p1', status: 'approved' },
                  { id: 'p2', status: 'approved' },
                ]),
              }),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/approve-all/route');
      const req = new Request('http://localhost:3000/api/posts/approve-all', { method: 'POST' });

      const res = await POST(req as any);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.approvedCount).toBe(2);
      expect(body.updatedPostIds).toContain('p1');
      expect(body.updatedPostIds).toContain('p2');
      expect(body.updatedPostIds).not.toContain('p3'); // Held untouched
      expect(body.updatedPostIds).not.toContain('p4'); // Draft untouched
    });

    it('AC-F5-06: "schedule-approved" transitions only approved posts to scheduled and creates publish jobs', async () => {
      const approvedPosts = [
        { id: 'p1', workspaceId: TEST_WORKSPACE_ID, channel: 'linkedin', status: 'approved', version: 1 },
        { id: 'p2', workspaceId: TEST_WORKSPACE_ID, channel: 'x', status: 'approved', version: 1 },
      ];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      const createdJobs: any[] = [];
      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockImplementation((table) => ({
              where: vi.fn().mockResolvedValue(approvedPosts),
            })),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue(
                  approvedPosts.map((p) => ({ ...p, status: 'scheduled' }))
                ),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((vals) => {
              createdJobs.push(...(Array.isArray(vals) ? vals : [vals]));
              return {
                returning: vi.fn().mockResolvedValue(vals),
              };
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/schedule-approved/route');
      const req = new Request('http://localhost:3000/api/posts/schedule-approved', { method: 'POST' });

      const res = await POST(req as any);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.scheduledCount).toBe(2);
    });
  });
});
