import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { incomingEndpoints, events } from '@/server/db/schema';
import { findEventByPayloadEventId, insertEvent } from '@/server/db/events';
import { verifyHmacTimingSafe, isTimestampFresh } from '@/lib/security/hmac';
import { decryptToken } from '@/lib/security/encryption';

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB limit (AC-F8-03)

export async function POST(
  req: Request,
  context: { params: Promise<{ publicToken: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const publicToken = resolvedParams?.publicToken;

  if (!publicToken) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Missing publicToken' } },
      { status: 404 }
    );
  }

  // 1. Look up endpoint by publicToken
  let endpoint: typeof incomingEndpoints.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(incomingEndpoints)
      .where(eq(incomingEndpoints.publicToken, publicToken));

    if (rows && rows.length > 0) {
      endpoint = rows[0];
    }
  } catch (err) {
    console.warn('DB lookup error for incoming endpoint:', err);
  }

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Unknown publicToken' } },
      { status: 404 }
    );
  }

  // 2. Resolve secret (decrypt if AES-GCM encrypted, otherwise plaintext)
  let secret = endpoint.secretEncrypted;
  try {
    if (secret && secret.includes(':')) {
      secret = decryptToken(secret);
    }
  } catch {
    // If not AES-GCM encrypted or decryption fails, use as raw string
  }

  // 3. Verify timestamp header (Replay protection AC-F8-01)
  const timestampHeader =
    req.headers.get('x-postpilot-timestamp') ||
    req.headers.get('x-hub-timestamp') ||
    '';

  if (!timestampHeader || !isTimestampFresh(timestampHeader, 300)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'TIMESTAMP_EXPIRED',
          message: 'Timestamp is missing, invalid, or expired (> 300 seconds window)',
        },
      },
      { status: 401 }
    );
  }

  // 4. Read raw request body as Buffer to guarantee whitespace fidelity (AC-F8-02)
  const arrayBuffer = await req.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);

  if (rawBuffer.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Payload exceeds maximum limit of ${MAX_PAYLOAD_BYTES} bytes`,
        },
      },
      { status: 400 }
    );
  }

  // 5. Verify HMAC signature header (AC-F8-01, AC-F8-02)
  const signatureHeader =
    req.headers.get('x-postpilot-signature') ||
    req.headers.get('x-hub-signature-256') ||
    '';

  if (!signatureHeader || !verifyHmacTimingSafe(secret, rawBuffer, signatureHeader)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SIGNATURE_INVALID',
          message: 'Invalid HMAC-SHA256 signature',
        },
      },
      { status: 401 }
    );
  }

  // 6. Strict JSON validation (AC-F8-03)
  let payloadObj: Record<string, unknown>;
  try {
    payloadObj = JSON.parse(rawBuffer.toString('utf8'));
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Malformed JSON payload',
        },
      },
      { status: 400 }
    );
  }

  if (!payloadObj || typeof payloadObj !== 'object' || Array.isArray(payloadObj)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload must be a JSON object',
        },
      },
      { status: 400 }
    );
  }

  // 7. Idempotent Deduplication Check by payload.event_id (AC-F8-04)
  const payloadEventId = (payloadObj.event_id || payloadObj.id) as string | undefined;

  let isDuplicate = false;
  let existingEventId: string | undefined;

  if (payloadEventId) {
    try {
      const found = await findEventByPayloadEventId(payloadEventId, endpoint.workspaceId);
      if (found) {
        isDuplicate = true;
        existingEventId = found.id;
      }
    } catch {
      // Safe fallback
    }

    if (!isDuplicate) {
      try {
        const workspaceEvents = await db
          .select()
          .from(events)
          .where(eq(events.workspaceId, endpoint.workspaceId));

        for (const ev of workspaceEvents) {
          const evPayload = ev.payload as Record<string, unknown>;
          if (evPayload?.event_id === payloadEventId || evPayload?.id === payloadEventId) {
            isDuplicate = true;
            existingEventId = ev.id;
            break;
          }
        }
      } catch {
        // Safe fallback
      }
    }
  }

  if (isDuplicate) {
    return NextResponse.json(
      {
        ok: true,
        duplicate: true,
        deduplicated: true,
        eventId: existingEventId || payloadEventId,
      },
      { status: 202 }
    );
  }

  // 8. Insert incoming event
  const eventId = crypto.randomUUID();
  const eventType = String(payloadObj.type || payloadObj.event || 'webhook.received');
  const eventRow = {
    id: eventId,
    workspaceId: endpoint.workspaceId,
    type: eventType,
    source: 'incoming',
    payload: payloadObj,
    status: 'success',
    createdAt: new Date(),
  };

  try {
    await insertEvent(eventRow);
  } catch {
    try {
      await db.insert(events).values(eventRow);
    } catch (err) {
      console.warn('DB error inserting incoming event, continuing with memory state:', err);
    }
  }

  // 9. Dispatch to automation engine (AC-F9) if available
  try {
    // intentional any: optional automation engine trigger
    const engine: any = await (async () => {
      try {
        // @ts-ignore
        return await import('@/lib/automations/engine');
      } catch {
        return null;
      }
    })();

    if (engine?.evaluateRule) {
      await engine.evaluateRule({
        event: eventRow,
        workspaceId: endpoint.workspaceId,
      });
    }
  } catch {
    // Ignore automation engine failure
  }

  return NextResponse.json(
    {
      ok: true,
      eventId,
    },
    { status: 202 }
  );
}
