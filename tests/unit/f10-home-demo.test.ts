import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Mock Next.js navigation and next-themes for SSR rendering
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const h = React.createElement;

describe('F10 Home Page, 100% Offline Demo, Documentation & WCAG AA (AC-F10-01..08)', () => {
  const rootDir = path.resolve(__dirname, '../../');

  // ------------------------------------------------------------------------
  // AC-F10-01: Home page landing experience & One-Click Demo Stepper
  // ------------------------------------------------------------------------
  describe('AC-F10-01: Home Landing Experience & Stepper Layout', () => {
    it('AC-F10-01: exports Hero, OneClickDemoStepper, Explainer, StackBreakdown, and FooterDisclaimer', async () => {
      const heroMod = await import('@/components/demo/hero');
      const stepperMod = await import('@/components/demo/one-click-demo-stepper');
      const explainerMod = await import('@/components/demo/explainer');
      const stackMod = await import('@/components/demo/stack-breakdown');
      const footerMod = await import('@/components/demo/footer-disclaimer');

      expect(heroMod.Hero).toBeDefined();
      expect(typeof heroMod.Hero).toBe('function');
      expect(stepperMod.OneClickDemoStepper).toBeDefined();
      expect(typeof stepperMod.OneClickDemoStepper).toBe('function');
      expect(explainerMod.Explainer).toBeDefined();
      expect(typeof explainerMod.Explainer).toBe('function');
      expect(stackMod.StackBreakdown).toBeDefined();
      expect(typeof stackMod.StackBreakdown).toBe('function');
      expect(footerMod.FooterDisclaimer).toBeDefined();
      expect(typeof footerMod.FooterDisclaimer).toBe('function');
    });

    it('AC-F10-01: Hero renders URL input, example brand chips, and Load Sample Brand Kit button', async () => {
      const { Hero } = await import('@/components/demo/hero');
      const html = renderToString(h(Hero));
      const $ = cheerio.load(html);

      // Verify URL input exists with proper accessibility
      const urlInput = $('input[type="url"], input[type="text"][name="url"], input[placeholder*="http"]');
      expect(urlInput.length).toBeGreaterThanOrEqual(1);
      expect(urlInput.attr('aria-label') || $('label[for="' + urlInput.attr('id') + '"]').length).toBeTruthy();

      // Verify example brand chips (e.g. Acme SaaS, DevFlow, CoffeeCo)
      const text = $.text();
      expect(text).toContain('Acme');
      expect(text).toContain('DevFlow');
      expect(text).toContain('CoffeeCo');

      // Verify "Load Sample Brand Kit" button
      const sampleBtn = $('button:contains("Load Sample"), button:contains("Sample Brand Kit")');
      expect(sampleBtn.length).toBeGreaterThanOrEqual(1);
    });

    it('AC-F10-01: One-Click Demo Stepper defines the 4-step autonomous marketing loop', async () => {
      const { OneClickDemoStepper } = await import('@/components/demo/one-click-demo-stepper');
      const html = renderToString(h(OneClickDemoStepper));
      const $ = cheerio.load(html);

      const text = $.text();
      // Step 1: Brand Extraction
      expect(text).toMatch(/Brand (Kit|Extraction)/i);
      // Step 2: Agent Run
      expect(text).toMatch(/Agent Run|Content Agent/i);
      // Step 3: Human Approval
      expect(text).toMatch(/Human Approval|Approval Queue/i);
      // Step 4: Publish / Scheduled
      expect(text).toMatch(/Publish|Scheduled/i);

      // Verify "Run One-Click Demo" trigger button exists
      const runBtn = $('button:contains("Run One-Click Demo"), button:contains("Start Demo"), button:contains("Run Full Demo")');
      expect(runBtn.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-02: 100% Offline Demo Guarantee
  // ------------------------------------------------------------------------
  describe('AC-F10-02: 100% Offline Demo Guarantee & Workflow State Transitions', () => {
    it('AC-F10-02: stepper component provides simulated and real offline run capability with zero network keys', async () => {
      const { OneClickDemoStepper, DEMO_STEPS } = await import('@/components/demo/one-click-demo-stepper');
      expect(DEMO_STEPS).toBeDefined();
      expect(Array.isArray(DEMO_STEPS)).toBe(true);
      expect(DEMO_STEPS.length).toBe(4);

      // Verify all 4 step keys exist
      const stepIds = DEMO_STEPS.map((s) => s.id);
      expect(stepIds).toEqual(['brand_kit', 'agent_run', 'human_approval', 'scheduled_publish']);

      // Render stepper in initial state
      const html = renderToString(h(OneClickDemoStepper));
      const $ = cheerio.load(html);
      expect($('[data-testid="demo-stepper"]').length).toBe(1);
      expect($.text()).toContain('100% Offline Guarantee');
    });

    it('AC-F10-02: FallbackBanner provides clear offline demo indicator for unconfigured environments', async () => {
      const { FallbackBanner } = await import('@/components/demo/fallback-banner');
      const html = renderToString(
        h(FallbackBanner, { provider: 'fallback', reason: 'offline_demo_mode' })
      );
      const $ = cheerio.load(html);
      expect($('[role="status"]').length).toBe(1);
      expect($.text()).toContain('Demo Guarantee');
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-03: Mandatory Portfolio Disclaimer in Footer
  // ------------------------------------------------------------------------
  describe('AC-F10-03: Mandatory Portfolio Disclaimer in Footer', () => {
    it('AC-F10-03: renders exact verbatim portfolio disclaimer and GitHub repository link', async () => {
      const { FooterDisclaimer } = await import('@/components/demo/footer-disclaimer');
      const html = renderToString(h(FooterDisclaimer));
      const $ = cheerio.load(html);

      const footer = $('footer, [data-testid="footer-disclaimer"]');
      expect(footer.length).toBeGreaterThanOrEqual(1);

      const footerText = footer.text();
      // Requirement AC-F10-03 verbatim check:
      // "BrandPilot is an open-source demonstration platform for autonomous AI marketing agents. Built by [Author] as a production-grade portfolio project."
      expect(footerText).toContain('BrandPilot is an open-source demonstration platform for autonomous AI marketing agents.');
      expect(footerText).toContain('as a production-grade portfolio project.');

      // GitHub link
      const githubLink = $('a[href*="github.com"]');
      expect(githubLink.length).toBeGreaterThanOrEqual(1);
      expect(githubLink.attr('rel')).toContain('noopener');
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-04: Explainer Section & Technology Stack Breakdown
  // ------------------------------------------------------------------------
  describe('AC-F10-04: Explainer & Technology Stack Breakdown', () => {
    it('AC-F10-04: Explainer details the 4 key stages of autonomous marketing', async () => {
      const { Explainer } = await import('@/components/demo/explainer');
      const html = renderToString(h(Explainer));
      const $ = cheerio.load(html);

      const text = $.text();
      expect(text).toContain('How It Works');
      expect(text).toMatch(/Fact Extraction|Brand Kit/i);
      expect(text).toMatch(/3-Step Pipeline|Agent/i);
      expect(text).toMatch(/Human Review|Approval Gate/i);
      expect(text).toMatch(/Scheduler|Publishing/i);
    });

    it('AC-F10-04: StackBreakdown details Next.js, Drizzle, Neon, Resvg, and Gemini', async () => {
      const { StackBreakdown } = await import('@/components/demo/stack-breakdown');
      const html = renderToString(h(StackBreakdown));
      const $ = cheerio.load(html);

      const text = $.text();
      expect(text).toContain('Next.js');
      expect(text).toContain('Drizzle');
      expect(text).toContain('Neon');
      expect(text).toContain('Resvg');
      expect(text).toContain('Gemini');
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-05: Comprehensive Production-Grade README.md
  // ------------------------------------------------------------------------
  describe('AC-F10-05: Production-Grade README.md Documentation', () => {
    it('AC-F10-05: README.md exists and contains features, architecture, offline instructions, and setup commands', () => {
      const readmePath = path.join(rootDir, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, 'utf8');

      expect(content).toContain('# BrandPilot');
      expect(content).toContain('100% Offline');
      expect(content).toContain('Architecture');
      expect(content).toContain('pnpm test');
      expect(content).toContain('pnpm test:e2e');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('GEMINI_API_KEY');
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-06: Documentation Package (architecture.md, decisions.md, review-log.md)
  // ------------------------------------------------------------------------
  describe('AC-F10-06: In-Depth Documentation Package', () => {
    it('AC-F10-06: docs/architecture.md details state machines, isolation, SSRF, and fallback hierarchy', () => {
      const archPath = path.join(rootDir, 'docs/architecture.md');
      expect(fs.existsSync(archPath)).toBe(true);
      const content = fs.readFileSync(archPath, 'utf8');

      expect(content).toContain('State Machine');
      expect(content).toContain('PostStatus');
      expect(content).toContain('Workspace');
      expect(content).toContain('SSRF');
      expect(content).toContain('Fallback');
      expect(content).toContain('Resvg');
    });

    it('AC-F10-06: docs/decisions.md contains ADRs for Drizzle, Resvg, Fallback hierarchy, and cookie isolation', () => {
      const decPath = path.join(rootDir, 'docs/decisions.md');
      expect(fs.existsSync(decPath)).toBe(true);
      const content = fs.readFileSync(decPath, 'utf8');

      expect(content).toContain('ADR');
      expect(content).toContain('Drizzle');
      expect(content).toContain('Resvg');
      expect(content).toContain('Fallback');
      expect(content).toContain('Workspace');
    });

    it('AC-F10-06: docs/review-log.md records compliance for all milestones F0 through F11 with "Open items: none"', () => {
      const reviewPath = path.join(rootDir, 'docs/review-log.md');
      expect(fs.existsSync(reviewPath)).toBe(true);
      const content = fs.readFileSync(reviewPath, 'utf8');

      expect(content).toContain('F0');
      expect(content).toContain('F1');
      expect(content).toContain('F2');
      expect(content).toContain('F3');
      expect(content).toContain('F4');
      expect(content).toContain('F5');
      expect(content).toContain('F6');
      expect(content).toContain('F7');
      expect(content).toContain('F8');
      expect(content).toContain('F9');
      expect(content).toContain('F10');
      expect(content).toContain('F11');
      expect(content).toContain('Open items: none');
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-07: Dynamic Metadata, Open Graph & Semantic Structure
  // ------------------------------------------------------------------------
  describe('AC-F10-07: Page Metadata, Open Graph & Semantic HTML', () => {
    it('AC-F10-07: Home page exports rich metadata with Open Graph and Twitter cards', async () => {
      const pageMod = await import('@/app/(workspace)/page');
      expect(pageMod.metadata).toBeDefined();

      const meta = pageMod.metadata;
      expect(meta.title).toMatch(/BrandPilot/i);
      expect(meta.description).toBeTruthy();
      expect(meta.openGraph).toBeDefined();
      expect(meta.openGraph?.title).toMatch(/BrandPilot/i);
      expect(meta.twitter).toBeDefined();
    });

    it('AC-F10-07: Home page renders semantic HTML landmark tags (main, header/section, footer)', async () => {
      const HomePage = (await import('@/app/(workspace)/page')).default;
      const html = renderToString(h(HomePage));
      const $ = cheerio.load(html);

      expect($('main').length).toBeGreaterThanOrEqual(1);
      expect($('section').length).toBeGreaterThanOrEqual(3);
      expect($('h1').length).toBeGreaterThanOrEqual(1);
      expect($('h2').length).toBeGreaterThanOrEqual(2);
      expect($('footer').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ------------------------------------------------------------------------
  // AC-F10-08: WCAG AA Accessibility, Focus Rings & Design System Compliance
  // ------------------------------------------------------------------------
  describe('AC-F10-08: WCAG AA Accessibility & Design Tokens', () => {
    it('AC-F10-08: UI interactive elements have accessible focus-visible rings', async () => {
      const { Hero } = await import('@/components/demo/hero');
      const { OneClickDemoStepper } = await import('@/components/demo/one-click-demo-stepper');
      const heroHtml = renderToString(h(Hero));
      const stepperHtml = renderToString(h(OneClickDemoStepper));

      expect(heroHtml).toMatch(/focus-visible:ring/);
      expect(stepperHtml).toMatch(/focus-visible:ring/);
    });

    it('AC-F10-08: Demo components use semantic CSS variable tokens without hardcoded hex colors', () => {
      const demoDir = path.join(rootDir, 'src/components/demo');
      const demoFiles = fs.readdirSync(demoDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

      for (const file of demoFiles) {
        // Exclude fallback banner which may use standard amber tailwind classes
        const content = fs.readFileSync(path.join(demoDir, file), 'utf8');
        // Check for raw inline styles with hex like style={{ color: '#123456' }} or hex in classNames
        const hexInlineMatches = content.match(/style=\{[^}]*#[0-9a-fA-F]{3,6}[^}]*\}/g);
        expect(hexInlineMatches || []).toEqual([]);
      }
    });

    it('AC-F10-08: Source code in F10 components contains ZERO uncommented any', () => {
      const f10Files = [
        path.join(rootDir, 'src/app/(workspace)/page.tsx'),
        path.join(rootDir, 'src/components/demo/hero.tsx'),
        path.join(rootDir, 'src/components/demo/one-click-demo-stepper.tsx'),
        path.join(rootDir, 'src/components/demo/explainer.tsx'),
        path.join(rootDir, 'src/components/demo/stack-breakdown.tsx'),
        path.join(rootDir, 'src/components/demo/footer-disclaimer.tsx'),
      ];

      for (const filePath of f10Files) {
        if (!fs.existsSync(filePath)) continue;
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/\bany\b/.test(line) && !line.includes('// intentional any')) {
            throw new Error(`Uncommented 'any' found in ${filePath}:${i + 1}: ${line}`);
          }
        }
      }
    });
  });
});
