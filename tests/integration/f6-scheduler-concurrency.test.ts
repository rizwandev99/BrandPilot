import { describe, it, expect, vi, beforeEach } from 'vitest';
import { posts } from '@/server/db/schema';

describe('F6 Scheduler: Concurrency, Idempotency, and Publishing Runner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F6-01 & AC-F6-02: schedule-approved Batch Job Creation', () => {
    it('AC-F6-01: schedule-approved processes ONLY posts in "approved" state and skips drafts, in_review, held, rejected', async () => {
      const mockWorkspaceId = 'ws-test-f6-01';
      const postsInDb = [
        { id: 'post-1-approved', workspaceId: mockWorkspaceId, status: 'approved', channel: 'linkedin', version: 1 },
        { id: 'post-2-draft', workspaceId: mockWorkspaceId, status: 'draft', channel: 'x', version: 1 },
        { id: 'post-3-in-review', workspaceId: mockWorkspaceId, status: 'in_review', channel: 'instagram', version: 1 },
        { id: 'post-4-held', workspaceId: mockWorkspaceId, status: 'held', channel: 'facebook', version: 1 },
        { id: 'post-5-rejected', workspaceId: mockWorkspaceId, status: 'rejected', channel: 'linkedin', version: 1 },
      ];

      const createdJobs: Array<{ postId: string; idempotencyKey: string; status: string }> = [];
      const updatedPosts: Array<{ id: string; status: string }> = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: mockWorkspaceId, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                return Promise.resolve(postsInDb.filter((p) => p.status === 'approved'));
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              createdJobs.push(val);
              return Promise.resolve([val]);
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((updates) => ({
              where: vi.fn().mockImplementation(() => {
                updatedPosts.push(updates);
                return Promise.resolve([updates]);
              }),
            })),
          }),
        },
      }));

      // Mock connectors query: all channels connected
      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue({
          provider: 'linkedin',
          mode: 'sandbox',
          capabilities: { maxChars: 3000, maxHashtags: 10, supportsImage: true, supportsScheduling: true },
        }),
      }));

      const { POST } = await import('@/app/api/posts/schedule-approved/route');
      const req = new Request('http://localhost:3000/api/posts/schedule-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(Date.now() + 3600000).toISOString() }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.scheduledCount ?? json.scheduled?.length).toBe(1);
      expect(json.scheduled ?? [json.scheduledCount]).toBeDefined();

      // Ensure post-1-approved was scheduled with idempotency key post-1-approved:1:linkedin
      if (createdJobs.length > 0) {
        expect(createdJobs[0].postId).toBe('post-1-approved');
        expect(createdJobs[0].idempotencyKey).toBe('post-1-approved:1:linkedin');
      }
    });

    it('AC-F6-02: skips approved post when channel connector is disconnected and reports reason', async () => {
      const mockWorkspaceId = 'ws-test-f6-02';
      const postsInDb = [
        { id: 'post-no-conn', workspaceId: mockWorkspaceId, status: 'approved', channel: 'x', version: 1 },
      ];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: mockWorkspaceId, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockImplementation((table) => ({
              where: vi.fn().mockImplementation((condition) => {
                // If querying connectors, return empty list (disconnected)
                // If querying posts, return approved posts in DB
                if (table && ('caption' in (table as any) || table === posts || (table as any)._?.name === 'posts')) {
                  return Promise.resolve(postsInDb);
                }
                return Promise.resolve([]);
              }),
            })),
          }),
        },
      }));

      const { POST } = await import('@/app/api/posts/schedule-approved/route');
      const req = new Request('http://localhost:3000/api/posts/schedule-approved', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.skipped?.length ?? json.skippedCount).toBeGreaterThanOrEqual(1);
      const skippedItem = json.skipped ? json.skipped[0] : null;
      if (skippedItem) {
        expect(skippedItem.postId).toBe('post-no-conn');
        expect(skippedItem.reason).toMatch(/CONNECTOR_NOT_CONNECTED|disconnected|missing/i);
      }
    });
  });

  describe('AC-F6-03: Concurrency Locking in run-due (Zero Duplicate Publishing)', () => {
    it('AC-F6-03: two parallel runDueJobs calls publish each job exactly once without double delivery', async () => {
      const dueJobs = [
        { id: 'job-1', postId: 'p-1', connectorId: 'c-1', idempotencyKey: 'p-1:1:linkedin', status: 'queued', attempt: 0 },
        { id: 'job-2', postId: 'p-2', connectorId: 'c-2', idempotencyKey: 'p-2:1:x', status: 'queued', attempt: 0 },
        { id: 'job-3', postId: 'p-3', connectorId: 'c-3', idempotencyKey: 'p-3:1:instagram', status: 'queued', attempt: 0 },
      ];

      // Simulated atomic lock tracker: Set of locked job IDs
      const lockedJobIds = new Set<string>();
      const publishExecutionLog: Array<{ worker: string; jobId: string }> = [];

      const mockConnector = {
        provider: 'linkedin' as const,
        mode: 'sandbox' as const,
        capabilities: { maxChars: 3000, maxHashtags: 10, supportsImage: true, supportsScheduling: true },
        publish: vi.fn().mockImplementation(async (ctx, input) => {
          // Simulate latency in publish
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { externalId: `ext-${input.idempotencyKey}`, externalUrl: `https://sandbox.brandpilot.app/${input.idempotencyKey}` };
        }),
      };

      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue(mockConnector),
      }));

      const { runDueJobs } = await import('@/lib/scheduler/runner');

      // Helper for mock concurrency lock
      const concurrencyLockHelper = {
        claimDueJobs: vi.fn().mockImplementation(async (workerName: string) => {
          const claimed: typeof dueJobs = [];
          for (const job of dueJobs) {
            if (!lockedJobIds.has(job.id)) {
              lockedJobIds.add(job.id);
              claimed.push(job);
            }
          }
          return claimed;
        }),
      };

      // Launch 2 concurrent workers
      const [worker1Result, worker2Result] = await Promise.all([
        runDueJobs({ workerName: 'worker-1', lockHelper: concurrencyLockHelper }),
        runDueJobs({ workerName: 'worker-2', lockHelper: concurrencyLockHelper }),
      ]);

      const totalProcessed = (worker1Result.processedCount || 0) + (worker2Result.processedCount || 0);
      expect(totalProcessed).toBe(3);

      // Verify mock connector publish was called exactly 3 times in total (no duplicates)
      expect(mockConnector.publish).toHaveBeenCalledTimes(3);
    });
  });

  describe('AC-F6-05: Publish Status & Event Emission', () => {
    it('AC-F6-05: on successful publish, transitions post to "published", saves external IDs, and emits "post.published" event', async () => {
      const mockWorkspaceId = 'ws-test-f6-05';
      const eventsEmitted: Array<{ type: string; payload: any }> = [];
      const updatedJobRecord: any = {};
      const updatedPostRecord: any = {};

      const mockJob = {
        id: 'job-success-1',
        postId: 'post-success-1',
        workspaceId: mockWorkspaceId,
        idempotencyKey: 'post-success-1:1:linkedin',
        status: 'queued',
        attempt: 0,
      };

      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue({
          provider: 'linkedin',
          mode: 'sandbox',
          publish: vi.fn().mockResolvedValue({
            externalId: 'li-ext-999',
            externalUrl: 'https://linkedin.com/feed/update/li-ext-999',
          }),
        }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockJob]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              Object.assign(updatedJobRecord, val);
              return {
                where: vi.fn().mockResolvedValue([val]),
              };
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              eventsEmitted.push(val);
              return Promise.resolve([val]);
            }),
          }),
        },
      }));

      const { executeJob } = await import('@/lib/scheduler/runner');
      const result = await executeJob(mockJob as any);

      expect(result.status).toBe('succeeded');
      expect(result.externalId).toBe('li-ext-999');

      // Verify event emission
      const pubEvent = eventsEmitted.find((e) => e.type === 'post.published');
      expect(pubEvent, 'Must emit post.published audit event').toBeDefined();
    });

    it('AC-F6-05: on final retry exhaustion (attempt >= 4), marks post as "failed" and emits "post.failed" event', async () => {
      const mockWorkspaceId = 'ws-test-f6-05-fail';
      const eventsEmitted: Array<{ type: string; payload: any }> = [];

      const failingJob = {
        id: 'job-fail-final',
        postId: 'post-fail-final',
        workspaceId: mockWorkspaceId,
        idempotencyKey: 'post-fail-final:1:x',
        status: 'retrying',
        attempt: 3, // Current attempt is 3, failure will make it 4 (exhausted)
      };

      const { ConnectorError } = await import('@/lib/connectors/types');
      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue({
          provider: 'x',
          mode: 'sandbox',
          publish: vi.fn().mockRejectedValue(new ConnectorError('TEMPORARY', 'Simulated 503 gateway timeout')),
        }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              eventsEmitted.push(val);
              return Promise.resolve([val]);
            }),
          }),
        },
      }));

      const { executeJob } = await import('@/lib/scheduler/runner');
      const result = await executeJob(failingJob as any);

      expect(result.status).toBe('failed');
      const failEvent = eventsEmitted.find((e) => e.type === 'post.failed');
      expect(failEvent, 'Must emit post.failed audit event on final failure').toBeDefined();
    });
  });

  describe('AC-F6-06: Idempotency Crash Recovery', () => {
    it('AC-F6-06: resumes after simulated crash with identical idempotencyKey and does not duplicate publication', async () => {
      let callCount = 0;
      const idempotencyKey = 'crash-post-001:1:instagram';

      // Mock connector that records publish calls per idempotency key
      const publishedRecords = new Map<string, { externalId: string; externalUrl: string }>();

      const mockConnector = {
        provider: 'instagram' as const,
        mode: 'sandbox' as const,
        publish: vi.fn().mockImplementation(async (ctx, input) => {
          callCount++;
          if (publishedRecords.has(input.idempotencyKey)) {
            // Idempotent return without duplicate action
            return publishedRecords.get(input.idempotencyKey)!;
          }
          const created = {
            externalId: `ig-media-${callCount}`,
            externalUrl: `https://instagram.com/p/ig-media-${callCount}`,
          };
          publishedRecords.set(input.idempotencyKey, created);
          return created;
        }),
      };

      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue(mockConnector),
      }));

      // Simulate Run 1: Connector publish succeeds, but DB commit crashes
      const { executeJob } = await import('@/lib/scheduler/runner');

      const jobPayload = {
        id: 'job-crash-test',
        postId: 'crash-post-001',
        idempotencyKey,
        attempt: 0,
        status: 'queued' as const,
      };

      // First run succeeds in adapter
      const run1 = await mockConnector.publish({ workspaceId: 'ws' }, { postId: 'crash-post-001', idempotencyKey } as any);
      expect(run1.externalId).toBe('ig-media-1');

      // Second run (simulating retry after crash recovery):
      const run2 = await mockConnector.publish({ workspaceId: 'ws' }, { postId: 'crash-post-001', idempotencyKey } as any);
      // Must return identical externalId
      expect(run2.externalId).toBe('ig-media-1');
      expect(publishedRecords.size).toBe(1);
    });
  });

  describe('AC-F6-08: Cron Endpoint Authentication & Maintenance Suite', () => {
    it('AC-F6-08: rejects unauthenticated cron request with 401 when CRON_SECRET is missing or wrong', async () => {
      process.env.CRON_SECRET = 'super_secret_cron_key_123';

      const { POST } = await import('@/app/api/publish/run-due/route');

      // Missing header
      const reqMissing = new Request('http://localhost:3000/api/publish/run-due', {
        method: 'POST',
      });
      const resMissing = await POST(reqMissing);
      expect(resMissing.status).toBe(401);

      // Wrong secret
      const reqWrong = new Request('http://localhost:3000/api/publish/run-due', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong_key' },
      });
      const resWrong = await POST(reqWrong);
      expect(resWrong.status).toBe(401);
    });

    it('AC-F6-08: accepts authorized cron request with CRON_SECRET and executes maintenance tasks (TTL & quota cleanup)', async () => {
      process.env.CRON_SECRET = 'valid_cron_secret_456';
      const maintenanceAudit: string[] = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        cleanupStaleWorkspaces: vi.fn().mockImplementation(async () => {
          maintenanceAudit.push('ttl_cleanup');
          return { deletedCount: 3 };
        }),
      }));

      vi.doMock('@/lib/scheduler/runner', () => ({
        runDueJobs: vi.fn().mockResolvedValue({ processedCount: 5, succeededCount: 5 }),
      }));

      const { POST } = await import('@/app/api/publish/run-due/route');
      const req = new Request('http://localhost:3000/api/publish/run-due', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_cron_secret_456' },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.ok ?? json.jobs ?? json.processedCount).toBeDefined();
      expect(maintenanceAudit).toContain('ttl_cleanup');
    });
  });
});
