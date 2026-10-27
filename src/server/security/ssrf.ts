import dns from 'dns';
import net from 'net';

export class SsrfError extends Error {
  code: string;

  constructor(message: string, code = 'SSRF_BLOCKED') {
    super(message);
    this.name = 'SsrfError';
    this.code = code;
  }
}

export class UpstreamError extends Error {
  code: string;

  constructor(message: string, code = 'UPSTREAM_ERROR') {
    super(message);
    this.name = 'UpstreamError';
    this.code = code;
  }
}

/**
 * Checks if an IP address (IPv4 or IPv6) belongs to a private, loopback,
 * link-local, carrier-grade NAT, or cloud metadata range.
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const trimmed = ip.trim().toLowerCase();

  // IPv4 check
  if (net.isIPv4(trimmed)) {
    const parts = trimmed.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    const [b0, b1] = parts;

    // 0.0.0.0/8 (Current network / unspecified)
    if (b0 === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;

    // 10.0.0.0/8 (RFC 1918 private)
    if (b0 === 10) return true;

    // 172.16.0.0/12 (RFC 1918 private: 172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16 (RFC 1918 private)
    if (b0 === 192 && b1 === 168) return true;

    // 169.254.0.0/16 (Link-local & AWS/Cloud Metadata 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT: 100.64.0.0 - 100.127.255.255)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 198.18.0.0/15 (Benchmark network)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

    // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved)
    if (b0 >= 224) return true;

    return false;
  }

  // IPv6 check
  if (net.isIPv6(trimmed)) {
    // Unspecified :: or ::0
    if (trimmed === '::' || trimmed === '0:0:0:0:0:0:0:0') return true;
    // Loopback ::1
    if (trimmed === '::1' || trimmed === '0:0:0:0:0:0:0:1') return true;

    // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
    if (trimmed.includes('.')) {
      const lastColon = trimmed.lastIndexOf(':');
      if (lastColon !== -1) {
        const potentialIpv4 = trimmed.substring(lastColon + 1);
        if (net.isIPv4(potentialIpv4)) {
          return isPrivateIp(potentialIpv4);
        }
      }
    }

    // Expand IPv6 blocks to 8 numbers
    const halves = trimmed.split('::');
    let blocks: number[] = [];

    if (halves.length === 2) {
      const left = halves[0] ? halves[0].split(':').map((b) => parseInt(b, 16)) : [];
      const right = halves[1] ? halves[1].split(':').map((b) => parseInt(b, 16)) : [];
      const missing = 8 - (left.length + right.length);
      const middle = new Array(Math.max(0, missing)).fill(0);
      blocks = [...left, ...middle, ...right];
    } else if (halves.length === 1) {
      blocks = trimmed.split(':').map((b) => parseInt(b, 16));
    }

    if (blocks.length === 8 && blocks.every((b) => !isNaN(b))) {
      // Loopback check
      if (
        blocks[0] === 0 &&
        blocks[1] === 0 &&
        blocks[2] === 0 &&
        blocks[3] === 0 &&
        blocks[4] === 0 &&
        blocks[5] === 0 &&
        blocks[6] === 0 &&
        blocks[7] === 1
      ) {
        return true;
      }
      // Unspecified
      if (blocks.every((b) => b === 0)) {
        return true;
      }
      // Link-local: fe80::/10 (first block 0xfe80 - 0xfebf)
      if (blocks[0] >= 0xfe80 && blocks[0] <= 0xfebf) {
        return true;
      }
      // Unique Local Addresses (ULA): fc00::/7 (0xfc00 - 0xfdff)
      if ((blocks[0] & 0xfe00) === 0xfc00) {
        return true;
      }
      // Multicast: ff00::/8
      if ((blocks[0] & 0xff00) === 0xff00) {
        return true;
      }
    }

    // Fallback prefix checks
    if (
      trimmed.startsWith('fe8') ||
      trimmed.startsWith('fe9') ||
      trimmed.startsWith('fea') ||
      trimmed.startsWith('feb') ||
      trimmed.startsWith('fc') ||
      trimmed.startsWith('fd')
    ) {
      return true;
    }

    return false;
  }

  // Not a recognizable valid IP address format
  return true;
}

/**
 * Validates a target URL:
 * - Scheme must be http or https
 * - Hostname cannot be localhost or resolve to private/loopback/cloud metadata IP
 */
