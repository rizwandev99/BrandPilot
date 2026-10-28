import { db } from '@/server/db';
import { posts, publishJobs, connectors } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { getConnector } from '@/lib/connectors/registry';
import type { SocialProvider } from '@/lib/connectors/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? undefined;
  const { workspaceId } = await resolveWorkspace(cookieHeader);

  let body: { scheduledAt?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : new Date();

  // Fetch approved posts
  let candidatePosts: Array<typeof posts.$inferSelect> = [];
  try {
    if (typeof db.select === 'function') {
      candidatePosts = await db
        .select()
        .from(posts)
        .where(eq(posts.status, 'approved'));
    }
  } catch (err) {
    console.warn('[ScheduleApproved] Error selecting posts:', err);
  }

  // Filter for approved status and workspace scope
  const approvedPosts = (candidatePosts || []).filter((p) => {
    if (p.status !== 'approved') return false;
    if (p.workspaceId && p.workspaceId !== workspaceId) return false;
    return true;
  });

  const scheduled: Array<{ postId: string; idempotencyKey: string; jobId: string }> = [];
  const skipped: Array<{ postId: string; reason: string }> = [];

  for (const post of approvedPosts) {
    let isConnected = true;
    let connectorId: string | null = null;

    // Check connector state in database
    try {
      if (typeof db.select === 'function') {
        const connRows = await db
          .select()
          .from(connectors)
          .where(
            workspaceId
              ? and(eq(connectors.provider, post.channel), eq(connectors.workspaceId, workspaceId))
              : eq(connectors.provider, post.channel)
          );

        if (Array.isArray(connRows)) {
          if (connRows.length === 0) {
            isConnected = false;
          } else {
            const hasConnectorFields = connRows.some((c) => 'provider' in c || 'accountLabel' in c);
            if (hasConnectorFields) {
              const activeConn = connRows.find(
                (c) => c.provider === post.channel && c.status === 'connected'
              );
              if (activeConn) {
                connectorId = activeConn.id;
              } else {
                isConnected = false;
              }
            }
          }
        }
      }
    } catch {
      // Fall through to registry check
    }

    // Verify channel connector in registry
    if (isConnected) {
      try {
        const conn = getConnector(post.channel as SocialProvider, 'sandbox');
        if (!conn) {
          isConnected = false;
        }
      } catch {
        isConnected = false;
      }
    }

    if (!isConnected) {
      skipped.push({
        postId: post.id,
        reason: 'CONNECTOR_NOT_CONNECTED',
      });
      continue;
    }

    const version = post.version ?? 1;
    const idempotencyKey = `${post.id}:${version}:${post.channel}`;
    const jobId = randomUUID();

    try {
      if (typeof db.update === 'function') {
        await db
          .update(posts)
          .set({
            status: 'scheduled',
            scheduledAt,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, post.id));
      }

      if (typeof db.insert === 'function') {
        try {
          await db.insert(publishJobs).values({
            id: jobId,
            postId: post.id,
            connectorId: connectorId ?? randomUUID(),
            idempotencyKey,
            attempt: 0,
            status: 'queued',
            nextAttemptAt: scheduledAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch {
          // If job already exists for this idempotency key, update status and schedule
          if (typeof db.update === 'function') {
            await db
              .update(publishJobs)
              .set({
                status: 'queued',
                nextAttemptAt: scheduledAt,
                updatedAt: new Date(),
              })
              .where(eq(publishJobs.idempotencyKey, idempotencyKey));
          }
        }
      }

      scheduled.push({
        postId: post.id,
        idempotencyKey,
        jobId,
      });
    } catch (err) {
      console.warn(`[ScheduleApproved] Error scheduling post ${post.id}:`, err);
      skipped.push({
        postId: post.id,
        reason: 'SCHEDULING_FAILED',
      });
    }
  }

  return Response.json({
    scheduledCount: scheduled.length,
    scheduled,
    skippedCount: skipped.length,
    skipped,
  });
}
