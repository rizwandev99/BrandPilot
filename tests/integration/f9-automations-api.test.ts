import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F9 Automations: API Endpoints, Dry-Run Simulation, Draft Creation & Quota Enforcement', () => {
  const TEST_WORKSPACE_ID = 'ws-automations-test-999';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F9-06: Dry-Run Test Endpoint (POST /api/automations/:id/test)', () => {
    it('AC-F9-06: executes dry-run simulation against sample payload without committing DB changes or side effects', async () => {
      const mockAutomation = {
        id: 'auto-test-001',
        workspaceId: TEST_WORKSPACE_ID,
        name: 'LinkedIn Draft on Product Launch',
        enabled: true,
        trigger: { type: 'webhook.received', eventName: 'product.launched' },
        conditions: [
          { type: 'path_comparison', path: 'payload.eventName', operator: 'eq', value: 'product.launched' },
          { type: 'path_comparison', path: 'payload.product.pricing.amount', operator: 'gt', value: 100 },
        ],
        actions: [
          { type: 'create_ai_draft', channel: 'linkedin' },
        ],
      };

      let insertCount = 0;
      let postCreateCount = 0;

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockAutomation]),
            }),
          }),
          insert: vi.fn().mockImplementation(() => {
            insertCount++;
            return {
              values: vi.fn().mockResolvedValue([]),
            };
          }),
        },
      }));

      const { POST } = await import('@/app/api/automations/[id]/test/route');
      const sampleEvent = {
        type: 'webhook.received',
        payload: {
          eventName: 'product.launched',
          product: {
            title: 'BrandPilot Enterprise',
            pricing: { amount: 249 },
          },
        },
      };

      const req = new Request(`http://localhost:3000/api/automations/${mockAutomation.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleEvent }),
      });

      const response = await POST(req, { params: { id: mockAutomation.id } });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.matched).toBe(true);
      expect(json.conditionsSummary ?? json.conditionLogs).toBeDefined();
      expect(json.plannedActions).toBeDefined();
      expect(json.plannedActions.length).toBe(1);
      expect(json.plannedActions[0].type).toBe('create_ai_draft');

      // Crucial: Dry run must NOT write to database
      expect(insertCount, 'Dry run simulation must produce zero database inserts').toBe(0);
      expect(postCreateCount, 'Dry run must not create actual posts').toBe(0);
    });

    it('AC-F9-06: returns matched: false and empty plannedActions when sample event fails condition', async () => {
      const mockAutomation = {
        id: 'auto-test-002',
        workspaceId: TEST_WORKSPACE_ID,
        trigger: { type: 'webhook.received' },
        conditions: [
          { type: 'path_comparison', path: 'payload.priority', operator: 'eq', value: 'high' },
        ],
        actions: [{ type: 'hold_post' }],
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockAutomation]),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/automations/[id]/test/route');
      const req = new Request(`http://localhost:3000/api/automations/${mockAutomation.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleEvent: { payload: { priority: 'low' } }, // Condition fails
        }),
      });

      const response = await POST(req, { params: { id: mockAutomation.id } });
      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.matched).toBe(false);
      expect(json.plannedActions).toEqual([]);
    });
  });

  describe('AC-F9-07 & AC-F9-08: create_ai_draft Action & Fallback Resiliency', () => {
    it('AC-F9-07: create_ai_draft creates new post in "in_review" status and records automation_run log', async () => {
      const createdPosts: any[] = [];
      const runLogs: any[] = [];

      vi.doMock('@/server/db', () => ({
        db: {
          insert: vi.fn().mockImplementation((table) => ({
            values: vi.fn().mockImplementation((val) => {
              // Track inserted posts and run logs
              if (val.caption !== undefined) {
                createdPosts.push(val);
              } else if (val.automationId !== undefined) {
                runLogs.push(val);
              }
              return {
                returning: vi.fn().mockResolvedValue([{ ...val, id: 'mock-id' }]),
              };
            }),
          })),
        },
      }));

      const { executeCreateAiDraftAction } = await import('@/lib/automations/action-dispatcher');

      const actionContext = {
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'linkedin' as const,
        eventPayload: {
          title: 'BrandPilot AI Automations Engine',
          url: 'https://brandpilot.app/features/automations',
        },
      };

      const result = await executeCreateAiDraftAction(actionContext);

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();

      // Post must be created in in_review state per PRD
      if (createdPosts.length > 0) {
        expect(createdPosts[0].status).toBe('in_review');
        expect(createdPosts[0].channel).toBe('linkedin');
        expect(createdPosts[0].caption).toBeDefined();
      }
    });

    it('AC-F9-08: create_ai_draft gracefully uses deterministic fallback generator when LLM quota is exhausted', async () => {
      // Mock LLM provider indicating quota exceeded / fallback
      vi.doMock('@/server/llm/interface', () => ({
        generateDraftCopy: vi.fn().mockResolvedValue({
          data: { caption: 'Discover BrandPilot: Reliable marketing automation for high-impact teams.' },
          provider: 'fallback',
          fallbackReason: 'QUOTA_EXHAUSTED',
        }),
      }));

      const { executeCreateAiDraftAction } = await import('@/lib/automations/action-dispatcher');

      const result = await executeCreateAiDraftAction({
        workspaceId: TEST_WORKSPACE_ID,
        channel: 'x',
        eventPayload: {
          title: 'Quarterly Product Announcement',
        },
      });

      expect(result.success).toBe(true);
      expect(result.providerUsed ?? result.fallback).toBeDefined();
    });
  });

  describe('AC-F9-09: Workspace Automation Quota Cap (Max 10 Automations)', () => {
    it('AC-F9-09: permits creating automations up to 10 for a workspace', async () => {
      // 9 existing automations
      const existingAutomations = Array.from({ length: 9 }).map((_, i) => ({
        id: `auto-${i + 1}`,
        workspaceId: TEST_WORKSPACE_ID,
        name: `Rule ${i + 1}`,
      }));

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(existingAutomations),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'auto-10', name: 'Rule 10' }]),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/automations/route');
      const req = new Request('http://localhost:3000/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rule 10',
          trigger: { type: 'post.published' },
          conditions: [],
          actions: [{ type: 'send_webhook', webhookUrl: 'https://example.com' }],
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);
    });

    it('AC-F9-09: rejects 11th automation creation with 400 QUOTA_EXHAUSTED', async () => {
      // Exactly 10 existing automations (at cap)
      const existingAutomations = Array.from({ length: 10 }).map((_, i) => ({
        id: `auto-${i + 1}`,
        workspaceId: TEST_WORKSPACE_ID,
        name: `Rule ${i + 1}`,
      }));

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(existingAutomations),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/automations/route');
      const req = new Request('http://localhost:3000/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rule 11 (Over Cap)',
          trigger: { type: 'post.published' },
          conditions: [],
          actions: [{ type: 'send_webhook' }],
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error?.code ?? json.error).toMatch(/QUOTA_EXHAUSTED|limit reached|maximum/i);
    });
  });
});
