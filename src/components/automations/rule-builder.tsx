'use client';

import * as React from 'react';
import { X, Plus, Zap, AlertCircle } from 'lucide-react';
import { ConditionRow } from './condition-row';
import { ActionRow } from './action-row';
import type { AutomationRule, RuleCondition, RuleAction, TriggerType } from '@/lib/automations/types';

interface RuleBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Partial<AutomationRule>) => Promise<void>;
  initialRule?: AutomationRule | null;
}

const TRIGGER_TYPES: { label: string; value: TriggerType; description: string }[] = [
  { label: 'Webhook Received', value: 'webhook.received', description: 'Triggers when an external HMAC-verified webhook arrives' },
  { label: 'Post Created', value: 'post.created', description: 'Triggers when a new draft post is created' },
  { label: 'Post Approved', value: 'post.approved', description: 'Triggers when a post is approved in the queue' },
  { label: 'Post Published', value: 'post.published', description: 'Triggers when a post is successfully published' },
  { label: 'Post Failed', value: 'post.failed', description: 'Triggers when a publishing job fails' },
];

export function RuleBuilder({ isOpen, onClose, onSave, initialRule }: RuleBuilderProps) {
  const [name, setName] = React.useState('');
  const [triggerType, setTriggerType] = React.useState<TriggerType>('webhook.received');
  const [eventName, setEventName] = React.useState('');
  const [conditions, setConditions] = React.useState<RuleCondition[]>([]);
  const [actions, setActions] = React.useState<RuleAction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialRule) {
      setName(initialRule.name || '');
      setTriggerType((initialRule.trigger?.type as TriggerType) || 'webhook.received');
      setEventName(initialRule.trigger?.eventName || '');
      setConditions(initialRule.conditions || []);
      setActions(initialRule.actions || []);
    } else {
      setName('');
      setTriggerType('webhook.received');
      setEventName('');
      setConditions([
        {
          type: 'path_comparison',
          path: 'payload.eventName',
          operator: 'eq',
          value: 'product.launched',
        },
      ]);
      setActions([
        {
          type: 'create_ai_draft',
          channel: 'linkedin',
        },
      ]);
    }
    setError(null);
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        type: 'path_comparison',
        path: 'payload.priority',
        operator: 'eq',
        value: 'high',
      },
    ]);
  };

  const handleUpdateCondition = (index: number, updated: RuleCondition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    setActions((prev) => [
      ...prev,
      {
        type: 'hold_post',
        reason: 'Automated check hold',
      },
    ]);
  };

  const handleUpdateAction = (index: number, updated: RuleAction) => {
    setActions((prev) => prev.map((a, i) => (i === index ? updated : a)));
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a descriptive rule name.');
      return;
    }

    if (actions.length === 0) {
      setError('Please configure at least one action for this automation rule.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        trigger: {
          type: triggerType,
          eventName: triggerType === 'webhook.received' && eventName.trim() ? eventName.trim() : undefined,
        },
        conditions,
        actions,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Failed to save automation rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text">
              {initialRule ? 'Edit Automation Rule' : 'New Automation Rule'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rule Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text">Rule Name</label>
            <input
              type="text"
              value={name}
              placeholder="e.g. Draft LinkedIn Post on Product Launch"
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Trigger Section */}
          <div className="space-y-2 p-3.5 rounded-lg border border-border bg-surface-2/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              1. Event Trigger
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Trigger On</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                  className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {triggerType === 'webhook.received' && (
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Event Name Filter (Optional)</label>
                  <input
                    type="text"
                    value={eventName}
                    placeholder="e.g. product.launched"
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Conditions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  2. Conditions (All must pass — AND)
                </span>
                <p className="text-[11px] text-text-faint">
                  Evaluated against event payload with deep dot notation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCondition}
                className="flex items-center gap-1 text-[11px] text-accent font-medium hover:underline px-2 py-1 rounded hover:bg-surface-2 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Condition
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-text-faint italic p-3 border border-dashed border-border rounded-lg text-center">
                No conditions configured (rule executes on every trigger event).
              </p>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <ConditionRow
                    key={idx}
                    condition={cond}
                    index={idx}
                    onChange={(updated) => handleUpdateCondition(idx, updated)}
                    onRemove={() => handleRemoveCondition(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  3. Actions (Executed sequentially)
                </span>
                <p className="text-[11px] text-text-faint">
                  Protected with depth limit recursion detection (max 3).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAction}
                className="flex items-center gap-1 text-[11px] text-accent font-medium hover:underline px-2 py-1 rounded hover:bg-surface-2 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Action
              </button>
            </div>

            {actions.length === 0 ? (
              <p className="text-xs text-text-faint italic p-3 border border-dashed border-border rounded-lg text-center">
                No actions configured.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((act, idx) => (
                  <ActionRow
                    key={idx}
                    action={act}
                    index={idx}
                    onChange={(updated) => handleUpdateAction(idx, updated)}
                    onRemove={() => handleRemoveAction(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-surface-2/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-text hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Saving...' : initialRule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
