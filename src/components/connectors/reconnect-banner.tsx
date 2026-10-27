'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import type { SocialProvider } from '@/lib/connectors/types';
import type { ConnectorItem } from './types';
import { PROVIDER_METADATA } from './types';

export interface ReconnectBannerProps {
  connectors: ConnectorItem[];
  onReconnect: (provider: SocialProvider) => Promise<void>;
  reconnectingProvider?: SocialProvider | null;
}

export function ReconnectBanner({
  connectors,
  onReconnect,
  reconnectingProvider,
}: ReconnectBannerProps) {
  const affectedConnectors = connectors.filter(
    (c) => c.status === 'needs_reconnect' || c.status === 'error'
  );

  if (affectedConnectors.length === 0) {
    return null;
  }

  const hasNeedsReconnect = affectedConnectors.some(
    (c) => c.status === 'needs_reconnect'
  );

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-text shadow-sm transition-all"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/20 text-warning">
            {hasNeedsReconnect ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">
              {affectedConnectors.length === 1
                ? `Connection Alert: ${PROVIDER_METADATA[affectedConnectors[0].provider]?.name || affectedConnectors[0].provider} requires attention`
                : `${affectedConnectors.length} connectors require reconnection`}
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Publishing is suspended for channels with expired tokens or connection errors. Click Reconnect below to restore normal scheduling and publishing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
          {affectedConnectors.map((connector) => {
            const meta = PROVIDER_METADATA[connector.provider];
            const isReconnecting = reconnectingProvider === connector.provider;

            return (
              <button
                key={connector.provider}
                type="button"
                disabled={isReconnecting}
                onClick={() => onReconnect(connector.provider)}
                className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-warning/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning disabled:opacity-50"
                aria-label={`Reconnect ${meta?.name || connector.provider}`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  Reconnect <span className="font-mono font-semibold">{meta?.badge}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
