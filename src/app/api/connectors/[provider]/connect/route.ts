import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { connectors } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { socialProviderSchema } from '@/lib/validation/connectors';
import { getConnector } from '@/lib/connectors/registry';

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

    // intentional any: parsed request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty in reconnect flows
      body = {};
    }

    const mode = body.mode === 'live' ? 'live' : 'sandbox';

    if (mode === 'live' && provider === 'linkedin') {
      if (process.env.ENABLE_LIVE_LINKEDIN !== 'true') {
        return NextResponse.json(
          {
            error: 'LIVE_MODE_DISABLED',
            message: 'Live LinkedIn mode is disabled',
          },
          { status: 403 }
        );
      }

      const connector = getConnector(provider, 'live');
      const connResult = await connector.connect({ workspaceId });

      await db
        .update(connectors)
        .set({
          mode: 'live',
          status: connResult.status,
          accountLabel: connResult.accountLabel,
        })
        .where(
          and(
            eq(connectors.workspaceId, workspaceId),
            eq(connectors.provider, provider)
          )
        );

      return NextResponse.json({
        ok: true,
        status: connResult.status,
        authUrl: connResult.authUrl,
      });
    }

    // Default: sandbox connection / reconnection
    const updateResult = await db
      .update(connectors)
      .set({
        mode: 'sandbox',
        status: 'connected',
      })
      .where(
        and(
          eq(connectors.workspaceId, workspaceId),
          eq(connectors.provider, provider)
        )
      )
      .returning();

    return NextResponse.json({
      ok: true,
      status: 'connected',
      provider,
      updated: updateResult?.[0],
    });
  // intentional any: catch clause error handler
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
