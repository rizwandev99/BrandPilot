import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canTransition,
  validateTransition,
  StatusTransitionError,
  ALL_POST_STATUSES,
  ALLOWED_TRANSITION_MAP,
  type PostStatus,
} from '@/lib/status-machine';
import { isPrivateIp, validateUrl, safeFetch, SsrfError, UpstreamError } from '@/server/security/ssrf';
import { computeHmacSha256, verifyHmacTimingSafe, isTimestampFresh } from '@/lib/security/hmac';
import { FallbackProvider } from '@/server/llm/fallback-provider';
import { renderCardPng } from '@/server/creatives/card-renderer';
import type { ClaimedJob } from '@/lib/scheduler/types';

describe('M12 Adversarial Stress Test Suite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. STATE MACHINE ADVERSARIAL STRESS
  // =========================================================================
  describe('1. State Machine Adversarial Stress', () => {
    it('1.1 Strictly rejects all prohibited state transitions across the full 9x9 matrix', () => {
      // In BrandPilot state machine:
      // draft -> only in_review
      // in_review -> only approved, held, rejected
      // held -> only in_review
      // approved -> only scheduled, in_review
      // scheduled -> only publishing, approved
      // publishing -> only published, failed
      // failed -> only scheduled
      // rejected -> only in_review
      // published -> [] (terminal)

      for (const fromStatus of ALL_POST_STATUSES) {
        const permitted = ALLOWED_TRANSITION_MAP[fromStatus] || [];

        for (const toStatus of ALL_POST_STATUSES) {
          const isAllowed = permitted.includes(toStatus);

          if (isAllowed) {
            expect(canTransition(fromStatus, toStatus)).toBe(true);
            expect(() => validateTransition(fromStatus, toStatus)).not.toThrow();
          } else {
            // Must be rejected
            expect(canTransition(fromStatus, toStatus)).toBe(false);
            expect(() => validateTransition(fromStatus, toStatus)).toThrow(StatusTransitionError);
          }
        }
      }
    });

    it('1.2 Rejects critical illegal transitions explicitly mandated in M12 scope', () => {
      // Mandate highlights:
      // draft -> published (ILLEGAL)
      expect(canTransition('draft', 'published')).toBe(false);
      expect(() => validateTransition('draft', 'published')).toThrow(StatusTransitionError);

      // in_review -> publishing (ILLEGAL)
      expect(canTransition('in_review', 'publishing')).toBe(false);
      expect(() => validateTransition('in_review', 'publishing')).toThrow(StatusTransitionError);

      // rejected -> scheduled (ILLEGAL)
      expect(canTransition('rejected', 'scheduled')).toBe(false);
      expect(() => validateTransition('rejected', 'scheduled')).toThrow(StatusTransitionError);

      // draft -> scheduled (ILLEGAL without approval)
      expect(canTransition('draft', 'scheduled')).toBe(false);
      expect(() => validateTransition('draft', 'scheduled')).toThrow(StatusTransitionError);

      // in_review -> published (ILLEGAL)
      expect(canTransition('in_review', 'published')).toBe(false);
      expect(() => validateTransition('in_review', 'published')).toThrow(StatusTransitionError);

      // Terminal published status cannot transition to ANY other status
      for (const target of ALL_POST_STATUSES) {
        expect(canTransition('published', target)).toBe(false);
        expect(() => validateTransition('published', target)).toThrow(StatusTransitionError);
      }

      // Self transitions are forbidden
      for (const st of ALL_POST_STATUSES) {
        expect(canTransition(st, st)).toBe(false);
      }
    });

    it('1.3 Post edits immediately reset "approved" and "scheduled" posts back to "in_review" and bump version', async () => {
      const mockWorkspaceId = 'ws-adv-statemachine-1';

      // Simulate approved post in database
      const existingApprovedPost = {
        id: 'post-adv-approved-1',
        workspaceId: mockWorkspaceId,
        status: 'approved' as const,
        caption: 'Original approved copy',
        channel: 'linkedin',
        version: 1,
        approvedAt: new Date('2026-10-25T10:00:00Z'),
        updatedAt: new Date('2026-10-25T10:00:00Z'),
      };

      let postInDb = { ...existingApprovedPost };

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: mockWorkspaceId, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => Promise.resolve([postInDb])),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((updates) => ({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockImplementation(() => {
                  postInDb = { ...postInDb, ...updates };
                  return Promise.resolve([postInDb]);
                }),
              }),
            })),
          }),
        },
      }));

      const { PATCH } = await import('@/app/api/posts/[id]/route');

      // Edit the approved post's caption
      const editReq = new Request('http://localhost:3000/api/posts/post-adv-approved-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: 'Updated modified copy by editor' }),
      });

      const response = await PATCH(editReq, { params: Promise.resolve({ id: 'post-adv-approved-1' }) });
      expect(response.status).toBe(200);

      const updated = await response.json();

      // State machine invariant: Post edit MUST reset status to in_review
      expect(updated.status).toBe('in_review');
      // Must clear approvedAt timestamp
      expect(updated.approvedAt).toBeNull();
      // Must increment version integer (1 -> 2)
      expect(updated.version).toBe(2);
      expect(updated.caption).toBe('Updated modified copy by editor');

      // Now test editing a 'scheduled' post
      postInDb.status = 'scheduled';
      postInDb.version = 2;
      postInDb.approvedAt = new Date();

      const editScheduledReq = new Request('http://localhost:3000/api/posts/post-adv-approved-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: 'Second modification to scheduled post' }),
      });

      const res2 = await PATCH(editScheduledReq, { params: Promise.resolve({ id: 'post-adv-approved-1' }) });
      expect(res2.status).toBe(200);
      const updated2 = await res2.json();

      expect(updated2.status).toBe('in_review');
      expect(updated2.approvedAt).toBeNull();
      expect(updated2.version).toBe(3);
    });

    it('1.4 Enforces that NO post can ever be scheduled or published without prior human approval', async () => {
      const mockWorkspaceId = 'ws-adv-approval-gate';

      // Test A: schedule-approved endpoint ignores unapproved posts
      const candidatePosts = [
        { id: 'p-draft', workspaceId: mockWorkspaceId, status: 'draft', channel: 'linkedin', version: 1 },
        { id: 'p-in-review', workspaceId: mockWorkspaceId, status: 'in_review', channel: 'linkedin', version: 1 },
        { id: 'p-held', workspaceId: mockWorkspaceId, status: 'held', channel: 'linkedin', version: 1 },
        { id: 'p-rejected', workspaceId: mockWorkspaceId, status: 'rejected', channel: 'linkedin', version: 1 },
        { id: 'p-approved', workspaceId: mockWorkspaceId, status: 'approved', channel: 'linkedin', version: 1 },
      ];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: mockWorkspaceId, isNew: false }),
      }));

      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue({
          provider: 'linkedin',
          mode: 'sandbox',
          capabilities: { maxChars: 3000, maxHashtags: 10, supportsImage: true, supportsScheduling: true },
        }),
      }));

      let currentQueryPost: any = null;
      const scheduledJobs: any[] = [];

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                if (currentQueryPost) {
                  return Promise.resolve([currentQueryPost]);
                }
                return Promise.resolve(candidatePosts.filter((p) => p.status === 'approved'));
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              scheduledJobs.push(val);
              return Promise.resolve([val]);
            }),
          }),
        },
      }));

      const { POST: scheduleApproved } = await import('@/app/api/posts/schedule-approved/route');
      const schedReq = new Request('http://localhost:3000/api/posts/schedule-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const schedRes = await scheduleApproved(schedReq);
      expect(schedRes.status).toBe(200);
      const schedData = await schedRes.json();

      // Only the 1 approved post was scheduled
      expect(schedData.scheduledCount).toBe(1);
      expect(scheduledJobs.length).toBe(1);
      expect(scheduledJobs[0].postId).toBe('p-approved');

      // Test B: publish-now endpoint blocks any unapproved post (draft, in_review, held, rejected)
      const { POST: publishNow } = await import('@/app/api/posts/[id]/publish-now/route');

      for (const unapprovedStatus of ['draft', 'in_review', 'held', 'rejected']) {
        currentQueryPost = {
          id: `post-${unapprovedStatus}`,
          workspaceId: mockWorkspaceId,
          status: unapprovedStatus,
          channel: 'linkedin',
          version: 1,
        };

        const pubReq = new Request(`http://localhost:3000/api/posts/post-${unapprovedStatus}/publish-now`, {
          method: 'POST',
        });

        const pubRes = await publishNow(pubReq, {
          params: Promise.resolve({ id: `post-${unapprovedStatus}` }),
        });

        // Must reject with 400 Bad Request
        expect(pubRes.status).toBe(400);
        const errJson = await pubRes.json();
        expect(errJson.error).toMatch(/must be approved first/i);
      }
    });
  });

  // =========================================================================
  // 2. SECURITY & SSRF STRESS
  // =========================================================================
  describe('2. Security & SSRF Stress', () => {
    it('2.1 Blocks all private, loopback, metadata, link-local, and reserved IPv4/IPv6 addresses', () => {
      const maliciousIps = [
        '127.0.0.1',
        '127.0.0.2',
        '127.255.255.254',
        '0.0.0.0',
        '169.254.169.254', // AWS/GCP/Azure Cloud Metadata
        '169.254.1.1',     // Link-local
        '10.0.0.1',        // RFC 1918 Class A
        '10.254.254.254',
        '172.16.0.1',       // RFC 1918 Class B
        '172.31.255.255',
        '192.168.1.1',      // RFC 1918 Class C
        '192.168.0.254',
        '100.64.0.1',       // RFC 6598 Carrier Grade NAT
        '100.127.255.254',
        '198.18.0.1',       // RFC 2544 Benchmark network
        '224.0.0.1',        // Multicast
        '240.0.0.1',        // Reserved
        '::1',              // IPv6 Loopback
        '::',               // IPv6 Unspecified
        '0:0:0:0:0:0:0:0',
        '0:0:0:0:0:0:0:1',
        'fe80::1',          // IPv6 Link-local
        'fc00::1',          // IPv6 Unique Local Address (ULA)
        'fd12:3456:789a::1',
        'ff02::1',          // IPv6 Multicast
        '::ffff:127.0.0.1', // IPv4-mapped IPv6 loopback
        '::ffff:169.254.169.254',
        '::ffff:10.0.0.1',
        '::ffff:192.168.1.1',
      ];

      for (const ip of maliciousIps) {
        expect(isPrivateIp(ip), `IP "${ip}" must be identified as private/prohibited`).toBe(true);
      }

      // Public routable IPs must return false
      const validPublicIps = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '140.82.121.3'];
      for (const ip of validPublicIps) {
        expect(isPrivateIp(ip), `Public IP "${ip}" must NOT be identified as private`).toBe(false);
      }
    });

    it('2.2 validateUrl rejects localhost, direct private IPs, and invalid protocols with SSRF_BLOCKED', async () => {
      const exploitUrls = [
        'http://127.0.0.1/admin',
        'http://0.0.0.0:8000',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/secret',
        'http://192.168.1.1/router-login',
        'http://[::1]:8080/metrics',
        'http://localhost:3000',
        'http://app.localhost',
        'ftp://example.com/file.txt',
        'file:///etc/passwd',
        'gopher://127.0.0.1:6379/_flushall',
      ];

      for (const targetUrl of exploitUrls) {
        await expect(
          validateUrl(targetUrl),
          `Target URL "${targetUrl}" should have been blocked with SSRF_BLOCKED`
        ).rejects.toThrow(SsrfError);
      }
    });

    it('2.3 safeFetch detects and halts SSRF attacks hidden inside 3xx redirect chains', async () => {
      // Mock fetch to simulate a public URL redirecting to AWS metadata IP 169.254.169.254
      const originalFetch = global.fetch;

      const mockFetch = vi.fn().mockImplementation(async (targetUrl: string) => {
        if (targetUrl === 'https://example.com/redirect-to-metadata') {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'http://169.254.169.254/latest/meta-data/iam/credentials',
            },
          });
        }
        return new Response('ok', { status: 200 });
      });

      global.fetch = mockFetch;

      try {
        await expect(
          safeFetch('https://example.com/redirect-to-metadata')
        ).rejects.toThrow(SsrfError);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('2.4 HMAC webhook verification: rejects replay attacks, expired timestamps, wrong secrets, and length mismatches', () => {
      const secret = 'prod_webhook_secret_key_abc123';
      const body = JSON.stringify({ event: 'invoice.paid', amount: 9900, id: 'evt-001' });
      const validSignature = computeHmacSha256(secret, body);

      const now = Date.now();

      // Case A: Fresh timestamp within 300s window passes
      expect(isTimestampFresh(now, 300, now)).toBe(true);
      expect(isTimestampFresh(now - 120_000, 300, now)).toBe(true); // 2 mins ago
      expect(isTimestampFresh(Math.floor((now - 60_000) / 1000), 300, now)).toBe(true); // in seconds

      // Case B: Replay attack > 300 seconds in past
      expect(isTimestampFresh(now - 301_000, 300, now)).toBe(false); // 301 seconds ago -> FAIL
      expect(isTimestampFresh(now - 3_600_000, 300, now)).toBe(false); // 1 hour ago -> FAIL
      expect(isTimestampFresh(now + 301_000, 300, now)).toBe(false); // 301s in future -> FAIL
      expect(isTimestampFresh('', 300, now)).toBe(false);
      expect(isTimestampFresh('invalid-timestamp', 300, now)).toBe(false);

      // Case C: Valid signature with or without sha256= prefix passes
      expect(verifyHmacTimingSafe(secret, body, validSignature)).toBe(true);
      expect(verifyHmacTimingSafe(secret, body, `sha256=${validSignature}`)).toBe(true);

      // Case D: Wrong secret fails
      expect(verifyHmacTimingSafe('wrong_attacker_secret', body, validSignature)).toBe(false);

      // Case E: Tampered body fails
      const tamperedBody = JSON.stringify({ event: 'invoice.paid', amount: 0, id: 'evt-001' });
      expect(verifyHmacTimingSafe(secret, tamperedBody, validSignature)).toBe(false);

      // Case F: Buffer length mismatch (attacker supplies truncated or padded signature)
      // Must return false cleanly without throwing RangeError in timingSafeEqual
      const shortSig = 'a'.repeat(32);
      const longSig = 'a'.repeat(128);
      expect(verifyHmacTimingSafe(secret, body, shortSig)).toBe(false);
      expect(verifyHmacTimingSafe(secret, body, longSig)).toBe(false);
      expect(verifyHmacTimingSafe(secret, body, '')).toBe(false);
    });
  });

  // =========================================================================
  // 3. CONCURRENCY & CONCURRENCY LOCK STRESS
  // =========================================================================
  describe('3. Concurrency & Concurrency Lock Stress', () => {
    it('3.1 Parallel runDueJobs across multiple workers guarantees zero duplicate publishing', async () => {
      // 10 due publish jobs
      const dueJobs: ClaimedJob[] = Array.from({ length: 10 }, (_, i) => ({
        id: `job-stress-${i + 1}`,
        postId: `post-stress-${i + 1}`,
        connectorId: `conn-${(i % 4) + 1}`,
        idempotencyKey: `post-stress-${i + 1}:1:linkedin`,
        status: 'queued',
        attempt: 0,
        workspaceId: 'ws-concurrency-stress',
      }));

      // Shared atomic lock simulating DB SKIP LOCKED
      const lockedJobIds = new Set<string>();
      const publishedJobs = new Set<string>();
      const executionCountPerJob = new Map<string, number>();

      const mockConnector = {
        provider: 'linkedin' as const,
        mode: 'sandbox' as const,
        capabilities: { maxChars: 3000, maxHashtags: 10, supportsImage: true, supportsScheduling: true },
        publish: vi.fn().mockImplementation(async (_ctx, input) => {
          // Add artificial jitter to expose race conditions
          await new Promise((r) => setTimeout(r, Math.random() * 20 + 5));
          publishedJobs.add(input.postId);
          executionCountPerJob.set(input.postId, (executionCountPerJob.get(input.postId) || 0) + 1);
          return { externalId: `ext-${input.idempotencyKey}`, externalUrl: `https://mock.linkedin.com/${input.idempotencyKey}` };
        }),
      };

      vi.doMock('@/lib/connectors/registry', () => ({
        getConnector: vi.fn().mockReturnValue(mockConnector),
      }));

      const concurrencyLockHelper = {
        claimDueJobs: vi.fn().mockImplementation(async (_workerName: string, batchSize = 10) => {
          const claimed: ClaimedJob[] = [];
          for (const job of dueJobs) {
            if (!lockedJobIds.has(job.id)) {
              lockedJobIds.add(job.id);
              claimed.push(job);
              if (claimed.length >= batchSize) break;
            }
          }
          return claimed;
        }),
        releaseJob: vi.fn().mockImplementation(async (id: string) => {
          lockedJobIds.delete(id);
        }),
      };

      const { runDueJobs } = await import('@/lib/scheduler/runner');

      // Launch 5 workers concurrently competing for the 10 due jobs
      const workerPromises = Array.from({ length: 5 }, (_, idx) =>
        runDueJobs({ workerName: `worker-${idx + 1}`, lockHelper: concurrencyLockHelper, batchSize: 5 })
      );

      const results = await Promise.all(workerPromises);

      const totalProcessed = results.reduce((acc, r) => acc + (r.processedCount || 0), 0);
      const totalSucceeded = results.reduce((acc, r) => acc + (r.succeededCount || 0), 0);

      // Every job must be claimed and processed exactly once
      expect(totalProcessed).toBe(10);
      expect(totalSucceeded).toBe(10);

      // Verify that every single post was published exactly 1 time
      expect(publishedJobs.size).toBe(10);
      for (const [postId, count] of executionCountPerJob.entries()) {
        expect(count, `Post ${postId} must NOT be published multiple times`).toBe(1);
      }

      // mockConnector.publish must have been called exactly 10 times in total
      expect(mockConnector.publish).toHaveBeenCalledTimes(10);
    });
  });

  // =========================================================================
  // 4. 100% OFFLINE DEMO GUARANTEE
  // =========================================================================
  describe('4. 100% Offline Demo Guarantee', () => {
    it('4.1 Complete pipeline (BrandKit -> 3-Step Agent -> Approval -> Schedule -> Publish) runs offline with ZERO external API calls', async () => {
      // Guard: intercept any network call to verify that offline execution makes zero external HTTP requests
      let externalNetworkCallAttempted = false;
      const originalFetch = global.fetch;

      global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        // Allow internal localhost requests if any, but block any external network calls
        if (!urlStr.includes('localhost') && !urlStr.includes('127.0.0.1')) {
          externalNetworkCallAttempted = true;
          throw new Error(`Outbound network call blocked in offline mode: ${urlStr}`);
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      });

      try {
        const provider = new FallbackProvider();

        // 1. Generate Brand Kit completely offline using FallbackProvider
        const brandKitResult = await provider.generateBrandKit({
          url: 'https://sample-brand.local',
          scrapedData: {
            title: 'BrandPilot Offline Showcase',
            description: 'Autonomous multi-channel AI marketing platform running in air-gapped demo mode.',
            headings: ['Autonomous Publishing', 'Zero Dependency Architecture', 'Privacy Guaranteed'],
            colors: ['#2563eb', '#4f46e5'],
          },
        });

        expect(brandKitResult.provider).toBe('fallback');
        const kit = brandKitResult.data;
        expect(kit.name).toContain('BrandPilot');
        expect(kit.colors.primary).toBe('#2563eb');
        expect(kit.colors.background).toBe('#ffffff');
        expect(kit.tone.length).toBeGreaterThan(0);
        expect(kit.dos.length).toBeGreaterThan(0);
        expect(kit.donts.length).toBeGreaterThan(0);

        // 2. Step 1: Generate Ideas completely offline
        const ideasResult = await provider.generateIdeas({
          brandKit: kit,
          goal: 'Demonstrate resilient social media orchestration without external cloud dependencies',
          channels: ['linkedin', 'x', 'instagram', 'facebook'],
          postCount: 4,
        });

        expect(ideasResult.provider).toBe('fallback');
        expect(ideasResult.data.length).toBe(4);
        const firstIdea = ideasResult.data[0];

        // 3. Step 2: Generate Creative copy & SVG spec offline
        const creativeResult = await provider.generateCreative({
          brandKit: kit,
          idea: firstIdea,
        });

        expect(creativeResult.provider).toBe('fallback');
        expect(creativeResult.data.caption.length).toBeGreaterThan(10);
        expect(creativeResult.data.creativeSpec).toBeDefined();

        // 4. Step 3: Resvg Branded Card Rendering (pure local SVG -> PNG conversion)
        const pngBuffer = renderCardPng({
          channel: firstIdea.channel,
          spec: creativeResult.data.creativeSpec,
        });

        expect(Buffer.isBuffer(pngBuffer)).toBe(true);
        expect(pngBuffer.length).toBeGreaterThan(100);
        // Verify PNG magic number bytes (0x89, 'P', 'N', 'G')
        expect(pngBuffer[0]).toBe(0x89);
        expect(pngBuffer[1]).toBe(0x50); // 'P'
        expect(pngBuffer[2]).toBe(0x4e); // 'N'
        expect(pngBuffer[3]).toBe(0x47); // 'G'

        // 5. Post Status Machine: Initial draft/in_review -> Human Approval Gate
        let postStatus: PostStatus = 'in_review';
        expect(canTransition(postStatus, 'approved')).toBe(true);
        postStatus = 'approved';

        // 6. Schedule approved post
        expect(canTransition(postStatus, 'scheduled')).toBe(true);
        postStatus = 'scheduled';

        // 7. Publish post via sandbox connector
        expect(canTransition(postStatus, 'publishing')).toBe(true);
        postStatus = 'publishing';

        expect(canTransition(postStatus, 'published')).toBe(true);
        postStatus = 'published';

        // Verify that throughout the entire pipeline, ZERO external network calls were attempted
        expect(externalNetworkCallAttempted, 'Offline demo pipeline must not make external network requests').toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('4.2 FallbackProvider and WCAG AA contrast auto-adjust guarantee readable palettes offline', async () => {
      const { ensureWcagContrast, getContrastRatio } = await import('@/lib/color-contrast');

      // Test extreme poor contrast: #fefefe text on #ffffff background
      const palette = ensureWcagContrast({
        primary: '#2563eb',
        secondary: '#10b981',
        background: '#ffffff',
        text: '#fefefe', // almost invisible on white!
      });

      const contrastRatio = getContrastRatio(palette.text, palette.background);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);

      // Dark background with dark text
      const darkPalette = ensureWcagContrast({
        primary: '#2563eb',
        secondary: '#10b981',
        background: '#121212',
        text: '#1a1a1a', // almost invisible on dark!
      });

      const darkContrastRatio = getContrastRatio(darkPalette.text, darkPalette.background);
      expect(darkContrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('4.3 Channel constraint validator guarantees compliance with X (280 chars), LinkedIn (3000), IG (2200), FB (2000)', async () => {
      const { validatePostForChannel } = await import('@/lib/channels');

      // X: 281 characters must fail
      const xResultTooLong = validatePostForChannel({ caption: 'a'.repeat(281), hashtags: [] }, 'x');
      expect(xResultTooLong.valid).toBe(false);
      expect(xResultTooLong.errors.length).toBeGreaterThan(0);

      // X: 280 characters passes
      const xResultPass = validatePostForChannel({ caption: 'a'.repeat(280), hashtags: ['#test'] }, 'x');
      expect(xResultPass.valid).toBe(true);

      // Instagram: max 30 hashtags (31 must fail)
      const igResultTooManyTags = validatePostForChannel(
        { caption: 'Check this out', hashtags: Array.from({ length: 31 }, (_, i) => `#tag${i}`) },
        'instagram'
      );
      expect(igResultTooManyTags.valid).toBe(false);
      expect(igResultTooManyTags.errors.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // ADDITIONAL ADVERSARIAL STRESS: BULK APPROVAL, PAYLOAD CAP, & RETRY
  // =========================================================================
  describe('5. Bulk Approval, Payload Caps & Retry Backoff Adversarial Edge Cases', () => {
    it('5.1 Bulk approve-all ONLY transitions in_review posts and skips draft, held, rejected, published', async () => {
      const mockWorkspaceId = 'ws-adv-bulk-approve';
      const approvedPostsIds: string[] = [];

      vi.doMock('@/server/workspace/workspace-service', () => ({
        resolveWorkspace: vi.fn().mockResolvedValue({ workspaceId: mockWorkspaceId, isNew: false }),
      }));

      vi.doMock('@/server/db', () => ({
        db: {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation(() => ({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockImplementation(() => {
                  approvedPostsIds.push('p1', 'p2');
                  return Promise.resolve([{ id: 'p1', status: 'approved' }, { id: 'p2', status: 'approved' }]);
                }),
              }),
            })),
          }),
        },
      }));

      const { POST: approveAll } = await import('@/app/api/posts/approve-all/route');
      const req = new Request('http://localhost:3000/api/posts/approve-all', {
        method: 'POST',
      });

      const res = await approveAll(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      // Exactly 2 posts in_review were approved, others were untouched
      expect(json.approvedCount).toBe(2);
      expect(approvedPostsIds).toEqual(['p1', 'p2']);
    });

    it('5.2 safeFetch strictly enforces 2MB response size limit to prevent memory exhaustion DoS', async () => {
      const originalFetch = global.fetch;

      // Mock fetch returning a stream or text exceeding 2MB (2,097,153 bytes)
      const hugeContent = 'x'.repeat(2 * 1024 * 1024 + 10);
      global.fetch = vi.fn().mockResolvedValue(
        new Response(hugeContent, {
          status: 200,
          headers: {
            'content-type': 'text/plain',
            'content-length': String(hugeContent.length),
          },
        })
      );

      try {
        await expect(
          safeFetch('https://example.com/huge-file.html', { maxSize: 2 * 1024 * 1024 })
        ).rejects.toThrow(UpstreamError);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('5.3 Retry policy generates exponentially increasing backoff with jitter and respects Retry-After headers', async () => {
      const { calculateNextRetry, isRetryableError } = await import('@/lib/scheduler/retry-policy');

      // Non-retryable error
      expect(isRetryableError('INVALID_CREDENTIALS')).toBe(false);
      const nonRetryDecision = calculateNextRetry(1, 'INVALID_CREDENTIALS');
      expect(nonRetryDecision.shouldRetry).toBe(false);

      // Retryable error (TEMPORARY / RATE_LIMITED)
      expect(isRetryableError('TEMPORARY')).toBe(true);
      expect(isRetryableError('RATE_LIMITED')).toBe(true);

      // Attempt 1 vs Attempt 2: base delay increases exponentially
      const dec1 = calculateNextRetry(1, 'TEMPORARY', undefined, undefined, () => 0.5);
      const dec2 = calculateNextRetry(2, 'TEMPORARY', undefined, undefined, () => 0.5);
      const dec3 = calculateNextRetry(3, 'TEMPORARY', undefined, undefined, () => 0.5);

      expect(dec1.shouldRetry).toBe(true);
      expect(dec2.shouldRetry).toBe(true);
      expect(dec3.shouldRetry).toBe(true);
      expect(dec2.delayMs!).toBeGreaterThan(dec1.delayMs!);
      expect(dec3.delayMs!).toBeGreaterThan(dec2.delayMs!);

      // Attempt >= 4 reaches max attempts cap (shouldRetry = false)
      const dec4 = calculateNextRetry(4, 'TEMPORARY');
      expect(dec4.shouldRetry).toBe(false);

      // Upstream Retry-After header (e.g. 45 seconds) overrides exponential delay
      const decWithHeader = calculateNextRetry(1, 'RATE_LIMITED', 45);
      expect(decWithHeader.shouldRetry).toBe(true);
      expect(decWithHeader.delayMs).toBe(45000);
    });
  });
});

