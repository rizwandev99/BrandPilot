import crypto from 'node:crypto';

/**
 * Computes an HMAC-SHA256 hex digest for a string or Buffer using the provided secret.
 */
export function computeHmacSha256(secret: string, body: string | Buffer): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof body === 'string' ? Buffer.from(body, 'utf8') : body);
  return hmac.digest('hex');
}

/**
 * Validates an HMAC-SHA256 signature against the raw body in constant time.
 * Handles signatures with or without the standard 'sha256=' prefix.
 * Guards against Buffer length mismatch before timingSafeEqual to prevent RangeError.
 */
export function verifyHmacTimingSafe(
  secret: string,
  body: string | Buffer,
  signature: string
): boolean {
  if (typeof signature !== 'string' || !signature.trim()) {
    return false;
  }

  const cleanSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  const expectedDigest = computeHmacSha256(secret, body);

  const sigBuffer = Buffer.from(cleanSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedDigest, 'utf8');

  // Input buffers must have the same byte length for timingSafeEqual
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Checks if a timestamp is within +/- windowSeconds of now.
 * Supports numeric timestamps in seconds or milliseconds, or numeric strings.
 * Enforces replay protection and guards against excessive clock skew.
 */
export function isTimestampFresh(
  timestamp: number | string,
  windowSeconds = 300,
  nowMs = Date.now()
): boolean {
  if (timestamp === '' || timestamp === null || timestamp === undefined) {
    return false;
  }

  const parsed = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return false;
  }

  // If timestamp is in seconds (< 1e11), convert to milliseconds
  const tsMs = parsed < 1e11 ? parsed * 1000 : parsed;
  const diffMs = Math.abs(nowMs - tsMs);

  return diffMs <= windowSeconds * 1000;
}
