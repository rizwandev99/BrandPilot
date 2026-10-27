import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { llmCache } from '@/server/db/schema';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();
  for (const k of keys) {
    sortedObj[k] = canonicalize((value as Record<string, unknown>)[k]);
  }
  return sortedObj;
}

export function generateLlmCacheKey(prefix: string, input: unknown): string {
  const canonical = canonicalize(input);
  const serialized = JSON.stringify({ prefix, data: canonical });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export async function getCachedLlmResponse<T = unknown>(key: string): Promise<T | null> {
  try {
    const rows = await db
      .select()
      .from(llmCache)
      .where(eq(llmCache.key, key));

    if (!rows || rows.length === 0) {
      return null;
    }

    const entry = rows[0];
    const createdAt = new Date(entry.createdAt).getTime();
    const now = Date.now();

    if (now - createdAt > CACHE_TTL_MS) {
      return null;
    }

    return entry.response as T;
  } catch (err) {
    console.error('Error reading from LLM cache:', err);
    return null;
  }
}

export async function setCachedLlmResponse(
  key: string,
  response: unknown,
  _ttlSeconds?: number
): Promise<void> {
  try {
    await db
      .insert(llmCache)
      .values({
        key,
        response,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: llmCache.key,
        set: {
          response,
          createdAt: new Date(),
        },
      });
  } catch (err) {
    console.error('Error writing to LLM cache:', err);
  }
}
