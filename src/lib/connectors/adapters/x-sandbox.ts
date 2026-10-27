import { BaseSandboxAdapter } from '../base-sandbox.adapter';
import type { ConnectorCapabilities, SocialProvider } from '../types';

export class XSandboxAdapter extends BaseSandboxAdapter {
  public readonly provider: SocialProvider = 'x';
  public readonly capabilities: ConnectorCapabilities = {
    maxChars: 280,
    maxHashtags: 5,
    supportsImage: true,
    supportsScheduling: true,
  };
}

export const xSandboxAdapter = new XSandboxAdapter();
