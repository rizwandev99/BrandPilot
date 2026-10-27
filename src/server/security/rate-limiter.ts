import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/server/db';
import { rateLimitCounters, events } from '@/server/db/schema';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export const RESOURCE_CAPS = {
  brandKits: 5,
  posts: 60,
  automations: 10,
  events: 200,
} as const;

export const MAX_BRAND_KITS = RESOURCE_CAPS.brandKits;
export const MAX_POSTS = RESOURCE_CAPS.posts;
export const MAX_AUTOMATIONS = RESOURCE_CAPS.automations;
export const MAX_EVENTS = RESOURCE_CAPS.events;

// In-memory fallback bucket store for testing or offline mode
const memoryCounters = new Map<string, { count: number; windowStart: number }>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const currentWindowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStartDate = new Date(currentWindowStartMs);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((currentWindowStartMs + windowMs - nowMs) / 1000)
  );

  try {
    // 1. Check current window counter from DB
    const existingRows = await db
      .select()
      .from(rateLimitCounters)
      .where(
        and(
          eq(rateLimitCounters.key, key),
          eq(rateLimitCounters.windowStart, windowStartDate)
        )
      );

    const currentCount =
      existingRows && existingRows.length > 0 ? existingRows[0].count : 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        count: currentCount + 1,
        limit,
        retryAfterSeconds,
      };
    }

    // 2. Increment window counter
    const upsertRes = await db
      .insert(rateLimitCounters)
      .values({
        key,
        windowStart: windowStartDate,
        count: 1,
      })
      .onConflictDoUpdate({
        target: [rateLimitCounters.key, rateLimitCounters.windowStart],
        set: {
          count: sql`${rateLimitCounters.count} + 1`,
        },
      });

    const resRows = upsertRes as unknown as Array<{ count?: number }>;
    const newCount =
      resRows && resRows.length > 0 && typeof resRows[0]?.count === 'number'
        ? resRows[0].count
        : currentCount + 1;

    return {
      allowed: true,
      count: newCount,
      limit,
      retryAfterSeconds,
    };
  } catch (err) {
    // If DB is unavailable or offline, use in-memory bucket store
    const memKey = `${key}:${currentWindowStartMs}`;
    const memEntry = memoryCounters.get(memKey);

    if (memEntry) {
      if (memEntry.count >= limit) {
        return {
          allowed: false,
          count: memEntry.count + 1,
          limit,
          retryAfterSeconds,
        };
      }
      memEntry.count += 1;
      return {
        allowed: true,
        count: memEntry.count,
        limit,
        retryAfterSeconds,
      };
    }

    memoryCounters.set(memKey, { count: 1, windowStart: currentWindowStartMs });
    return {
      allowed: true,
      count: 1,
      limit,
      retryAfterSeconds,
    };
  }
}

export function createRateLimitedResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: 'RATE_LIMITED',
      message: `Rate limit exceeded. Please retry after ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertResourceCap(
  resource: 'brandKits' | 'posts' | 'automations',
  currentCount: number
): void {
  const cap = RESOURCE_CAPS[resource];
  if (currentCount >= cap) {
    throw new ValidationError(
      `VALIDATION_ERROR: Workspace limit reached for ${resource}. Maximum allowed: ${cap}.`
    );
  }
}

export async function pruneWorkspaceEvents(
  workspaceId: string,
  maxEvents: number = MAX_EVENTS
): Promise<number> {
  try {
    const wsEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.workspaceId, workspaceId))
      .orderBy(desc(events.createdAt));

    if (wsEvents.length <= maxEvents) {
      return 0;
    }

    const excess = wsEvents.slice(maxEvents);
    let pruned = 0;
    for (const item of excess) {
      await db.delete(events).where(eq(events.id, item.id));
      pruned++;
    }
    return pruned;
  } catch (err) {
    console.error('Error pruning workspace events:', err);
    return 0;
  }
}
