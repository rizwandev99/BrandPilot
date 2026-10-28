import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { brandKits } from '@/server/db/schema';
import { PatchBrandKitRequestSchema } from '@/lib/validation/brand-kit';
import { ensureWcagContrast } from '@/lib/color-contrast';
import * as workspaceService from '@/server/workspace/workspace-service';
import { ScopedRepository } from '@/server/db/scoped-queries';

async function getWorkspaceId(): Promise<string> {
  let cookieVal: string | undefined;
  type CookieStoreType = Awaited<ReturnType<typeof cookies>>;
  let cookieStore: CookieStoreType | undefined;
  try {
    cookieStore = await cookies();
    const cookieName = workspaceService.WORKSPACE_COOKIE_NAME || 'brandpilot_workspace_id';
    cookieVal = cookieStore.get(cookieName)?.value;
  } catch {
    // Outside of Next request context
  }

  const resolution = await workspaceService.resolveWorkspace(cookieVal);

  if (cookieStore) {
    try {
      cookieStore.set(
        workspaceService.WORKSPACE_COOKIE_NAME,
        resolution.workspaceId,
        workspaceService.WORKSPACE_COOKIE_OPTIONS
      );
    } catch {
      // Non-fatal
    }
  }

  return resolution.workspaceId;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: 'MISSING_ID', message: 'Brand kit ID is required' }, { status: 400 });
  }

  const workspaceId = await getWorkspaceId();

  try {
    const rows = await db
      .select()
      .from(brandKits)
      .where(and(eq(brandKits.id, id), eq(brandKits.workspaceId, workspaceId)));

    if (rows && rows.length > 0) {
      return NextResponse.json(rows[0], { status: 200 });
    }
  } catch {
    // DB unreachable, fallback to memory store
  }

  const repo = new ScopedRepository(workspaceId);
  const kit = await repo.getBrandKitById(id);

  if (!kit) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Brand kit not found' }, { status: 404 });
  }

  return NextResponse.json(kit, { status: 200 });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) {
    return NextResponse.json({ error: 'MISSING_ID', message: 'Brand kit ID is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parseResult = PatchBrandKitRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const workspaceId = await getWorkspaceId();
  const updateData: Record<string, any> = {
    ...parseResult.data,
    updatedAt: new Date(),
  };

  if (parseResult.data.colors) {
    updateData.colors = ensureWcagContrast(parseResult.data.colors);
  }

  try {
    const rows = await db
      .update(brandKits)
      .set(updateData)
      .where(and(eq(brandKits.id, id), eq(brandKits.workspaceId, workspaceId)))
      .returning();

    if (rows && rows.length > 0) {
      return NextResponse.json(rows[0], { status: 200 });
    }
  } catch {
    // DB unreachable, fallback to memory store
  }

  const repo = new ScopedRepository(workspaceId);
  const updated = await repo.updateBrandKit(id, updateData);

  if (!updated) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Brand kit not found' }, { status: 404 });
  }

  return NextResponse.json(updated, { status: 200 });
}
