import type { SocialProvider, ConnectorMode, ConnectorStatus, ConnectorCapabilities } from '@/lib/connectors/types';
import type { SimulationFailureMode } from '@/lib/validation/connectors';

export interface ConnectorItem {
  id: string;
  workspaceId: string;
  provider: SocialProvider;
  mode: ConnectorMode;
  status: ConnectorStatus;
  accountLabel: string;
  simulationFailure: SimulationFailureMode;
  settings?: {
    simulateFailure?: SimulationFailureMode;
    retryAfterSeconds?: number;
  };
  lastHealthCheckAt?: string | Date;
  createdAt: string | Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  details?: string;
  checkedAt: Date;
}

export interface ProviderMeta {
  provider: SocialProvider;
  badge: string;
  name: string;
  description: string;
  capabilities: ConnectorCapabilities;
  accentColor: string;
  badgeBg: string;
}

export const PROVIDER_METADATA: Record<SocialProvider, ProviderMeta> = {
  linkedin: {
    provider: 'linkedin',
    badge: '[LI]',
    name: 'LinkedIn',
    description: 'Professional networking platform for articles, business updates, and corporate posts.',
    capabilities: {
      maxChars: 3000,
      maxHashtags: 30,
      supportsImage: true,
      supportsScheduling: true,
    },
    accentColor: '#0A66C2',
    badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  instagram: {
    provider: 'instagram',
    badge: '[IG]',
    name: 'Instagram',
    description: 'Visual media platform optimized for branded image cards, carousels, and hashtag discovery.',
    capabilities: {
      maxChars: 2200,
      maxHashtags: 30,
      supportsImage: true,
      supportsScheduling: true,
    },
    accentColor: '#E4405F',
    badgeBg: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  },
  x: {
    provider: 'x',
    badge: '[X]',
    name: 'X (Twitter)',
    description: 'Real-time short-form broadcast channel with concise copy and punchy hashtags.',
    capabilities: {
      maxChars: 280,
      maxHashtags: 5,
      supportsImage: true,
      supportsScheduling: true,
    },
    accentColor: '#000000',
    badgeBg: 'bg-neutral-500/10 text-text border-border',
  },
  facebook: {
    provider: 'facebook',
    badge: '[FB]',
    name: 'Facebook',
    description: 'Multi-format community feed for comprehensive storytelling, images, and audience engagement.',
    capabilities: {
      maxChars: 2000,
      maxHashtags: 30,
      supportsImage: true,
      supportsScheduling: true,
    },
    accentColor: '#1877F2',
    badgeBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  },
};
