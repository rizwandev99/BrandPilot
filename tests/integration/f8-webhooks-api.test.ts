import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

describe('F8 Webhooks: Incoming Ingestion, SSRF Guard, and Activity Log API', () => {
  const TEST_PUBLIC_TOKEN = 'tok_pub_workspace_123';
  const TEST_HMAC_SECRET = 'whsec_test_secret_key_1234567890abcdef';
  const FIXED_NOW = 1700000000000;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function signPayload(bodyStr: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(Buffer.from(bodyStr)).digest('hex');
  }

  describe('AC-F8-01: Incoming Webhook Endpoint Authentication & Verification', () => {
    it('AC-F8-01: returns 202 Accepted and records incoming event for valid signature and fresh timestamp', async () => {
      const storedEvents: any[] = [];
      const payloadObj = { event_id: 'evt-unique-001', type: 'product.launched', title: 'BrandPilot v1' };
      const bodyStr = JSON.stringify(payloadObj);
      const signature = signPayload(bodyStr, TEST_HMAC_SECRET);
      const timestamp = String(Math.floor(Date.now() / 1000));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                // Return incoming endpoint matching public token
                return Promise.resolve([
                  {
                    id: 'ep-1',
                    workspaceId: 'ws-123',
                    publicToken: TEST_PUBLIC_TOKEN,
                    secretEncrypted: TEST_HMAC_SECRET, // Mock decrypted or plain in test mock
                  },
                ]);
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation((val) => {
              const eventRow = { ...val, id: 'event-uuid-001' };
              storedEvents.push(eventRow);
              return {
                returning: vi.fn().mockResolvedValue([eventRow]),
              };
            }),
          }),
        },
      }));

      // Mock automation dispatcher so it doesn't fail
      vi.doMock('@/lib/automations/engine', () => ({
        evaluateRule: vi.fn().mockResolvedValue({ matched: false, actionsToRun: [] }),
      }));

      const { POST } = await import('@/app/api/hooks/in/[publicToken]/route');
      const req = new Request(`http://localhost:3000/api/hooks/in/${TEST_PUBLIC_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PostPilot-Signature': signature,
          'X-PostPilot-Timestamp': timestamp,
        },
        body: bodyStr,
      });

      const response = await POST(req, { params: { publicToken: TEST_PUBLIC_TOKEN } });
      expect(response.status).toBe(202);

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.eventId).toBeDefined();

      expect(storedEvents.length).toBe(1);
      expect(storedEvents[0].source).toBe('incoming');
    });

    it('AC-F8-01: returns 401 SIGNATURE_INVALID when signature does not match secret', async () => {
      const bodyStr = JSON.stringify({ event_id: 'evt-bad-sig' });
      const badSignature = 'sha256=' + 'f'.repeat(64);
      const timestamp = String(Math.floor(Date.now() / 1000));

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { id: 'ep-1', publicToken: TEST_PUBLIC_TOKEN, secretEncrypted: TEST_HMAC_SECRET },
              ]),
            }),
          }),
        },
      }));

      const { POST } = await import('@/app/api/hooks/in/[publicToken]/route');
      const req = new Request(`http://localhost:3000/api/hooks/in/${TEST_PUBLIC_TOKEN}`, {
        method: 'POST',
        headers: {
          'X-PostPilot-Signature': badSignature,
          'X-PostPilot-Timestamp': timestamp,
        },
        body: bodyStr,
      });

      const response = await POST(req, { params: { publicToken: TEST_PUBLIC_TOKEN } });
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error?.code ?? json.error).toMatch(/SIGNATURE_INVALID|unauthorized/i);
    });

    it('AC-F8-01: returns 401 TIMESTAMP_EXPIRED when timestamp is older than 300 seconds', async () => {
      const bodyStr = JSON.stringify({ event_id: 'evt-old-time' });
      const signature = signPayload(bodyStr, TEST_HMAC_SECRET);
      // 301 seconds ago
      const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 301);

      const { POST } = await import('@/app/api/hooks/in/[publicToken]/route');
      const req = new Request(`http://localhost:3000/api/hooks/in/${TEST_PUBLIC_TOKEN}`, {
        method: 'POST',
        headers: {
          'X-PostPilot-Signature': signature,
          'X-PostPilot-Timestamp': expiredTimestamp,
        },
        body: bodyStr,
      });

      const response = await POST(req, { params: { publicToken: TEST_PUBLIC_TOKEN } });
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error?.code ?? json.error).toMatch(/TIMESTAMP_EXPIRED|expired/i);
    });

    it('AC-F8-01: returns 404 NOT_FOUND for unknown publicToken', async () => {
      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // No endpoint found
            }),
          }),
        },
      }));

      const bodyStr = JSON.stringify({ hello: 'world' });
      const { POST } = await import('@/app/api/hooks/in/[publicToken]/route');
      const req = new Request('http://localhost:3000/api/hooks/in/non_existent_token', {
        method: 'POST',
        headers: {
          'X-PostPilot-Signature': 'sha256=123',
          'X-PostPilot-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: bodyStr,
      });

      const response = await POST(req, { params: { publicToken: 'non_existent_token' } });
      expect(response.status).toBe(404);
    });
  });

  describe('AC-F8-04: Idempotent Event Deduplication by payload.event_id', () => {
    it('AC-F8-04: duplicate delivery with same event_id returns 202 without creating duplicate row', async () => {
      const duplicateEventId = 'evt-idempotent-999';
      const payloadObj = { event_id: duplicateEventId, title: 'Release 2.0' };
      const bodyStr = JSON.stringify(payloadObj);
      const signature = signPayload(bodyStr, TEST_HMAC_SECRET);
      const timestamp = String(Math.floor(Date.now() / 1000));

      let insertCount = 0;

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockImplementation((table) => ({
              where: vi.fn().mockImplementation(() => {
                // If checking endpoint:
                return Promise.resolve([
                  { id: 'ep-1', publicToken: TEST_PUBLIC_TOKEN, secretEncrypted: TEST_HMAC_SECRET },
                ]);
              }),
            })),
          })),
        },
      }));

      // Mock deduplication check finding existing event with same event_id
      vi.doMock('@/server/db/events', () => ({
        findEventByPayloadEventId: vi.fn().mockResolvedValue({ id: 'existing-event-id-999', payload: payloadObj }),
        insertEvent: vi.fn().mockImplementation(() => {
          insertCount++;
          return Promise.resolve({ id: 'new-id' });
        }),
      }));

      const { POST } = await import('@/app/api/hooks/in/[publicToken]/route');
      const req = new Request(`http://localhost:3000/api/hooks/in/${TEST_PUBLIC_TOKEN}`, {
        method: 'POST',
        headers: {
          'X-PostPilot-Signature': signature,
          'X-PostPilot-Timestamp': timestamp,
        },
        body: bodyStr,
      });

      const response = await POST(req, { params: { publicToken: TEST_PUBLIC_TOKEN } });
      expect(response.status).toBe(202);

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.duplicate || json.eventId).toBeDefined();
      // Ensure no new duplicate insert was made
      expect(insertCount).toBe(0);
    });
  });

  describe('AC-F8-05: Outgoing Webhook Delivery & SSRF Guard', () => {
    it('AC-F8-05: blocks outgoing webhooks to private IP ranges and AWS metadata with SSRF_BLOCKED', async () => {
      const { deliverOutgoingWebhook } = await import('@/server/webhooks/dispatcher');

      const blockedUrls = [
        'http://127.0.0.1:8080/callback',
        'http://localhost/hook',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/internal-hook',
        'http://192.168.1.50/api',
      ];

      for (const url of blockedUrls) {
        await expect(
          deliverOutgoingWebhook({
            url,
            secret: TEST_HMAC_SECRET,
            event: { type: 'post.published', payload: { postId: '123' } },
          })
        ).rejects.toMatchObject({
          code: 'SSRF_BLOCKED',
        });
      }
    });

    it('AC-F8-05: explicitly permits built-in sandbox receiver /api/sandbox/receiver/:token', async () => {
      const { deliverOutgoingWebhook } = await import('@/server/webhooks/dispatcher');

      const sandboxUrl = 'http://localhost:3000/api/sandbox/receiver/test_token_123';

      // Mock fetch to simulate receiver responding 200 OK
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ received: true }),
      });

      const result = await deliverOutgoingWebhook({
        url: sandboxUrl,
        secret: TEST_HMAC_SECRET,
        event: { type: 'post.published', payload: { postId: '123' } },
      });

      expect(result.status).toBe(200);
      expect(result.delivered).toBe(true);
    });

    it('AC-F8-05: built-in sandbox receiver route returns 200 OK', async () => {
      const { POST } = await import('@/app/api/sandbox/receiver/[token]/route');
      const req = new Request('http://localhost:3000/api/sandbox/receiver/tok_demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      const response = await POST(req, { params: { token: 'tok_demo' } });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('AC-F8-06: Outgoing Webhook Retry Policy and Attempt Logging', () => {
    it('AC-F8-06: retries on 5xx or network error up to 3 attempts and logs each attempt', async () => {
      const { deliverOutgoingWebhook } = await import('@/server/webhooks/dispatcher');

      let attemptCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return { ok: false, status: 503, statusText: 'Service Unavailable' };
        }
        return { ok: true, status: 200, statusText: 'OK' };
      });

      const attemptLogs: any[] = [];
      const result = await deliverOutgoingWebhook({
        url: 'https://example.com/webhook',
        secret: TEST_HMAC_SECRET,
        event: { type: 'post.approved', payload: { postId: 'p-1' } },
        onAttempt: (attempt) => attemptLogs.push(attempt),
      });

      expect(attemptCount).toBe(3);
      expect(result.delivered).toBe(true);
      expect(attemptLogs.length).toBe(3);
    });

    it('AC-F8-06: fails immediately without retry on non-retryable 4xx client errors', async () => {
      const { deliverOutgoingWebhook } = await import('@/server/webhooks/dispatcher');

      let attemptCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attemptCount++;
        return { ok: false, status: 400, statusText: 'Bad Request' };
      });

      const result = await deliverOutgoingWebhook({
        url: 'https://example.com/webhook',
        secret: TEST_HMAC_SECRET,
        event: { type: 'post.published', payload: { postId: 'p-1' } },
      });

      // Must not retry on 400
      expect(attemptCount).toBe(1);
      expect(result.delivered).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  describe('AC-F8-08: Activity Feed Pagination & Secret Redaction', () => {
    it('AC-F8-08: redacts sensitive keys from payload before returning activity event feed', async () => {
      const rawEvents = [
        {
          id: 'evt-1',
          source: 'incoming',
          type: 'webhook.received',
          status: 'success',
          payload: {
            apiKey: 'super_secret_123',
            accessToken: 'token_abc',
            secret: 'secret_xyz',
            normalData: 'public info',
          },
          createdAt: new Date(),
        },
      ];

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(rawEvents),
                  }),
                }),
              }),
            }),
          }),
        },
      }));

      const { GET } = await import('@/app/api/events/route');
      const req = new Request('http://localhost:3000/api/events?page=1&pageSize=10');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      const eventPayload = json.events[0].payload;

      expect(eventPayload.normalData).toBe('public info');
      // Sensitive fields must be redacted or masked
      expect(eventPayload.apiKey).toMatch(/\*\*\*|\[REDACTED\]/);
      expect(eventPayload.accessToken).toMatch(/\*\*\*|\[REDACTED\]/);
      expect(eventPayload.secret).toMatch(/\*\*\*|\[REDACTED\]/);
    });
  });

  describe('AC-F8-09: Secret Rotation', () => {
    it('AC-F8-09: rotates secret and immediately rejects requests signed with previous secret', async () => {
      let currentSecret = 'whsec_initial_secret_111';

      vi.doMock('@/server/db', () => ({
        db: {
          select: vi.fn().mockImplementation(() => ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockImplementation(() => {
                return Promise.resolve([
                  { id: 'ep-1', publicToken: TEST_PUBLIC_TOKEN, secretEncrypted: currentSecret },
                ]);
              }),
            }),
          })),
          update: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockImplementation((val) => {
              if (val.secretEncrypted) currentSecret = val.secretEncrypted;
              return {
                where: vi.fn().mockResolvedValue([]),
              };
            }),
          })),
        },
      }));

      // Rotate secret endpoint
      const { POST: rotateSecret } = await import('@/app/api/hooks/in/rotate-secret/route');
      const rotateRes = await rotateSecret(new Request('http://localhost:3000/api/hooks/in/rotate-secret', { method: 'POST' }));
      expect(rotateRes.status).toBe(200);

      const rotateJson = await rotateRes.json();
      expect(rotateJson.newSecretMasked ?? rotateJson.ok).toBeDefined();

      // Incoming webhook with OLD secret must now fail with 401
      const { POST: incomingWebhook } = await import('@/app/api/hooks/in/[publicToken]/route');
      const oldSignedReq = new Request(`http://localhost:3000/api/hooks/in/${TEST_PUBLIC_TOKEN}`, {
        method: 'POST',
        headers: {
          'X-PostPilot-Signature': signPayload('{"test":true}', 'whsec_initial_secret_111'),
          'X-PostPilot-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify({ test: true }),
      });

      const rejectRes = await incomingWebhook(oldSignedReq, { params: { publicToken: TEST_PUBLIC_TOKEN } });
      expect(rejectRes.status).toBe(401);
    });
  });
});
