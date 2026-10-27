'use client';

import * as React from 'react';
import { ArrowDownLeft, ArrowUpRight, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { JsonPayloadViewer } from './json-payload-viewer';

export interface ActivityEventItem {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string | Date;
}

interface EventItemRowProps {
  event: ActivityEventItem;
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec) || diffSec < 0) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function EventItemRow({ event }: EventItemRowProps) {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'incoming':
        return <ArrowDownLeft className="h-3.5 w-3.5 text-info" />;
      case 'outgoing':
        return <ArrowUpRight className="h-3.5 w-3.5 text-success" />;
      default:
        return <Cpu className="h-3.5 w-3.5 text-accent" />;
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'incoming':
        return 'bg-info/10 text-info border-info/20';
      case 'outgoing':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  const isSuccess = event.status === 'success';

  return (
    <div className="p-4 rounded-xl border border-border bg-surface space-y-3 hover:border-border/80 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Source Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getSourceBadgeClass(
              event.source
            )}`}
          >
            {getSourceIcon(event.source)}
            <span className="capitalize">{event.source}</span>
          </span>

          {/* Event Type */}
          <span className="font-mono text-xs font-semibold text-text">
            {event.type}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isSuccess
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span className="capitalize">{event.status}</span>
          </span>

          {/* Timestamp */}
          <span className="text-xs text-text-muted" title={new Date(event.createdAt).toISOString()}>
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
      </div>

      <div className="text-[11px] text-text-muted font-mono truncate">
        Event ID: {event.id}
      </div>

      {/* Expandable JSON Payload with masked secrets */}
      <JsonPayloadViewer payload={event.payload} />
    </div>
  );
}
