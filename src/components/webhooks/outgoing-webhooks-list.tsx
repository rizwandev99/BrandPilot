'use client';

import * as React from 'react';
import { Plus, Globe, Trash2, Send, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export interface OutgoingWebhookItem {
  id: string;
  url: string;
  secretMasked: string;
  active: boolean;
  createdAt: string | Date;
}

interface OutgoingWebhooksListProps {
  webhooks: OutgoingWebhookItem[];
  onAddClick: () => void;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestDelivery: (id: string, url: string) => Promise<{ ok: boolean; status?: number; error?: string }>;
}

export function OutgoingWebhooksList({
  webhooks,
  onAddClick,
  onToggleActive,
  onDelete,
  onTestDelivery,
}: OutgoingWebhooksListProps) {
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResults, setTestResults] = React.useState<Record<string, { ok: boolean; status?: number; error?: string }>>({});

  const handleTest = async (hook: OutgoingWebhookItem) => {
    setTestingId(hook.id);
    try {
      const res = await onTestDelivery(hook.id, hook.url);
      setTestResults((prev) => ({ ...prev, [hook.id]: res }));
    } catch (err: unknown) {
      const error = err as Error;
      setTestResults((prev) => ({ ...prev, [hook.id]: { ok: false, error: error?.message || 'Delivery test failed' } }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">Outgoing Webhooks</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Forward published posts, approvals, and system events to third-party endpoints or the built-in sandbox.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border hover:bg-surface-2 text-text transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add webhook</span>
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg space-y-2">
          <Globe className="h-8 w-8 text-text-muted/50 mx-auto" />
          <p className="text-xs text-text-muted">No outgoing webhooks configured yet.</p>
          <button
            type="button"
            onClick={onAddClick}
            className="text-xs font-medium text-accent hover:underline"
          >
            Create your first outgoing webhook
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {webhooks.map((hook) => {
            const testResult = testResults[hook.id];
            const isSandbox = hook.url.includes('/api/sandbox/receiver/');

            return (
              <div key={hook.id} className="p-4 space-y-2.5 bg-surface hover:bg-surface-2/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="font-mono text-xs font-medium text-text truncate">{hook.url}</span>
                    {isSandbox && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-info/10 text-info shrink-0">
                        Sandbox
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTest(hook)}
                      disabled={testingId === hook.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-2 text-text transition-colors disabled:opacity-50"
                    >
                      <Send className={`h-3 w-3 ${testingId === hook.id ? 'animate-pulse' : ''}`} />
                      <span>{testingId === hook.id ? 'Testing...' : 'Test'}</span>
                    </button>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hook.active}
                        onChange={(e) => onToggleActive(hook.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-success" />
                    </label>

                    <button
                      type="button"
                      onClick={() => onDelete(hook.id)}
                      aria-label="Delete webhook"
                      className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-text-muted">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Secret: <code className="font-mono">{hook.secretMasked}</code></span>
                  </div>
                  <span>Status: <strong className={hook.active ? 'text-success' : 'text-text-muted'}>{hook.active ? 'Active' : 'Disabled'}</strong></span>
                </div>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs ${
                      testResult.ok
                        ? 'bg-success/10 text-success border border-success/30'
                        : 'bg-danger/10 text-danger border border-danger/30'
                    }`}
                  >
                    {testResult.ok ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Delivery succeeded! HTTP {testResult.status || 200}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Delivery failed: {testResult.error || `HTTP ${testResult.status}`}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
