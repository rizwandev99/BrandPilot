import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { automations } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';

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

export async function GET(
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

    return NextResponse.json({ ok: true, automation: rows[0] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to fetch automation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId(req);

  try {
    const body = await req.json();
    const updateData: Partial<typeof automations.$inferInsert> = {};

    if (body.name !== undefined) {
      updateData.name = String(body.name).trim();
    }
    if (body.enabled !== undefined) {
      updateData.enabled = Boolean(body.enabled);
    }
    if (body.trigger !== undefined) {
      updateData.trigger = body.trigger;
    }
    if (body.conditions !== undefined) {
      updateData.conditions = body.conditions;
    }
    if (body.actions !== undefined) {
      updateData.actions = body.actions;
    }

    const updated = await db
      .update(automations)
      .set(updateData)
      .where(and(eq(automations.id, id), eq(automations.workspaceId, workspaceId)))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json({ ok: false, error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, automation: updated[0] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to update automation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId(req);

  try {
    await db
      .delete(automations)
      .where(and(eq(automations.id, id), eq(automations.workspaceId, workspaceId)));

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to delete automation' },
      { status: 500 }
    );
  }
}
