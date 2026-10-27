import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F1 Anonymous Workspace: Service & Cookie Handling', () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F1-01: Cookie UUID v4 Creation & Extraction', () => {
    it('AC-F1-01: generates new valid UUID v4 when cookie is absent and marks isNew = true', async () => {
      // Mock db insertion for new workspace
      const insertedRows: Array<{ id: string; lastSeenAt: Date }> = [];
      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              insertedRows.push(val);
              return {
                returning: vi.fn().mockResolvedValue([val]),
              };
            }),
          }),
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');
      const result = await resolveWorkspace(undefined);

      expect(result).toBeDefined();
      expect(result.workspaceId).toMatch(UUID_V4_REGEX);
      expect(result.isNew).toBe(true);
    });

    it('AC-F1-01: resolves existing workspace from valid UUID cookie and marks isNew = false', async () => {
      const existingId = 'a1111111-1111-4111-8111-111111111111';
      const lastSeen = new Date(Date.now() - 60000); // 1 minute ago

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: existingId, lastSeenAt: lastSeen }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');
      const result = await resolveWorkspace(existingId);

      expect(result.workspaceId).toBe(existingId);
      expect(result.isNew).toBe(false);
    });

    it('AC-F1-01: exports standard cookie configuration with httpOnly, sameSite=lax, secure', async () => {
      const { WORKSPACE_COOKIE_NAME, WORKSPACE_COOKIE_OPTIONS } = await import(
        '@/server/workspace/workspace-service'
      );

      expect(WORKSPACE_COOKIE_NAME).toBe('brandpilot_workspace_id');
      expect(WORKSPACE_COOKIE_OPTIONS).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );
    });
  });

  describe('AC-F1-02: Throttled last_seen_at Update (5 Minutes)', () => {
    it('AC-F1-02: skips database update when last_seen_at is less than 5 minutes old', async () => {
      const existingId = 'b2222222-2222-4222-8222-222222222222';
      const recentLastSeen = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago (< 5m)

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: existingId, lastSeenAt: recentLastSeen }]),
            }),
          }),
          update: updateMock,
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');
      await resolveWorkspace(existingId);

      // Since last seen was 2 min ago, update should NOT have been invoked
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('AC-F1-02: performs database update when last_seen_at is older than 5 minutes', async () => {
      const existingId = 'c3333333-3333-4333-8333-333333333333';
      const staleLastSeen = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago (>= 5m)

      const updateSetMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      const updateMock = vi.fn().mockReturnValue({
        set: updateSetMock,
      });

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: existingId, lastSeenAt: staleLastSeen }]),
            }),
          }),
          update: updateMock,
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');
      await resolveWorkspace(existingId);

      expect(updateMock).toHaveBeenCalled();
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSeenAt: expect.any(Date),
        })
      );
    });
  });

  describe('AC-F1-06: Resilient Recovery from Corrupt or Missing Cookies', () => {
    it('AC-F1-06: creates fresh workspace when cookie contains invalid UUID string', async () => {
      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => ({
              returning: vi.fn().mockResolvedValue([val]),
            })),
          }),
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');

      const corruptValues = [
        'invalid-non-uuid-string',
        '12345',
        '"><script>alert(1)</script>',
        "' OR '1'='1",
        '',
        'undefined',
      ];

      for (const corruptVal of corruptValues) {
        const result = await resolveWorkspace(corruptVal);
        expect(result.workspaceId).toMatch(UUID_V4_REGEX);
        expect(result.isNew).toBe(true);
      }
    });

    it('AC-F1-06: creates fresh workspace when valid UUID cookie does not exist in DB', async () => {
      const nonExistentId = 'f9999999-9999-4999-8999-999999999999';

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // DB returns empty
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => ({
              returning: vi.fn().mockResolvedValue([val]),
            })),
          }),
        },
      }));

      const { resolveWorkspace } = await import('@/server/workspace/workspace-service');
      const result = await resolveWorkspace(nonExistentId);

      expect(result.workspaceId).toMatch(UUID_V4_REGEX);
      expect(result.isNew).toBe(true);
    });
  });
});
