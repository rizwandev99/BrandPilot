import crypto from 'node:crypto';
import type {
  Connector,
  ConnectorCapabilities,
  ConnectorExecutionContext,
  ConnectorMode,
  ConnectorStatus,
  PublishInput,
  PublishResult,
  SocialProvider,
} from '../types';
import { ConnectorError } from '../types';

export class LinkedInLiveAdapter implements Connector {
  public readonly provider: SocialProvider = 'linkedin';
  public readonly mode: ConnectorMode = 'live';
  public readonly capabilities: ConnectorCapabilities = {
    maxChars: 3000,
    maxHashtags: 30,
    supportsImage: true,
    supportsScheduling: true,
  };

  private idempotencyStore = new Map<string, PublishResult>();

  async connect(
    _ctx: ConnectorExecutionContext
  ): Promise<{ status: ConnectorStatus; accountLabel: string; authUrl?: string }> {
    if (process.env.ENABLE_LIVE_LINKEDIN !== 'true') {
      throw new ConnectorError(
        'PERMANENT',
        'Live LinkedIn mode is disabled (ENABLE_LIVE_LINKEDIN is not enabled)'
      );
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const redirectUri =
      process.env.LINKEDIN_REDIRECT_URI ||
      'http://localhost:3000/api/connectors/linkedin/callback';
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('w_member_social openid profile email')}` +
      `&state=${encodeURIComponent(state)}`;

    return {
      status: 'needs_reconnect',
      accountLabel: 'LinkedIn Member',
      authUrl,
    };
  }

  async disconnect(_ctx: ConnectorExecutionContext): Promise<void> {
    this.idempotencyStore.clear();
  }

  async healthCheck(
    ctx: ConnectorExecutionContext
  ): Promise<{ healthy: boolean; latencyMs?: number; details?: string }> {
    if (process.env.ENABLE_LIVE_LINKEDIN !== 'true') {
      return {
        healthy: false,
        latencyMs: 0,
        details: 'Live LinkedIn is disabled (ENABLE_LIVE_LINKEDIN!=true)',
      };
    }

    if (!ctx.accessToken) {
      return {
        healthy: false,
        latencyMs: 0,
        details: 'No LinkedIn access token available',
      };
    }

    const start = Date.now();
    try {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
        },
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          healthy: true,
          latencyMs,
          details: 'LinkedIn live connection active',
        };
      }

      if (res.status === 401) {
        return {
          healthy: false,
          latencyMs,
          details: 'LinkedIn access token expired or revoked',
        };
      }

      return {
        healthy: false,
        latencyMs,
        details: `LinkedIn health check returned HTTP ${res.status}`,
      };
    // intentional any: catch network error
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        details: `Network error connecting to LinkedIn: ${err.message}`,
      };
    }
  }

  async publish(
    ctx: ConnectorExecutionContext,
    input: PublishInput
  ): Promise<PublishResult> {
    if (process.env.ENABLE_LIVE_LINKEDIN !== 'true') {
      throw new ConnectorError(
        'PERMANENT',
        'Live LinkedIn mode is disabled (ENABLE_LIVE_LINKEDIN must be true)'
      );
    }

    // Validate content limits
    if (input.caption.length > this.capabilities.maxChars) {
      throw new ConnectorError(
        'INVALID_CONTENT',
        `Caption exceeds maximum characters allowed (${this.capabilities.maxChars} chars)`
      );
    }

    if (input.hashtags && input.hashtags.length > this.capabilities.maxHashtags) {
      throw new ConnectorError(
        'INVALID_CONTENT',
        `Hashtags count exceeds maximum allowed (${this.capabilities.maxHashtags})`
      );
    }

    if (!ctx.accessToken) {
      throw new ConnectorError(
        'AUTH_EXPIRED',
        'LinkedIn access token is missing or expired'
      );
    }

    // Idempotency check
    if (input.idempotencyKey && this.idempotencyStore.has(input.idempotencyKey)) {
      return this.idempotencyStore.get(input.idempotencyKey)!;
    }

    const commentary =
      input.hashtags.length > 0
        ? `${input.caption}\n\n${input.hashtags.join(' ')}`
        : input.caption;

    try {
      const res = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: 'urn:li:person:me',
          commentary,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      });

      if (res.status === 201) {
        const externalId =
          res.headers.get('x-restli-id') ||
          res.headers.get('x-linkedin-id') ||
          `urn:li:share:${crypto.randomUUID()}`;
        const externalUrl = `https://www.linkedin.com/feed/update/${externalId}`;

        const result: PublishResult = { externalId, externalUrl };
        if (input.idempotencyKey) {
          this.idempotencyStore.set(input.idempotencyKey, result);
        }
        return result;
      }

      if (res.status === 401) {
        throw new ConnectorError(
          'AUTH_EXPIRED',
          'LinkedIn token expired or unauthorized'
        );
      }

      if (res.status === 429) {
        const retryHeader = res.headers.get('retry-after');
        const retryAfter = retryHeader ? parseInt(retryHeader, 10) : 60;
        throw new ConnectorError(
          'RATE_LIMITED',
          'LinkedIn API rate limit exceeded',
          isNaN(retryAfter) ? 60 : retryAfter
        );
      }

      const bodyText = await res.text().catch(() => '');
      if (res.status === 400 || res.status === 422) {
        throw new ConnectorError(
          'INVALID_CONTENT',
          `LinkedIn rejected post content: ${bodyText}`
        );
      }

      if (res.status >= 500) {
        throw new ConnectorError(
          'TEMPORARY',
          `LinkedIn server error (HTTP ${res.status}): ${bodyText}`
        );
      }

      throw new ConnectorError(
        'PERMANENT',
        `LinkedIn API returned unexpected error (HTTP ${res.status}): ${bodyText}`
      );
    // intentional any: catch network or unexpected error
    } catch (err: any) {
      if (err instanceof ConnectorError) {
        throw err;
      }
      throw new ConnectorError(
        'TEMPORARY',
        `Network error during LinkedIn publish: ${err.message}`,
        undefined,
        err
      );
    }
  }
}

export const linkedInLiveAdapter = new LinkedInLiveAdapter();
