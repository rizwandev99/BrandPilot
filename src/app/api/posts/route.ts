import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { posts } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { RESOURCE_CAPS } from '@/server/db/scoped-queries';
import { isPostStatus } from '@/lib/status-machine';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const channelParam = searchParams.get('channel');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();
    const fromDateParam = searchParams.get('fromDate');
    const toDateParam = searchParams.get('toDate');

    // Fetch posts for this workspace ordered newest first
    const allPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.workspaceId, workspaceId))
      .orderBy(desc(posts.createdAt));

    let filtered = allPosts;

    if (statusParam && isPostStatus(statusParam)) {
      filtered = filtered.filter((p) => p.status === statusParam);
    }

    if (channelParam) {
      filtered = filtered.filter((p) => p.channel.toLowerCase() === channelParam.toLowerCase());
    }

    if (searchParam) {
      filtered = filtered.filter((p) => {
        const captionMatch = p.caption?.toLowerCase().includes(searchParam);
        const headlineMatch = p.creativeSpec?.headline?.toLowerCase().includes(searchParam);
        const hashtagMatch = p.hashtags?.some((h) => h.toLowerCase().includes(searchParam));
        return captionMatch || headlineMatch || hashtagMatch;
      });
    }

    if (fromDateParam) {
      const fromTime = new Date(fromDateParam).getTime();
      if (!isNaN(fromTime)) {
        filtered = filtered.filter((p) => {
          const t = p.scheduledAt ? new Date(p.scheduledAt).getTime() : new Date(p.createdAt).getTime();
          return t >= fromTime;
        });
      }
    }

    if (toDateParam) {
      const toTime = new Date(toDateParam).getTime();
      if (!isNaN(toTime)) {
        filtered = filtered.filter((p) => {
          const t = p.scheduledAt ? new Date(p.scheduledAt).getTime() : new Date(p.createdAt).getTime();
          return t <= toTime;
        });
      }
    }

    return NextResponse.json(filtered, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    // Resource cap enforcement
    const existingCountRows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.workspaceId, workspaceId));

    if (existingCountRows.length >= RESOURCE_CAPS.POSTS) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          error: `Resource cap exceeded: maximum ${RESOURCE_CAPS.POSTS} posts allowed per workspace.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!body?.channel || !body?.caption) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', error: 'Channel and caption are required.' },
        { status: 400 }
      );
    }

    const validStatus = body.status && isPostStatus(body.status) ? body.status : 'draft';
    const now = new Date();

    const creativeSpec = body.creativeSpec ?? {
      headline: body.caption.slice(0, 60),
      templateId: 'minimal',
      colors: {
        primary: '#6366f1',
        secondary: '#06b6d4',
        background: '#ffffff',
        text: '#0f172a',
      },
    };

    const newPost = {
      workspaceId,
      channel: body.channel,
      caption: body.caption,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      creativeSpec,
      status: validStatus,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      approvedAt: validStatus === 'approved' ? now : null,
      holdReason: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db.insert(posts).values(newPost).returning();
    return NextResponse.json(inserted[0] ?? newPost, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: message },
      { status: 500 }
    );
  }
}
