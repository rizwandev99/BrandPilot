import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { automations } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';
import { evaluateRule } from '@/lib/automations/engine';
import type { AutomationRule, SystemEvent } from '@/lib/automations/types';

async function getWorkspaceId(req?: Request): Promise<string> {
  let cookieVal: string | undefined;
  if (req) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) cookieVal = cookieHeader;
  }
  if (!cookieVal) {
    try {
      const cookieStore = await cookies();
      cookieVal = cookieStore.get(workspaceService.WORKSPACE_COOKIE_NAME)?.value;
    } catch {
      // In test context
    }
  }

  const resolution = await workspaceService.resolveWorkspace(cookieVal);
  return resolution.workspaceId;
}

/**
 * AC-F9-06: Dry-Run Simulation Mode
 * Evaluates a sample event against the automation rule without writing side effects to DB or social platforms.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId(req);

  try {
    const rows = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.workspaceId, workspaceId)));

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Automation not found' }, { status: 404 });
    }

    const automation = rows[0] as unknown as AutomationRule;
    const body = await req.json().catch(() => ({}));
    const sampleEvent: SystemEvent = (body.sampleEvent || body.event || body) as SystemEvent;

    // Evaluate the rule with pure engine
    const evalResult = await evaluateRule(automation, sampleEvent);

    return NextResponse.json({
      ok: true,
      matched: evalResult.matched,
      conditionsSummary: evalResult.conditionLogs,
      conditionLogs: evalResult.conditionLogs,
      plannedActions: evalResult.matched ? evalResult.actionsToRun : [],
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Dry-run evaluation failed' },
      { status: 500 }
    );
  }
}
