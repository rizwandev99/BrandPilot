import { BaseSandboxAdapter } from '../base-sandbox.adapter';
import type { ConnectorCapabilities, SocialProvider } from '../types';

export class InstagramSandboxAdapter extends BaseSandboxAdapter {
  public readonly provider: SocialProvider = 'instagram';
  public readonly capabilities: ConnectorCapabilities = {
    maxChars: 2200,
    maxHashtags: 30,
    supportsImage: true,
    supportsScheduling: true,
  };
}

export const instagramSandboxAdapter = new InstagramSandboxAdapter();
