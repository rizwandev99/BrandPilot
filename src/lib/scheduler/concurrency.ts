import { db } from '@/server/db';
import { publishJobs } from '@/server/db/schema';
import { shouldUseDb, isDbAvailable } from '@/server/db/scoped-queries';
import { sql, inArray, lte, and } from 'drizzle-orm';
import type { ClaimedJob, ConcurrencyLockHelper } from './types';

// In-process lock tracker for single-instance or test environments
const inMemoryLockedJobIds = new Set<string>();

export class DefaultConcurrencyLockHelper implements ConcurrencyLockHelper {
  async claimDueJobs(workerName: string, batchSize: number = 10): Promise<ClaimedJob[]> {
    const now = new Date();

    if (shouldUseDb()) {
      try {
        // Neon / PostgreSQL transaction with FOR UPDATE SKIP LOCKED
        if (isDbAvailable() && typeof db.transaction === 'function') {
          return await db.transaction(async (tx) => {
            const result = await tx.execute(sql`
              SELECT 
                id, 
                post_id as "postId", 
                connector_id as "connectorId", 
                idempotency_key as "idempotencyKey", 
                status, 
                attempt, 
                next_attempt_at as "nextAttemptAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
              FROM publish_jobs
              WHERE status IN ('queued', 'pending', 'retrying')
                AND next_attempt_at <= ${now}
              ORDER BY next_attempt_at ASC
              LIMIT ${batchSize}
              FOR UPDATE SKIP LOCKED
            `);

            // intentional any: postgres-js execute result mapping
            const rows = (Array.isArray(result) ? result : (result as any)?.rows || []) as ClaimedJob[];
            if (rows.length > 0) {
              const claimedIds = rows.map((r) => r.id);
              await tx
                .update(publishJobs)
                .set({ status: 'running', updatedAt: new Date() })
                .where(inArray(publishJobs.id, claimedIds));
            }
            return rows;
          });
        }

        // Standard select fallback for mocked db in tests
        const candidateRows = await db
          .select()
          .from(publishJobs)
          .where(
            and(
              inArray(publishJobs.status, ['queued', 'pending', 'retrying']),
              lte(publishJobs.nextAttemptAt, now)
            )
          )
          .limit(batchSize);

        const claimed: ClaimedJob[] = [];
        for (const row of candidateRows) {
          if (!inMemoryLockedJobIds.has(row.id)) {
            inMemoryLockedJobIds.add(row.id);
            claimed.push({
              id: row.id,
              postId: row.postId,
              connectorId: row.connectorId,
              idempotencyKey: row.idempotencyKey,
              status: row.status,
              attempt: row.attempt,
              nextAttemptAt: row.nextAttemptAt,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            });
          }
        }
        return claimed;
      } catch (err) {
        console.warn(`[ConcurrencyLock] Failed to claim jobs from DB for worker ${workerName}:`, err);
      }
    }

    // Memory fallback when DB is completely offline
    return [];
  }

  async releaseJob(jobId: string): Promise<void> {
    inMemoryLockedJobIds.delete(jobId);
  }
}

export const defaultConcurrencyLockHelper = new DefaultConcurrencyLockHelper();
