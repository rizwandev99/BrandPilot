import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { posts } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { renderCardPng, getChannelDimensions } from '@/server/creatives/card-renderer';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  // intentional any: Next.js 15 custom route segment param typing
  context: { params: Promise<any> }
): Promise<Response> {
  try {
    const resolvedParams = await context.params;
    // intentional any: extract postId if present in params
    let rawPostId = (resolvedParams as any)?.postId;
    if (!rawPostId) {
      const url = new URL(req.url);
      const parts = url.pathname.split('/');
      rawPostId = parts[parts.length - 1];
    }
    const postId = (rawPostId || '').replace(/\.png$/i, '');

    let rows: Array<typeof posts.$inferSelect> = [];
    try {
      rows = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId));
    } catch {
      // Database query error, fallback to memory
    }

    let post = rows?.[0];
    if (!post) {
      // Memory store fallback if running offline/in-memory
      const { getMemoryStore } = await import('@/server/db/scoped-queries');
      const store = getMemoryStore();
      post = store.posts.get(postId) as unknown as typeof posts.$inferSelect;
    }

    if (!post) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Post creative not found' } },
        { status: 404 }
      );
    }

    const channel = post.channel || 'linkedin';
    const dimensions = getChannelDimensions(channel);

    const creativeSpec = post.creativeSpec || {
      headline: post.caption ? post.caption.slice(0, 80) : 'BrandPilot',
      subline: '',
      templateId: 'minimal-quote',
      colors: {
        primary: '#2563eb',
        secondary: '#4f46e5',
        background: '#ffffff',
        text: '#0f172a',
      },
    };

    const pngBuffer = renderCardPng({
      channel,
      dimensions,
      spec: creativeSpec,
    });

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': String(pngBuffer.length),
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: `Failed to render creative: ${message}` } },
      { status: 500 }
    );
  }
}
