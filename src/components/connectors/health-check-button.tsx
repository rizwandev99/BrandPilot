'use client';

import * as React from 'react';
import { Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { SocialProvider } from '@/lib/connectors/types';
import type { HealthCheckResult } from './types';

export interface HealthCheckButtonProps {
  provider: SocialProvider;
  onRunHealthCheck: (provider: SocialProvider) => Promise<HealthCheckResult>;
  lastResult?: HealthCheckResult | null;
  className?: string;
}

export function HealthCheckButton({
  provider,
  onRunHealthCheck,
  lastResult,
  className = '',
}: HealthCheckButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<HealthCheckResult | null>(lastResult ?? null);

  React.useEffect(() => {
    if (lastResult !== undefined) {
      setResult(lastResult);
    }
  }, [lastResult]);

  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await onRunHealthCheck(provider);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={loading}
        onClick={handleHealthCheck}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:bg-surface hover:border-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        aria-label={`Run health check for ${provider}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden="true" />
        ) : (
          <Activity className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        )}
        <span>{loading ? 'Checking...' : 'Run health check'}</span>
      </button>

      {result && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
            result.healthy
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}
          title={result.details || (result.healthy ? 'Connector is operational' : 'Connector check failed')}
        >
          {result.healthy ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="font-mono text-[11px]">{result.latencyMs}ms</span>
          <span>{result.healthy ? 'Healthy' : 'Unhealthy'}</span>
        </div>
      )}
    </div>
  );
}
