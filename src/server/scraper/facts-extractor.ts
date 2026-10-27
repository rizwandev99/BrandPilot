import * as cheerio from 'cheerio';
import { isValidHex } from '@/lib/color-contrast';

export interface BrandFacts {
  brandName: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  headings: string[];
  sampleText: string;
  themeColor?: string;
  url?: string;
}

/**
 * Extracts facts from raw HTML using Cheerio:
 * title, meta description, OG tags, headings, visible text sample, and theme-color.
 */
export function extractBrandFacts(html: string, sourceUrl?: string): BrandFacts {
  const $ = cheerio.load(html || '');

  // Remove irrelevant/noisy elements before extracting text
  $('script, style, noscript, svg, iframe').remove();

  const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="twitter:description"]').attr('content')?.trim() ||
    '';

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();

  // Headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 2 && text.length < 150 && !headings.includes(text)) {
      headings.push(text);
    }
  });

  // Visible body text sample
  const paragraphTexts: string[] = [];
  $('p, article, section').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 10) {
      paragraphTexts.push(text);
    }
  });
  const rawSampleText = paragraphTexts.join(' ').replace(/\s+/g, ' ').trim();
  const sampleText = rawSampleText.slice(0, 1000);

  // Theme color extraction
  let themeColor =
    $('meta[name="theme-color"]').attr('content')?.trim() ||
    $('meta[name="msapplication-TileColor"]').attr('content')?.trim() ||
    undefined;

  if (themeColor) {
    if (!themeColor.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(themeColor)) {
      themeColor = `#${themeColor}`;
    }
    if (!isValidHex(themeColor)) {
      themeColor = undefined;
    }
  }

  // Brand Name Derivation
  let brandName = '';
  if (ogSiteName && ogSiteName.length <= 50) {
    brandName = ogSiteName;
  } else if (ogTitle && ogTitle.length <= 40 && !ogTitle.includes(':') && !ogTitle.includes('|')) {
    brandName = ogTitle;
  } else {
    // Try from title separators
    if (title) {
      const parts = title.split(/[:|\-–—•]/).map((p) => p.trim());
      if (parts.length > 1) {
        // Usually brand name is either the first or last part
        if (parts[0].length <= 30) {
          brandName = parts[0];
        } else if (parts[parts.length - 1].length <= 30) {
          brandName = parts[parts.length - 1];
        }
      }
    }

    if (!brandName && headings.length > 0 && headings[0].length <= 40) {
      brandName = headings[0];
    }

    if (!brandName && title) {
      brandName = title.slice(0, 50);
    }

    if (!brandName && sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        const host = parsed.hostname.replace(/^www\./, '');
        brandName = host.split('.')[0] || 'Brand';
        brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
      } catch {
        brandName = 'Brand';
      }
    }
  }

  if (!brandName) {
    brandName = 'Brand';
  }

  return {
    brandName,
    title,
    description,
    ogTitle,
    ogDescription,
    headings: headings.slice(0, 10),
    sampleText,
    themeColor,
    url: sourceUrl,
  };
}
