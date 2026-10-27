import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  Connector,
  PublishInput,
  PublishResult,
  SocialProvider,
  ConnectorMode,
} from '@/lib/connectors/types';

describe('F4: Connector Framework Contract & Sandbox Adapters', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const samplePublishInput: PublishInput = {
    postId: 'post-uuid-001',
    caption: 'Discover modern workflows with BrandPilot. Safe, automated, on-brand.',
    hashtags: ['#brandpilot', '#marketing', '#ai'],
    mediaUrl: 'https://example.com/assets/sample-creative.png',
    creativeSpec: {
      templateId: 'feature',
      headline: 'Automate social marketing with BrandPilot',
      subline: 'Strict approval gates, multi-channel scheduling',
      colors: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        background: '#ffffff',
        text: '#0f172a',
      },
    },
    idempotencyKey: 'post-uuid-001:1:linkedin',
  };

  describe('AC-F4-01: Connector Registry & Provider Lookup', () => {
    it('AC-F4-01: returns connector instance for all valid providers in sandbox mode', async () => {
      const { getConnector } = await import('@/lib/connectors/registry');

      const providers: SocialProvider[] = ['linkedin', 'instagram', 'x', 'facebook'];
      for (const provider of providers) {
        const connector = getConnector(provider, 'sandbox');
        expect(connector, `Connector for ${provider} (sandbox) must exist`).toBeDefined();
        expect(connector.provider).toBe(provider);
        expect(connector.mode).toBe('sandbox');
      }
    });

    it('AC-F4-01: returns live connector for linkedin provider when mode is live', async () => {
      const { getConnector } = await import('@/lib/connectors/registry');

      const connector = getConnector('linkedin', 'live');
      expect(connector).toBeDefined();
      expect(connector.provider).toBe('linkedin');
      expect(connector.mode).toBe('live');
    });

    it('AC-F4-01: throws NOT_FOUND error for unknown provider', async () => {
      const { getConnector } = await import('@/lib/connectors/registry');

      expect(() => {
        // @ts-expect-error testing invalid provider
        getConnector('unsupported_platform', 'sandbox');
      }).toThrow(/NOT_FOUND|not found/i);
    });

    it('AC-F4-01: throws NOT_FOUND error for unsupported live mode on sandbox-only providers', async () => {
      const { getConnector } = await import('@/lib/connectors/registry');

      expect(() => {
        getConnector('instagram', 'live');
      }).toThrow(/NOT_FOUND|not found|unsupported/i);

      expect(() => {
        getConnector('x', 'live');
      }).toThrow(/NOT_FOUND|not found|unsupported/i);

      expect(() => {
        getConnector('facebook', 'live');
      }).toThrow(/NOT_FOUND|not found|unsupported/i);
    });

    it('AC-F4-01: lists all supported connector provider and mode pairs', async () => {
      const { listConnectors } = await import('@/lib/connectors/registry');

      const list = listConnectors();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(4);

      const providers = list.map((c: Connector) => `${c.provider}:${c.mode}`);
      expect(providers).toContain('linkedin:sandbox');
      expect(providers).toContain('instagram:sandbox');
      expect(providers).toContain('x:sandbox');
      expect(providers).toContain('facebook:sandbox');
      expect(providers).toContain('linkedin:live');
    });
  });

  describe('AC-F4-02: Shared Contract Test Suite across All Sandbox Adapters', () => {
    const sandboxProviders: SocialProvider[] = ['linkedin', 'instagram', 'x', 'facebook'];

    for (const provider of sandboxProviders) {
      describe(`Adapter contract: ${provider} (sandbox)`, () => {
        it(`AC-F4-02: declares valid capabilities for ${provider}`, async () => {
          const { getConnector } = await import('@/lib/connectors/registry');
          const connector = getConnector(provider, 'sandbox');

          expect(connector.capabilities).toBeDefined();
          expect(typeof connector.capabilities.maxChars).toBe('number');
          expect(connector.capabilities.maxChars).toBeGreaterThan(0);
          expect(typeof connector.capabilities.maxHashtags).toBe('number');
          expect(typeof connector.capabilities.supportsImage).toBe('boolean');
          expect(typeof connector.capabilities.supportsScheduling).toBe('boolean');

          // Check channel limits defined in PRD
          if (provider === 'x') {
            expect(connector.capabilities.maxChars).toBeLessThanOrEqual(280);
          } else if (provider === 'linkedin') {
            expect(connector.capabilities.maxChars).toBeGreaterThanOrEqual(3000);
          } else if (provider === 'instagram') {
            expect(connector.capabilities.maxChars).toBeLessThanOrEqual(2200);
            expect(connector.capabilities.maxHashtags).toBeLessThanOrEqual(30);
          } else if (provider === 'facebook') {
            expect(connector.capabilities.maxChars).toBeLessThanOrEqual(2000);
          }
        });

        it(`AC-F4-02: healthCheck returns healthy status for ${provider}`, async () => {
          const { getConnector } = await import('@/lib/connectors/registry');
          const connector = getConnector(provider, 'sandbox');

          const health = await connector.healthCheck({ workspaceId: 'ws-test-123' });
          expect(health.healthy).toBe(true);
        });

        it(`AC-F4-02: publish succeeds and returns externalId and sandbox URL for ${provider}`, async () => {
          const { getConnector } = await import('@/lib/connectors/registry');
          const connector = getConnector(provider, 'sandbox');

          const input: PublishInput = {
            ...samplePublishInput,
            idempotencyKey: `post-001:1:${provider}`,
          };

          const result: PublishResult = await connector.publish(
            { workspaceId: 'ws-test-123' },
            input
          );

          expect(result).toBeDefined();
          expect(result.externalId).toBeDefined();
          expect(typeof result.externalId).toBe('string');
          expect(result.externalId.length).toBeGreaterThan(0);
          expect(result.externalUrl).toBeDefined();
          expect(result.externalUrl.toLowerCase()).toMatch(/sandbox|mock|preview/);
        });

        it(`AC-F4-02: idempotencyKey handling: repeat publish returns exact same externalId without duplicate action for ${provider}`, async () => {
          const { getConnector } = await import('@/lib/connectors/registry');
          const connector = getConnector(provider, 'sandbox');

          const key = `post-idem-test:1:${provider}`;
          const input: PublishInput = {
            ...samplePublishInput,
            idempotencyKey: key,
          };

          const firstResult = await connector.publish({ workspaceId: 'ws-test-123' }, input);
          const secondResult = await connector.publish({ workspaceId: 'ws-test-123' }, input);

          expect(secondResult.externalId).toBe(firstResult.externalId);
          expect(secondResult.externalUrl).toBe(firstResult.externalUrl);

          // With a different idempotency key, a new externalId must be issued
          const differentInput: PublishInput = {
            ...samplePublishInput,
            idempotencyKey: `post-idem-test-2:1:${provider}`,
          };
          const thirdResult = await connector.publish(
            { workspaceId: 'ws-test-123' },
            differentInput
          );
          expect(thirdResult.externalId).not.toBe(firstResult.externalId);
        });

        it(`AC-F4-02: maps invalid content (e.g. caption exceeding maxChars) to INVALID_CONTENT error for ${provider}`, async () => {
          const { getConnector } = await import('@/lib/connectors/registry');
          const { ConnectorError } = await import('@/lib/connectors/types');
          const connector = getConnector(provider, 'sandbox');

          const oversizedCaption = 'A'.repeat(connector.capabilities.maxChars + 50);
          const oversizedInput: PublishInput = {
            ...samplePublishInput,
            caption: oversizedCaption,
            idempotencyKey: `post-overflow:1:${provider}`,
          };

          await expect(
            connector.publish({ workspaceId: 'ws-test-123' }, oversizedInput)
          ).rejects.toThrow(ConnectorError);

          try {
            await connector.publish({ workspaceId: 'ws-test-123' }, oversizedInput);
          } catch (err: any) {
            expect(err.code).toBe('INVALID_CONTENT');
          }
        });
      });
    }
  });

  describe('AC-F4-03: Sandbox Adapters Failure Simulation', () => {
    const providers: SocialProvider[] = ['linkedin', 'instagram', 'x', 'facebook'];

    for (const provider of providers) {
      it(`AC-F4-03: simulates TEMPORARY failure when configured for ${provider}`, async () => {
        const { getConnector } = await import('@/lib/connectors/registry');
        const connector = getConnector(provider, 'sandbox');

        await expect(
          connector.publish(
            {
              workspaceId: 'ws-test-123',
              simulationConfig: { simulatedError: 'temporary' },
            },
            { ...samplePublishInput, idempotencyKey: `sim-temp:${provider}` }
          )
        ).rejects.toMatchObject({
          code: 'TEMPORARY',
        });
      });

      it(`AC-F4-03: simulates RATE_LIMITED failure with retryAfterSeconds for ${provider}`, async () => {
        const { getConnector } = await import('@/lib/connectors/registry');
        const connector = getConnector(provider, 'sandbox');

        try {
          await connector.publish(
            {
              workspaceId: 'ws-test-123',
              simulationConfig: { simulatedError: 'rate_limit', retryAfterSeconds: 45 },
            },
            { ...samplePublishInput, idempotencyKey: `sim-rate:${provider}` }
          );
          expect.fail('Should have thrown RATE_LIMITED');
        } catch (err: any) {
          expect(err.code).toBe('RATE_LIMITED');
          expect(err.retryAfterSeconds).toBe(45);
        }
      });

      it(`AC-F4-03: simulates PERMANENT failure when configured for ${provider}`, async () => {
        const { getConnector } = await import('@/lib/connectors/registry');
        const connector = getConnector(provider, 'sandbox');

        await expect(
          connector.publish(
            {
              workspaceId: 'ws-test-123',
              simulationConfig: { simulatedError: 'permanent' },
            },
            { ...samplePublishInput, idempotencyKey: `sim-perm:${provider}` }
          )
        ).rejects.toMatchObject({
          code: 'PERMANENT',
        });
      });

      it(`AC-F4-03: succeeds when simulatedError is explicitly set to none for ${provider}`, async () => {
        const { getConnector } = await import('@/lib/connectors/registry');
        const connector = getConnector(provider, 'sandbox');

        const result = await connector.publish(
          {
            workspaceId: 'ws-test-123',
            simulationConfig: { simulatedError: 'none' },
          },
          { ...samplePublishInput, idempotencyKey: `sim-none:${provider}` }
        );

        expect(result.externalId).toBeDefined();
      });
    }
  });

  describe('AC-F4-09: Extensible Adapter Pattern', () => {
    it('AC-F4-09: allows registering a custom provider without touching scheduler or core logic', async () => {
      const { registerConnector, getConnector } = await import('@/lib/connectors/registry');

      // Create a mock custom connector adhering to Connector interface
      const customAdapter: Connector = {
        provider: 'bluesky' as any,
        mode: 'sandbox',
        capabilities: {
          maxChars: 300,
          maxHashtags: 10,
          supportsImage: true,
          supportsScheduling: true,
        },
        connect: vi.fn().mockResolvedValue({ status: 'connected', accountLabel: '@custom.bsky.social' }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
        publish: vi.fn().mockResolvedValue({
          externalId: 'bsky-post-123',
          externalUrl: 'https://sandbox.brandpilot.app/bsky/123',
        }),
      };

      registerConnector(customAdapter);

      const retrieved = getConnector('bluesky' as any, 'sandbox');
      expect(retrieved).toBeDefined();
      expect(retrieved.capabilities.maxChars).toBe(300);

      const pubResult = await retrieved.publish(
        { workspaceId: 'ws-test' },
        { ...samplePublishInput, idempotencyKey: 'bsky-idem:1' }
      );
      expect(pubResult.externalId).toBe('bsky-post-123');
      expect(customAdapter.publish).toHaveBeenCalled();
    });
  });
});
