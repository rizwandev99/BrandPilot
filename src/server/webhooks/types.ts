export interface WebhookAttempt {
  attempt: number;
  status: number;
  ok: boolean;
  error?: string;
  timestamp: number;
  responseBody?: string;
}

export interface WebhookEvent {
  type: string;
  payload: Record<string, unknown>;
  eventId?: string;
  timestamp?: number | string;
  [key: string]: unknown;
}

export interface WebhookDeliveryOptions {
  url: string;
  secret: string;
  event: {
    type: string;
    payload: Record<string, unknown>;
    [key: string]: unknown;
  };
  onAttempt?: (attempt: WebhookAttempt) => void;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface WebhookDeliveryResult {
  delivered: boolean;
  status: number;
  attempts: number;
  error?: string;
}

export interface InboundWebhookPayload {
  event_id?: string;
  id?: string;
  type?: string;
  event?: string;
  timestamp?: number | string;
  title?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}
