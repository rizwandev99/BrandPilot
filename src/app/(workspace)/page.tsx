import * as React from 'react';
import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { Hero } from '@/components/demo/hero';
import { OneClickDemoStepper } from '@/components/demo/one-click-demo-stepper';
import { Explainer } from '@/components/demo/explainer';
import { StackBreakdown } from '@/components/demo/stack-breakdown';
import { FooterDisclaimer } from '@/components/demo/footer-disclaimer';
import { FallbackBanner } from '@/components/demo/fallback-banner';

export const metadata: Metadata = {
  title: 'BrandPilot — Autonomous AI Marketing Platform',
  description:
    'Turn website URLs into high-impact multi-channel social media campaigns with autonomous brand facts extraction, 3-step content agent, Resvg branded cards, and human-in-the-loop review.',
  keywords: [
    'AI marketing agent',
    'autonomous social media',
    'brand kit extraction',
    'multi-channel publishing',
    'content calendar',
    'Resvg image cards',
    'approval queue',
  ],
  authors: [{ name: 'Rizwan' }],
  creator: 'Rizwan',
  openGraph: {
    title: 'BrandPilot — Autonomous AI Marketing Platform',
    description:
      'Turn website URLs into high-impact multi-channel social campaigns with resilient high-availability fallback architecture.',
    url: 'https://brandpilot.dev',
    siteName: 'BrandPilot',
    images: [
      {
        url: '/og-card.png',
        width: 1200,
        height: 630,
        alt: 'BrandPilot Autonomous AI Marketing Agent Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrandPilot — Autonomous AI Marketing Platform',
    description:
      'Turn website URLs into high-impact multi-channel social campaigns with resilient high-availability fallback architecture.',
    creator: '@BrandPilot',
    images: ['/og-card.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  const isOfflineDemo = !process.env.GEMINI_API_KEY;

  return (
    <AppShell
      title="BrandPilot Overview"
      currentPath="/"
      breadcrumbs={[
        { label: 'BrandPilot', href: '/' },
        { label: 'Home', href: '/' },
      ]}
    >
      <div className="space-y-12 pb-8">
        {/* Unconfigured / Offline Environment Demo Banner */}
        {isOfflineDemo && (
          <div className="max-w-4xl mx-auto px-4">
            <FallbackBanner
              provider="fallback"
              reason="missing_api_key"
            />
          </div>
        )}

        {/* Hero Section */}
        <Hero />

        {/* 100% Offline 4-Step Interactive Stepper */}
        <div className="max-w-5xl mx-auto px-4">
          <OneClickDemoStepper />
        </div>

        {/* Core Architecture Explainer ("How It Works") */}
        <div className="max-w-5xl mx-auto px-4">
          <Explainer />
        </div>

        {/* Technology Stack Breakdown */}
        <div className="max-w-5xl mx-auto px-4">
          <StackBreakdown />
        </div>

        {/* Portfolio Disclaimer & Documentation Footer */}
        <div className="max-w-5xl mx-auto px-4">
          <FooterDisclaimer />
        </div>
      </div>
    </AppShell>
  );
}
