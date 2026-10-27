export type SocialProvider = 'linkedin' | 'instagram' | 'x' | 'facebook';
export type ConnectorMode = 'sandbox' | 'live';
export type ConnectorStatus = 'connected' | 'disconnected' | 'needs_reconnect' | 'error';

export interface ConnectorCapabilities {
  maxChars: number;
  maxHashtags: number;
  supportsImage: boolean;
  supportsScheduling: boolean;
}

export interface PublishInput {
  postId: string;
  caption: string;
  hashtags: string[];
  creativeSpec?: {
    templateId: string;
    headline: string;
    subline?: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      [key: string]: string;
    };
  };
  mediaUrl?: string;
  idempotencyKey: string;
}

export interface PublishResult {
  externalId: string;
  externalUrl: string;
}

export type ConnectorErrorCode =
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'INVALID_CONTENT'
  | 'TEMPORARY'
  | 'PERMANENT';

export class ConnectorError extends Error {
  constructor(
    public readonly code: ConnectorErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    public readonly rawError?: unknown
  ) {
    super(message);
    this.name = 'ConnectorError';
    Object.setPrototypeOf(this, ConnectorError.prototype);
  }
}

export interface ConnectorExecutionContext {
  workspaceId: string;
  accessToken?: string;
  simulationConfig?: {
    simulatedError?: 'none' | 'temporary' | 'rate_limit' | 'permanent' | 'auth_expired';
    retryAfterSeconds?: number;
  };
}

export interface Connector {
  readonly provider: SocialProvider;
  readonly mode: ConnectorMode;
  readonly capabilities: ConnectorCapabilities;

  connect(
    ctx: ConnectorExecutionContext
  ): Promise<{ status: ConnectorStatus; accountLabel: string; authUrl?: string }>;
  disconnect(ctx: ConnectorExecutionContext): Promise<void>;
  healthCheck(
    ctx: ConnectorExecutionContext
  ): Promise<{ healthy: boolean; latencyMs?: number; details?: string }>;
  publish(ctx: ConnectorExecutionContext, input: PublishInput): Promise<PublishResult>;
}
