import type { ConnectorErrorCode } from '@/lib/connectors/types';

export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export interface RetryDecision {
  shouldRetry: boolean;
  nextAttemptAt?: Date;
  delayMs?: number;
}

export type PublishJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'retrying'
  | 'pending';

export interface ClaimedJob {
  id: string;
  postId: string;
  connectorId?: string | null;
  idempotencyKey: string;
  status: string;
  attempt: number;
  workspaceId?: string;
  nextAttemptAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ConcurrencyLockHelper {
  claimDueJobs(workerName: string, batchSize?: number): Promise<ClaimedJob[]>;
  releaseJob?(jobId: string): Promise<void>;
}

export interface RunDueJobsOptions {
  workerName?: string;
  lockHelper?: ConcurrencyLockHelper;
  clock?: () => Date;
  batchSize?: number;
  workspaceId?: string;
}

export interface RunDueJobsResult {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  retriedCount: number;
  skippedCount?: number;
  jobResults?: Array<{
    jobId: string;
    status: 'succeeded' | 'failed' | 'retrying';
    externalId?: string;
    error?: string;
  }>;
}

export interface ExecuteJobResult {
  status: 'succeeded' | 'failed' | 'retrying';
  externalId?: string;
  externalUrl?: string;
  error?: string;
  nextAttemptAt?: Date;
}
