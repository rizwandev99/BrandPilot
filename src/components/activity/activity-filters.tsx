'use client';

import * as React from 'react';
import { Filter, Search, RotateCcw } from 'lucide-react';

export interface ActivityFilterState {
  source: string;
  type: string;
  status: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
  onReset: () => void;
}

const SOURCE_TABS = [
  { id: 'all', label: 'All Sources' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'system', label: 'System' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
];

export function ActivityFilters({
  filters,
  onChange,
  onReset,
}: ActivityFiltersProps) {
  const hasActiveFilters =
    filters.source !== 'all' || filters.status !== 'all' || filters.type.trim() !== '';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange({ ...filters, source: tab.id })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filters.source === tab.id
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="px-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Event Type Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
        <input
          type="text"
          placeholder="Filter by event type (e.g. post.published, webhook.received, test.ping)..."
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-2 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
    </div>
  );
}
