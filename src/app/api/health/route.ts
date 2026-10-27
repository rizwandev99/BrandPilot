import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Probe database connectivity with a lightweight query
    await db.execute(sql`SELECT 1`);
    return NextResponse.json(
      { ok: true, db: true },
      { status: 200 }
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const sanitizedMessage = rawMessage
      .replace(/postgres:\/\/[^:]+:[^@]+@/gi, 'postgres://[REDACTED]@[REDACTED]')
      .replace(/postgresql:\/\/[^:]+:[^@]+@/gi, 'postgresql://[REDACTED]@[REDACTED]');
    console.error('Health check database probe failed:', sanitizedMessage);
    return NextResponse.json(
      { ok: false, db: false, error: 'Database unreachable' },
      { status: 503 }
    );
  }
}
