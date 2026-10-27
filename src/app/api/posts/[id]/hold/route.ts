import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { posts } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { canTransition, type PostStatus } from '@/lib/status-machine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const resolvedParams = await Promise.resolve(context.params);
    const postId = resolvedParams?.id;

    if (!postId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', error: 'Missing post ID' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason as string | undefined;

    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)));

    const currentPost = rows[0];
    if (!currentPost) {
      return NextResponse.json(
        { code: 'NOT_FOUND', error: 'Post not found' },
        { status: 404 }
      );
    }

    const currentStatus = currentPost.status as PostStatus;
    if (!canTransition(currentStatus, 'held')) {
      return NextResponse.json(
        {
          code: 'INVALID_TRANSITION',
          error: `INVALID_TRANSITION: Cannot transition post from "${currentStatus}" to "held".`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await db
      .update(posts)
      .set({
        status: 'held',
        holdReason: reason ?? null,
        approvedAt: null,
        updatedAt: now,
      })
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)))
      .returning();

    return NextResponse.json(
      updated[0] ?? { ...currentPost, status: 'held', holdReason: reason ?? null },
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
