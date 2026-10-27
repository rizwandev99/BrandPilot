import { runDueJobs } from '@/lib/scheduler/runner';

export const dynamic = 'force-dynamic';

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret configured in environment, allow local development execution
  if (!secret) return true;

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (token === secret) return true;
  }

  const customHeader = req.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === secret) {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  if (!verifyCronAuth(req)) {
    return Response.json(
      { error: 'Unauthorized: invalid or missing cron secret' },
      { status: 401 }
    );
  }

  // Trigger workspace TTL & maintenance cleanup
  try {
    const wsService = await import('@/server/workspace/workspace-service');
    // intentional any: dynamic check across workspace cleanup variations
    const cleanup = (wsService as any).cleanupStaleWorkspaces ?? (wsService as any).cleanupExpiredWorkspaces;
    if (typeof cleanup === 'function') {
      await cleanup();
    }
  } catch (err) {
    console.warn('[Cron] Workspace maintenance cleanup warning:', err);
  }

  // Execute due publish jobs
  const result = await runDueJobs();

  return Response.json({
    ok: true,
    processedCount: result.processedCount,
    succeededCount: result.succeededCount,
    failedCount: result.failedCount,
    retriedCount: result.retriedCount,
    jobs: result.jobResults,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
