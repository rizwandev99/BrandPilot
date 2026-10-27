import { NextResponse } from 'next/server';

interface ReceivedItem {
  id: string;
  token: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

// Global in-memory ring buffer for sandbox receiver (accessible across calls)
const globalStore = globalThis as unknown as {
  __brandpilot_sandbox_deliveries?: Map<string, ReceivedItem[]>;
};

function getBufferMap(): Map<string, ReceivedItem[]> {
  if (!globalStore.__brandpilot_sandbox_deliveries) {
    globalStore.__brandpilot_sandbox_deliveries = new Map();
  }
  return globalStore.__brandpilot_sandbox_deliveries;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const token = resolvedParams?.token || 'default';

  let body: unknown = null;
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  } catch {
    body = null;
  }

  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });

  const now = Date.now();
  const item: ReceivedItem = {
    id: `rcv-${now}-${Math.random().toString(36).slice(2, 7)}`,
    token,
    headers: headersObj,
    body,
    timestamp: now,
  };

  const bufferMap = getBufferMap();
  const list = bufferMap.get(token) || [];
  list.unshift(item);
  // Cap at 100 entries per token
  if (list.length > 100) {
    list.pop();
  }
  bufferMap.set(token, list);

  return NextResponse.json(
    {
      ok: true,
      received: true,
      token,
      timestamp: now,
      item,
    },
    { status: 200 }
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const token = resolvedParams?.token || 'default';

  const bufferMap = getBufferMap();
  const list = bufferMap.get(token) || [];

  return NextResponse.json({
    ok: true,
    token,
    deliveries: list,
    total: list.length,
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const token = resolvedParams?.token || 'default';

  const bufferMap = getBufferMap();
  bufferMap.delete(token);

  return NextResponse.json({
    ok: true,
    cleared: true,
    token,
  });
}
