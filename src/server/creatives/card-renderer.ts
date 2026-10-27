import { Resvg } from '@resvg/resvg-js';
import type { Channel } from '@/lib/channels';
import { CHANNEL_CONFIG } from '@/lib/channels';
import { renderMinimalQuoteTemplate } from './templates/minimal-quote';
import { renderFeatureCardTemplate } from './templates/feature-card';
import { renderEditorialTipTemplate } from './templates/editorial-tip';

export interface CreativeCardColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  [key: string]: string;
}

export interface CreativeSpec {
  headline: string;
  subline?: string;
  templateId: string;
  colors: Record<string, string>;
}

export interface RenderCardSvgInput {
  channel: Channel | string;
  dimensions?: {
    width: number;
    height: number;
  };
  spec: CreativeSpec;
}

export function getChannelDimensions(channel: string): { width: number; height: number } {
  const ch = channel.toLowerCase() as Channel;
  if (CHANNEL_CONFIG[ch]) {
    return CHANNEL_CONFIG[ch].dimensions;
  }
  // Default dimensions
  return { width: 1200, height: 630 };
}

/**
 * Normalizes colors to valid hex strings, ensuring defaults if missing.
 */
function normalizeColors(rawColors?: Record<string, string>): CreativeCardColors {
  return {
    primary: rawColors?.primary || '#2563eb',
    secondary: rawColors?.secondary || '#4f46e5',
    background: rawColors?.background || '#ffffff',
    text: rawColors?.text || '#0f172a',
    ...(rawColors || {}),
  };
}

/**
 * Renders SVG string for a branded image card based on the creative spec.
 */
export function renderCardSvg(input: RenderCardSvgInput): string {
  const { channel, spec } = input;
  const dimensions = input.dimensions || getChannelDimensions(channel);
  const colors = normalizeColors(spec.colors);

  const templateOptions = {
    width: dimensions.width,
    height: dimensions.height,
    headline: spec.headline || 'BrandPilot Creative',
    subline: spec.subline,
    colors,
  };

  switch (spec.templateId) {
    case 'feature-card':
      return renderFeatureCardTemplate(templateOptions);
    case 'editorial-tip':
      return renderEditorialTipTemplate(templateOptions);
    case 'minimal-quote':
    default:
      return renderMinimalQuoteTemplate(templateOptions);
  }
}

/**
 * Renders a PNG Buffer using @resvg/resvg-js from the card spec.
 */
export function renderCardPng(input: RenderCardSvgInput): Buffer {
  const svg = renderCardSvg(input);
  const dimensions = input.dimensions || getChannelDimensions(input.channel);

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: dimensions.width,
    },
    font: {
      loadSystemFonts: false,
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
