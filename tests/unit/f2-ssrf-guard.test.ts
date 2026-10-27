import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';

describe('F2 Brand Kit: SSRF Guard & Safe Fetcher', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-F2-02: IP Classification & Private IP Detection (isPrivateIp)', () => {
    it('AC-F2-02: identifies loopback addresses (IPv4 and IPv6) as private', async () => {
      const { isPrivateIp } = await import('@/server/security/ssrf');

      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.0.0.2')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
    });

    it('AC-F2-02: identifies AWS/cloud metadata address (169.254.169.254) and link-local ranges as private', async () => {
      const { isPrivateIp } = await import('@/server/security/ssrf');

      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
      expect(isPrivateIp('169.254.254.254')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('AC-F2-02: identifies RFC 1918 private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
      const { isPrivateIp } = await import('@/server/security/ssrf');

      // 10.0.0.0/8
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.1.99')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.24.12.34')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      // Outside 172.16.0.0/12
      expect(isPrivateIp('172.15.255.255')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('AC-F2-02: identifies carrier-grade NAT (100.64.0.0/10) as private', async () => {
      const { isPrivateIp } = await import('@/server/security/ssrf');

      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.100.50.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
      // Outside 100.64.0.0/10
      expect(isPrivateIp('100.63.255.255')).toBe(false);
      expect(isPrivateIp('100.128.0.1')).toBe(false);
    });

    it('AC-F2-02: permits legitimate public IP addresses', async () => {
      const { isPrivateIp } = await import('@/server/security/ssrf');

      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false); // example.com
      expect(isPrivateIp('142.250.190.46')).toBe(false); // google.com
      expect(isPrivateIp('2606:4700:4700::1111')).toBe(false); // cloudflare IPv6
    });
  });

  describe('AC-F2-02: URL Scheme & Target Validation (validateUrl / safeFetch)', () => {
    it('AC-F2-02: blocks non-http(s) protocols with SSRF_BLOCKED error code', async () => {
      const { safeFetch, validateUrl } = await import('@/server/security/ssrf');

      const invalidProtocols = [
        'ftp://example.com/file.txt',
        'file:///etc/passwd',
        'file://C:\\Windows\\win.ini',
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'gopher://127.0.0.1:70/',
        'smtp://mail.internal.net',
      ];

      for (const url of invalidProtocols) {
        if (typeof validateUrl === 'function') {
          await expect(validateUrl(url), `validateUrl should reject ${url}`).rejects.toMatchObject({
            code: 'SSRF_BLOCKED',
          });
        }
        await expect(safeFetch(url), `safeFetch should reject ${url}`).rejects.toMatchObject({
          code: 'SSRF_BLOCKED',
        });
      }
    });

    it('AC-F2-02: blocks http://127.0.0.1 with SSRF_BLOCKED', async () => {
      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('http://127.0.0.1')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
      await expect(safeFetch('http://127.0.0.1:8080/admin')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
    });

    it('AC-F2-02: blocks http://localhost with SSRF_BLOCKED', async () => {
      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('http://localhost')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
      await expect(safeFetch('http://localhost:3000/api')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
    });

    it('AC-F2-02: blocks http://169.254.169.254 (cloud metadata) with SSRF_BLOCKED', async () => {
      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('http://169.254.169.254/latest/meta-data')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
    });

    it('AC-F2-02: blocks http://[::1] (IPv6 loopback) with SSRF_BLOCKED', async () => {
      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('http://[::1]')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
      await expect(safeFetch('http://[::1]:8080')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });
    });

    it('AC-F2-02: blocks hostnames resolving to private IPs via DNS resolution with SSRF_BLOCKED', async () => {
      // Mock dns lookup to return a private IP for an innocent-looking domain
      const lookupSpy = vi.spyOn(dns.promises, 'lookup').mockImplementation(async (hostname) => {
        if (hostname === 'innocent.external.domain.com') {
          return [{ address: '10.0.0.42', family: 4 }] as any;
        }
        return [{ address: '93.184.216.34', family: 4 }] as any;
      });

      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('https://innocent.external.domain.com')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });

      lookupSpy.mockRestore();
    });

    it('AC-F2-02: blocks HTTP redirect targeting a private IP with SSRF_BLOCKED', async () => {
      // Mock global fetch: first request returns 302 redirecting to http://192.168.1.1
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          location: 'http://192.168.1.1/secret',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { safeFetch } = await import('@/server/security/ssrf');

      // DNS lookup mock for initial domain returns public IP
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      await expect(safeFetch('https://valid-external-site.com/redirect')).rejects.toMatchObject({
        code: 'SSRF_BLOCKED',
      });

      vi.unstubAllGlobals();
    });

    it('AC-F2-02: blocks redirect chains exceeding maximum 3 redirects with UPSTREAM_ERROR', async () => {
      // Mock 4 redirects in a row
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 302, headers: new Headers({ location: 'https://r1.com' }) })
        .mockResolvedValueOnce({ status: 302, headers: new Headers({ location: 'https://r2.com' }) })
        .mockResolvedValueOnce({ status: 302, headers: new Headers({ location: 'https://r3.com' }) })
        .mockResolvedValueOnce({ status: 302, headers: new Headers({ location: 'https://r4.com' }) });
      vi.stubGlobal('fetch', mockFetch);

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('https://start-redirect.com')).rejects.toMatchObject({
        code: 'UPSTREAM_ERROR',
      });

      vi.unstubAllGlobals();
    });
  });

  describe('AC-F2-03: Response Size Limit & Timeout Handling', () => {
    it('AC-F2-03: aborts and returns UPSTREAM_ERROR when response exceeds 2MB size cap', async () => {
      // Simulate stream producing > 2MB (2 * 1024 * 1024 + 1 bytes)
      const oversizedChunk = new Uint8Array(2 * 1024 * 1024 + 1024);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(oversizedChunk);
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 200,
        headers: new Headers({ 'content-length': String(oversizedChunk.length) }),
        body: stream,
        arrayBuffer: async () => oversizedChunk.buffer,
        text: async () => 'huge payload',
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const { safeFetch } = await import('@/server/security/ssrf');

      await expect(safeFetch('https://legit-site.com/large-file')).rejects.toMatchObject({
        code: 'UPSTREAM_ERROR',
      });

      vi.unstubAllGlobals();
    });

    it('AC-F2-03: aborts with UPSTREAM_ERROR on slow response or timeout (8000ms)', async () => {
      // Simulate timeout by rejecting with AbortError or timeout
      const mockFetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
          // Simulate hung response
          setTimeout(() => {
            const err = new Error('Timeout');
            err.name = 'TimeoutError';
            reject(err);
          }, 200);
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const { safeFetch } = await import('@/server/security/ssrf');

      // safeFetch should catch AbortError/Timeout and normalize to UPSTREAM_ERROR
      await expect(
        safeFetch('https://slow-hanging-site.com', { timeoutMs: 50 })
      ).rejects.toMatchObject({
        code: 'UPSTREAM_ERROR',
      });

      vi.unstubAllGlobals();
    });

    it('AC-F2-03: successfully returns response text for safe, valid response within 2MB and 8s', async () => {
      const sampleHtml = '<html><head><title>BrandPilot</title></head><body><h1>Marketing AI</h1></body></html>';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => sampleHtml,
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const { safeFetch } = await import('@/server/security/ssrf');
      const response = await safeFetch('https://example.com');
      const text = await response.text();

      expect(text).toBe(sampleHtml);
      expect(response.status).toBe(200);

      vi.unstubAllGlobals();
    });
  });
});
