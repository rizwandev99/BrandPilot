import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { connectors } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import {
  socialProviderSchema,
  updateSettingsRequestSchema,
} from '@/lib/validation/connectors';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const params = await context.params;
    const providerParse = socialProviderSchema.safeParse(params.provider);
    if (!providerParse.success) {
      return NextResponse.json(
        { error: 'INVALID_PROVIDER', message: 'Invalid social provider' },
        { status: 400 }
      );
    }
    const provider = providerParse.data;

    // intentional any: parsed json body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    const validation = updateSettingsRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid simulation failure setting',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { simulationFailure, retryAfterSeconds } = validation.data;

    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    // intentional any: update payload for connectors table
    const updatePayload: any = {
      simulationFailure,
      settings: {
        simulateFailure: simulationFailure,
        retryAfterSeconds,
      },
    };

    const updated = await db
      .update(connectors)
      .set(updatePayload)
      .where(
        and(
          eq(connectors.workspaceId, workspaceId),
          eq(connectors.provider, provider)
        )
      )
      .returning();

    const responseRecord = updated?.[0] ?? {
      provider,
      simulationFailure,
    };

    return NextResponse.json(responseRecord);
  // intentional any: catch clause error handler
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
