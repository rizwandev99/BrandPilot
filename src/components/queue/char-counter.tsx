'use client';

import * as React from 'react';
import { clsx } from 'clsx';

export const CHANNEL_LIMITS: Record<string, number> = {
  x: 280,
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 2000,
};

export const DEFAULT_CHANNEL_LIMIT = 2000;

export function getChannelLimit(channel: string): number {
  const normalized = channel.toLowerCase().trim();
  return CHANNEL_LIMITS[normalized] ?? DEFAULT_CHANNEL_LIMIT;
}

export function isOverLimit(channel: string, text: string): boolean {
  const max = getChannelLimit(channel);
  return (text?.length ?? 0) > max;
}

export interface CharCounterProps {
  channel: string;
  count: number;
  className?: string;
  showWarningThreshold?: number; // e.g. 0.9 for 90%
}

export function CharCounter({
  channel,
  count,
  className,
  showWarningThreshold = 0.9,
}: CharCounterProps) {
  const max = getChannelLimit(channel);
  const ratio = max > 0 ? count / max : 0;
  const isOverflow = count > max;
  const isWarning = !isOverflow && ratio >= showWarningThreshold;
  const remaining = max - count;

  return (
    <div
      data-testid="char-counter"
      className={clsx(
        'text-xs tabular-nums flex items-center gap-1.5 transition-colors',
        isOverflow
          ? 'text-danger font-semibold'
          : isWarning
          ? 'text-warning font-medium'
          : 'text-text-muted',
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span>
        {count} / {max}
      </span>
      {isOverflow ? (
        <span className="text-[11px] text-danger bg-danger/10 px-1.5 py-0.5 rounded font-medium">
          +{count - max} over limit
        </span>
      ) : isWarning ? (
        <span className="text-[11px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">
          {remaining} left
        </span>
      ) : null}
    </div>
  );
}
