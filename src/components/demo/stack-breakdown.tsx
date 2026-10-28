'use client';

import * as React from 'react';
import { Layers, Database, Sparkles, Image, Code2, Server } from 'lucide-react';

export interface TechStackItem {
  name: string;
  category: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const TECH_STACK: readonly TechStackItem[] = [
  {
    name: 'Next.js App Router',
    category: 'Full-Stack Framework',
    description:
      'React Server Components with TypeScript strict mode, API routes, and Server Actions for optimal performance.',
    highlights: ['Strict type guarantees', 'Edge-compatible routing', 'Strict type safety'],
    icon: Code2,
  },
  {
    name: 'Drizzle ORM',
    category: 'Type-Safe ORM',
    description:
      'Lightweight SQL query builder defining 15 relational tables with cascading foreign keys and zero runtime overhead.',
    highlights: ['15 relational schemas', 'Scoped workspace queries', 'Automated migrations'],
    icon: Database,
  },
  {
    name: 'Neon Postgres',
    category: 'Serverless Database',
    description:
      'Serverless Postgres with connection pooling for web traffic and atomic FOR UPDATE SKIP LOCKED concurrency.',
    highlights: ['Connection pooling', 'SKIP LOCKED concurrency', 'Anonymous cookie isolation'],
    icon: Server,
  },
  {
    name: 'Resvg Server Engine',
    category: 'Image Card Generation',
    description:
      'High-performance Rust-based SVG to PNG card renderer executing in pure serverless runtimes without headless Chrome.',
    highlights: ['Fast PNG compilation', '3+ card templates', 'Zero external AI image cost'],
    icon: Image,
  },
  {
    name: 'Gemini LLM & High-Availability Engine',
    category: 'AI Pipeline & SLA Guard',
    description:
      'Multi-tiered enterprise AI provider architecture with real-time scraping, 24h SHA-256 caching, and high-availability SLA resilience.',
    highlights: ['Multi-tier failover', 'Daily quota governance', 'Sliding rate limits'],
    icon: Sparkles,
  },
];

export function StackBreakdown({ className = '' }: { className?: string }) {
  return (
    <section
      aria-labelledby="tech-stack-heading"
      className={`py-8 sm:py-12 border-t border-border ${className}`}
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent border border-accent/20 mb-3">
          <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Production Stack</span>
        </div>
        <h2 id="tech-stack-heading" className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
          Technology Stack Breakdown
        </h2>
        <p className="text-xs sm:text-sm text-text-muted mt-2">
          High-availability multi-tiered provider architecture with sub-millisecond query isolation and resilient fallback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TECH_STACK.map((tech) => {
          const TechIcon = tech.icon;
          return (
            <div
              key={tech.name}
              className="p-5 rounded-2xl border border-border bg-surface shadow-sm flex flex-col justify-between hover:border-accent/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 border border-accent/20">
                    <TechIcon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text leading-tight">
                      {tech.name}
                    </h3>
                    <span className="text-[11px] text-text-muted">
                      {tech.category}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  {tech.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                {tech.highlights.map((h, hIdx) => (
                  <span
                    key={hIdx}
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-text-muted border border-border"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
