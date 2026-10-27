export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  sleepFn?: (ms: number) => Promise<void>;
}

export async function executeWithBackoff<T>(
  operation: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    factor = 2,
    jitter = true,
    sleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }

      // Check if error is 429 or rate limit
      const isRateLimit =
        err instanceof Error &&
        ((err as { status?: number }).status === 429 ||
          /429|rate\s*limit|resource\s*exhausted/i.test(err.message));

      if (!isRateLimit && (err as { status?: number })?.status !== undefined && (err as { status?: number }).status !== 429) {
        // If it has an explicit status code that is NOT 429, don't backoff-retry (e.g. 400 Bad Request)
        throw err;
      }

      const exponentialDelay = baseDelayMs * Math.pow(factor, attempt - 1);
      const jitterAmount = jitter ? Math.floor(Math.random() * (exponentialDelay * 0.15)) : 0;
      const totalDelay = exponentialDelay + jitterAmount;

      await sleepFn(totalDelay);
    }
  }
}
