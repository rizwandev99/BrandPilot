'use client';

import * as React from 'react';
import {
  Cable,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  Sparkles,
  Image as ImageIcon,
  Calendar,
  Hash,
  Type,
  Power,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import type { SocialProvider } from '@/lib/connectors/types';
import type { ConnectorItem, HealthCheckResult } from './types';
import { PROVIDER_METADATA } from './types';
import { HealthCheckButton } from './health-check-button';

export interface ConnectorCardProps {
  connector: ConnectorItem;
  healthResult?: HealthCheckResult | null;
  onRunHealthCheck: (provider: SocialProvider) => Promise<HealthCheckResult>;
  onToggleConnect: (connector: ConnectorItem) => Promise<void>;
  onOpenSimulator: (connector: ConnectorItem) => void;
  onOpenLiveLinkedIn?: () => void;
  isActionLoading?: boolean;
}

export function ConnectorCard({
  connector,
  healthResult,
  onRunHealthCheck,
  onToggleConnect,
  onOpenSimulator,
  onOpenLiveLinkedIn,
  isActionLoading = false,
}: ConnectorCardProps) {
  const meta = PROVIDER_METADATA[connector.provider];
  const isConnected = connector.status === 'connected';
  const isNeedsReconnect = connector.status === 'needs_reconnect';
  const isError = connector.status === 'error';
  const isDisconnected = connector.status === 'disconnected';

  const isSimulating =
    connector.simulationFailure && connector.simulationFailure !== 'none';

  const statusConfig = React.useMemo(() => {
    switch (connector.status) {
      case 'connected':
        return {
          label: 'Connected',
          badgeClass: 'bg-success/10 text-success border-success/20',
          dotClass: 'bg-success',
          icon: CheckCircle2,
        };
      case 'needs_reconnect':
        return {
          label: 'Needs Reconnect',
          badgeClass: 'bg-warning/10 text-warning border-warning/20',
          dotClass: 'bg-warning animate-pulse',
          icon: AlertTriangle,
        };
      case 'error':
        return {
          label: 'Error',
          badgeClass: 'bg-danger/10 text-danger border-danger/20',
          dotClass: 'bg-danger',
          icon: XCircle,
        };
      case 'disconnected':
      default:
        return {
          label: 'Disconnected',
          badgeClass: 'bg-surface-2 text-text-muted border-border',
          dotClass: 'bg-text-muted',
          icon: Cable,
        };
    }
  }, [connector.status]);

  const StatusIcon = statusConfig.icon;

  const formattedLastChecked = React.useMemo(() => {
    if (healthResult?.checkedAt) {
      return new Date(healthResult.checkedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    if (connector.lastHealthCheckAt) {
      return new Date(connector.lastHealthCheckAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'Not checked yet';
  }, [healthResult, connector.lastHealthCheckAt]);

  return (
    <div
      data-testid={`connector-card-${connector.provider}`}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-text-muted/30 hover:shadow-md"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo-free text badge as mandated by AC-F7-01 */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold tracking-tight transition-colors ${meta.badgeBg}`}
              title={`${meta.name} connector badge`}
            >
              {meta.badge}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text">{meta.name}</h3>
                {/* Mode Badge (Sandbox / Live) */}
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                    connector.mode === 'live'
                      ? 'border border-accent/30 bg-accent/15 text-accent'
                      : 'border border-border bg-surface-2 text-text-muted'
                  }`}
                >
                  {connector.mode === 'live'
                    ? 'Live Production OAuth'
                    : 'Safe Developer Sandbox'}
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono mt-0.5 truncate max-w-[200px]">
                {connector.accountLabel || `Sandbox ${connector.provider.toUpperCase()}`}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} aria-hidden="true" />
            <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Provider Description */}
        <p className="mt-3 text-xs text-text-muted leading-relaxed line-clamp-2">
          {meta.description}
        </p>

        {/* Channel Capabilities Grid (AC-F7-01) */}
        <div className="mt-4 rounded-lg border border-border/70 bg-surface-2/60 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
            Channel Capabilities
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-text" title="Maximum allowed caption characters">
              <Type className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
              <span>{meta.capabilities.maxChars.toLocaleString()} chars</span>
            </div>
            <div className="flex items-center gap-1.5 text-text" title="Maximum allowed hashtags">
              <Hash className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
              <span>Up to {meta.capabilities.maxHashtags} tags</span>
            </div>
            <div className="flex items-center gap-1.5 text-text" title="Resvg dynamic PNG card rendering">
              <ImageIcon className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
              <span>Branded Cards</span>
            </div>
            <div className="flex items-center gap-1.5 text-text" title="Automated concurrency scheduler">
              <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
              <span>Auto-schedule</span>
            </div>
          </div>
        </div>

        {/* Active Simulation Fault Warning (AC-F7-03) */}
        {isSimulating && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-medium">
                Fault Injected: <code className="font-mono">{connector.simulationFailure}</code>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenSimulator(connector)}
              className="text-[11px] underline hover:text-text font-medium"
            >
              Change Fault
            </button>
          </div>
        )}
      </div>

      {/* Card Footer: Health Check & Actions (AC-F7-02, AC-F7-04) */}
      <div className="mt-5 border-t border-border pt-4 space-y-3">
        {/* Health Check row */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <HealthCheckButton
            provider={connector.provider}
            onRunHealthCheck={onRunHealthCheck}
            lastResult={healthResult}
          />
          <span className="text-[11px] text-text-muted">
            Last checked: {formattedLastChecked}
          </span>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Connect / Disconnect / Reconnect Button */}
            {isNeedsReconnect || isError ? (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => onToggleConnect(connector)}
                className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-warning/90 disabled:opacity-50"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reconnect</span>
              </button>
            ) : isConnected ? (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => onToggleConnect(connector)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                title="Disconnect this channel"
              >
                <Power className="h-3 w-3" aria-hidden="true" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => onToggleConnect(connector)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                <Power className="h-3 w-3" aria-hidden="true" />
                <span>Connect</span>
              </button>
            )}

            {/* LinkedIn Live OAuth Trigger */}
            {connector.provider === 'linkedin' && onOpenLiveLinkedIn && (
              <button
                type="button"
                onClick={onOpenLiveLinkedIn}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface hover:border-text-muted transition-colors"
                title="Switch to Live LinkedIn account via OAuth"
              >
                <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
                <span>{connector.mode === 'live' ? 'Live Settings' : 'Go Live'}</span>
              </button>
            )}
          </div>

          {/* Advanced Failure Simulator Button (AC-F7-03) */}
          <button
            type="button"
            onClick={() => onOpenSimulator(connector)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
            title="Configure fault injection testing for this sandbox"
            aria-label={`Configure fault injection for ${meta.name}`}
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Fault Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
