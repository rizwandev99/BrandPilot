'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Globe, Loader2, CheckCircle2 } from 'lucide-react';

export interface ExampleChip {
  name: string;
  url: string;
  tagline: string;
}

export const EXAMPLE_BRANDS: readonly ExampleChip[] = [
  { name: 'Acme SaaS', url: 'https://acme-saas.example.com', tagline: 'Cloud analytics' },
  { name: 'DevFlow', url: 'https://devflow.io', tagline: 'Developer workflows' },
  { name: 'CoffeeCo', url: 'https://coffeeco.craft', tagline: 'Artisanal roastery' },
];

export interface HeroProps {
  onUrlExtracted?: (brandKitId: string) => void;
  onSampleLoaded?: (brandKitId: string) => void;
  className?: string;
}

export function Hero({ onUrlExtracted, onSampleLoaded, className = '' }: HeroProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadingSample, setLoadingSample] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleExtractUrl = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setError('Please enter a valid website URL');
      return;
    }

    let validUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Invalid URL format. Example: https://example.com');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const created = (await res.json()) as { id: string; name: string };
      setSuccessMessage(`Brand kit "${created.name}" synthesized!`);
      onUrlExtracted?.(created.id);
      router.push('/brand-kit');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract brand facts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: true }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const sampleKit = (await res.json()) as { id: string; name: string };
      setSuccessMessage(`Sample kit "${sampleKit.name}" loaded instantly!`);
      onSampleLoaded?.(sampleKit.id);
      router.push('/brand-kit');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample brand kit';
      setError(msg);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleChipClick = (chip: ExampleChip) => {
    setUrl(chip.url);
    setError(null);
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className={`relative pt-8 pb-12 sm:pt-12 sm:pb-16 text-center max-w-4xl mx-auto px-4 ${className}`}
    >
      {/* Category / Showcase Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent/20 mb-6 transition-transform hover:scale-105">
        <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Autonomous Multi-Channel AI Marketing Platform</span>
      </div>

      {/* Main Headline */}
      <h1
        id="hero-heading"
        className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-text leading-tight sm:leading-tight md:leading-tight mb-4"
      >
        Turn Any Website URL into{' '}
        <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
          High-Impact Social Campaigns
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
        Autonomous brand facts extraction, 3-step content agent, Resvg branded cards,
        and human-in-the-loop review. Built with a 100% offline guarantee.
      </p>

      {/* URL Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleExtractUrl(url);
        }}
        className="max-w-xl mx-auto mb-4"
      >
        <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-xl bg-surface border border-border shadow-sm focus-within:ring-2 focus-within:ring-accent transition-all">
          <div className="relative flex-1 flex items-center">
            <Globe
              className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="website-url-input" className="sr-only">
              Website URL to extract brand kit
            </label>
            <input
              id="website-url-input"
              type="url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              aria-label="Website URL to extract brand kit"
              className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
              disabled={loading || loadingSample}
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingSample}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <span>Extract Brand</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Example Brand Chips & Instant Sample Button */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-text-muted mb-4">
        <span className="font-medium mr-1">Try example:</span>
        {EXAMPLE_BRANDS.map((chip) => (
          <button
            key={chip.name}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-text hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
            title={`${chip.name} — ${chip.tagline}`}
          >
            <span>{chip.name}</span>
          </button>
        ))}

        <span className="mx-1.5 text-border" aria-hidden="true">|</span>

        {/* Load Sample Brand Kit Button (AC-F10-01) */}
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={loading || loadingSample}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-accent-soft text-accent border border-accent/25 hover:bg-accent hover:text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all font-medium disabled:opacity-50"
        >
          {loadingSample ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Load Sample Brand Kit</span>
            </>
          )}
        </button>
      </div>

      {/* Status Feedback */}
      {error && (
        <p role="alert" className="text-xs sm:text-sm text-danger mt-2 font-medium">
          {error}
        </p>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-success mt-2 font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}
    </section>
  );
}
