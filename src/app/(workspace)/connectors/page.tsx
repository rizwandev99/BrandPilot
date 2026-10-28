'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ReconnectBanner } from '@/components/connectors/reconnect-banner';
import { ConnectorCard } from '@/components/connectors/connector-card';
import { FailureSimulatorModal } from '@/components/connectors/failure-simulator-modal';
import { LiveLinkedInDialog } from '@/components/connectors/live-linkedin-dialog';
import type { ConnectorItem, HealthCheckResult } from '@/components/connectors/types';
import { PROVIDER_METADATA } from '@/components/connectors/types';
import type { SocialProvider } from '@/lib/connectors/types';
import type { SimulationFailureMode } from '@/lib/validation/connectors';
import {
  Cable,
  RefreshCw,
  Activity,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const EXPECTED_PROVIDERS: SocialProvider[] = [
  'linkedin',
  'instagram',
  'x',
  'facebook',
];

function ConnectorsContent() {
  const searchParams = useSearchParams();
  const [connectorsList, setConnectorsList] = React.useState<ConnectorItem[]>([]);
  const [healthResults, setHealthResults] = React.useState<Record<string, HealthCheckResult>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingProvider, setActionLoadingProvider] = React.useState<SocialProvider | null>(null);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = React.useState<string | null>(null);

  // Modals state
  const [activeSimulatorConnector, setActiveSimulatorConnector] = React.useState<ConnectorItem | null>(null);
  const [isLiveLinkedInOpen, setIsLiveLinkedInOpen] = React.useState(false);

  // Advanced section collapse state (AC-F7-03)
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  // Handle URL notifications from OAuth callback
  React.useEffect(() => {
    const connectedParam = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (connectedParam) {
      setPageSuccess(`Successfully connected ${connectedParam.toUpperCase()} live account.`);
    } else if (errorParam) {
      setPageError(`LinkedIn OAuth error: ${errorParam} ${errorDesc ? `(${errorDesc})` : ''}`);
    }
  }, [searchParams]);

  // Fetch connectors list from API (AC-F7-01, AC-F7-05)
  const fetchConnectors = React.useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setPageError(null);

    try {
      const res = await fetch('/api/connectors');
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || 'Failed to fetch connectors');
      }

      const data: ConnectorItem[] = await res.json();

      // Ensure all 4 expected providers are present, sorting into consistent canonical order
      const sorted = [...data].sort((a, b) => {
        return EXPECTED_PROVIDERS.indexOf(a.provider) - EXPECTED_PROVIDERS.indexOf(b.provider);
      });

      setConnectorsList(sorted);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPageError(errorObj?.message || 'Failed to load social connectors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConnectors(true);
  }, [fetchConnectors]);

  // Run health check for a single provider (AC-F7-02)
  const handleRunHealthCheck = async (provider: SocialProvider): Promise<HealthCheckResult> => {
    try {
      const startTime = performance.now();
      const res = await fetch(`/api/connectors/${provider}/health`, {
        method: 'POST',
      });
      const clientLatency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const failedResult: HealthCheckResult = {
          healthy: false,
          latencyMs: clientLatency,
          details: errJson.message || `Health probe failed with HTTP ${res.status}`,
          checkedAt: new Date(),
        };
        setHealthResults((prev) => ({ ...prev, [provider]: failedResult }));
        return failedResult;
      }

      const data = await res.json();
      const successResult: HealthCheckResult = {
        healthy: data.healthy !== false,
        latencyMs: typeof data.latencyMs === 'number' && data.latencyMs > 0 ? data.latencyMs : clientLatency,
        details: data.details || 'Connector is healthy and responding',
        checkedAt: new Date(),
      };

      setHealthResults((prev) => ({ ...prev, [provider]: successResult }));
      return successResult;
    } catch (err: unknown) {
      const errorObj = err as Error;
      const errorResult: HealthCheckResult = {
        healthy: false,
        latencyMs: 0,
        details: errorObj?.message || 'Health probe network error',
        checkedAt: new Date(),
      };
      setHealthResults((prev) => ({ ...prev, [provider]: errorResult }));
      return errorResult;
    }
  };

  // Run health checks on all connectors simultaneously (AC-F7-02)
  const handleCheckAllHealth = async () => {
    setRefreshing(true);
    try {
      await Promise.all(connectorsList.map((c) => handleRunHealthCheck(c.provider)));
      setPageSuccess('All connector health checks executed successfully.');
    } finally {
      setRefreshing(false);
    }
  };

  // Connect / Disconnect toggle (AC-F7-01, AC-F7-04)
  const handleToggleConnect = async (connector: ConnectorItem) => {
    setActionLoadingProvider(connector.provider);
    setPageError(null);
    setPageSuccess(null);

    try {
      if (connector.status === 'connected') {
        // Disconnect
        const res = await fetch(`/api/connectors/${connector.provider}/disconnect`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to disconnect');
        setPageSuccess(`${PROVIDER_METADATA[connector.provider].name} disconnected.`);
      } else {
        // Connect or Reconnect
        const res = await fetch(`/api/connectors/${connector.provider}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'sandbox' }),
        });
        if (!res.ok) throw new Error('Failed to connect');
        setPageSuccess(`${PROVIDER_METADATA[connector.provider].name} connected in Developer Sandbox environment.`);
      }

      await fetchConnectors(false);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPageError(errorObj?.message || 'Connection action failed');
    } finally {
      setActionLoadingProvider(null);
    }
  };

  // Reconnect one-click banner action (AC-F7-04)
  const handleBannerReconnect = async (provider: SocialProvider) => {
    setActionLoadingProvider(provider);
    setPageError(null);
    setPageSuccess(null);

    try {
      const res = await fetch(`/api/connectors/${provider}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sandbox' }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Reconnect failed');
      }

      setPageSuccess(`Reconnected ${PROVIDER_METADATA[provider].name}. Publishing resumed.`);
      await fetchConnectors(false);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPageError(errorObj?.message || 'Failed to reconnect');
    } finally {
      setActionLoadingProvider(null);
    }
  };

  // Save failure simulator settings (AC-F7-03)
  const handleSaveSimulation = async (
    provider: SocialProvider,
    mode: SimulationFailureMode,
    retryAfterSeconds?: number
  ) => {
    const res = await fetch(`/api/connectors/${provider}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulationFailure: mode,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || 'Failed to save simulator settings');
    }

    setPageSuccess(
      `Updated ${PROVIDER_METADATA[provider].name} sandbox fault mode to "${mode}".`
    );
    await fetchConnectors(false);
  };

  // Confirm Live LinkedIn connection
  const handleConfirmLiveLinkedIn = async () => {
    const res = await fetch('/api/connectors/linkedin/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'live' }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        error: data.message || `Live connection failed with code ${data.error || res.status}`,
      };
    }

    if (data.authUrl) {
      return { authUrl: data.authUrl };
    }

    await fetchConnectors(false);
    return {};
  };

  // Reset all connectors to default sandbox state (AC-F7-05)
  const handleResetSandboxDefaults = async () => {
    if (!confirm('Reset all 4 developer sandboxes to clean default connected testing state (clearing active faults)?')) {
      return;
    }

    setRefreshing(true);
    setPageError(null);

    try {
      // Clear faults and reconnect all 4 to sandbox
      await Promise.all(
        EXPECTED_PROVIDERS.map(async (provider) => {
          await fetch(`/api/connectors/${provider}/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulationFailure: 'none' }),
          });
          await fetch(`/api/connectors/${provider}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'sandbox' }),
          });
        })
      );

      setPageSuccess('Reset all 4 connectors to default Developer Sandbox connected state.');
      await fetchConnectors(false);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPageError(errorObj?.message || 'Failed to reset connectors');
    } finally {
      setRefreshing(false);
    }
  };

  const activeSimulationCount = connectorsList.filter(
    (c) => c.simulationFailure && c.simulationFailure !== 'none'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner for Reconnect state (AC-F7-04) */}
      <ReconnectBanner
        connectors={connectorsList}
        onReconnect={handleBannerReconnect}
        reconnectingProvider={actionLoadingProvider}
      />

      {/* Page-level alerts */}
      {pageError && (
        <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 p-4 text-xs text-danger animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-danger hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {pageSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-4 text-xs text-success animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{pageSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageSuccess(null)}
            className="text-success hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Cable className="h-4 w-4" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              Social Connectors
            </h1>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Manage multi-channel social publishing adapters, monitor real-time API latency, and verify delivery resilience across safe developer sandboxes (Stripe-grade staging) and live OAuth production integrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Run all health checks button */}
          <button
            type="button"
            onClick={handleCheckAllHealth}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-2 hover:border-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            title="Probe health and latency across all 4 channels"
          >
            <Activity className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Probe All</span>
          </button>

          {/* Reset to sandbox defaults (AC-F7-05) */}
          <button
            type="button"
            onClick={handleResetSandboxDefaults}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            title="Reset all 4 connectors to default connected sandbox staging state"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Sandboxes</span>
          </button>

          {/* Refresh page data */}
          <button
            type="button"
            onClick={() => fetchConnectors(false)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-border bg-surface-2/50 p-5"
            />
          ))}
        </div>
      ) : (
        /* Provider Cards Grid (AC-F7-01) */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-2">
          {connectorsList.map((connector) => (
            <ConnectorCard
              key={connector.provider}
              connector={connector}
              healthResult={healthResults[connector.provider]}
              onRunHealthCheck={handleRunHealthCheck}
              onToggleConnect={handleToggleConnect}
              onOpenSimulator={(conn) => setActiveSimulatorConnector(conn)}
              onOpenLiveLinkedIn={
                connector.provider === 'linkedin'
                  ? () => setIsLiveLinkedInOpen(true)
                  : undefined
              }
              isActionLoading={actionLoadingProvider === connector.provider}
            />
          ))}
        </div>
      )}

      {/* Advanced Failure Simulator Collapsible Section (AC-F7-03) */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="flex w-full items-center justify-between text-left focus:outline-none"
          aria-expanded={isAdvancedOpen}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-text">
              <Sliders className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">
                  Chaos Engineering & SLA Resilience Testing Matrix
                </h3>
                {activeSimulationCount > 0 && (
                  <span className="inline-flex rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-warning">
                    {activeSimulationCount} active fault{activeSimulationCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Simulate upstream outages, quota limits, and token expirations in safe developer sandboxes to verify automated retry policies before live publishing.
              </p>
            </div>
          </div>
          <div className="rounded p-1 text-text-muted hover:bg-surface-2 transition-colors">
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
        </button>

        {isAdvancedOpen && (
          <div className="mt-4 border-t border-border pt-4 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {connectorsList.map((connector) => {
                const meta = PROVIDER_METADATA[connector.provider];
                const simMode = connector.simulationFailure || 'none';

                return (
                  <div
                    key={connector.provider}
                    className="rounded-lg border border-border bg-surface-2 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-text">
                        {meta.badge} {meta.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold ${
                          simMode === 'none'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {simMode}
                      </span>
                    </div>

                    <div className="text-[11px] text-text-muted truncate">
                      {simMode === 'none'
                        ? 'Normal Operation (200 OK)'
                        : `Fault Active: ${simMode.toUpperCase()}`}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSimulatorConnector(connector)}
                      className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-text hover:bg-surface-2 hover:border-text-muted transition-colors"
                    >
                      Configure Fault Mode
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-border/80 bg-surface-2/40 p-3 text-xs text-text-muted flex items-start gap-2.5">
              <HelpCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-medium text-text">Developer Sandbox & Fault Injection Architecture: </span>
                Like Stripe and PayPal developer sandboxes, BrandPilot provides isolated test adapters for each social network. Configuring injected faults allows teams to verify that background workers execute exponential backoff with randomized jitter (500), strictly obey upstream Retry-After rate limits (429), prevent retries on validation rejections (400), and trigger administrator re-authorization alerts (401) before going live.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Failure Simulator Modal (AC-F7-03) */}
      <FailureSimulatorModal
        connector={activeSimulatorConnector}
        isOpen={activeSimulatorConnector !== null}
        onClose={() => setActiveSimulatorConnector(null)}
        onSave={handleSaveSimulation}
      />

      {/* Live LinkedIn OAuth Dialog */}
      <LiveLinkedInDialog
        isOpen={isLiveLinkedInOpen}
        onClose={() => setIsLiveLinkedInOpen(false)}
        onConfirmLive={handleConfirmLiveLinkedIn}
      />
    </div>
  );
}

export default function ConnectorsPage() {
  return (
    <AppShell
      title="Connectors"
      breadcrumbs={[
        { label: 'Workspace', href: '/' },
        { label: 'Connectors' },
      ]}
    >
      <React.Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-2/50" />
        }
      >
        <ConnectorsContent />
      </React.Suspense>
    </AppShell>
  );
}
