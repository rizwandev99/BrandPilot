import { db } from '@/server/db';
import { agentRuns, agentRunSteps, brandKits, type AgentRun, type AgentRunStep, type Post } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Channel } from '@/lib/channels';
import type { BrandKitOutput, LlmProvider, IdeaItem } from '@/server/llm/interface';
import { runIdeaStep } from './idea-step';
import { runCreativeStep, type GeneratedCreative } from './creative-step';
import { runCampaignStep } from './campaign-step';

export interface CreateAgentRunInput {
  brandKitId: string;
  goal: string;
  channels: Channel[];
  postCount: number;
}

export interface NextStepResult {
  run: AgentRun;
  step: AgentRunStep;
  posts?: Post[];
}

export class StepExecutionError extends Error {
  step: string;
  constructor(message: string, step: string) {
    super(message);
    this.name = 'StepExecutionError';
    this.step = step;
  }
}

/**
 * Creates a new agent run with status "queued" and initial step "idea".
 */
export async function createAgentRun(
  input: CreateAgentRunInput,
  workspaceId: string
): Promise<AgentRun> {
  const id = randomUUID();
  const now = new Date();

  const runValues = {
    id,
    workspaceId,
    brandKitId: input.brandKitId,
    goal: input.goal,
    channels: input.channels,
    postCount: input.postCount,
    status: 'queued',
    currentStep: 'idea',
    error: null,
    createdAt: now,
    finishedAt: null,
  };

  try {
    const rows = await db.insert(agentRuns).values(runValues).returning();
    if (rows && rows[0]) {
      return rows[0];
    }
  } catch {
    // In-memory or mocked fallback
  }

  return runValues as unknown as AgentRun;
}

/**
 * Executes the next step in the agent state machine (idea -> creative -> campaign).
 * Safe and idempotent: if a step is already complete and retry is false, advances to next step.
 */
