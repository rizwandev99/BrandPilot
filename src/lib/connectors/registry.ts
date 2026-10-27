import type { Connector, ConnectorMode, SocialProvider } from './types';
import { linkedInSandboxAdapter } from './adapters/linkedin-sandbox';
import { xSandboxAdapter } from './adapters/x-sandbox';
import { instagramSandboxAdapter } from './adapters/instagram-sandbox';
import { facebookSandboxAdapter } from './adapters/facebook-sandbox';
import { linkedInLiveAdapter } from './adapters/linkedin-live';

const registry = new Map<string, Connector>();

function makeKey(provider: string, mode: ConnectorMode): string {
  return `${provider}:${mode}`;
}

/**
 * Registers a connector into the central registry.
 */
export function registerConnector(connector: Connector): void {
  registry.set(makeKey(connector.provider, connector.mode), connector);
}

/**
 * Retrieves a connector instance by provider and mode.
 * Throws NOT_FOUND if the combination is not registered.
 */
export function getConnector(
  provider: SocialProvider,
  mode: ConnectorMode = 'sandbox'
): Connector {
  const key = makeKey(provider, mode);
  const connector = registry.get(key);
  if (!connector) {
    throw new Error(
      `Connector NOT_FOUND: provider "${provider}" with mode "${mode}" is not registered or unsupported`
    );
  }
  return connector;
}

/**
 * Returns all currently registered connectors.
 */
export function listConnectors(): Connector[] {
  return Array.from(registry.values());
}

// Initialize default built-in connectors
registerConnector(linkedInSandboxAdapter);
registerConnector(xSandboxAdapter);
registerConnector(instagramSandboxAdapter);
registerConnector(facebookSandboxAdapter);
registerConnector(linkedInLiveAdapter);
