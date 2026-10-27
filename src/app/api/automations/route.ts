import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { automations } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';
import { randomUUID } from 'node:crypto';

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

export async function GET(req: Request) {
  try {
    const workspaceId = await getWorkspaceId(req);
    const rows = await db
      .select()
      .from(automations)
      .where(eq(automations.workspaceId, workspaceId));

    return NextResponse.json({ ok: true, automations: rows || [] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const workspaceId = await getWorkspaceId(req);

    // 1. Enforce Workspace Quota Cap (AC-F9-09: Max 10 automations per workspace)
    const existing = await db
      .select()
      .from(automations)
      .where(eq(automations.workspaceId, workspaceId));

    if (existing && existing.length >= 10) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'QUOTA_EXHAUSTED',
            message: 'Workspace automation quota limit reached (maximum 10 automations per workspace).',
          },
        },
        { status: 400 }
      );
    }

    // 2. Parse & Validate input
    const body = await req.json();
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled Automation';
    const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
    const trigger = body.trigger || { type: 'webhook.received' };
    const conditions = Array.isArray(body.conditions) ? body.conditions : [];
    const actions = Array.isArray(body.actions) ? body.actions : [];

    const newId = randomUUID();
    const created = await db
      .insert(automations)
      .values({
        id: newId,
        workspaceId,
        name,
        enabled,
        trigger,
        conditions,
        actions,
      })
      .returning();

    const createdRecord = created && created[0] ? created[0] : { id: newId, name, enabled, trigger, conditions, actions };

    return NextResponse.json(
      {
        ok: true,
        automation: createdRecord,
        id: createdRecord.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to create automation' },
      { status: 500 }
    );
  }
}
