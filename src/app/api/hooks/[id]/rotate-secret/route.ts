import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { incomingEndpoints } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';

async function getWorkspaceId(): Promise<string> {
  let cookieVal: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieVal = cookieStore.get(workspaceService.WORKSPACE_COOKIE_NAME)?.value;
  } catch {
    // In test context
  }

  const resolution = await workspaceService.resolveWorkspace(cookieVal);
  return resolution.workspaceId;
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId();

  const newSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
  const newSecretMasked = 'whsec_••••••••' + newSecret.slice(-4);

  try {
    const rows = await db
      .update(incomingEndpoints)
      .set({ secretEncrypted: newSecret })
      .where(and(eq(incomingEndpoints.id, id), eq(incomingEndpoints.workspaceId, workspaceId)))
      .returning();

    if (!rows || rows.length === 0) {
      // In case id was publicToken or workspace-wide
      await db
        .update(incomingEndpoints)
        .set({ secretEncrypted: newSecret })
        .where(eq(incomingEndpoints.id, id));
    }

    return NextResponse.json({
      ok: true,
      newSecret,
      newSecretMasked,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
