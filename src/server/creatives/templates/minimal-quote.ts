export interface CardTemplateOptions {
  width: number;
  height: number;
  headline: string;
  subline?: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

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

export function renderMinimalQuoteTemplate(options: CardTemplateOptions): string {
  const { width, height, headline, subline, colors } = options;

  const maxChars = Math.max(20, Math.floor(width / 32));
  const headlineLines = wrapText(headline, maxChars);
  const sublineLines = subline ? wrapText(subline, Math.floor(width / 24)) : [];

  const fontSize = Math.min(54, Math.floor(width / 22));
  const lineHeight = Math.floor(fontSize * 1.35);
  const startY = Math.floor(height * 0.38);

  const headlineTspans = headlineLines
    .map(
      (line, idx) =>
        `<tspan x="${Math.floor(width * 0.12)}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const sublineFontSize = Math.min(28, Math.floor(width / 42));
  const sublineLineHeight = Math.floor(sublineFontSize * 1.4);
  const sublineStartY = startY + headlineLines.length * lineHeight + 40;

  const sublineTspans = sublineLines
    .map(
      (line, idx) =>
        `<tspan x="${Math.floor(width * 0.12)}" dy="${idx === 0 ? 0 : sublineLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Quote card">
  <!-- Template: minimal-quote -->
  <defs>
    <linearGradient id="quote-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0.8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${colors.background}" />

  <!-- Left border accent -->
  <rect x="${Math.floor(width * 0.08)}" y="${Math.floor(height * 0.22)}" width="6" height="${Math.floor(height * 0.56)}" rx="3" fill="url(#quote-accent)" />

  <!-- Large Quotation Glyph -->
  <text x="${Math.floor(width * 0.12)}" y="${Math.floor(height * 0.28)}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.floor(fontSize * 2.2)}" font-weight="900" fill="${colors.primary}" opacity="0.35">“</text>

  <!-- Headline Quote -->
  <text x="${Math.floor(width * 0.12)}" y="${startY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="${colors.text}">
    ${headlineTspans}
  </text>

  <!-- Subline / Author -->
  ${
    sublineLines.length > 0
      ? `<text x="${Math.floor(width * 0.12)}" y="${sublineStartY}" font-family="system-ui, -apple-system, sans-serif" font-size="${sublineFontSize}" font-weight="500" fill="${colors.text}" opacity="0.8">
    ${sublineTspans}
  </text>`
      : ''
  }
</svg>`;
}
