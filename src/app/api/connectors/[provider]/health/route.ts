import { NextResponse } from 'next/server';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { getConnector } from '@/server/connectors/registry';
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

    // Look up connector (defaults to sandbox mode for health probe)
    const connector = getConnector(provider, 'sandbox');
    const health = await connector.healthCheck({ workspaceId });

    return NextResponse.json({
      healthy: health.healthy,
      latencyMs: typeof health.latencyMs === 'number' ? health.latencyMs : 0,
      details: health.details ?? 'Health check complete',
    });
  // intentional any: catch clause error handler
  } catch (err: any) {
    return NextResponse.json(
      { error: 'HEALTH_CHECK_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
