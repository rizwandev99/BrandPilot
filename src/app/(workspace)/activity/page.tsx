'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ActivityFilters, type ActivityFilterState } from '@/components/activity/activity-filters';
import { EventItemRow, type ActivityEventItem } from '@/components/activity/event-item-row';
import { RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;

export default function ActivityPage() {
  const [events, setEvents] = React.useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<ActivityFilterState>({
    source: 'all',
    type: '',
    status: 'all',
  });

  const fetchEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (filters.source !== 'all') params.set('source', filters.source);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.type.trim()) params.set('type', filters.type.trim());

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load activity events');
      const json = await res.json();
      setEvents(json.events || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Failed to load activity events');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = (newFilters: ActivityFilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleResetFilters = () => {
    setFilters({ source: 'all', type: '', status: 'all' });
    setPage(1);
  };

  return (
    <AppShell
      title="Activity Log"
      breadcrumbs={[{ label: 'Workspace', href: '/' }, { label: 'Activity' }]}
      currentPath="/activity"
      actions={
        <button
          type="button"
          onClick={fetchEvents}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-5 pb-12">
        <ActivityFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {error && (
          <div className="p-3.5 text-xs rounded-xl bg-danger/10 border border-danger/30 text-danger flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchEvents}
              className="text-xs font-semibold underline ml-3"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mr-2 text-accent" />
            Loading activity log...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-2 bg-surface">
            <Activity className="h-8 w-8 text-text-muted/40 mx-auto" />
            <p className="text-sm font-medium text-text">No events found</p>
            <p className="text-xs text-text-muted">
              Events will appear here as webhooks, campaigns, and posts are processed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventItemRow key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {!loading && events.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-text-muted">
              Page {page} • Showing up to {PAGE_SIZE} events
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={events.length < PAGE_SIZE}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-2 text-text transition-colors disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
