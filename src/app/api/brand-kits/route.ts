import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { brandKits, llmCache } from '@/server/db/schema';
import { safeFetch } from '@/server/security/ssrf';
import { extractBrandFacts, type BrandFacts } from '@/server/scraper/facts-extractor';
import { ensureWcagContrast, type BrandColors } from '@/lib/color-contrast';
import {
  CreateBrandKitRequestSchema,
  BrandKitSchema,
} from '@/lib/validation/brand-kit';
import * as workspaceService from '@/server/workspace/workspace-service';
import { ScopedRepository } from '@/server/db/scoped-queries';

const DEFAULT_COOKIE_NAME = 'brandpilot_workspace_id';
const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function getCookieName(): string {
  try {
    return (workspaceService as { WORKSPACE_COOKIE_NAME?: string }).WORKSPACE_COOKIE_NAME || DEFAULT_COOKIE_NAME;
  } catch {
    return DEFAULT_COOKIE_NAME;
  }
}

function getCookieOptions() {
  try {
    return (workspaceService as { WORKSPACE_COOKIE_OPTIONS?: typeof DEFAULT_COOKIE_OPTIONS }).WORKSPACE_COOKIE_OPTIONS || DEFAULT_COOKIE_OPTIONS;
  } catch {
    return DEFAULT_COOKIE_OPTIONS;
  }
}

async function getWorkspaceId(): Promise<string> {
  let cookieVal: string | undefined;
  type CookieStoreType = Awaited<ReturnType<typeof cookies>>;
  let cookieStore: CookieStoreType | undefined;
  try {
    cookieStore = await cookies();
    const cookieName = getCookieName() || 'brandpilot_workspace_id';
    cookieVal = cookieStore.get(cookieName)?.value;
  } catch {
    // Outside of Next request context (e.g. testing)
  }

  const resolution = await workspaceService.resolveWorkspace(cookieVal);

  if (cookieStore) {
    try {
      cookieStore.set(
        getCookieName(),
        resolution.workspaceId,
        getCookieOptions()
      );
    } catch {
      // Non-fatal if context is read-only
    }
  }

  return resolution.workspaceId;
}

const SAMPLE_BRAND_KIT = {
  name: 'BrandPilot',
  summary: 'Autonomous AI marketing agent platform for multi-channel social media management.',
  tone: ['innovative', 'authoritative', 'concise', 'reliable'],
  dos: [
    'Emphasize automation & reliability',
    'Keep tone professional and bold',
    'Highlight multi-channel support',
  ],
  donts: [
    'Never make exaggerated claims',
    'Avoid tech jargon overload',
    'Do not mention unapproved features',
  ],
  audience: 'Founders, marketers, and growth teams managing social channels.',
  colors: {
    primary: '#6366f1',
    secondary: '#06b6d4',
    background: '#ffffff',
    text: '#0f172a',
  },
  keywords: ['ai marketing', 'social media', 'automation', 'content agent', 'brand kit', 'scheduling'],
  provider: 'fallback',
};

