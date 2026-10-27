'use client';

import * as React from 'react';
import Link from 'next/link';
import { Github, FileText, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export function FooterDisclaimer({ className = '' }: { className?: string }) {
  return (
    <footer
      data-testid="footer-disclaimer"
      aria-label="Portfolio disclaimer and project documentation"
      className={`border-t border-border mt-16 pt-8 pb-12 text-xs text-text-muted ${className}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Author & Open-Source Portfolio Disclaimer */}
        <div className="text-center md:text-left max-w-xl">
          <p className="font-semibold text-text mb-1 flex items-center justify-center md:justify-start gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Open-Source Demonstration Platform</span>
          </p>
          <p className="leading-relaxed">
            BrandPilot is an open-source demonstration platform for autonomous AI marketing agents.
            Built by <strong className="text-text font-semibold">Rizwan</strong> as a production-grade portfolio project.
          </p>
        </div>

        {/* Links & Repository */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 shrink-0">
          <a
            href="https://github.com/rizwan/BrandPilot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-text hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors font-medium"
            aria-label="View BrandPilot repository on GitHub (opens in new window)"
          >
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            <span>GitHub Repository</span>
          </a>

          <div className="flex items-center gap-3 text-text-muted">
            <span className="text-border" aria-hidden="true">&bull;</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" />
              <span>WCAG AA Compliant</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
