import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { agentRuns } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { createAgentRun } from '@/server/agents/run-orchestrator';
import type { Channel } from '@/lib/channels';

const createRunSchema = z.object({
  brandKitId: z.string().min(1, 'brandKitId is required'),
  goal: z.string().min(1, 'goal is required'),
  channels: z.array(z.enum(['linkedin', 'x', 'instagram', 'facebook'])).min(1, 'At least one channel is required'),
  postCount: z.number().int().min(1).max(60).default(4),
});

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const body = await req.json();
    const validated = createRunSchema.parse(body);

    const run = await createAgentRun(
      {
        brandKitId: validated.brandKitId,
        goal: validated.goal,
        channels: validated.channels as Channel[],
        postCount: validated.postCount,
      },
      workspaceId
    );

    return NextResponse.json(run, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Invalid request', details: err.errors } },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: `Failed to create agent run: ${message}` } },
      { status: 500 }
    );
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const runs = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.workspaceId, workspaceId))
      .orderBy(desc(agentRuns.createdAt));

    return NextResponse.json({ runs }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: `Failed to list agent runs: ${message}` } },
      { status: 500 }
    );
  }
}
