import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { incomingEndpoints } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';
import { decryptToken } from '@/lib/security/encryption';

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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId();

  try {
    const rows = await db
      .select()
      .from(incomingEndpoints)
      .where(and(eq(incomingEndpoints.id, id), eq(incomingEndpoints.workspaceId, workspaceId)));

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Endpoint not found' }, { status: 404 });
    }

    const endpoint = rows[0];
    let secret = endpoint.secretEncrypted;
    try {
      if (secret && secret.includes(':')) {
        secret = decryptToken(secret);
      }
    } catch {
      // Plaintext fallback
    }

    const origin = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      endpoint: {
        id: endpoint.id,
        publicToken: endpoint.publicToken,
        url: `${origin}/api/hooks/in/${endpoint.publicToken}`,
        secret,
        secretMasked: 'whsec_••••••••' + secret.slice(-4),
        createdAt: endpoint.createdAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId();

  try {
    await db
      .delete(incomingEndpoints)
      .where(and(eq(incomingEndpoints.id, id), eq(incomingEndpoints.workspaceId, workspaceId)));

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
