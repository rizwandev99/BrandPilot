import { db } from '@/server/db';
import { workspaces } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getMemoryStore, shouldUseDb } from '@/server/db/scoped-queries';

export { withWorkspace, ScopedRepository } from '@/server/db/scoped-queries';

export const WORKSPACE_COOKIE_NAME = 'brandpilot_workspace_id';

export const WORKSPACE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_V4_REGEX.test(id);
}

export function extractWorkspaceId(cookieHeaderOrValue?: string): string | null {
  if (!cookieHeaderOrValue || typeof cookieHeaderOrValue !== 'string') {
    return null;
  }

  const trimmed = cookieHeaderOrValue.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return null;
  }

  const cookieMatch = trimmed.match(
    new RegExp(`(?:^|;\\s*)${WORKSPACE_COOKIE_NAME}=([^;]+)`)
  );
  if (cookieMatch && cookieMatch[1]) {
    try {
      return decodeURIComponent(cookieMatch[1].trim());
    } catch {
      return cookieMatch[1].trim();
    }
  }

  if (trimmed.includes('=')) {
    return null;
  }

  return trimmed;
}

export interface WorkspaceResolution {
  workspaceId: string;
  isNew: boolean;
}

export async function resolveWorkspace(
  cookieHeaderOrValue?: string
): Promise<WorkspaceResolution> {
  const candidateId = extractWorkspaceId(cookieHeaderOrValue);

  if (candidateId && isValidUuid(candidateId)) {
    try {
      if (shouldUseDb()) {
        const rows = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, candidateId));

        if (rows && rows.length > 0) {
          const ws = rows[0];
          const lastSeen = ws.lastSeenAt instanceof Date ? ws.lastSeenAt : new Date(ws.lastSeenAt);
          const now = Date.now();

          if (now - lastSeen.getTime() > THROTTLE_WINDOW_MS) {
            await db
              .update(workspaces)
              .set({ lastSeenAt: new Date(now) })
              .where(eq(workspaces.id, candidateId));
          }

          // Also keep in-memory store in sync
          const store = getMemoryStore();
          store.workspaces.set(candidateId, {
            id: candidateId,
            createdAt: ws.createdAt instanceof Date ? ws.createdAt : new Date(ws.createdAt),
            lastSeenAt: new Date(now),
          });

          return { workspaceId: candidateId, isNew: false };
        }
      } else {
        const store = getMemoryStore();
        const ws = store.workspaces.get(candidateId);
        if (ws) {
          const now = Date.now();
          if (now - ws.lastSeenAt.getTime() > THROTTLE_WINDOW_MS) {
            ws.lastSeenAt = new Date(now);
          }
          return { workspaceId: candidateId, isNew: false };
        }
      }
    } catch (err) {
      console.warn('Workspace lookup encountered error, creating fresh workspace:', err);
    }
  }

  // Candidate is missing, invalid, or does not exist in DB: create a new workspace
  const newId = randomUUID();
  const now = new Date();

  // Save in memory store
  const store = getMemoryStore();
  store.workspaces.set(newId, {
    id: newId,
    createdAt: now,
    lastSeenAt: now,
  });

  if (shouldUseDb()) {
    try {
      await db
        .insert(workspaces)
        .values({
          id: newId,
          createdAt: now,
          lastSeenAt: now,
        })
        .returning();
    } catch (err) {
      console.warn('Workspace insert encountered error, continuing with in-memory state:', err);
    }
  }

  return { workspaceId: newId, isNew: true };
}
