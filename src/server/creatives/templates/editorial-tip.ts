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

export function renderEditorialTipTemplate(options: CardTemplateOptions): string {
  const { width, height, headline, subline, colors } = options;

  const marginX = Math.floor(width * 0.1);
  const maxChars = Math.max(22, Math.floor((width - marginX * 2) / 28));
  const headlineLines = wrapText(headline, maxChars);
  const sublineLines = subline ? wrapText(subline, Math.floor((width - marginX * 2) / 22)) : [];

  const fontSize = Math.min(48, Math.floor(width / 25));
  const lineHeight = Math.floor(fontSize * 1.35);

  const topBarY = Math.floor(height * 0.18);
  const headlineStartY = topBarY + 80;

  const headlineTspans = headlineLines
    .map(
      (line, idx) =>
        `<tspan x="${marginX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const dividerY = headlineStartY + headlineLines.length * lineHeight + 20;
  const sublineFontSize = Math.min(26, Math.floor(width / 42));
  const sublineLineHeight = Math.floor(sublineFontSize * 1.4);
  const sublineStartY = dividerY + 45;

  const sublineTspans = sublineLines
    .map(
      (line, idx) =>
        `<tspan x="${marginX}" dy="${idx === 0 ? 0 : sublineLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Editorial tip card">
  <!-- Template: editorial-tip -->
  <defs>
    <linearGradient id="tip-accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.secondary}" />
      <stop offset="100%" stop-color="${colors.primary}" />
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="${colors.background}" />

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="${width}" height="14" fill="url(#tip-accent)" />

  <!-- Editorial Section Tag -->
  <text x="${marginX}" y="${topBarY}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="${colors.secondary}" letter-spacing="2">
    PRO TIP • ACTIONABLE INSIGHT
  </text>

  <!-- Headline -->
  <text x="${marginX}" y="${headlineStartY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="${colors.text}">
    ${headlineTspans}
  </text>

  <!-- Clean Editorial Divider Line -->
  <line x1="${marginX}" y1="${dividerY}" x2="${width - marginX}" y2="${dividerY}" stroke="${colors.primary}" stroke-width="2" stroke-opacity="0.25" />

  <!-- Subline Takeaway -->
  ${
    sublineLines.length > 0
      ? `<text x="${marginX}" y="${sublineStartY}" font-family="system-ui, -apple-system, sans-serif" font-size="${sublineFontSize}" font-weight="400" fill="${colors.text}" opacity="0.9">
    ${sublineTspans}
  </text>`
      : ''
  }
</svg>`;
}
