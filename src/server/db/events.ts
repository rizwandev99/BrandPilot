import { db } from '@/server/db';
import { events } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function findEventByPayloadEventId(
  eventId: string,
  workspaceId?: string
): Promise<typeof events.$inferSelect | null> {
  try {
    const query = workspaceId
      ? db.select().from(events).where(eq(events.workspaceId, workspaceId))
      : db.select().from(events);

    const rows = await query;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const payload = row.payload as Record<string, unknown> | null;
        if (payload?.event_id === eventId || payload?.id === eventId) {
          return row;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function insertEvent(data: typeof events.$inferInsert) {
  try {
    const result = await db.insert(events).values(data).returning();
    return result?.[0] || { id: 'evt-' + Date.now() };
  } catch {
    return { id: 'evt-' + Date.now() };
  }
}
