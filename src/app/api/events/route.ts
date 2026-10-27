import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq, desc, and, SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { events } from '@/server/db/schema';
import * as workspaceService from '@/server/workspace/workspace-service';

const SENSITIVE_KEY_PATTERN =
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|bearer|private[_-]?key|credential)/i;

function redactSensitiveFields(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;

  if (Array.isArray(val)) {
    return val.map(redactSensitiveFields);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function getWorkspaceId(): Promise<string | null> {
  let cookieVal: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieVal = cookieStore.get(workspaceService.WORKSPACE_COOKIE_NAME)?.value;
  } catch {
    // In test context or outside Next cookie store
  }

  if (cookieVal) {
    const resolution = await workspaceService.resolveWorkspace(cookieVal);
    return resolution.workspaceId;
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10));
  const sourceFilter = url.searchParams.get('source');
  const typeFilter = url.searchParams.get('type');
  const statusFilter = url.searchParams.get('status');
  const offset = (page - 1) * pageSize;

  const workspaceId = await getWorkspaceId();

  const conditions: SQL[] = [];
  if (workspaceId) {
    conditions.push(eq(events.workspaceId, workspaceId));
  }
  if (sourceFilter && sourceFilter !== 'all') {
    conditions.push(eq(events.source, sourceFilter));
  }
  if (typeFilter && typeFilter !== 'all') {
    conditions.push(eq(events.type, typeFilter));
  }
  if (statusFilter && statusFilter !== 'all') {
    conditions.push(eq(events.status, statusFilter));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let rawRows: Array<typeof events.$inferSelect> = [];
  try {
    // In test mocks, db.select().from().where().orderBy().limit().offset() is mocked
    const query = db
      .select()
      .from(events)
      .where(whereClause as SQL)
      .orderBy(desc(events.createdAt))
      .limit(pageSize)
      .offset(offset);

    rawRows = (await query) as Array<typeof events.$inferSelect>;
  } catch (err) {
    console.warn('DB error fetching activity events, using fallback:', err);
  }

  // Redact sensitive secrets from all event payloads (AC-F8-08)
  const sanitizedEvents = (rawRows || []).map((row) => ({
    ...row,
    payload: redactSensitiveFields(row.payload),
  }));

  return NextResponse.json({
    ok: true,
    events: sanitizedEvents,
    page,
    pageSize,
    total: sanitizedEvents.length,
  });
}