export async function validateUrl(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new SsrfError('Invalid URL format', 'SSRF_BLOCKED');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfError(`Unsupported protocol: ${parsed.protocol}`, 'SSRF_BLOCKED');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new SsrfError('Access to localhost is blocked', 'SSRF_BLOCKED');
  }

  // Strip IPv6 enclosing brackets if present
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // Direct IP in URL check
  if (net.isIP(cleanHost)) {
    if (isPrivateIp(cleanHost)) {
      throw new SsrfError(`Target IP ${cleanHost} is blocked`, 'SSRF_BLOCKED');
    }
    return parsed;
  }

  // DNS lookup check
  let addresses: Array<{ address: string; family: number }> = [];
  try {
    const lookupResult = await dns.promises.lookup(cleanHost, { all: true });
    addresses = Array.isArray(lookupResult) ? lookupResult : [lookupResult];
  // intentional any: DNS error object
  } catch (err: any) {
    // If DNS resolution fails, throw UpstreamError
    throw new UpstreamError(`DNS lookup failed for ${cleanHost}: ${err?.message || ''}`);
  }

  if (addresses.length === 0) {
    throw new UpstreamError(`No DNS records found for ${cleanHost}`);
  }

  for (const record of addresses) {
    if (isPrivateIp(record.address)) {
      throw new SsrfError(
        `Hostname ${cleanHost} resolved to private IP ${record.address}`,
        'SSRF_BLOCKED'
      );
    }
  }

  return parsed;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxSize?: number;
  maxRedirects?: number;
  headers?: HeadersInit;
  method?: string;
}

export interface SafeFetchResponse {
  status: number;
  ok: boolean;
  headers: Headers;
  text: () => Promise<string>;
  // intentional any: arbitrary JSON payload returned by response
  json: () => Promise<any>;
}

/**
 * SSRF-Safe Fetch Client:
 * - Enforces DNS resolution against private IP ranges
 * - Re-evaluates target IP on every redirect (max 3 redirects)
 * - Enforces 2MB maximum size cap
 * - Enforces 8000ms timeout abort
 */
export async function safeFetch(
  url: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResponse> {
  let currentUrl = url;
  let redirectCount = 0;
  const maxRedirects = options?.maxRedirects ?? 3;
  const timeoutMs = options?.timeoutMs ?? 8000;
  const maxSize = options?.maxSize ?? 2 * 1024 * 1024; // 2MB

  while (true) {
    // 1. Validate target URL scheme and DNS
    await validateUrl(currentUrl);

    // 2. Set up timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error('Request timed out'));
    }, timeoutMs);

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        method: options?.method ?? 'GET',
        headers: options?.headers,
        redirect: 'manual',
        signal: controller.signal,
      });
    // intentional any: fetch abort/network error
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (
        err?.name === 'AbortError' ||
        err?.name === 'TimeoutError' ||
        err?.message?.includes('aborted') ||
        err?.message?.includes('Timeout') ||
        err?.message?.includes('timed out')
      ) {
        throw new UpstreamError('Request timed out or aborted');
      }
      throw new UpstreamError(err?.message || 'Network fetch failed');
    } finally {
      clearTimeout(timeoutId);
    }

    // 3. Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new UpstreamError(`Redirect chain exceeded limit of ${maxRedirects}`);
      }

      const location = res.headers.get('location');
      if (!location) {
        throw new UpstreamError('Redirect response missing location header');
      }

      // Resolve redirect target relative to current URL
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new UpstreamError(`Invalid redirect target: ${location}`);
      }

      // Continue to next hop in loop (will be validated for SSRF)
      continue;
    }

    // 4. Response size limit enforcement
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new UpstreamError(`Response content-length exceeds ${maxSize} bytes`);
    }

    // Read response body with byte cap
    let textContent = '';
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxSize) {
            try {
              await reader.cancel();
            } catch {
              // Ignore cancellation errors
            }
            throw new UpstreamError(`Response body exceeded ${maxSize} byte limit`);
          }
          chunks.push(value);
        }
      }

      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      textContent = new TextDecoder('utf-8').decode(merged);
    } else if (typeof res.text === 'function') {
      textContent = await res.text();
      if (Buffer.byteLength(textContent, 'utf-8') > maxSize) {
        throw new UpstreamError(`Response body exceeded ${maxSize} byte limit`);
      }
    }

    return {
      status: res.status,
      ok: res.ok ?? (res.status >= 200 && res.status < 300),
      headers: res.headers,
      text: async () => textContent,
      json: async () => JSON.parse(textContent),
    };
  }
}
