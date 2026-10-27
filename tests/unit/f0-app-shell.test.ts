import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import * as cheerio from 'cheerio';
import {
  AppShell,
  Sidebar,
  TopBar,
  NAV_ITEMS,
  ThemeToggle,
} from '@/components/layout/app-shell';

const h = React.createElement;

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('F0 Foundation: Responsive App Shell (AC-F0-06)', () => {
  describe('AC-F0-06: Component Architecture & Exports', () => {
    it('AC-F0-06: exports AppShell, Sidebar, TopBar, ThemeToggle, and NAV_ITEMS', () => {
      expect(AppShell).toBeDefined();
      expect(typeof AppShell).toBe('function');
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe('function');
      expect(TopBar).toBeDefined();
      expect(typeof TopBar).toBe('function');
      expect(ThemeToggle).toBeDefined();
      expect(typeof ThemeToggle).toBe('function');
      expect(Array.isArray(NAV_ITEMS)).toBe(true);
      expect(NAV_ITEMS.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('AC-F0-06: App Shell Core Structure (Sidebar, Top Bar, Content Area)', () => {
    it('AC-F0-06: renders main layout containing desktop sidebar, top bar, and content area', () => {
      const html = renderToString(
        h(AppShell, { title: 'Dashboard' },
          h('div', { 'data-testid': 'test-child' }, 'Child Content')
        )
      );
      const $ = cheerio.load(html);

      // Verify root container
      const shell = $('[data-testid="app-shell"]');
      expect(shell.length).toBe(1);

      // Verify desktop sidebar exists
      const desktopSidebar = $('[data-testid="desktop-sidebar"]');
      expect(desktopSidebar.length).toBe(1);

      // Verify top bar exists
      const topBar = $('[data-testid="top-bar"]');
      expect(topBar.length).toBe(1);

      // Verify main content area exists and renders children
      const contentArea = $('[data-testid="app-content-area"]');
      expect(contentArea.length).toBe(1);
      expect(contentArea.find('[data-testid="test-child"]').text()).toBe('Child Content');
    });

    it('AC-F0-06: content area enforces ~1200px maximum width constraint', () => {
      const html = renderToString(
        h(AppShell, null,
          h('div', null, 'Main Page Content')
        )
      );
      const $ = cheerio.load(html);

      const contentInner = $('[data-testid="app-content-area"] > div');
      expect(contentInner.length).toBe(1);
      expect(contentInner.attr('class')).toMatch(/max-w-\[1200px\]|max-w-7xl/);
    });
  });

  describe('AC-F0-06: Left Sidebar Navigation & Links', () => {
    it('AC-F0-06: sidebar includes all 9 required PRD navigation links with correct routes', () => {
      const html = renderToString(h(Sidebar, { currentPath: '/' }));
      const $ = cheerio.load(html);

      const expectedRoutes: Record<string, string> = {
        'Home': '/',
        'Brand Kit': '/brand-kit',
        'Agent': '/agent',
        'Queue': '/queue',
        'Calendar': '/calendar',
        'Connectors': '/connectors',
        'Automations': '/automations',
        'Webhooks': '/webhooks',
        'Activity': '/activity',
      };

      for (const [label, expectedHref] of Object.entries(expectedRoutes)) {
        const link = $(`a[href="${expectedHref}"]`);
        expect(link.length, `Sidebar link for "${label}" with href "${expectedHref}" must exist`).toBeGreaterThanOrEqual(1);
        expect(link.text()).toContain(label);
      }
    });

    it('AC-F0-06: sidebar marks active route with data-active and aria-current="page"', () => {
      const html = renderToString(h(Sidebar, { currentPath: '/brand-kit' }));
      const $ = cheerio.load(html);

      const activeLink = $('a[href="/brand-kit"]');
      expect(activeLink.attr('data-active')).toBe('true');
      expect(activeLink.attr('aria-current')).toBe('page');

      const inactiveLink = $('a[href="/connectors"]');
      expect(inactiveLink.attr('data-active')).toBeUndefined();
      expect(inactiveLink.attr('aria-current')).toBeUndefined();
    });

    it('AC-F0-06: sidebar includes brand logo, ThemeToggle, and Reset Demo controls', () => {
      const html = renderToString(h(Sidebar, { currentPath: '/' }));
      const $ = cheerio.load(html);

      expect($('[data-testid="brand-logo"]').length).toBe(1);
      expect($('[data-testid="theme-toggle"]').length).toBe(1);
      expect($('[data-testid="reset-demo-button"]').length).toBe(1);
      expect($('[data-testid="reset-demo-button"]').text()).toContain('Reset Demo');
    });
  });

  describe('AC-F0-06: Responsive Layout Down to Phone Width', () => {
    it('AC-F0-06: desktop sidebar hides on phone widths via hidden md:flex classes', () => {
      const html = renderToString(
        h(AppShell, null,
          h('div', null, 'Content')
        )
      );
      const $ = cheerio.load(html);

      const desktopSidebar = $('[data-testid="desktop-sidebar"]');
      const classes = desktopSidebar.attr('class') || '';

      // Must be hidden on mobile (<md) and displayed on desktop (>=md)
      expect(classes).toMatch(/\bhidden\b/);
      expect(classes).toMatch(/\bmd:flex\b/);
    });

    it('AC-F0-06: top bar contains mobile menu toggle button visible on phone widths (md:hidden)', () => {
      const html = renderToString(
        h(AppShell, null,
          h('div', null, 'Content')
        )
      );
      const $ = cheerio.load(html);

      const toggleButton = $('[data-testid="mobile-menu-toggle"]');
      expect(toggleButton.length).toBe(1);

      const classes = toggleButton.attr('class') || '';
      expect(classes).toMatch(/\bmd:hidden\b/);
      expect(toggleButton.attr('aria-label')).toBeDefined();
    });

    it('AC-F0-06: collapsible mobile sidebar drawer exists with md:hidden and dialog semantics', () => {
      const html = renderToString(
        h(AppShell, null,
          h('div', null, 'Content')
        )
      );
      const $ = cheerio.load(html);

      const mobileSidebar = $('[data-testid="mobile-sidebar"]');
      expect(mobileSidebar.length).toBe(1);

      const classes = mobileSidebar.attr('class') || '';
      expect(classes).toMatch(/\bmd:hidden\b/);
      expect(mobileSidebar.attr('role')).toBe('dialog');
      expect(mobileSidebar.attr('aria-modal')).toBe('true');
    });
  });

  describe('AC-F0-06: TopBar Breadcrumbs and Actions', () => {
    it('AC-F0-06: top bar displays custom breadcrumb hierarchy when provided', () => {
      const breadcrumbs = [
        { label: 'Workspaces', href: '/' },
        { label: 'Brand Kit', href: '/brand-kit' },
        { label: 'Edit' },
      ];
      const html = renderToString(h(TopBar, { breadcrumbs }));
      const $ = cheerio.load(html);

      const breadcrumbNav = $('nav[aria-label="Breadcrumb"]');
      expect(breadcrumbNav.length).toBe(1);
      expect(breadcrumbNav.text()).toContain('Workspaces');
      expect(breadcrumbNav.text()).toContain('Brand Kit');
      expect(breadcrumbNav.text()).toContain('Edit');
    });

    it('AC-F0-06: top bar displays page title and action slot elements', () => {
      const html = renderToString(
        h(TopBar, {
          title: 'Connectors',
          actions: h('button', { 'data-testid': 'custom-action-btn' }, 'New Connector'),
        })
      );
      const $ = cheerio.load(html);

      expect($('h1').text()).toBe('Connectors');
      expect($('[data-testid="custom-action-btn"]').length).toBe(1);
      expect($('[data-testid="custom-action-btn"]').text()).toBe('New Connector');
    });
  });

  describe('AC-F0-06: Semantic Tokens & Theme Integration', () => {
    it('AC-F0-06: layout components use semantic CSS variable classes rather than hardcoded colors', () => {
      const html = renderToString(
        h(AppShell, null,
          h('div', null, 'Test')
        )
      );

      // Verify presence of semantic token classes
      expect(html).toContain('bg-bg');
      expect(html).toContain('bg-surface');
      expect(html).toContain('text-text');
      expect(html).toContain('border-border');

      // Verify no hardcoded hex color codes in rendered component classes/styles
      const hexColorPattern = /#[0-9a-fA-F]{3,6}/;
      expect(hexColorPattern.test(html)).toBe(false);
    });
  });
});
