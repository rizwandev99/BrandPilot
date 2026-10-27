import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { agentRuns, agentRunSteps } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const steps = await db
      .select()
      .from(agentRunSteps)
      .where(eq(agentRunSteps.runId, id));

    let runData: unknown = null;
    try {
      const runRows = await db
        .select()
        .from(agentRuns)
        .where(and(eq(agentRuns.id, id), eq(agentRuns.workspaceId, workspaceId)));
      runData = runRows[0] || null;
    } catch {
      // Mock / fallback
    }

    const baseRun = runData && typeof runData === 'object' ? runData : { id };

    return NextResponse.json(
      {
        ...baseRun,
        run: baseRun,
        steps: steps || [],
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: `Failed to fetch run details: ${message}` } },
      { status: 500 }
    );
  }
}
