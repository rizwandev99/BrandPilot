'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RulesList } from '@/components/automations/rules-list';
import { RuleBuilder } from '@/components/automations/rule-builder';
import { DryRunModal } from '@/components/automations/dry-run-modal';
import type { AutomationRule } from '@/lib/automations/types';
import { Zap, Plus, RefreshCw, AlertCircle } from 'lucide-react';

const MAX_AUTOMATIONS = 10;

export default function AutomationsPage() {
  const [rules, setRules] = React.useState<AutomationRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal states
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AutomationRule | null>(null);
  const [dryRunRule, setDryRunRule] = React.useState<AutomationRule | null>(null);

  const fetchRules = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/automations');
      if (!res.ok) {
        throw new Error('Failed to load automations');
      }
      const data = await res.json();
      setRules(data.automations || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error loading automations');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreateOrUpdate = async (ruleData: Partial<AutomationRule>) => {
    if (editingRule) {
      // PATCH existing
      const res = await fetch(`/api/automations/${editingRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.error || 'Failed to update rule');
      }
    } else {
      // POST new
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.error || 'Failed to create rule');
      }
    }

    await fetchRules();
  };

  const handleToggleActive = async (id: string, enabled: boolean) => {
    // Optimistic update
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        throw new Error('Failed to update rule state');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Toggle failed');
      // Rollback
      await fetchRules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    // Optimistic removal
    setRules((prev) => prev.filter((r) => r.id !== id));

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete rule');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Delete failed');
      await fetchRules();
    }
  };

  const isAtQuota = rules.length >= MAX_AUTOMATIONS;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h1 className="text-xl font-bold tracking-tight text-text">Automation Rules</h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Trigger automated social workflows, drafts, and approval gates from events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quota Counter Badge (AC-F9-09) */}
            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
                isAtQuota
                  ? 'border-warning/30 bg-warning/10 text-warning font-semibold'
                  : 'border-border bg-surface text-text-muted'
              }`}
            >
              {rules.length} / {MAX_AUTOMATIONS} rules used
            </span>

            <button
              type="button"
              onClick={fetchRules}
              disabled={loading}
              title="Refresh automations"
              className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              disabled={isAtQuota}
              onClick={() => {
                setEditingRule(null);
                setIsBuilderOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Rule</span>
            </button>
          </div>
        </div>

        {/* Quota Warning Banner */}
        {isAtQuota && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/10 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Workspace quota limit reached: You have reached the maximum cap of 10 automation rules.
              Delete an existing rule to create a new one.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Rules List Component */}
        <RulesList
          rules={rules}
          onToggleActive={handleToggleActive}
          onEdit={(rule) => {
            setEditingRule(rule);
            setIsBuilderOpen(true);
          }}
          onDelete={handleDelete}
          onDryRun={(rule) => setDryRunRule(rule)}
          onCreateNew={() => {
            setEditingRule(null);
            setIsBuilderOpen(true);
          }}
        />

        {/* Modals */}
        <RuleBuilder
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingRule(null);
          }}
          onSave={handleCreateOrUpdate}
          initialRule={editingRule}
        />

        <DryRunModal
          isOpen={Boolean(dryRunRule)}
          onClose={() => setDryRunRule(null)}
          automation={dryRunRule}
        />
      </div>
    </AppShell>
  );
}
