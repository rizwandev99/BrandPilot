'use client';

import * as React from 'react';
import { Play, Edit2, Trash2, Zap, ArrowRight, Layers } from 'lucide-react';
import type { AutomationRule } from '@/lib/automations/types';

interface RulesListProps {
  rules: AutomationRule[];
  onToggleActive: (id: string, enabled: boolean) => Promise<void>;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (id: string) => Promise<void>;
  onDryRun: (rule: AutomationRule) => void;
  onCreateNew: () => void;
}

export function RulesList({
  rules,
  onToggleActive,
  onEdit,
  onDelete,
  onDryRun,
  onCreateNew,
}: RulesListProps) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-surface/50">
        <div className="p-3 rounded-full bg-accent/10 text-accent mb-3">
          <Zap className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-text mb-1">No automations configured</h3>
        <p className="text-xs text-text-muted max-w-sm mb-4">
          Create rules to automatically generate AI drafts, hold posts for review, or emit webhooks
          when events occur.
        </p>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 rounded-lg bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover transition-colors shadow-sm"
        >
          Create First Rule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => {
        const triggerType = rule.trigger?.type || 'webhook.received';
        const eventName = rule.trigger?.eventName;
        const conditionsCount = rule.conditions?.length || 0;
        const actionsCount = rule.actions?.length || 0;

        return (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.enabled
                ? 'border-border bg-surface hover:border-accent/30'
                : 'border-border/60 bg-surface/60 opacity-75'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Active Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(rule.enabled)}
                      onChange={(e) => onToggleActive(rule.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
                  </label>

                  <h4 className="text-sm font-semibold text-text truncate">{rule.name}</h4>

                  {/* Trigger Badge */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {triggerType}
                    {eventName ? `: ${eventName}` : ''}
                  </span>
                </div>

                {/* Subtitle / summary info */}
                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-text-faint" />
                    <span>
                      {conditionsCount} {conditionsCount === 1 ? 'condition' : 'conditions'}
                    </span>
                  </div>

                  <span>•</span>

                  <div className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-text-faint" />
                    <span>
                      {actionsCount} {actionsCount === 1 ? 'action' : 'actions'}
                    </span>
                  </div>

                  {/* Actions tags preview */}
                  {rule.actions && rule.actions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {rule.actions.map((act, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-2 border border-border text-text-faint"
                        >
                          {act.type}
                          {act.channel ? ` (${act.channel})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onDryRun(rule)}
                  title="Run dry-run simulation test"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-text hover:bg-surface-2 hover:border-accent/40 transition-colors"
                >
                  <Play className="h-3 w-3 text-accent" />
                  <span>Dry Run</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(rule)}
                  aria-label="Edit rule"
                  className="p-1.5 rounded-md border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(rule.id)}
                  aria-label="Delete rule"
                  className="p-1.5 rounded-md border border-border bg-surface text-text-muted hover:text-danger hover:bg-surface-2 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
