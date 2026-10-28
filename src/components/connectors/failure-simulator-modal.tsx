'use client';

import * as React from 'react';
import { X, Sliders, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { SocialProvider } from '@/lib/connectors/types';
import type { SimulationFailureMode } from '@/lib/validation/connectors';
import type { ConnectorItem } from './types';
import { PROVIDER_METADATA } from './types';

export interface FailureSimulatorModalProps {
  connector: ConnectorItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    provider: SocialProvider,
    mode: SimulationFailureMode,
    retryAfterSeconds?: number
  ) => Promise<void>;
}

interface SimulationOption {
  value: SimulationFailureMode;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  testOutcome: string;
}

const SIMULATION_OPTIONS: SimulationOption[] = [
  {
    value: 'none',
    label: 'None (Normal Operation)',
    badge: '200 OK',
    badgeColor: 'bg-success/10 text-success border-success/20',
    description: 'Connector operates normally with zero injected errors. Posts publish immediately.',
    testOutcome: 'Publish jobs succeed on first attempt and transition post status to "published".',
  },
  {
    value: 'temporary',
    label: 'Temporary Failure (500)',
    badge: 'HTTP 500',
    badgeColor: 'bg-warning/10 text-warning border-warning/20',
    description: 'Simulates upstream platform outage or server error.',
    testOutcome: 'Publisher enters exponential backoff with jitter and attempts retry according to policy.',
  },
  {
    value: 'rate_limit',
    label: 'Rate Limited (429)',
    badge: 'HTTP 429',
    badgeColor: 'bg-warning/10 text-warning border-warning/20',
    description: 'Simulates API quota exhaustion or burst rate-limiting.',
    testOutcome: 'Publisher respects retry-after header and delays retry by specified seconds.',
  },
  {
    value: 'permanent',
    label: 'Permanent Error (400)',
    badge: 'HTTP 400',
    badgeColor: 'bg-danger/10 text-danger border-danger/20',
    description: 'Simulates fatal validation error or banned content rejection.',
    testOutcome: 'Publisher immediately marks post as "failed" without retrying.',
  },
  {
    value: 'auth_expired',
    label: 'Authentication Expired (401)',
    badge: 'HTTP 401',
    badgeColor: 'bg-danger/10 text-danger border-danger/20',
    description: 'Simulates expired OAuth access token or revoked account credentials.',
    testOutcome: 'Connector transitions to "needs_reconnect", triggering prominent reconnect alert banner.',
  },
];

export function FailureSimulatorModal({
  connector,
  isOpen,
  onClose,
  onSave,
}: FailureSimulatorModalProps) {
  const [selectedMode, setSelectedMode] = React.useState<SimulationFailureMode>('none');
  const [retryAfter, setRetryAfter] = React.useState<number>(30);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (connector) {
      setSelectedMode(connector.simulationFailure || 'none');
      setRetryAfter(connector.settings?.retryAfterSeconds || 30);
      setError(null);
    }
  }, [connector, isOpen]);

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !connector) {
    return null;
  }

  const meta = PROVIDER_METADATA[connector.provider];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(
        connector.provider,
        selectedMode,
        selectedMode === 'rate_limit' || selectedMode === 'temporary' ? retryAfter : undefined
      );
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Failed to update simulation failure setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulator-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sliders className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="simulator-modal-title" className="text-base font-semibold text-text">
                Sandbox Fault Injection & Resilience Testing
              </h2>
              <p className="text-xs text-text-muted">
                Inject deterministic faults into <span className="font-semibold text-text">{meta?.name || connector.provider}</span> ({meta?.badge})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-text-muted leading-relaxed">
            Simulate upstream social network error conditions in this safe developer sandbox to verify automated retries, rate-limit backoff, and admin notifications without impacting live accounts.
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {SIMULATION_OPTIONS.map((option) => {
              const isSelected = selectedMode === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border bg-surface-2 hover:border-text-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="simulationMode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSelectedMode(option.value)}
                    className="mt-1 h-4 w-4 text-accent border-border focus:ring-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{option.label}</span>
                      <span className={`inline-flex rounded border px-1.5 py-0.2 text-[10px] font-mono font-semibold ${option.badgeColor}`}>
                        {option.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{option.description}</p>
                    <p className="mt-1 text-[11px] text-text-faint italic font-sans">
                      Test behavior: {option.testOutcome}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {(selectedMode === 'rate_limit' || selectedMode === 'temporary') && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="retry-delay"
                  className="flex items-center gap-1.5 text-xs font-medium text-text"
                >
                  <Clock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  <span>Simulated Retry-After Delay (seconds)</span>
                </label>
                <span className="font-mono text-xs font-semibold text-text">{retryAfter}s</span>
              </div>
              <input
                id="retry-delay"
                type="number"
                min="5"
                max="3600"
                value={retryAfter}
                onChange={(e) => setRetryAfter(Math.max(1, parseInt(e.target.value) || 30))}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-[11px] text-text-muted">
                The safe developer sandbox connector will return this HTTP Retry-After header to verify publisher backoff wait windows.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{saving ? 'Applying...' : 'Apply Sandbox Fault Mode'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
