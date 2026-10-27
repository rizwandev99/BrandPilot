import { NextResponse } from 'next/server';
import { executeNextStep } from '@/server/agents/run-orchestrator';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    let body: { retry?: boolean } = {};

    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Body is empty or optional
    }

    const result = await executeNextStep(id, {
      retry: Boolean(body?.retry),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const step = (err as { step?: string })?.step;

    return NextResponse.json(
      {
        error: {
          code: 'STEP_EXECUTION_FAILED',
          message,
          step,
        },
      },
      { status: 500 }
    );
  }
}
