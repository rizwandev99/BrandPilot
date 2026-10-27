import { BaseSandboxAdapter } from '../base-sandbox.adapter';
import type { ConnectorCapabilities, SocialProvider } from '../types';

export class LinkedInSandboxAdapter extends BaseSandboxAdapter {
  public readonly provider: SocialProvider = 'linkedin';
  public readonly capabilities: ConnectorCapabilities = {
    maxChars: 3000,
    maxHashtags: 30,
    supportsImage: true,
    supportsScheduling: true,
  };
}

export const linkedInSandboxAdapter = new LinkedInSandboxAdapter();
