import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { outgoingWebhooks } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';
import { validateUrl, SsrfError } from '@/server/security/ssrf';
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
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId();

  try {
    const rows = await db
      .select()
      .from(outgoingWebhooks)
      .where(and(eq(outgoingWebhooks.id, id), eq(outgoingWebhooks.workspaceId, workspaceId)));

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Outgoing webhook not found' }, { status: 404 });
    }

    const hook = rows[0];
    let secret = hook.secretEncrypted;
    try {
      if (secret && secret.includes(':')) {
        secret = decryptToken(secret);
      }
    } catch {
      // Plaintext fallback
    }

    return NextResponse.json({
      ok: true,
      webhook: {
        id: hook.id,
        url: hook.url,
        secretMasked: secret ? 'whsec_••••••••' + secret.slice(-4) : '',
        active: hook.active,
        createdAt: hook.createdAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id;
  const workspaceId = await getWorkspaceId();

  try {
    const body = await req.json();
    const updateData: Partial<typeof outgoingWebhooks.$inferInsert> = {};

    if (body.url !== undefined) {
      const url = body.url.trim();
      if (!url) {
        return NextResponse.json({ ok: false, error: 'URL cannot be empty' }, { status: 400 });
      }
      const isSandbox = url.includes('/api/sandbox/receiver/');
      if (!isSandbox) {
        try {
          await validateUrl(url);
        } catch (err: unknown) {
          if (err instanceof SsrfError) {
            return NextResponse.json(
              { ok: false, error: { code: 'SSRF_BLOCKED', message: err.message } },
              { status: 400 }
            );
          }
          const error = err as Error;
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
      }
      updateData.url = url;
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    const updated = await db
      .update(outgoingWebhooks)
      .set(updateData)
      .where(and(eq(outgoingWebhooks.id, id), eq(outgoingWebhooks.workspaceId, workspaceId)))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json({ ok: false, error: 'Outgoing webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, webhook: updated[0] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Update failed' }, { status: 500 });
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
      .delete(outgoingWebhooks)
      .where(and(eq(outgoingWebhooks.id, id), eq(outgoingWebhooks.workspaceId, workspaceId)));

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Delete failed' }, { status: 500 });
  }
}
