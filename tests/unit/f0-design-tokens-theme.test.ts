import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F0 Foundation: Design Tokens & Theme Configuration (AC-F0-05)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const cssPath = path.join(rootDir, 'src/app/globals.css');
  const layoutPath = path.join(rootDir, 'src/app/layout.tsx');

  describe('AC-F0-05: CSS Variable Design Tokens', () => {
    it('AC-F0-05: globals.css exists and declares semantic CSS variables for :root (light theme)', () => {
      expect(fs.existsSync(cssPath), 'src/app/globals.css must exist').toBe(true);

      const css = fs.readFileSync(cssPath, 'utf8');

      // Check :root block
      expect(css).toMatch(/:root\s*\{/);

      // Verify core semantic token categories exist in :root
      // e.g., background/bg, surface/card, border, accent/primary, text/foreground
      const hasBg = /--(bg|background)\b/.test(css);
      const hasSurface = /--(surface|card|muted)\b/.test(css);
      const hasBorder = /--border\b/.test(css);
      const hasAccent = /--(accent|primary)\b/.test(css);
      const hasText = /--(text|foreground)\b/.test(css);

      expect(hasBg, 'globals.css must define background token (--bg or --background)').toBe(true);
      expect(hasSurface, 'globals.css must define surface token (--surface or --card)').toBe(true);
      expect(hasBorder, 'globals.css must define border token (--border)').toBe(true);
      expect(hasAccent, 'globals.css must define accent token (--accent or --primary)').toBe(true);
      expect(hasText, 'globals.css must define text token (--text or --foreground)').toBe(true);
    });

    it('AC-F0-05: globals.css declares dark theme tokens under .dark selector', () => {
      if (!fs.existsSync(cssPath)) return;
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toMatch(/\.dark\s*\{/);

      // Verify .dark contains overridden values for tokens
      const darkBlockMatch = css.match(/\.dark\s*\{([^}]+)\}/);
      expect(darkBlockMatch, '.dark class rule block must be present').toBeTruthy();

      const darkBlock = darkBlockMatch ? darkBlockMatch[1] : '';
      const hasDarkBg = /--(bg|background)\b/.test(darkBlock);
      const hasDarkBorder = /--border\b/.test(darkBlock);

      expect(hasDarkBg, '.dark block must override background token').toBe(true);
      expect(hasDarkBorder, '.dark block must override border token').toBe(true);
    });
  });

  describe('AC-F0-05: ThemeProvider and FOUC Prevention in Root Layout', () => {
    it('AC-F0-05: root layout.tsx configures ThemeProvider with attribute="class"', () => {
      expect(fs.existsSync(layoutPath), 'src/app/layout.tsx must exist').toBe(true);

      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      // ThemeProvider import and usage
      const hasThemeProvider = /ThemeProvider/.test(layoutContent);
      expect(hasThemeProvider, 'layout.tsx must use ThemeProvider component').toBe(true);

      const hasClassAttr = /attribute\s*=\s*["']class["']/.test(layoutContent);
      expect(hasClassAttr, 'ThemeProvider must specify attribute="class"').toBe(true);
    });

    it('AC-F0-05: html element in root layout includes suppressHydrationWarning', () => {
      if (!fs.existsSync(layoutPath)) return;
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      const hasSuppressHydration = /<html[^>]*\bsuppressHydrationWarning\b/i.test(layoutContent);
      expect(
        hasSuppressHydration,
        'Root <html> tag must include suppressHydrationWarning to prevent theme mismatch warnings'
      ).toBe(true);
    });
  });
});
