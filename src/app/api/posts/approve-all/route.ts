import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { posts } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const now = new Date();
    const queryBuilder = db
      .update(posts)
      .set({
        status: 'approved',
        approvedAt: now,
        holdReason: null,
        updatedAt: now,
      })
      .where(and(eq(posts.workspaceId, workspaceId), eq(posts.status, 'in_review')));

    // intentional any: Drizzle query builder chaining vs test mock promise
    const updated = typeof (queryBuilder as any)?.returning === 'function'
      // intentional any: call returning() when supported by Drizzle
      ? await (queryBuilder as any).returning()
      : await queryBuilder;

    const updatedPostIds = (updated ?? []).map((p: { id: string }) => p.id);

    return NextResponse.json(
      {
        approvedCount: updatedPostIds.length,
        updatedPostIds,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}
