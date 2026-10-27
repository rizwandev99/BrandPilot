'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import type { RuleCondition, ConditionOperator } from '@/lib/automations/types';

interface ConditionRowProps {
  condition: RuleCondition;
  index: number;
  onChange: (updated: RuleCondition) => void;
  onRemove: () => void;
}

const OPERATORS: { label: string; value: ConditionOperator }[] = [
  { label: 'equals (==)', value: 'eq' },
  { label: 'not equals (!=)', value: 'neq' },
  { label: 'contains', value: 'contains' },
  { label: 'does not contain', value: 'not_contains' },
  { label: 'greater than (>)', value: 'gt' },
  { label: 'less than (<)', value: 'lt' },
  { label: 'in array', value: 'in' },
  { label: 'exists', value: 'exists' },
];

export function ConditionRow({ condition, index, onChange, onRemove }: ConditionRowProps) {
  const isPath = condition.type === 'path_comparison';
  const isAi = condition.type === 'ai_on_brand' || condition.type === 'ai_on_brand_check';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg border border-border bg-surface-2/60 text-xs text-text transition-colors">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono text-text-faint px-1.5 py-0.5 rounded bg-surface border border-border">
          #{index + 1}
        </span>
        <select
          value={condition.type}
          onChange={(e) => {
            const nextType = e.target.value;
            if (nextType === 'ai_on_brand') {
              onChange({
                type: 'ai_on_brand',
                prompt: 'Verify content complies with brand voice and tone',
              });
            } else {
              onChange({
                type: 'path_comparison',
                path: 'payload.eventName',
                operator: 'eq',
                value: '',
              });
            }
          }}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="path_comparison">Field Comparison</option>
          <option value="ai_on_brand">AI On-Brand Check</option>
        </select>
      </div>

      {isPath && (
        <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2 w-full">
          <input
            type="text"
            value={condition.path || ''}
            placeholder="e.g. payload.eventName"
            onChange={(e) => onChange({ ...condition, path: e.target.value })}
            className="flex-1 min-w-[140px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <select
            value={condition.operator || 'eq'}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
            className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {condition.operator !== 'exists' && (
            <input
              type="text"
              value={condition.value !== undefined ? String(condition.value) : ''}
              placeholder="Comparison value"
              onChange={(e) => {
                const val = e.target.value;
                // Parse number or boolean if applicable
                if (val === 'true') {
                  onChange({ ...condition, value: true });
                } else if (val === 'false') {
                  onChange({ ...condition, value: false });
                } else if (!isNaN(Number(val)) && val.trim() !== '') {
                  onChange({ ...condition, value: Number(val) });
                } else {
                  onChange({ ...condition, value: val });
                }
              }}
              className="flex-1 min-w-[120px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      )}

      {isAi && (
        <div className="flex-1 w-full">
          <input
            type="text"
            value={condition.prompt || ''}
            placeholder="e.g. Ensure product tone is innovative and professional"
            onChange={(e) => onChange({ ...condition, prompt: e.target.value })}
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove condition"
        className="p-1 rounded text-text-faint hover:text-danger hover:bg-surface transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
