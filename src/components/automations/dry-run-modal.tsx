'use client';

import * as React from 'react';
import { X, Play, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { AutomationRule, ConditionLog, RuleAction } from '@/lib/automations/types';

interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  automation: AutomationRule | null;
}

interface SimulationResponse {
  ok: boolean;
  matched: boolean;
  conditionsSummary?: ConditionLog[];
  conditionLogs?: ConditionLog[];
  plannedActions?: RuleAction[];
  error?: string;
}

export function DryRunModal({ isOpen, onClose, automation }: DryRunModalProps) {
  const [sampleEventJson, setSampleEventJson] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SimulationResponse | null>(null);
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  // Initialize sample event JSON when modal opens or automation changes
  React.useEffect(() => {
    if (automation) {
      const defaultPayload = {
        type: automation.trigger?.type || 'webhook.received',
        depth: 0,
        payload: {
          eventName: automation.trigger?.eventName || 'product.launched',
          title: 'BrandPilot Enterprise Edition',
          product: {
            id: 'prod-101',
            title: 'BrandPilot Enterprise Edition',
            pricing: {
              amount: 299,
              currency: 'USD',
            },
            active: true,
            tags: ['saas', 'enterprise', 'launch'],
          },
        },
      };
      setSampleEventJson(JSON.stringify(defaultPayload, null, 2));
      setResult(null);
      setJsonError(null);
    }
  }, [automation, isOpen]);

  if (!isOpen || !automation) return null;

  const handleRunSimulation = async () => {
    setJsonError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(sampleEventJson);
    } catch {
      setJsonError('Invalid JSON format. Please check the sample event syntax.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/automations/${automation.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleEvent: parsed }),
      });

      const json = await res.json();
      if (!res.ok) {
        setResult({
          ok: false,
          matched: false,
          error: json.error?.message || json.error || 'Dry-run evaluation failed',
        });
      } else {
        setResult(json);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setResult({
        ok: false,
        matched: false,
        error: error.message || 'Simulation network request failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
                Simulation Mode
              </span>
              <h3 className="text-sm font-semibold text-text">Dry-Run Test</h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Testing &quot;{automation.name}&quot; without committing database side effects.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text">Sample Event Payload (JSON)</label>
              <button
                type="button"
                onClick={() => {
                  setSampleEventJson(
                    JSON.stringify(
                      {
                        type: automation.trigger?.type || 'webhook.received',
                        payload: {
                          eventName: automation.trigger?.eventName || 'custom.event',
                          title: 'New Feature Release',
                          priority: 'high',
                        },
                      },
                      null,
                      2
                    )
                  );
                }}
                className="text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Quick Template
              </button>
            </div>
            <textarea
              value={sampleEventJson}
              onChange={(e) => setSampleEventJson(e.target.value)}
              rows={8}
              className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-surface-2 text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
            />
            {jsonError && <p className="text-xs text-danger mt-1">{jsonError}</p>}
          </div>

          {/* Simulation Output Area */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Match Banner */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs font-medium ${
                  result.matched
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-surface-2 text-text-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.matched ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-text-faint" />
                  )}
                  <span>
                    {result.matched
                      ? 'Rule Matched: All conditions satisfied!'
                      : 'No Match: One or more conditions were not satisfied.'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border">
                  {result.plannedActions?.length || 0} Actions Planned
                </span>
              </div>

              {/* Conditions Summary */}
              {result.conditionsSummary && result.conditionsSummary.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Condition Breakdown
                  </h4>
                  <div className="space-y-1">
                    {result.conditionsSummary.map((log) => (
                      <div
                        key={log.conditionIndex}
                        className="flex items-center justify-between p-2 rounded border border-border bg-surface text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {log.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                          )}
                          <span className="font-mono text-[11px] text-text">
                            Condition #{log.conditionIndex + 1}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            log.passed
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-danger/10 text-danger border border-danger/20'
                          }`}
                        >
                          {log.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planned Actions */}
              {result.plannedActions && result.plannedActions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    Planned Actions to Execute
                  </h4>
                  <div className="space-y-1">
                    {result.plannedActions.map((act, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded border border-border bg-surface text-xs text-text"
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="font-mono text-[11px] font-semibold text-text">
                          {act.type}
                        </span>
                        {'channel' in act && Boolean(act.channel) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted">
                            channel: {String(act.channel)}
                          </span>
                        )}
                        {'status' in act && Boolean(act.status) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted">
                            status: {String(act.status)}
                          </span>
                        )}
                        {'reason' in act && Boolean(act.reason) && (
                          <span className="text-text-muted text-[11px] italic">
                            &quot;{String(act.reason)}&quot;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-surface-2/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-text hover:bg-surface-2 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
          >
            <Play className="h-3.5 w-3.5" />
            {loading ? 'Evaluating...' : 'Run Simulation'}
          </button>
        </div>
      </div>
    </div>
  );
}
