export interface BrandColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export const DEFAULT_PALETTE: BrandColors = {
  primary: '#2563eb',
  secondary: '#10b981',
  background: '#ffffff',
  text: '#111827',
};

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Validates if a string is a valid 3-digit or 6-digit hex color with a leading #.
 */
export function isValidHex(hex: string): boolean {
  if (typeof hex !== 'string') return false;
  return HEX_REGEX.test(hex.trim());
}

/**
 * Normalizes a 3-digit or 6-digit hex color to standard 6-digit format #rrggbb.
 */
export function normalizeHex(hex: string, preserveCase = false): string {
  if (!isValidHex(hex)) return '#000000';
  const clean = hex.trim();
  if (clean.length === 4) {
    const r = clean[1];
    const g = clean[2];
    const b = clean[3];
    const expanded = `#${r}${r}${g}${g}${b}${b}`;
    return preserveCase ? expanded : expanded.toLowerCase();
  }
  return preserveCase ? clean : clean.toLowerCase();
}

/**
 * Parses a hex color string into [r, g, b] in range 0..255.
 */
function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  return [r, g, b];
}

/**
 * Converts [r, g, b] into a 6-digit hex string #rrggbb.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG 2.1 relative luminance for a hex color (0 for black, 1 for white).
 */
export function getLuminance(hex: string): number {
  if (!isValidHex(hex)) return 0;
  const [r255, g255, b255] = hexToRgb(hex);

  const linearize = (c255: number): number => {
    const c = c255 / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLin = linearize(r255);
  const gLin = linearize(g255);
  const bLin = linearize(b255);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors: (L1 + 0.05) / (L2 + 0.05)
 */
export function getContrastRatio(colorA: string, colorB: string): number {
  const lumA = getLuminance(colorA);
  const lumB = getLuminance(colorB);

  const l1 = Math.max(lumA, lumB);
  const l2 = Math.min(lumA, lumB);

  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Adjusts text color luminance towards black or white until contrast against
 * background reaches at least targetRatio (default 4.5:1 for WCAG AA).
 */
export function adjustTextForContrast(
  textHex: string,
  bgHex: string,
  targetRatio = 4.5
): string {
  if (!isValidHex(textHex)) return '#000000';
  if (!isValidHex(bgHex)) return textHex;

  const currentRatio = getContrastRatio(textHex, bgHex);
  if (currentRatio >= targetRatio) {
    return textHex;
  }

  const [origR, origG, origB] = hexToRgb(textHex);
  const bgLuminance = getLuminance(bgHex);

  // If background is light (>= 0.5 luminance), prioritize darkening towards black
  if (bgLuminance >= 0.5) {
    // 1. Try darkening towards black
    for (let i = 1; i <= 100; i++) {
      const t = i / 100;
      const candidate = rgbToHex(origR * (1 - t), origG * (1 - t), origB * (1 - t));
      if (getContrastRatio(candidate, bgHex) >= targetRatio) {
        return candidate;
      }
    }

    // 2. Fallback: try lightening towards white
    for (let i = 1; i <= 100; i++) {
      const t = i / 100;
      const candidate = rgbToHex(
        origR + (255 - origR) * t,
        origG + (255 - origG) * t,
        origB + (255 - origB) * t
      );
      if (getContrastRatio(candidate, bgHex) >= targetRatio) {
        return candidate;
      }
    }

    return '#000000';
  } else {
    // Background is dark (< 0.5 luminance), prioritize lightening towards white
    // 1. Try lightening towards white
    for (let i = 1; i <= 100; i++) {
      const t = i / 100;
      const candidate = rgbToHex(
        origR + (255 - origR) * t,
        origG + (255 - origG) * t,
        origB + (255 - origB) * t
      );
      if (getContrastRatio(candidate, bgHex) >= targetRatio) {
        return candidate;
      }
    }

    // 2. Fallback: try darkening towards black
    for (let i = 1; i <= 100; i++) {
      const t = i / 100;
      const candidate = rgbToHex(origR * (1 - t), origG * (1 - t), origB * (1 - t));
      if (getContrastRatio(candidate, bgHex) >= targetRatio) {
        return candidate;
      }
    }

    return '#ffffff';
  }
}

/**
 * Validates an entire 4-color palette, falling back to safe defaults for invalid hexes
 * and adjusting text/background contrast to meet WCAG AA (>= 4.5:1).
 */
export function ensureWcagContrast(palette: Partial<BrandColors> | null | undefined): BrandColors {
  const safePrimary =
    palette?.primary && isValidHex(palette.primary)
      ? normalizeHex(palette.primary, true)
      : DEFAULT_PALETTE.primary;

  const safeSecondary =
    palette?.secondary && isValidHex(palette.secondary)
      ? normalizeHex(palette.secondary, true)
      : DEFAULT_PALETTE.secondary;

  const safeBackground =
    palette?.background && isValidHex(palette.background)
      ? normalizeHex(palette.background, true)
      : DEFAULT_PALETTE.background;

  const initialText =
    palette?.text && isValidHex(palette.text)
      ? normalizeHex(palette.text, true)
      : DEFAULT_PALETTE.text;

  const adjustedText = adjustTextForContrast(initialText, safeBackground, 4.5);

  return {
    primary: safePrimary,
    secondary: safeSecondary,
    background: safeBackground,
    text: adjustedText,
  };
}

export interface WcagContrastResult {
  color: string;
  ratio: number;
  adjusted: boolean;
}

/**
 * Checks and ensures contrast between a text color and background meets WCAG AA (>= 4.5:1).
 */
export function ensureWcagAaContrast(
  textColor: string,
  bgColor: string,
  targetRatio = 4.5
): WcagContrastResult {
  const normText = isValidHex(textColor) ? normalizeHex(textColor, true) : DEFAULT_PALETTE.text;
  const normBg = isValidHex(bgColor) ? normalizeHex(bgColor, true) : DEFAULT_PALETTE.background;

  const initialRatio = getContrastRatio(normText, normBg);
  if (initialRatio >= targetRatio) {
    return {
      color: normText,
      ratio: initialRatio,
      adjusted: false,
    };
  }

  const adjustedColor = adjustTextForContrast(normText, normBg, targetRatio);
  const finalRatio = getContrastRatio(adjustedColor, normBg);

  return {
    color: adjustedColor,
    ratio: finalRatio,
    adjusted: true,
  };
}
