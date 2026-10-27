import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { connectors } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { socialProviderSchema } from '@/lib/validation/connectors';

export async function POST(
  req: Request,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const params = await context.params;
    const providerParse = socialProviderSchema.safeParse(params.provider);
    if (!providerParse.success) {
      return NextResponse.json(
        { error: 'INVALID_PROVIDER', message: 'Invalid social provider' },
        { status: 400 }
      );
    }
    const provider = providerParse.data;

    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    await db
      .update(connectors)
      .set({
        status: 'disconnected',
        tokenEncrypted: null,
        tokenExpiresAt: null,
      })
      .where(
        and(
          eq(connectors.workspaceId, workspaceId),
          eq(connectors.provider, provider)
        )
      );

    return NextResponse.json({
      ok: true,
      status: 'disconnected',
      provider,
    });
  // intentional any: catch clause error handler
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
