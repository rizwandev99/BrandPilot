import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F7 Connectors UI & Simulation API (AC-F7-01, 02, 03, 04, 05)', () => {
  const TEST_WORKSPACE_ID = 'w1111111-1111-4111-8111-111111111111';
  const EXPECTED_PROVIDERS = ['linkedin', 'instagram', 'x', 'facebook'] as const;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F7-01: GET /api/connectors Provider Listing & Details', () => {
    it('AC-F7-01: returns cards for all 4 providers with mode, status, and account labels', async () => {
      const mockConnectors = EXPECTED_PROVIDERS.map((provider) => ({
        id: `conn-${provider}`,
        workspaceId: TEST_WORKSPACE_ID,
        provider,
        mode: 'sandbox',
        status: 'connected',
        accountLabel: `Sandbox ${provider.toUpperCase()}`,
        simulationFailure: 'none',
        lastHealthCheckAt: new Date(),
        createdAt: new Date(),
      }));

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockConnectors),
            }),
          }),
        },
      }));

      const { GET } = await import('@/app/api/connectors/route');
      const req = new Request('http://localhost:3000/api/connectors');
      const res = await GET(req as any);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(4);

      const returnedProviders = data.map((c: any) => c.provider);
      for (const p of EXPECTED_PROVIDERS) {
        expect(returnedProviders).toContain(p);
      }

      for (const conn of data) {
        expect(conn.mode).toMatch(/sandbox|live/);
        expect(conn.status).toMatch(/connected|disconnected|needs_reconnect|error/);
        expect(conn.accountLabel).toBeDefined();
      }
    });
  });

  describe('AC-F7-02: POST /api/connectors/:provider/health Health Check Endpoint', () => {
    it('AC-F7-02: executes health check and returns status and latency for provider', async () => {
      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue({
          healthCheck: vi.fn().mockResolvedValue({
            healthy: true,
            latencyMs: 42,
            details: 'Sandbox ping successful',
          }),
        }),
      }));

      const { POST } = await import('@/app/api/connectors/[provider]/health/route');
      const req = new Request('http://localhost:3000/api/connectors/linkedin/health', {
        method: 'POST',
      });

      const res = await POST(req as any, { params: Promise.resolve({ provider: 'linkedin' }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.healthy).toBe(true);
      expect(typeof body.latencyMs).toBe('number');
      expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AC-F7-03: PATCH /api/connectors/:provider/settings Simulation Failure Settings', () => {
    it('AC-F7-03: allows updating simulationFailure to temporary, rate_limit, permanent, auth_expired, or none', async () => {
      const allowedSimulations = ['none', 'temporary', 'rate_limit', 'permanent', 'auth_expired'] as const;

      for (const simFailure of allowedSimulations) {
        let updatedRecord = {
          provider: 'x',
          simulationFailure: simFailure,
        };

        vi.doMock('@/server/workspace/workspace-service', () => ({
          resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
        }));

        vi.doMock('@/server/db', () => ({
          db: {
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockImplementation((val) => {
                updatedRecord = { ...updatedRecord, ...val };
                return {
                  where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([updatedRecord]),
                  }),
                };
              }),
            }),
          },
        }));

        const { PATCH } = await import('@/app/api/connectors/[provider]/settings/route');
        const req = new Request('http://localhost:3000/api/connectors/x/settings', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ simulationFailure: simFailure }),
        });

        const res = await PATCH(req as any, { params: Promise.resolve({ provider: 'x' }) });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.simulationFailure).toBe(simFailure);
      }
    });

    it('AC-F7-03: rejects invalid simulation failure mode with HTTP 400', async () => {
      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      const { PATCH } = await import('@/app/api/connectors/[provider]/settings/route');
      const req = new Request('http://localhost:3000/api/connectors/x/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ simulationFailure: 'invalid_mode' }),
      });

      const res = await PATCH(req as any, { params: Promise.resolve({ provider: 'x' }) });
      expect(res.status).toBe(400);
    });
  });

  describe('AC-F7-04: Reconnect State & Warning Banner Flow', () => {
    it('AC-F7-04: marks status as needs_reconnect when auth expires and handles reconnect', async () => {
      let connectorRecord = {
        provider: 'linkedin',
        mode: 'live',
        status: 'needs_reconnect',
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([connectorRecord]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((val) => {
              connectorRecord = { ...connectorRecord, ...val };
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([connectorRecord]),
                }),
              };
            }),
          }),
        },
      }));

      // 1. GET connectors returns needs_reconnect
      const { GET } = await import('@/app/api/connectors/route');
      const getRes = await GET(new Request('http://localhost:3000/api/connectors') as any);
      expect(getRes.status).toBe(200);
      const list = await getRes.json();
      expect(list[0].status).toBe('needs_reconnect');

      // 2. POST reconnect endpoint initiates reconnect flow
      const { POST: connectRoute } = await import('@/app/api/connectors/[provider]/connect/route');
      const connectRes = await connectRoute(
        new Request('http://localhost:3000/api/connectors/linkedin/connect', { method: 'POST' }) as any,
        { params: Promise.resolve({ provider: 'linkedin' }) }
      );
      expect(connectRes.status).toBe(200);
    });
  });

  describe('AC-F7-05: Default Workspace Seeding (All 4 Sandbox Connectors Connected)', () => {
    it('AC-F7-05: auto-seeds 4 connected sandbox connectors on initial workspace creation', async () => {
      const seededConnectors: any[] = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: true }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                // If not seeded yet, return seeded list
                return Promise.resolve(seededConnectors);
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((vals) => {
              const rows = Array.isArray(vals) ? vals : [vals];
              seededConnectors.push(...rows);
              return {
                returning: vi.fn().mockResolvedValue(rows),
              };
            }),
          }),
        },
      }));

      const { GET } = await import('@/app/api/connectors/route');
      const res = await GET(new Request('http://localhost:3000/api/connectors') as any);
      expect(res.status).toBe(200);

      const list = await res.json();
      expect(list).toHaveLength(4);

      for (const p of EXPECTED_PROVIDERS) {
        const found = list.find((c: any) => c.provider === p);
        expect(found, `Default connector for ${p} must exist`).toBeDefined();
        expect(found.mode).toBe('sandbox');
        expect(found.status).toBe('connected');
      }
    });
  });
});
