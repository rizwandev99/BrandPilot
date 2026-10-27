import { computeHmacSha256 } from '@/lib/security/hmac';
import { validateUrl, SsrfError } from '@/server/security/ssrf';
import type {
  WebhookDeliveryOptions,
  WebhookDeliveryResult,
  WebhookAttempt,
} from './types';

export * from './types';

/**
 * Checks whether the destination URL points to the local sandbox receiver.
 */
function isSandboxReceiverUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.pathname.includes('/api/sandbox/receiver/');
  } catch {
    return urlStr.includes('/api/sandbox/receiver/');
  }
}

/**
 * Delivers an outgoing webhook with HMAC-SHA256 signature, timestamp headers,
 * SSRF validation (permitting sandbox receiver), exponential retry for transient errors,
 * and attempt tracking.
 */
export async function deliverOutgoingWebhook(
  options: WebhookDeliveryOptions
): Promise<WebhookDeliveryResult> {
  const { url, secret, event, onAttempt } = options;
  const maxRetries = options.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? 8000;

  // 1. SSRF Validation Guard (AC-F8-05)
  // Explicitly permits built-in sandbox receiver /api/sandbox/receiver/:token
  if (!isSandboxReceiverUrl(url)) {
    try {
      await validateUrl(url);
    } catch (err: unknown) {
      if (err instanceof SsrfError) {
        throw err;
      }
      const errorObj = err as { code?: string; message?: string };
      const blockedError = new SsrfError(
        errorObj.message || 'SSRF validation failed',
        errorObj.code || 'SSRF_BLOCKED'
      );
      throw blockedError;
    }
  }

  // 2. Prepare payload and HMAC signature
  const bodyStr = JSON.stringify(event);
  const signatureHex = computeHmacSha256(secret, bodyStr);
  const signature = `sha256=${signatureHex}`;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-PostPilot-Signature': signature,
    'X-PostPilot-Timestamp': timestamp,
  };

  let lastStatus = 0;
  let lastError: string | undefined;

  // 3. Delivery attempts with retry policy (AC-F8-06)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatus = response.status;

      const isOk = response.ok ?? (response.status >= 200 && response.status < 300);

      const attemptRecord: WebhookAttempt = {
        attempt,
        status: response.status,
        ok: isOk,
        timestamp: Date.now(),
      };
      onAttempt?.(attemptRecord);

      if (isOk) {
        return {
          delivered: true,
          status: response.status,
          attempts: attempt,
        };
      }

      // Non-retryable 4xx client errors: fail immediately without retry (AC-F8-06)
      if (response.status >= 400 && response.status < 500) {
        return {
          delivered: false,
          status: response.status,
          attempts: attempt,
          error: `Client error: ${response.status}`,
        };
      }

      // 5xx Server errors: retry if attempts remain
      lastError = `Server error: ${response.status}`;
    } catch (err: unknown) {
      clearTimeout(timer);
      const error = err as Error;
      lastStatus = 0;
      lastError = error?.message || 'Network request failed';

      const attemptRecord: WebhookAttempt = {
        attempt,
        status: 0,
        ok: false,
        error: lastError,
        timestamp: Date.now(),
      };
      onAttempt?.(attemptRecord);
    }

    // Exponential backoff before next attempt (skip delay if last attempt)
    if (attempt < maxRetries) {
      const delay = process.env.NODE_ENV === 'test' ? 5 : Math.min(100 * Math.pow(2, attempt - 1), 2000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    delivered: false,
    status: lastStatus,
    attempts: maxRetries,
    error: lastError || 'Max delivery retries exceeded',
  };
}
