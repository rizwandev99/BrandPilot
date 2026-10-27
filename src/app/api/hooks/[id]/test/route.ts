import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { incomingEndpoints, events } from '@/server/db/schema';
import { cookies } from 'next/headers';
import * as workspaceService from '@/server/workspace/workspace-service';
import { computeHmacSha256 } from '@/lib/security/hmac';
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

export async function POST(
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

    const testPayload = {
      event_id: `evt-test-${Date.now()}`,
      type: 'test.ping',
      title: 'BrandPilot Test Webhook Ping',
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        message: 'This is a test webhook payload triggered from the BrandPilot UI.',
        triggeredAt: new Date().toISOString(),
      },
    };

    const bodyStr = JSON.stringify(testPayload);
    const signature = 'sha256=' + computeHmacSha256(secret, bodyStr);
    const timestamp = String(Math.floor(Date.now() / 1000));

    // Record incoming test event in events table
    const eventId = crypto.randomUUID();
    const eventRow = {
      id: eventId,
      workspaceId,
      type: 'test.ping',
      source: 'incoming',
      payload: testPayload,
      status: 'success',
      createdAt: new Date(),
    };

    await db.insert(events).values(eventRow);

    return NextResponse.json({
      ok: true,
      delivered: true,
      eventId,
      signature,
      timestamp,
      payload: testPayload,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
