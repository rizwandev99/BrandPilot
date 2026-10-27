import { BaseSandboxAdapter } from '../base-sandbox.adapter';
import type { ConnectorCapabilities, SocialProvider } from '../types';

export class FacebookSandboxAdapter extends BaseSandboxAdapter {
  public readonly provider: SocialProvider = 'facebook';
  public readonly capabilities: ConnectorCapabilities = {
    maxChars: 2000,
    maxHashtags: 30,
    supportsImage: true,
    supportsScheduling: true,
  };
}

export const facebookSandboxAdapter = new FacebookSandboxAdapter();
