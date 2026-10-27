import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
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

export async function GET() {
  const workspaceId = await getWorkspaceId();

  try {
    const rows = await db
      .select()
      .from(outgoingWebhooks)
      .where(eq(outgoingWebhooks.workspaceId, workspaceId))
      .orderBy(desc(outgoingWebhooks.createdAt));

    const list = rows.map((hook) => {
      let secret = hook.secretEncrypted;
      try {
        if (secret && secret.includes(':')) {
          secret = decryptToken(secret);
        }
      } catch {
        // Plaintext fallback
      }
      return {
        id: hook.id,
        url: hook.url,
        secretMasked: secret ? 'whsec_••••••••' + secret.slice(-4) : '',
        active: hook.active,
        createdAt: hook.createdAt,
      };
    });

    return NextResponse.json({ ok: true, webhooks: list });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const workspaceId = await getWorkspaceId();

  try {
    const body = await req.json();
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ ok: false, error: 'URL is required' }, { status: 400 });
    }

    // SSRF validation (AC-F8-05): allow built-in sandbox receiver, block private IPs otherwise
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

    const secret = body.secret?.trim() || 'whsec_' + crypto.randomBytes(32).toString('hex');
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const newHook = {
      id: crypto.randomUUID(),
      workspaceId,
      url,
      secretEncrypted: secret,
      active,
      createdAt: new Date(),
    };

    const inserted = await db.insert(outgoingWebhooks).values(newHook).returning();
    const row = inserted[0] || newHook;

    return NextResponse.json(
      {
        ok: true,
        webhook: {
          id: row.id,
          url: row.url,
          secret,
          secretMasked: 'whsec_••••••••' + secret.slice(-4),
          active: row.active,
          createdAt: row.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to create webhook' }, { status: 500 });
  }
}
