import { NextResponse } from 'next/server';
import { resolveWorkspace, withWorkspace } from '@/server/workspace/workspace-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') ?? undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    await withWorkspace(workspaceId, async (repo) => {
      await repo.resetWorkspace();
    });

    return NextResponse.json({ ok: true, workspaceId }, { status: 200 });
  } catch (error) {
    console.error('Workspace reset error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
