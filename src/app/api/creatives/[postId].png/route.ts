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

    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)));

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Post creative not found' } },
        { status: 404 }
      );
    }

    const post = rows[0];
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