function generateFallbackBrandKit(facts: BrandFacts, url: string) {
  const name = facts.brandName || facts.title || 'Brand';
  const summary = (
    facts.description ||
    facts.sampleText.slice(0, 200) ||
    `${name} provides modern products and services designed for quality and excellence.`
  ).slice(0, 280);

  const keywords: string[] = [];
  const words = `${facts.title} ${facts.headings.join(' ')} ${facts.description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'your', 'about'].includes(w));
  keywords.push(...words);

  const defaults = ['marketing', 'automation', 'productivity', 'innovation', 'digital', 'growth'];
  for (const d of defaults) {
    if (keywords.length < 5) keywords.push(d);
  }
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 8);

  const palette = ensureWcagContrast({
    primary: facts.themeColor || '#2563eb',
    secondary: '#10b981',
    background: '#ffffff',
    text: '#111827',
  });

  return {
    name,
    summary,
    tone: ['innovative', 'approachable', 'reliable', 'focused'],
    dos: [
      'Highlight quality and performance',
      'Focus on customer outcomes',
      'Communicate clearly and directly',
    ],
    donts: [
      'Avoid misleading claims',
      'Never sacrifice quality',
      'Do not ignore user feedback',
    ],
    audience: `Modern professionals, decision makers, and teams engaging with ${name}.`,
    colors: palette,
    keywords: uniqueKeywords,
    provider: 'fallback',
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parseResult = CreateBrandKitRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  try {
    const workspaceId = await getWorkspaceId();
    const requestData = parseResult.data;

    // 1. Instant Sample Brand Kit (AC-F2-06)
    if ('sample' in requestData && requestData.sample === true) {
      const repo = new ScopedRepository(workspaceId);
      const inserted = await repo.createBrandKit({
        name: SAMPLE_BRAND_KIT.name,
        summary: SAMPLE_BRAND_KIT.summary,
        tone: SAMPLE_BRAND_KIT.tone,
        dos: SAMPLE_BRAND_KIT.dos,
        donts: SAMPLE_BRAND_KIT.donts,
        audience: SAMPLE_BRAND_KIT.audience,
        colors: ensureWcagContrast(SAMPLE_BRAND_KIT.colors),
        keywords: SAMPLE_BRAND_KIT.keywords,
        provider: SAMPLE_BRAND_KIT.provider,
      });

      const res = NextResponse.json(inserted, { status: 201 });
      res.cookies.set(getCookieName(), workspaceId, getCookieOptions());
      return res;
    }

    if (!('url' in requestData)) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'URL is required' },
        { status: 400 }
      );
    }

    // 2. URL Extraction Path (AC-F2-01, AC-F2-04, AC-F2-07)
    const targetUrl = requestData.url;
    const normalizedUrl = targetUrl.trim().toLowerCase();
    const cacheKey = createHash('sha256').update(`brand-kit:${normalizedUrl}`).digest('hex');

    // Check 24-hour cache (AC-F2-07)
    try {
      const cachedRows = await db
        .select()
        .from(llmCache)
        .where(eq(llmCache.key, cacheKey));

      if (cachedRows && cachedRows.length > 0) {
        const cached = cachedRows[0];
        const ageMs = Date.now() - new Date(cached.createdAt).getTime();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (ageMs < TWENTY_FOUR_HOURS) {
          // intentional any: cached response is stored as jsonb in DB
          const cachedKit = cached.response as any;
          const repo = new ScopedRepository(workspaceId);
          const inserted = await repo.createBrandKit({
            name: cachedKit.name,
            summary: cachedKit.summary,
            tone: cachedKit.tone,
            dos: cachedKit.dos,
            donts: cachedKit.donts,
            audience: cachedKit.audience,
            colors: ensureWcagContrast(cachedKit.colors),
            keywords: cachedKit.keywords,
            sourceUrl: targetUrl,
            provider: cachedKit.provider || 'gemini',
          });

          const res = NextResponse.json(inserted, { status: 201 });
          res.cookies.set(getCookieName(), workspaceId, getCookieOptions());
          return res;
        }
      }
    } catch (err) {
      // Cache check error should not block generation
    }

    // 3. Scrape website with SSRF Guard (AC-F2-02, AC-F2-03, AC-F2-09)
    let html = '';
    try {
      const resp = await safeFetch(targetUrl);
      html = await resp.text();
    // intentional any: safeFetch error structure
    } catch (err: any) {
      return NextResponse.json(
        {
          error: err.code || 'UPSTREAM_ERROR',
          message: 'Unable to reach that website (unable to fetch). Please check the URL or select an enterprise starter template.',
        },
        { status: 422 }
      );
    }

    // 4. Extract facts via Cheerio
    const facts = extractBrandFacts(html, targetUrl);

    // 5. Generate structured Brand Kit (Gemini or Fallback) (AC-F2-04)
    // intentional any: dynamically generated brand kit shape before schema parsing
    let generatedKit: any = null;
    let usedProvider = 'fallback';

    try {
      // intentional any: dynamic import of provider module with fallback
      const geminiMod = (await import('@/server/llm/gemini-provider').catch(() => null)) as any;
      if (geminiMod) {
        // intentional any: raw LLM kit response before schema validation
        let rawKit: any = null;
        if (typeof geminiMod.generateBrandKitWithGemini === 'function') {
          rawKit = await geminiMod.generateBrandKitWithGemini(facts);
        } else if (geminiMod.GeminiProvider) {
          const provider = new geminiMod.GeminiProvider();
          const res = await provider.generateBrandKit({ url: targetUrl, scrapedData: facts });
          rawKit = res.data;
        }

        if (rawKit) {
          // Validate with Zod
          const validateResult = BrandKitSchema.safeParse(rawKit);
          if (validateResult.success) {
            generatedKit = validateResult.data;
            usedProvider = rawKit.provider || 'gemini';
          }
        }
      }
    } catch (err) {
      // LLM failed, quota exhausted, or validation error: fallback to offline generator
    }

    if (!generatedKit) {
      generatedKit = generateFallbackBrandKit(facts, targetUrl);
      usedProvider = 'fallback';
    }

    // Ensure WCAG contrast on palette
    const finalColors = ensureWcagContrast(generatedKit.colors);
    generatedKit.colors = finalColors;
    generatedKit.provider = usedProvider;

    // Save to 24-hour cache (AC-F2-07)
    try {
      await db
        .insert(llmCache)
        .values({
          key: cacheKey,
          response: generatedKit,
          createdAt: new Date(),
        })
        .returning();
    } catch {
      // Non-fatal
    }

    // Save brand kit via ScopedRepository (supports DB and offline in-memory fallback)
    const repo = new ScopedRepository(workspaceId);
    const inserted = await repo.createBrandKit({
      name: generatedKit.name,
      summary: generatedKit.summary,
      tone: generatedKit.tone,
      dos: generatedKit.dos,
      donts: generatedKit.donts,
      audience: generatedKit.audience,
      colors: finalColors,
      keywords: generatedKit.keywords,
      sourceUrl: targetUrl,
      provider: usedProvider,
    });

    const res = NextResponse.json(inserted, { status: 201 });
    res.cookies.set(getCookieName(), workspaceId, getCookieOptions());
    return res;
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error('[API /api/brand-kits] Error processing request:', errorObj);
    if (errorObj?.message?.includes('VALIDATION_ERROR') || errorObj?.message?.includes('Resource cap exceeded')) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: errorObj.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorObj?.message || 'Failed to generate brand kit' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const workspaceId = await getWorkspaceId();
  const repo = new ScopedRepository(workspaceId);
  const kits = await repo.getBrandKits();

  const res = NextResponse.json(kits);
  res.cookies.set(getCookieName(), workspaceId, getCookieOptions());
  return res;
}
