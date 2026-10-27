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
} from './types';
import { ConnectorError } from './types';

export abstract class BaseSandboxAdapter implements Connector {
  public abstract readonly provider: SocialProvider;
  public readonly mode: ConnectorMode = 'sandbox';
  public abstract readonly capabilities: ConnectorCapabilities;

  private idempotencyStore = new Map<string, PublishResult>();

  async connect(
    _ctx: ConnectorExecutionContext
  ): Promise<{ status: ConnectorStatus; accountLabel: string; authUrl?: string }> {
    return {
      status: 'connected',
      accountLabel: `Sandbox ${this.provider.toUpperCase()}`,
    };
  }

  async disconnect(_ctx: ConnectorExecutionContext): Promise<void> {
    // Sandbox disconnect is a no-op locally
  }

  async healthCheck(
    _ctx: ConnectorExecutionContext
  ): Promise<{ healthy: boolean; latencyMs?: number; details?: string }> {
    return {
      healthy: true,
      latencyMs: 15,
      details: `Sandbox ${this.provider} ping successful`,
    };
  }

  async publish(
    ctx: ConnectorExecutionContext,
    input: PublishInput
  ): Promise<PublishResult> {
    // 1. Configurable failure simulation
    const simulatedError = ctx.simulationConfig?.simulatedError;
    if (simulatedError && simulatedError !== 'none') {
      switch (simulatedError) {
        case 'temporary':
          throw new ConnectorError(
            'TEMPORARY',
            `Simulated temporary 500 error on ${this.provider} sandbox`
          );
        case 'rate_limit':
          throw new ConnectorError(
            'RATE_LIMITED',
            `Simulated 429 rate limit error on ${this.provider} sandbox`,
            ctx.simulationConfig?.retryAfterSeconds ?? 60
          );
        case 'permanent':
          throw new ConnectorError(
            'PERMANENT',
            `Simulated permanent 400 error on ${this.provider} sandbox`
          );
        case 'auth_expired':
          throw new ConnectorError(
            'AUTH_EXPIRED',
            `Simulated 401 auth expired error on ${this.provider} sandbox`
          );
      }
    }

    // 2. Content constraints validation
    if (input.caption.length > this.capabilities.maxChars) {
      throw new ConnectorError(
        'INVALID_CONTENT',
        `Caption exceeds maximum characters allowed for ${this.provider} (${this.capabilities.maxChars} chars)`
      );
    }

    if (input.hashtags && input.hashtags.length > this.capabilities.maxHashtags) {
      throw new ConnectorError(
        'INVALID_CONTENT',
        `Hashtags count exceeds maximum allowed for ${this.provider} (${this.capabilities.maxHashtags})`
      );
    }

    // 3. Idempotency handling
    if (input.idempotencyKey && this.idempotencyStore.has(input.idempotencyKey)) {
      return this.idempotencyStore.get(input.idempotencyKey)!;
    }

    // 4. Generate new publication result
    const externalId = `sb-${this.provider}-${crypto.randomUUID()}`;
    const externalUrl = `https://sandbox.brandpilot.app/${this.provider}/posts/${externalId}`;
    const result: PublishResult = {
      externalId,
      externalUrl,
    };

    if (input.idempotencyKey) {
      this.idempotencyStore.set(input.idempotencyKey, result);
    }

    return result;
  }
}
