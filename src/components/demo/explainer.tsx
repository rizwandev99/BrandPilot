'use client';

import * as React from 'react';
import {
  Globe,
  Bot,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Cpu,
} from 'lucide-react';

export interface ExplainerStage {
  title: string;
  badge: string;
  summary: string;
  points: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const EXPLAINER_STAGES: readonly ExplainerStage[] = [
  {
    title: '1. Fact Extraction & Brand Synthesis',
    badge: 'Cheerio & SSRF Guard',
    summary:
      'Extracts structured brand identity directly from raw HTML with strict security guards and color contrast math.',
    points: [
      'Strict SSRF Guard: Blocks RFC 1918, loopback, link-local, and AWS/GCP cloud metadata IP ranges across all redirects.',
      'Cheerio Fact Extractor: Scrapes site title, meta description, H1-H3 headings, brand palette, and representative copy.',
      'WCAG AA Contrast Math: Automatically shifts luminance of extracted palette colors to guarantee contrast ratio >= 4.5:1.',
      'Resilient LLM Cache: 24-hour SHA-256 hash caching prevents redundant generation and protects daily API quotas.',
    ],
    icon: Globe,
  },
  {
    title: '2. 3-Step Pipeline: Content Agent & Resvg Cards',
    badge: 'Idea → Creative → Campaign',
    summary:
      'Multi-channel social post generation with server-side branded card rendering and brand guideline enforcement.',
    points: [
      'Idea Step: Brainstorms channel-optimized concepts adhering to brand tone, keywords, and audience segments.',
      'Creative Step: Generates tailored captions, hashtags, and SVG layouts for LinkedIn, X, Instagram, and Facebook.',
      'Campaign Step: Enforces channel character limits, strips brand "donts" banned words, and schedules spacing >= 2h apart.',
      'Resvg Server Engine: Compiles high-resolution PNG image cards on the server without headless Chrome or external AI image APIs.',
    ],
    icon: Bot,
  },
  {
    title: '3. Human Review & Approval Gate',
    badge: 'Strict State Machine',
    summary:
      'Linear-grade review system preventing accidental publishing with automated audit logging and version tracking.',
    points: [
      'Strict Post Machine: Posts begin in "in_review" and require explicit human approval before scheduling or publishing.',
      'Edit & Version Bump: Any edit to an approved post increments version and immediately resets status back to "in_review".',
      'Live Character Counter: Real-time counter with channel limits (X: 280, LinkedIn: 3000, IG: 2200) and overflow locking.',
      'Keyboard Navigation: Rapid queue triage using standard shortcuts (A to approve, H to hold, E to edit, ? for cheatsheet).',
    ],
    icon: Layers,
  },
  {
    title: '4. Concurrency Publisher & Connectors',
    badge: 'Postgres SKIP LOCKED',
    summary:
      'Fault-tolerant scheduler with atomic database locking, exponential backoff, and multi-network sandbox adapters.',
    points: [
      'Idempotent Concurrency: FOR UPDATE SKIP LOCKED prevents duplicate publishing when multiple workers execute run-due.',
      'Exponential Backoff: Retries TEMPORARY and RATE_LIMITED failures with jitter and respects provider Retry-After headers.',
      'Sandbox Simulator: Test failure handling with configurable injected errors (network drop, rate limit, token expired).',
      'Live LinkedIn OAuth: Optional personal profile publishing (w_member_social) with AES-256-GCM token encryption.',
    ],
    icon: Calendar,
  },
];

export function Explainer({ className = '' }: { className?: string }) {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className={`py-8 sm:py-12 ${className}`}
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent/20 mb-3">
          <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Core Architecture</span>
        </div>
        <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
          How It Works: Autonomous Marketing Pipeline
        </h2>
        <p className="text-xs sm:text-sm text-text-muted mt-2">
          High-availability multi-tiered provider architecture with sub-millisecond query isolation and resilient fallback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {EXPLAINER_STAGES.map((stage) => {
          const StageIcon = stage.icon;
          return (
            <div
              key={stage.title}
              className="p-6 rounded-2xl border border-border bg-surface shadow-sm hover:border-accent/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-accent/20">
                    <StageIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-2 text-text-muted border border-border">
                    {stage.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-text mb-2">
                  {stage.title}
                </h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-4">
                  {stage.summary}
                </p>

                <ul className="space-y-2 text-xs text-text-muted">
                  {stage.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" aria-hidden="true" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
