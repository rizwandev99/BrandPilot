import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { posts } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
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

    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)));

    const post = rows[0];
    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
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

    // Find existing post
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

    // AC-F5-04: Increment version integer on edit
    const currentVersion = typeof currentPost.version === 'number' ? currentPost.version : 1;
    const nextVersion = currentVersion + 1;

    // AC-F5-04: If post was approved or scheduled, editing resets it back to in_review
    let newStatus = currentPost.status;
    let approvedAt = currentPost.approvedAt;
    if (currentPost.status === 'approved' || currentPost.status === 'scheduled') {
      newStatus = 'in_review';
      approvedAt = null;
    }

    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      version: nextVersion,
      status: newStatus,
      approvedAt,
      updatedAt: now,
    };

    if (typeof body.caption === 'string') {
      updatePayload.caption = body.caption;
    }
    if (Array.isArray(body.hashtags)) {
      updatePayload.hashtags = body.hashtags;
    }
    if (body.creativeSpec !== undefined) {
      updatePayload.creativeSpec = body.creativeSpec;
    }
    if (body.scheduledAt !== undefined) {
      updatePayload.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (typeof body.channel === 'string') {
      updatePayload.channel = body.channel;
    }

    const updated = await db
      .update(posts)
      .set(updatePayload)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)))
      .returning();

    const result = updated[0] ?? { ...currentPost, ...updatePayload };
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
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

    await db
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)));

    return NextResponse.json({ success: true, id: postId }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}
