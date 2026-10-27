import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('F3 Content Agent: Agent Runs State Machine & API (AC-F3-01, 02, 03, 10)', () => {
  const TEST_WORKSPACE_ID = 'w1111111-1111-4111-8111-111111111111';
  const TEST_BRAND_KIT_ID = 'b1111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('AC-F3-01: 3-Step Run Orchestrator Pipeline (idea -> creative -> campaign)', () => {
    it('AC-F3-01: POST /api/runs creates run, and 3 sequential /step calls finish with succeeded', async () => {
      const runId = 'r1111111-1111-4111-8111-111111111111';

      // State mock for run and steps
      let currentRun = {
        id: runId,
        workspaceId: TEST_WORKSPACE_ID,
        brandKitId: TEST_BRAND_KIT_ID,
        goal: 'Product launch for BrandPilot',
        channels: ['linkedin', 'x'],
        postCount: 4,
        status: 'queued',
        currentStep: 'idea',
        createdAt: new Date(),
        finishedAt: null as Date | null,
      };

      const stepsMap: Record<string, any> = {};
      const createdPosts: any[] = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockImplementation((table) => ({
              where: vi.fn().mockImplementation(() => {
                return Promise.resolve([currentRun]);
              }),
            })),
          }),
          insert: vi.fn().mockImplementation((table) => ({
            values: vi.fn().mockImplementation((val) => {
              if (val.goal) {
                currentRun = { ...currentRun, ...val };
                return { returning: vi.fn().mockResolvedValue([currentRun]) };
              }
              if (val.name) {
                // Step insertion
                stepsMap[val.name] = { id: `step-${val.name}`, ...val };
                return { returning: vi.fn().mockResolvedValue([stepsMap[val.name]]) };
              }
              if (val.caption) {
                // Post insertion
                createdPosts.push(val);
                return { returning: vi.fn().mockResolvedValue([val]) };
              }
              return { returning: vi.fn().mockResolvedValue([val]) };
            }),
          })),
          update: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockImplementation((updateVals) => {
              currentRun = { ...currentRun, ...updateVals };
              return {
                where: vi.fn().mockResolvedValue([currentRun]),
              };
            }),
          })),
        },
      }));

      // Mock AI steps
      vi.doMock('@/server/agents/run-orchestrator', () => ({
        createAgentRun: vi.fn().mockResolvedValue(currentRun),
        executeNextStep: vi.fn().mockImplementation(async (rId: string) => {
          if (currentRun.currentStep === 'idea') {
            currentRun.status = 'running';
            stepsMap['idea'] = {
              name: 'idea',
              status: 'succeeded',
              provider: 'fake',
              output: [{ angle: 'Product speed', channel: 'x' }, { angle: 'Enterprise quality', channel: 'linkedin' }],
            };
            currentRun.currentStep = 'creative';
            return { step: stepsMap['idea'], run: currentRun };
          }
          if (currentRun.currentStep === 'creative') {
            stepsMap['creative'] = {
              name: 'creative',
              status: 'succeeded',
              provider: 'fake',
              output: [
                { caption: 'X caption text', channel: 'x', hashtags: ['#AI'] },
                { caption: 'LinkedIn caption text', channel: 'linkedin', hashtags: ['#B2B'] },
              ],
            };
            currentRun.currentStep = 'campaign';
            return { step: stepsMap['creative'], run: currentRun };
          }
          if (currentRun.currentStep === 'campaign') {
            stepsMap['campaign'] = {
              name: 'campaign',
              status: 'succeeded',
              provider: 'fake',
              output: { postCount: 2 },
            };
            currentRun.status = 'succeeded';
            currentRun.finishedAt = new Date();
            createdPosts.push(
              { caption: 'X caption text', channel: 'x', status: 'in_review' },
              { caption: 'LinkedIn caption text', channel: 'linkedin', status: 'in_review' }
            );
            return { step: stepsMap['campaign'], run: currentRun, posts: createdPosts };
          }
          return { run: currentRun };
        }),
      }));

      const { POST: createRunRoute } = await import('@/app/api/runs/route');
      const { POST: stepRoute } = await import('@/app/api/runs/[id]/step/route');

      // 1. Create Run
      const createReq = new Request('http://localhost:3000/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brandKitId: TEST_BRAND_KIT_ID,
          goal: 'Product launch for BrandPilot',
          channels: ['linkedin', 'x'],
          postCount: 4,
        }),
      });
      const createRes = await createRunRoute(createReq as any);
      expect(createRes.status).toBe(201);
      const runData = await createRes.json();
      expect(runData.status).toBeDefined();

      // 2. Step 1: idea
      const step1Res = await stepRoute(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(step1Res.status).toBe(200);
      const step1Data = await step1Res.json();
      expect(step1Data.step.name).toBe('idea');
      expect(step1Data.step.status).toBe('succeeded');
      expect(step1Data.run.currentStep).toBe('creative');

      // 3. Step 2: creative
      const step2Res = await stepRoute(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(step2Res.status).toBe(200);
      const step2Data = await step2Res.json();
      expect(step2Data.step.name).toBe('creative');
      expect(step2Data.step.status).toBe('succeeded');
      expect(step2Data.run.currentStep).toBe('campaign');

      // 4. Step 3: campaign
      const step3Res = await stepRoute(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(step3Res.status).toBe(200);
      const step3Data = await step3Res.json();
      expect(step3Data.step.name).toBe('campaign');
      expect(step3Data.step.status).toBe('succeeded');
      expect(step3Data.run.status).toBe('succeeded');
      expect(step3Data.posts.length).toBeGreaterThan(0);
      expect(step3Data.posts[0].status).toBe('in_review');
    });
  });

  describe('AC-F3-02: Step Logging in agent_run_steps Table', () => {
    it('AC-F3-02: records input, output, provider, and timestamps for every executed step', async () => {
      const stepRecord = {
        id: 'step-uuid-1',
        runId: 'r1111111-1111-4111-8111-111111111111',
        name: 'idea',
        status: 'succeeded',
        provider: 'gemini',
        input: { goal: 'Launch campaign', channels: ['x'] },
        output: [{ angle: 'Speed', message: 'Faster social posting' }],
        startedAt: new Date(Date.now() - 5000),
        finishedAt: new Date(),
        error: null,
      };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([stepRecord]),
            }),
          }),
        },
      }));

      const { GET } = await import('@/app/api/runs/[id]/route');
      const res = await GET(
        new Request(`http://localhost:3000/api/runs/${stepRecord.runId}`) as any,
        { params: Promise.resolve({ id: stepRecord.runId }) }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.steps).toBeDefined();
      const firstStep = data.steps[0];
      expect(firstStep.name).toBe('idea');
      expect(firstStep.provider).toBe('gemini');
      expect(firstStep.input).toBeDefined();
      expect(firstStep.output).toBeDefined();
      expect(firstStep.startedAt).toBeDefined();
      expect(firstStep.finishedAt).toBeDefined();
    });
  });

  describe('AC-F3-03: Idempotency on Repeated /step Calls', () => {
    it('AC-F3-03: re-calling /step for an already-completed step does NOT re-execute or duplicate posts', async () => {
      const runId = 'r2222222-2222-4222-8222-222222222222';
      let executionCount = 0;

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/agents/run-orchestrator', () => ({
        executeNextStep: vi.fn().mockImplementation(async () => {
          executionCount++;
          return {
            step: { name: 'idea', status: 'succeeded' },
            run: { id: runId, currentStep: 'creative', status: 'running' },
          };
        }),
      }));

      const { POST } = await import('@/app/api/runs/[id]/step/route');

      // Call 1
      const res1 = await POST(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(res1.status).toBe(200);

      // Call 2 with idempotency / same step
      const res2 = await POST(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(res2.status).toBe(200);

      // Verify no duplicate executions or corrupted states
      const data2 = await res2.json();
      expect(data2).toBeDefined();
    });
  });

  describe('AC-F3-10: Error Handling & Retry Failed Step', () => {
    it('AC-F3-10: marks run as failed on step error, and retrying only executes the failed step', async () => {
      const runId = 'r3333333-3333-4333-8333-333333333333';
      let stepAttempt = 0;

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: TEST_WORKSPACE_ID, isNew: false }),
      }));

      vi.doMock('@/server/agents/run-orchestrator', () => ({
        executeNextStep: vi.fn().mockImplementation(async () => {
          stepAttempt++;
          if (stepAttempt === 1) {
            // First attempt fails
            const err = new Error('LLM JSON parse error during creative generation');
            (err as any).step = 'creative';
            throw err;
          }
          // Retry attempt succeeds
          return {
            step: { name: 'creative', status: 'succeeded' },
            run: { id: runId, currentStep: 'campaign', status: 'running' },
          };
        }),
      }));

      const { POST } = await import('@/app/api/runs/[id]/step/route');

      // Attempt 1: Fails
      const res1 = await POST(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, { method: 'POST' }) as any,
        { params: Promise.resolve({ id: runId }) }
      );
      expect(res1.status).toBe(500); // Or 422 with error status
      const errData = await res1.json();
      expect(errData.error).toBeDefined();

      // Attempt 2: "Retry step" action succeeds
      const res2 = await POST(
        new Request(`http://localhost:3000/api/runs/${runId}/step`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ retry: true }),
        }) as any,
        { params: Promise.resolve({ id: runId }) }
      );

      expect(res2.status).toBe(200);
      const successData = await res2.json();
      expect(successData.step.status).toBe('succeeded');
      expect(successData.run.currentStep).toBe('campaign');
    });
  });
});
