import type { CardTemplateOptions } from './minimal-quote';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxChars) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

export function renderFeatureCardTemplate(options: CardTemplateOptions): string {
  const { width, height, headline, subline, colors } = options;

  const cardPadding = Math.floor(width * 0.08);
  const cardX = cardPadding;
  const cardY = cardPadding;
  const cardW = width - cardPadding * 2;
  const cardH = height - cardPadding * 2;

  const contentX = cardX + Math.floor(cardW * 0.08);
  const maxChars = Math.max(22, Math.floor(cardW / 30));
  const headlineLines = wrapText(headline, maxChars);
  const sublineLines = subline ? wrapText(subline, Math.floor(cardW / 22)) : [];

  const fontSize = Math.min(50, Math.floor(width / 24));
  const lineHeight = Math.floor(fontSize * 1.35);

  const badgeY = cardY + Math.floor(cardH * 0.16);
  const headlineStartY = badgeY + 70;

  const headlineTspans = headlineLines
    .map(
      (line, idx) =>
        `<tspan x="${contentX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const sublineFontSize = Math.min(26, Math.floor(width / 44));
  const sublineLineHeight = Math.floor(sublineFontSize * 1.4);
  const sublineStartY = headlineStartY + headlineLines.length * lineHeight + 30;

  const sublineTspans = sublineLines
    .map(
      (line, idx) =>
        `<tspan x="${contentX}" dy="${idx === 0 ? 0 : sublineLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Feature card">
  <!-- Template: feature-card -->
  <defs>
    <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0.08" />
    </linearGradient>
  </defs>

  <!-- Canvas Background -->
  <rect width="${width}" height="${height}" fill="${colors.background}" />

  <!-- Inner Elevated Card Container -->
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="28" fill="url(#card-grad)" stroke="${colors.primary}" stroke-width="2" stroke-opacity="0.3" />

  <!-- Category Pill Badge -->
  <rect x="${contentX}" y="${badgeY}" width="160" height="34" rx="17" fill="${colors.primary}" />
  <text x="${contentX + 80}" y="${badgeY + 22}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#ffffff" letter-spacing="1">FEATURE</text>

  <!-- Main Headline -->
  <text x="${contentX}" y="${headlineStartY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="800" fill="${colors.text}">
    ${headlineTspans}
  </text>

  <!-- Subline Details -->
  ${
    sublineLines.length > 0
      ? `<text x="${contentX}" y="${sublineStartY}" font-family="system-ui, -apple-system, sans-serif" font-size="${sublineFontSize}" font-weight="400" fill="${colors.text}" opacity="0.85">
    ${sublineTspans}
  </text>`
      : ''
  }
</svg>`;
}
