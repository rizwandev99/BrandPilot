import type { ConnectorErrorCode } from '@/lib/connectors/types';
import type { RetryPolicyConfig, RetryDecision } from './types';

export type { RetryPolicyConfig, RetryDecision };

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 4,
  baseDelayMs: 60_000,
  maxDelayMs: 3_600_000,
  jitterFactor: 0.2,
};

export const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  'TEMPORARY',
  'RATE_LIMITED',
]);

/**
 * Checks whether a connector error code is eligible for retry.
 */
export function isRetryableError(errorCode: ConnectorErrorCode | string): boolean {
  return RETRYABLE_ERROR_CODES.has(errorCode);
}

/**
 * Pure exponential backoff calculation with jitter and retry-after header support.
 * Formula:
 * - Backoff: cappedDelay = min(maxDelayMs, baseDelayMs * 2^(attempt - 1))
 * - Jitter: jitterMs = round(cappedDelay * jitterFactor * randomValue)
 * - Delay: cappedDelay + jitterMs
 *
 * If upstream specifies retryAfterSeconds > 0, it overrides the exponential calculation.
 */
export function calculateNextRetry(
  attempt: number,
  errorCode: ConnectorErrorCode | string,
  retryAfterSeconds?: number,
  config?: Partial<RetryPolicyConfig>,
  randomFn?: () => number
): RetryDecision {
  const cfg: RetryPolicyConfig = {
    ...DEFAULT_RETRY_POLICY,
    ...config,
  };

  // Error code truth table check
  if (!isRetryableError(errorCode)) {
    return { shouldRetry: false };
  }

  // Max attempts cap check
  if (attempt >= cfg.maxAttempts) {
    return { shouldRetry: false };
  }

  const now = Date.now();

  // Upstream Retry-After header handling
  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    const delayMs = retryAfterSeconds * 1000;
    return {
      shouldRetry: true,
      nextAttemptAt: new Date(now + delayMs),
      delayMs,
    };
  }

  // Pure exponential backoff calculation
  const exponent = Math.max(0, attempt - 1);
  const rawDelay = cfg.baseDelayMs * Math.pow(2, exponent);
  const cappedDelay = Math.min(cfg.maxDelayMs, rawDelay);

  // Bounded jitter calculation [0, cappedDelay * jitterFactor]
  const randomValue = typeof randomFn === 'function' ? randomFn() : Math.random();
  const boundedRandom = Math.max(0, Math.min(1, randomValue));
  const jitterMs = Math.round(cappedDelay * cfg.jitterFactor * boundedRandom);
  const totalDelayMs = cappedDelay + jitterMs;

  return {
    shouldRetry: true,
    nextAttemptAt: new Date(now + totalDelayMs),
    delayMs: totalDelayMs,
  };
}

/**
 * Calculates raw retry delay in milliseconds with exponential backoff, jitter,
 * and support for numeric or HTTP Date Retry-After headers.
 */
export function calculateRetryDelay(
  attempt: number,
  retryAfter?: string | number,
  baseDelayMs = 1000,
  maxDelayMs = 3600000,
  jitterFactor = 0.2
): number {
  if (retryAfter !== undefined && retryAfter !== null) {
    if (typeof retryAfter === 'number') {
      return retryAfter * 1000;
    }
    const trimmed = String(retryAfter).trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed) * 1000;
    }
    const parsedDate = Date.parse(trimmed);
    if (!isNaN(parsedDate)) {
      return Math.max(0, parsedDate - Date.now());
    }
  }

  const exponent = Math.max(0, attempt - 1);
  const rawDelay = baseDelayMs * Math.pow(2, exponent);
  const cappedDelay = Math.min(maxDelayMs, rawDelay);
  const jitterMs = Math.round(cappedDelay * jitterFactor * Math.random());
  return cappedDelay + jitterMs;
}

