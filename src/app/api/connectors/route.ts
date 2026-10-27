import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { connectors } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import type { SocialProvider } from '@/lib/connectors/types';

const DEFAULT_PROVIDERS: SocialProvider[] = [
  'linkedin',
  'instagram',
  'x',
  'facebook',
];

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId, isNew } = await resolveWorkspace(cookieHeader);

    const existing = await db
      .select()
      .from(connectors)
      .where(eq(connectors.workspaceId, workspaceId));

    if (isNew || existing.length === 0) {
      const seedValues = DEFAULT_PROVIDERS.map((provider) => ({
        workspaceId,
        provider,
        mode: 'sandbox' as const,
        status: 'connected' as const,
        accountLabel: `Sandbox ${provider.toUpperCase()}`,
        settings: { simulateFailure: 'none' as const },
        simulationFailure: 'none',
      }));

      const seeded = await db.insert(connectors).values(seedValues).returning();
      // intentional any: connector row type mapping
      const formattedSeeded = seeded.map((c: any) => ({
        ...c,
        simulationFailure:
          c.simulationFailure ?? c.settings?.simulateFailure ?? 'none',
      }));

      return NextResponse.json(formattedSeeded);
    }

    // intentional any: connector row type mapping
    const formattedExisting = existing.map((c: any) => ({
      ...c,
      simulationFailure:
        c.simulationFailure ?? c.settings?.simulateFailure ?? 'none',
    }));

    return NextResponse.json(formattedExisting);
  // intentional any: catch handler error
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
