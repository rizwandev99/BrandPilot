import { db } from '@/server/db';
import { workspaces } from '@/server/db/schema';
import { lt } from 'drizzle-orm';
import { cleanupMemoryWorkspaces, shouldUseDb } from '@/server/db/scoped-queries';

export interface CleanupOptions {
  now?: Date;
  ttlDays?: number;
}

export interface CleanupResult {
  deletedCount: number;
}

export async function cleanupStaleWorkspaces(
  optionsOrCutoff?: Date | CleanupOptions
): Promise<CleanupResult> {
  let cutoff: Date;

  if (optionsOrCutoff instanceof Date) {
    cutoff = optionsOrCutoff;
  } else if (optionsOrCutoff && typeof optionsOrCutoff === 'object') {
    const now = optionsOrCutoff.now ?? new Date();
    const ttlDays = optionsOrCutoff.ttlDays ?? parseInt(process.env.WORKSPACE_TTL_DAYS || '7', 10);
    cutoff = new Date(now.getTime() - ttlDays * 24 * 60 * 60 * 1000);
  } else {
    const ttlDays = parseInt(process.env.WORKSPACE_TTL_DAYS || '7', 10);
    cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
  }

  let dbDeletedCount = 0;
  if (shouldUseDb()) {
    try {
      const staleRows = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(lt(workspaces.lastSeenAt, cutoff));

      if (staleRows.length > 0) {
        await db.delete(workspaces).where(lt(workspaces.lastSeenAt, cutoff));
        dbDeletedCount = staleRows.length;
      }
    } catch (err) {
      console.warn('Database cleanup encountered error, falling back to memory cleanup:', err);
    }
  }

  const memDeletedCount = cleanupMemoryWorkspaces(cutoff);

  return {
    deletedCount: Math.max(dbDeletedCount, memDeletedCount),
  };
}
