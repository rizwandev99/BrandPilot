import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { incomingEndpoints } from '@/server/db/schema';
import * as workspaceService from '@/server/workspace/workspace-service';
import { decryptToken } from '@/lib/security/encryption';

async function getWorkspaceId(): Promise<string> {
  let cookieVal: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieVal = cookieStore.get(workspaceService.WORKSPACE_COOKIE_NAME)?.value;
  } catch {
    // In test context or outside Next cookie store
  }

  const resolution = await workspaceService.resolveWorkspace(cookieVal);
  return resolution.workspaceId;
}

/**
 * Resolves or auto-initializes the incoming webhook endpoint for the workspace.
 */
export async function GET(req: Request) {
  const workspaceId = await getWorkspaceId();

  let endpoint: typeof incomingEndpoints.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(incomingEndpoints)
      .where(eq(incomingEndpoints.workspaceId, workspaceId));

    if (rows && rows.length > 0) {
      endpoint = rows[0];
    } else {
      // Auto-create default incoming webhook endpoint for the workspace (AC-F8-07)
      const publicToken = 'tok_' + crypto.randomBytes(16).toString('hex');
      const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');
      const newRow = {
        id: crypto.randomUUID(),
        workspaceId,
        publicToken,
        secretEncrypted: secret,
        createdAt: new Date(),
      };
      const inserted = await db.insert(incomingEndpoints).values(newRow).returning();
      endpoint = inserted[0] || newRow;
    }
  } catch (err) {
    console.warn('DB error fetching incoming endpoint, creating memory fallback:', err);
    endpoint = {
      id: crypto.randomUUID(),
      workspaceId,
      publicToken: 'tok_' + crypto.randomBytes(16).toString('hex'),
      secretEncrypted: 'whsec_' + crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
    };
  }

  let secret = endpoint.secretEncrypted;
  try {
    if (secret && secret.includes(':')) {
      secret = decryptToken(secret);
    }
  } catch {
    // Plaintext fallback
  }

  const secretMasked = secret ? 'whsec_••••••••' + secret.slice(-4) : '';
  const origin = new URL(req.url).origin;
  const webhookUrl = `${origin}/api/hooks/in/${endpoint.publicToken}`;

  return NextResponse.json({
    ok: true,
    endpoint: {
      id: endpoint.id,
      publicToken: endpoint.publicToken,
      url: webhookUrl,
      secret,
      secretMasked,
      createdAt: endpoint.createdAt,
    },
  });
}

export async function POST(req: Request) {
  const workspaceId = await getWorkspaceId();

  try {
    const publicToken = 'tok_' + crypto.randomBytes(16).toString('hex');
    const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    const newEndpoint = {
      id: crypto.randomUUID(),
      workspaceId,
      publicToken,
      secretEncrypted: secret,
      createdAt: new Date(),
    };

    const inserted = await db.insert(incomingEndpoints).values(newEndpoint).returning();
    const endpoint = inserted[0] || newEndpoint;

    const origin = new URL(req.url).origin;
    const webhookUrl = `${origin}/api/hooks/in/${endpoint.publicToken}`;

    return NextResponse.json(
      {
        ok: true,
        endpoint: {
          id: endpoint.id,
          publicToken: endpoint.publicToken,
          url: webhookUrl,
          secret,
          secretMasked: 'whsec_••••••••' + secret.slice(-4),
          createdAt: endpoint.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: { message: error?.message || 'Failed to create endpoint' } },
      { status: 500 }
    );
  }
}