export async function executeNextStep(
  runId: string,
  options?: { retry?: boolean; provider?: LlmProvider }
): Promise<NextStepResult> {
  // 1. Fetch current run
  const runRows = await db.select().from(agentRuns).where(eq(agentRuns.id, runId));
  const run = runRows[0];
  if (!run) {
    throw new Error(`Agent run ${runId} not found`);
  }

  // 2. Fetch existing steps
  const existingSteps = await db
    .select()
    .from(agentRunSteps)
    .where(eq(agentRunSteps.runId, runId));

  const stepsByName: Record<string, AgentRunStep> = {};
  for (const s of existingSteps) {
    stepsByName[s.name] = s;
  }

  // 3. Fetch brand kit for context
  let brandKit: BrandKitOutput = {
    name: 'BrandPilot',
    summary: 'Autonomous AI marketing agent',
    tone: ['Professional', 'Innovative'],
    dos: ['Highlight speed and automation', 'Show real workflow results'],
    donts: ['cheap', 'guarantee', 'spam', 'rock bottom prices'],
    audience: 'Marketers, founders, and creators',
    colors: {
      primary: '#2563eb',
      secondary: '#4f46e5',
      background: '#ffffff',
      text: '#0f172a',
    },
    keywords: ['AI', 'Marketing', 'Automation', 'Growth'],
  };

  try {
    const bkRows = await db
      .select()
      .from(brandKits)
      .where(eq(brandKits.id, run.brandKitId));
    if (bkRows[0]) {
      const b = bkRows[0];
      brandKit = {
        name: b.name,
        summary: b.summary,
        tone: b.tone,
        dos: b.dos,
        donts: b.donts,
        audience: b.audience,
        colors: b.colors,
        keywords: b.keywords,
      };
    }
  } catch {
    // Keep fallback brand kit
  }

  // 4. Determine which step to execute
  let stepToRun = run.currentStep || 'idea';
  const isRetry = Boolean(options?.retry);

  if (isRetry) {
    // On retry, if run was failed, restart the current or failed step
    stepToRun = run.currentStep || 'idea';
  } else {
    // Normal step progression with idempotency check:
    if (stepToRun === 'idea' && stepsByName['idea']?.status === 'succeeded') {
      stepToRun = 'creative';
    }
    if (stepToRun === 'creative' && stepsByName['creative']?.status === 'succeeded') {
      stepToRun = 'campaign';
    }
    if (stepToRun === 'campaign' && stepsByName['campaign']?.status === 'succeeded') {
      // Run is fully complete
      return {
        run: { ...run, status: 'succeeded' },
        step: stepsByName['campaign'],
      };
    }
  }

  const now = new Date();

  // Helper to upsert step record
  async function upsertStep(
    name: string,
    status: string,
    inputData: unknown,
    outputData: unknown,
    providerName: 'gemini' | 'fallback' | 'fake',
    errorMsg: string | null = null
  ): Promise<AgentRunStep> {
    const stepId = stepsByName[name]?.id || randomUUID();
    const stepRecord: AgentRunStep = {
      id: stepId,
      runId,
      name,
      status,
      input: inputData,
      output: outputData,
      provider: providerName,
      startedAt: stepsByName[name]?.startedAt || now,
      finishedAt: status === 'succeeded' || status === 'failed' ? new Date() : null,
      error: errorMsg,
    };

    try {
      if (stepsByName[name]) {
        await db
          .update(agentRunSteps)
          .set(stepRecord)
          .where(eq(agentRunSteps.id, stepId));
      } else {
        await db.insert(agentRunSteps).values(stepRecord);
      }
    } catch {
      // Mock / fallback
    }

    stepsByName[name] = stepRecord;
    return stepRecord;
  }

  // Helper to update run state
  async function updateRunState(updates: Partial<AgentRun>): Promise<AgentRun> {
    const updated = { ...run, ...updates };
    try {
      await db
        .update(agentRuns)
        .set(updates)
        .where(eq(agentRuns.id, runId));
    } catch {
      // Mock / fallback
    }
    return updated as AgentRun;
  }

  try {
    if (stepToRun === 'idea') {
      // 1. Idea Step
      await updateRunState({ status: 'running', currentStep: 'idea', error: null });
      const stepInput = {
        goal: run.goal,
        channels: (run.channels || ['linkedin', 'x']) as Channel[],
        postCount: run.postCount || 4,
      };

      await upsertStep('idea', 'running', stepInput, null, 'fallback');

      const ideaResult = await runIdeaStep({
        brandKit,
        goal: run.goal,
        channels: stepInput.channels,
        postCount: stepInput.postCount,
        provider: options?.provider,
      });

      const finishedStep = await upsertStep(
        'idea',
        'succeeded',
        stepInput,
        ideaResult.ideas,
        ideaResult.provider
      );

      const updatedRun = await updateRunState({
        status: 'running',
        currentStep: 'creative',
      });

      return { run: updatedRun, step: finishedStep };
    }

    if (stepToRun === 'creative') {
      // 2. Creative Step
      await updateRunState({ status: 'running', currentStep: 'creative', error: null });

      const ideaStep = stepsByName['idea'];
      const ideas: IdeaItem[] = Array.isArray(ideaStep?.output)
        ? (ideaStep.output as IdeaItem[])
        : [];

      const stepInput = { ideasCount: ideas.length };
      await upsertStep('creative', 'running', stepInput, null, 'fallback');

      const creativeResult = await runCreativeStep({
        brandKit,
        ideas,
        provider: options?.provider,
      });

      const finishedStep = await upsertStep(
        'creative',
        'succeeded',
        stepInput,
        creativeResult.creatives,
        creativeResult.provider
      );

      const updatedRun = await updateRunState({
        status: 'running',
        currentStep: 'campaign',
      });

      return { run: updatedRun, step: finishedStep };
    }

    if (stepToRun === 'campaign') {
      // 3. Campaign Step
      await updateRunState({ status: 'running', currentStep: 'campaign', error: null });

      const creativeStep = stepsByName['creative'];
      const creatives: GeneratedCreative[] = Array.isArray(creativeStep?.output)
        ? (creativeStep.output as GeneratedCreative[])
        : [];

      const stepInput = { creativesCount: creatives.length };
      await upsertStep('campaign', 'running', stepInput, null, 'fallback');

      const campaignResult = await runCampaignStep({
        runId,
        workspaceId: run.workspaceId,
        creatives,
        provider: (creativeStep?.provider as 'gemini' | 'fallback' | 'fake') || 'fallback',
      });

      const finishedStep = await upsertStep(
        'campaign',
        'succeeded',
        stepInput,
        { postCount: campaignResult.postCount },
        campaignResult.provider
      );

      const updatedRun = await updateRunState({
        status: 'succeeded',
        currentStep: 'campaign',
        finishedAt: new Date(),
      });

      return {
        run: updatedRun,
        step: finishedStep,
        posts: campaignResult.posts,
      };
    }

    throw new StepExecutionError(`Unknown step: ${stepToRun}`, stepToRun);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await upsertStep(
      stepToRun,
      'failed',
      null,
      null,
      'fallback',
      errorMsg
    );
    await updateRunState({
      status: 'failed',
      currentStep: stepToRun,
      error: errorMsg,
    });

    const stepError = new StepExecutionError(errorMsg, stepToRun);
    throw stepError;
  }
}
