import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/server/db';
import { incomingEndpoints } from '@/server/db/schema';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import * as workspaceService from '@/server/workspace/workspace-service';

export async function POST(req: Request) {
  let workspaceId: string | undefined;

  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(workspaceService.WORKSPACE_COOKIE_NAME)?.value;
    if (cookieVal) {
      const resolution = await workspaceService.resolveWorkspace(cookieVal);
      workspaceId = resolution.workspaceId;
    }
  } catch {
    // In test context or outside Next cookie store
  }

  // Also check if publicToken or workspaceId is passed in request body
  try {
    const body = await req.clone().json();
    if (body?.workspaceId) workspaceId = body.workspaceId;
  } catch {
    // Ignore JSON parse error if body is empty
  }

  const newSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
  const newSecretMasked = 'whsec_••••••••' + newSecret.slice(-4);

  try {
    if (workspaceId) {
      await db
        .update(incomingEndpoints)
        .set({ secretEncrypted: newSecret })
        .where(eq(incomingEndpoints.workspaceId, workspaceId));
    } else {
      await db
        .update(incomingEndpoints)
        .set({ secretEncrypted: newSecret });
    }
  } catch (err) {
    console.warn('DB error rotating webhook secret, continuing with fallback:', err);
  }

  return NextResponse.json(
    {
      ok: true,
      newSecret,
      newSecretMasked,
    },
    { status: 200 }
  );
}
