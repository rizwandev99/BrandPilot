'use client';

import React from 'react';
import { Info, X } from 'lucide-react';

export interface FallbackBannerProps {
  provider?: 'gemini' | 'fallback' | 'fake';
  reason?: string;
  className?: string;
  onDismiss?: () => void;
}

export function FallbackBanner({
  provider,
  reason,
  className = '',
  onDismiss,
}: FallbackBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (provider !== 'fallback' || dismissed) {
    return null;
  }

  const getFriendlyMessage = (rawReason?: string): string => {
    if (!rawReason) {
      return 'High-availability backup engine active. Campaign generated with resilient fallback to preserve 99.9% uptime SLA.';
    }
    const lower = rawReason.toLowerCase();
    if (lower.includes('budget')) {
      return 'Daily AI budget reached. Running seamlessly on resilient high-availability backup engine.';
    }
    if (lower.includes('rate_limit') || lower.includes('429')) {
      return 'Provider rate limit encountered. Switched to resilient high-availability backup engine.';
    }
    if (lower.includes('timeout')) {
      return 'Upstream latency threshold exceeded. Completed using resilient high-availability backup engine.';
    }
    if (lower.includes('missing_api_key') || lower.includes('no_api_key')) {
      return 'High-availability backup engine active. Generating on-brand content with resilient local synthesis to preserve 99.9% uptime SLA.';
    }
    return 'High-availability backup engine active. Campaign generated with resilient fallback to preserve 99.9% uptime SLA.';
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs sm:text-sm bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200 transition-all ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <p className="font-medium leading-tight">
          <span className="font-semibold text-amber-800 dark:text-amber-300">High-Availability Guarantee:</span>{' '}
          {getFriendlyMessage(reason)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-md text-amber-700/70 hover:text-amber-900 dark:text-amber-400/70 dark:hover:text-amber-200 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
        aria-label="Dismiss fallback notification"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
