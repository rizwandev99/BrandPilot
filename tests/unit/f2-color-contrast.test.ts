import { describe, it, expect } from 'vitest';

describe('F2 Brand Kit: WCAG AA Color Contrast & Hex Validation (AC-F2-05)', () => {
  describe('AC-F2-05: Hex Color Format Validation (isValidHex)', () => {
    it('AC-F2-05: accepts valid 6-digit hex color strings (case-insensitive)', async () => {
      const { isValidHex } = await import('@/lib/color-contrast');

      const valid6Hex = [
        '#ffffff',
        '#000000',
        '#1a1a1a',
        '#FF5733',
        '#33ff57',
        '#5733FF',
        '#aAbBcC',
        '#012345',
        '#6789de',
      ];

      for (const hex of valid6Hex) {
        expect(isValidHex(hex), `Expected ${hex} to be recognized as valid hex`).toBe(true);
      }
    });

    it('AC-F2-05: accepts valid 3-digit shorthand hex color strings', async () => {
      const { isValidHex } = await import('@/lib/color-contrast');

      const valid3Hex = ['#fff', '#000', '#123', '#abc', '#ABC', '#f0a'];

      for (const hex of valid3Hex) {
        expect(isValidHex(hex), `Expected ${hex} to be valid shorthand hex`).toBe(true);
      }
    });

    it('AC-F2-05: rejects invalid hex color formats, missing hash, or bad characters', async () => {
      const { isValidHex } = await import('@/lib/color-contrast');

      const invalidHex = [
        'ffffff', // missing leading #
        '#ffff', // 4 chars (non-standard without alpha support)
        '#fffff', // 5 chars
        '#fffffff', // 7 chars
        '#gggggg', // non-hex character 'g'
        '#12345z', // non-hex character 'z'
        '#', // empty hash
        '', // empty string
        'rgb(255,255,255)',
        'blue',
        '#12 34 56', // spaces
      ];

      for (const hex of invalidHex) {
        expect(isValidHex(hex), `Expected ${hex} to be rejected as invalid hex`).toBe(false);
      }
    });
  });

  describe('AC-F2-05: WCAG Relative Luminance & Contrast Ratio Calculation', () => {
    it('AC-F2-05: calculates relative luminance matching WCAG 2.1 formula', async () => {
      const { getLuminance } = await import('@/lib/color-contrast');

      // Pure black has luminance 0
      expect(getLuminance('#000000')).toBeCloseTo(0, 4);

      // Pure white has luminance 1
      expect(getLuminance('#ffffff')).toBeCloseTo(1, 4);

      // Srgb mid-gray #808080 is around ~0.2158
      const midGrayLum = getLuminance('#808080');
      expect(midGrayLum).toBeGreaterThan(0.2);
      expect(midGrayLum).toBeLessThan(0.25);
    });

    it('AC-F2-05: calculates maximum 21:1 contrast ratio between pure black and pure white', async () => {
      const { getContrastRatio } = await import('@/lib/color-contrast');

      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);

      // Symmetry check: contrast(A, B) === contrast(B, A)
      const reverseRatio = getContrastRatio('#ffffff', '#000000');
      expect(reverseRatio).toBeCloseTo(21, 1);
    });

    it('AC-F2-05: calculates 1:1 contrast ratio for identical colors', async () => {
      const { getContrastRatio } = await import('@/lib/color-contrast');

      expect(getContrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 4);
      expect(getContrastRatio('#000000', '#000000')).toBeCloseTo(1, 4);
      expect(getContrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 4);
    });

    it('AC-F2-05: accurately flags low contrast pairs failing WCAG AA (ratio < 4.5:1)', async () => {
      const { getContrastRatio } = await import('@/lib/color-contrast');

      // Yellow on white is notoriously illegible (~1.07:1)
      const yellowOnWhite = getContrastRatio('#ffff00', '#ffffff');
      expect(yellowOnWhite).toBeLessThan(4.5);

      // Light gray on white (#d1d5db on #ffffff) ~1.46:1
      const lightGrayOnWhite = getContrastRatio('#d1d5db', '#ffffff');
      expect(lightGrayOnWhite).toBeLessThan(4.5);

      // Dark blue on black (#1e3a8a on #000000) ~1.7:1
      const darkBlueOnBlack = getContrastRatio('#1e3a8a', '#000000');
      expect(darkBlueOnBlack).toBeLessThan(4.5);
    });
  });

  describe('AC-F2-05: Automatic Luminance Adjustment for WCAG AA Compliance', () => {
    it('AC-F2-05: leaves text color unchanged if it already meets or exceeds 4.5:1 contrast', async () => {
      const { adjustTextForContrast, getContrastRatio } = await import('@/lib/color-contrast');

      const originalText = '#000000';
      const background = '#ffffff';

      expect(getContrastRatio(originalText, background)).toBeGreaterThanOrEqual(4.5);

      const adjusted = adjustTextForContrast(originalText, background);
      expect(adjusted.toLowerCase()).toBe(originalText.toLowerCase());
    });

    it('AC-F2-05: automatically darkens low-contrast text on light backgrounds until ratio >= 4.5:1', async () => {
      const { adjustTextForContrast, getContrastRatio, isValidHex } = await import('@/lib/color-contrast');

      const background = '#ffffff'; // Light background
      const lowContrastTexts = [
        '#ffff00', // Yellow
        '#fef08a', // Light yellow
        '#a7f3d0', // Light green
        '#93c5fd', // Light blue
        '#e5e7eb', // Off white
      ];

      for (const text of lowContrastTexts) {
        expect(getContrastRatio(text, background)).toBeLessThan(4.5);

        const adjusted = adjustTextForContrast(text, background);

        expect(isValidHex(adjusted), `Adjusted color ${adjusted} must be valid hex`).toBe(true);

        const newRatio = getContrastRatio(adjusted, background);
        expect(
          newRatio,
          `Adjusted text ${adjusted} on ${background} must achieve contrast >= 4.5:1 (got ${newRatio})`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('AC-F2-05: automatically lightens low-contrast text on dark backgrounds until ratio >= 4.5:1', async () => {
      const { adjustTextForContrast, getContrastRatio, isValidHex } = await import('@/lib/color-contrast');

      const background = '#0f172a'; // Slate-900 (dark background)
      const lowContrastTexts = [
        '#1e293b', // Slate-800
        '#334155', // Slate-700
        '#1c1917', // Stone-900
        '#000000', // Black
      ];

      for (const text of lowContrastTexts) {
        expect(getContrastRatio(text, background)).toBeLessThan(4.5);

        const adjusted = adjustTextForContrast(text, background);

        expect(isValidHex(adjusted), `Adjusted color ${adjusted} must be valid hex`).toBe(true);

        const newRatio = getContrastRatio(adjusted, background);
        expect(
          newRatio,
          `Adjusted text ${adjusted} on ${background} must achieve contrast >= 4.5:1 (got ${newRatio})`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('AC-F2-05: ensureWcagContrast validates and fixes entire 4-color palette', async () => {
      const { ensureWcagContrast, getContrastRatio, isValidHex } = await import('@/lib/color-contrast');

      const unverifiedPalette = {
        primary: '#3b82f6',
        secondary: '#10b981',
        background: '#ffffff',
        text: '#fde047', // Low contrast yellow text on white
      };

      const compliantPalette = ensureWcagContrast(unverifiedPalette);

      // All 4 colors must be valid hex
      expect(isValidHex(compliantPalette.primary)).toBe(true);
      expect(isValidHex(compliantPalette.secondary)).toBe(true);
      expect(isValidHex(compliantPalette.background)).toBe(true);
      expect(isValidHex(compliantPalette.text)).toBe(true);

      // Text vs Background must pass WCAG AA
      const contrast = getContrastRatio(compliantPalette.text, compliantPalette.background);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('AC-F2-05: falls back to safe default palette if given malformed or invalid hex strings', async () => {
      const { ensureWcagContrast, isValidHex, getContrastRatio } = await import('@/lib/color-contrast');

      const brokenPalette = {
        primary: 'invalid',
        secondary: '#xyz',
        background: '',
        text: 'not-a-color',
      };

      const fallbackPalette = ensureWcagContrast(brokenPalette as any);

      expect(isValidHex(fallbackPalette.primary)).toBe(true);
      expect(isValidHex(fallbackPalette.secondary)).toBe(true);
      expect(isValidHex(fallbackPalette.background)).toBe(true);
      expect(isValidHex(fallbackPalette.text)).toBe(true);

      const contrast = getContrastRatio(fallbackPalette.text, fallbackPalette.background);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });
});
