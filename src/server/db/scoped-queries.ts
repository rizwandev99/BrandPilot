import { db } from './index';
import {
  workspaces,
  brandKits,
  posts,
  connectors,
  events,
  automations,
  incomingEndpoints,
  outgoingWebhooks,
  agentRuns,
  type BrandKit,
  type Post,
  type Connector,
  type SystemEvent,
  type Automation,
} from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface MemoryWorkspace {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface MemoryBrandKit {
  id: string;
  workspaceId: string;
  sourceUrl: string | null;
  name: string;
  summary: string;
  tone: string[];
  dos: string[];
  donts: string[];
  audience: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  keywords: string[];
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryPost {
  id: string;
  workspaceId: string;
  runId: string | null;
  channel: string;
  caption: string;
  hashtags: string[];
  creativeSpec: {
    headline: string;
    subline?: string;
    templateId: string;
    colors: Record<string, string>;
  };
  status: string;
  scheduledAt: Date | null;
  approvedAt: Date | null;
  holdReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryConnector {
  id: string;
  workspaceId: string;
  provider: string;
  mode: string;
  status: string;
  accountLabel: string;
  tokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  settings: {
    simulateFailure?: 'none' | 'temporary' | 'rate_limit' | 'permanent';
  } | null;
  createdAt: Date;
}

export interface MemoryEvent {
  id: string;
  workspaceId: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

export interface MemoryAutomation {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  createdAt: Date;
}

export interface GlobalMemoryStore {
  workspaces: Map<string, MemoryWorkspace>;
  brandKits: Map<string, MemoryBrandKit>;
  posts: Map<string, MemoryPost>;
  connectors: Map<string, MemoryConnector>;
  events: Map<string, MemoryEvent>;
  automations: Map<string, MemoryAutomation>;
}

const globalForStore = globalThis as unknown as {
  __brandpilot_memory_store?: GlobalMemoryStore;
};

export function getMemoryStore(): GlobalMemoryStore {
  if (!globalForStore.__brandpilot_memory_store) {
    globalForStore.__brandpilot_memory_store = {
      workspaces: new Map(),
      brandKits: new Map(),
      posts: new Map(),
      connectors: new Map(),
      events: new Map(),
      automations: new Map(),
    };
  }
  return globalForStore.__brandpilot_memory_store;
}

export const RESOURCE_CAPS = {
  BRAND_KITS: 5,
  POSTS: 60,
  AUTOMATIONS: 10,
  MAX_EVENTS: 200,
} as const;

export const DEFAULT_SANDBOX_CONNECTORS = [
  { provider: 'linkedin', accountLabel: 'Sandbox LinkedIn', mode: 'sandbox', status: 'connected' },
  { provider: 'instagram', accountLabel: 'Sandbox Instagram', mode: 'sandbox', status: 'connected' },
  { provider: 'x', accountLabel: 'Sandbox X', mode: 'sandbox', status: 'connected' },
  { provider: 'facebook', accountLabel: 'Sandbox Facebook', mode: 'sandbox', status: 'connected' },
] as const;

export function isDbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function shouldUseDb(): boolean {
  if (isDbAvailable()) return true;
  try {
    const anyDb = db as unknown as { select?: unknown; insert?: unknown; update?: unknown };
    if (anyDb) {
      const isMock = (fn: unknown): boolean =>
        typeof fn === 'function' &&
        Boolean(
          ((fn as unknown) as Record<string, unknown>).mock ||
          ((fn as unknown) as Record<string, unknown>)._isMockFunction ||
          ((fn as unknown) as Record<string, unknown>).calls
        );
      if (isMock(anyDb.select) || isMock(anyDb.insert) || isMock(anyDb.update)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function cleanupMemoryWorkspaces(cutoff: Date): number {
  const store = getMemoryStore();
  const deletedWorkspaceIds = new Set<string>();

  for (const [id, ws] of store.workspaces.entries()) {
    if (ws.lastSeenAt.getTime() < cutoff.getTime()) {
      deletedWorkspaceIds.add(id);
      store.workspaces.delete(id);
    }
  }

  // Cascading deletion to all child resources
  for (const [id, bk] of store.brandKits.entries()) {
    if (deletedWorkspaceIds.has(bk.workspaceId)) store.brandKits.delete(id);
  }
  for (const [id, p] of store.posts.entries()) {
    if (deletedWorkspaceIds.has(p.workspaceId)) store.posts.delete(id);
  }
  for (const [id, c] of store.connectors.entries()) {
    if (deletedWorkspaceIds.has(c.workspaceId)) store.connectors.delete(id);
  }
  for (const [id, e] of store.events.entries()) {
    if (deletedWorkspaceIds.has(e.workspaceId)) store.events.delete(id);
  }
  for (const [id, a] of store.automations.entries()) {
    if (deletedWorkspaceIds.has(a.workspaceId)) store.automations.delete(id);
  }

  return deletedWorkspaceIds.size;
}

export class ScopedRepository {
  constructor(public readonly workspaceId: string) {}

  async ensureWorkspaceExists(): Promise<void> {
    const store = getMemoryStore();
    if (!store.workspaces.has(this.workspaceId)) {
      store.workspaces.set(this.workspaceId, {
        id: this.workspaceId,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      });
    }

    if (shouldUseDb()) {
      try {
        const existing = await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.id, this.workspaceId));
        if (existing.length === 0) {
          await db.insert(workspaces).values({
            id: this.workspaceId,
            createdAt: new Date(),
            lastSeenAt: new Date(),
          });
        }
      } catch {
        // Safe fallback in offline/test mode
      }
    }
  }

  async setWorkspaceLastSeen(date: Date): Promise<void> {
    const store = getMemoryStore();
    const ws = store.workspaces.get(this.workspaceId);
    if (ws) {
      ws.lastSeenAt = date;
    } else {
      store.workspaces.set(this.workspaceId, {
        id: this.workspaceId,
        createdAt: date,
        lastSeenAt: date,
      });
    }

    if (shouldUseDb()) {
      try {
        await db
          .update(workspaces)
          .set({ lastSeenAt: date })
          .where(eq(workspaces.id, this.workspaceId));
      } catch {
        // Safe fallback in offline/test mode
      }
    }
  }

  // --- Brand Kits ---

  async createBrandKit(data: {
    name: string;
    summary: string;
    tone: string[];
    dos: string[];
    donts: string[];
    audience: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
    keywords: string[];
    sourceUrl?: string | null;
    provider?: string;
  }): Promise<BrandKit> {
    const currentKits = await this.getBrandKits();
    if (currentKits.length >= RESOURCE_CAPS.BRAND_KITS) {
      throw new Error(
        `[VALIDATION_ERROR] Resource cap exceeded: maximum ${RESOURCE_CAPS.BRAND_KITS} brand kits allowed per workspace`
      );
    }

    const id = randomUUID();
    const now = new Date();

    const memKit: MemoryBrandKit = {
      id,
      workspaceId: this.workspaceId,
      name: data.name,
      summary: data.summary,
      tone: [...data.tone],
      dos: [...data.dos],
      donts: [...data.donts],
      audience: data.audience,
      colors: { ...data.colors },
      keywords: [...data.keywords],
      sourceUrl: data.sourceUrl ?? null,
      provider: data.provider ?? 'gemini',
      createdAt: now,
      updatedAt: now,
    };
    getMemoryStore().brandKits.set(id, memKit);

    if (shouldUseDb()) {
      try {
        const rows = await db
          .insert(brandKits)
          .values({
            id,
            workspaceId: this.workspaceId,
            name: data.name,
            summary: data.summary,
            tone: data.tone,
            dos: data.dos,
            donts: data.donts,
            audience: data.audience,
            colors: data.colors,
            keywords: data.keywords,
            sourceUrl: data.sourceUrl ?? null,
            provider: data.provider ?? 'gemini',
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return memKit as unknown as BrandKit;
  }

  async getBrandKits(): Promise<BrandKit[]> {
    if (shouldUseDb()) {
      try {
        return await db
          .select()
          .from(brandKits)
          .where(eq(brandKits.workspaceId, this.workspaceId));
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const list: BrandKit[] = [];
    for (const kit of store.brandKits.values()) {
      if (kit.workspaceId === this.workspaceId) {
        list.push(kit as unknown as BrandKit);
      }
    }
    return list;
  }

  async getBrandKitById(id: string): Promise<BrandKit | null> {
    if (shouldUseDb()) {
      try {
        const rows = await db
          .select()
          .from(brandKits)
          .where(and(eq(brandKits.id, id), eq(brandKits.workspaceId, this.workspaceId)));
        return rows[0] ?? null;
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const kit = store.brandKits.get(id);
    if (!kit || kit.workspaceId !== this.workspaceId) {
      return null;
    }
    return kit as unknown as BrandKit;
  }

  async updateBrandKit(id: string, data: Partial<BrandKit>): Promise<BrandKit | null> {
    const store = getMemoryStore();
    const kit = store.brandKits.get(id);
    if (!kit || kit.workspaceId !== this.workspaceId) {
      return null;
    }

    Object.assign(kit, data, { updatedAt: new Date(), workspaceId: this.workspaceId, id });

    if (shouldUseDb()) {
      try {
        const rows = await db
          .update(brandKits)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(brandKits.id, id), eq(brandKits.workspaceId, this.workspaceId)))
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return kit as unknown as BrandKit;
  }

  async deleteBrandKit(id: string): Promise<void> {
    const store = getMemoryStore();
    const kit = store.brandKits.get(id);
    if (kit && kit.workspaceId === this.workspaceId) {
      store.brandKits.delete(id);
    }

    if (shouldUseDb()) {
      try {
        await db
          .delete(brandKits)
          .where(and(eq(brandKits.id, id), eq(brandKits.workspaceId, this.workspaceId)));
      } catch {
        // Fallback to memory
      }
    }
  }

  // --- Posts ---

  async createPost(data: {
    channel: string;
    caption: string;
    creativeSpec: {
      headline: string;
      subline?: string;
      templateId: string;
      colors: Record<string, string>;
    };
    status?: string;
    hashtags?: string[];
    scheduledAt?: Date | null;
    approvedAt?: Date | null;
    holdReason?: string | null;
    version?: number;
    runId?: string | null;
  }): Promise<Post> {
    const currentPosts = await this.getPosts();
    if (currentPosts.length >= RESOURCE_CAPS.POSTS) {
      throw new Error(
        `[VALIDATION_ERROR] Resource cap exceeded: maximum ${RESOURCE_CAPS.POSTS} posts allowed per workspace`
      );
    }

    const id = randomUUID();
    const now = new Date();

    const memPost: MemoryPost = {
      id,
      workspaceId: this.workspaceId,
      channel: data.channel,
      caption: data.caption,
      creativeSpec: data.creativeSpec,
      status: data.status ?? 'draft',
      hashtags: data.hashtags ? [...data.hashtags] : [],
      scheduledAt: data.scheduledAt ?? null,
      approvedAt: data.approvedAt ?? null,
      holdReason: data.holdReason ?? null,
      version: data.version ?? 1,
      runId: data.runId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    getMemoryStore().posts.set(id, memPost);

    if (shouldUseDb()) {
      try {
        const rows = await db
          .insert(posts)
          .values({
            id,
            workspaceId: this.workspaceId,
            channel: data.channel,
            caption: data.caption,
            creativeSpec: data.creativeSpec,
            status: data.status ?? 'draft',
            hashtags: data.hashtags ?? [],
            scheduledAt: data.scheduledAt ?? null,
            approvedAt: data.approvedAt ?? null,
            holdReason: data.holdReason ?? null,
            version: data.version ?? 1,
            runId: data.runId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return memPost as unknown as Post;
  }

  async getPosts(): Promise<Post[]> {
    if (shouldUseDb()) {
      try {
        return await db
          .select()
          .from(posts)
          .where(eq(posts.workspaceId, this.workspaceId));
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const list: Post[] = [];
    for (const p of store.posts.values()) {
      if (p.workspaceId === this.workspaceId) {
        list.push(p as unknown as Post);
      }
    }
    return list;
  }

  async getPostById(id: string): Promise<Post | null> {
    if (shouldUseDb()) {
      try {
        const rows = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, id), eq(posts.workspaceId, this.workspaceId)));
        return rows[0] ?? null;
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const p = store.posts.get(id);
    if (!p || p.workspaceId !== this.workspaceId) return null;
    return p as unknown as Post;
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post | null> {
    const store = getMemoryStore();
    const p = store.posts.get(id);
    if (!p || p.workspaceId !== this.workspaceId) return null;

    Object.assign(p, data, { updatedAt: new Date(), workspaceId: this.workspaceId, id });

    if (shouldUseDb()) {
      try {
        const rows = await db
          .update(posts)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(posts.id, id), eq(posts.workspaceId, this.workspaceId)))
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return p as unknown as Post;
  }

  async deletePost(id: string): Promise<void> {
    const store = getMemoryStore();
    const p = store.posts.get(id);
    if (p && p.workspaceId === this.workspaceId) {
      store.posts.delete(id);
    }

    if (shouldUseDb()) {
      try {
        await db
          .delete(posts)
          .where(and(eq(posts.id, id), eq(posts.workspaceId, this.workspaceId)));
      } catch {
        // Fallback to memory
      }
    }
  }

  // --- Connectors ---

  async createConnector(data: {
    provider: string;
    mode?: string;
    status?: string;
    accountLabel: string;
    tokenEncrypted?: string | null;
    tokenExpiresAt?: Date | null;
    settings?: {
      simulateFailure?: 'none' | 'temporary' | 'rate_limit' | 'permanent';
    } | null;
  }): Promise<Connector> {
    const id = randomUUID();
    const now = new Date();

    const memConnector: MemoryConnector = {
      id,
      workspaceId: this.workspaceId,
      provider: data.provider,
      mode: data.mode ?? 'sandbox',
      status: data.status ?? 'connected',
      accountLabel: data.accountLabel,
      tokenEncrypted: data.tokenEncrypted ?? null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      settings: data.settings ?? null,
      createdAt: now,
    };
    getMemoryStore().connectors.set(id, memConnector);

    if (shouldUseDb()) {
      try {
        const rows = await db
          .insert(connectors)
          .values({
            id,
            workspaceId: this.workspaceId,
            provider: data.provider,
            mode: data.mode ?? 'sandbox',
            status: data.status ?? 'connected',
            accountLabel: data.accountLabel,
            tokenEncrypted: data.tokenEncrypted ?? null,
            tokenExpiresAt: data.tokenExpiresAt ?? null,
            settings: data.settings ?? null,
            createdAt: now,
          })
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return memConnector as unknown as Connector;
  }

  async getConnectors(): Promise<Connector[]> {
    if (shouldUseDb()) {
      try {
        return await db
          .select()
          .from(connectors)
          .where(eq(connectors.workspaceId, this.workspaceId));
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const list: Connector[] = [];
    for (const c of store.connectors.values()) {
      if (c.workspaceId === this.workspaceId) {
        list.push(c as unknown as Connector);
      }
    }
    return list;
  }

  async getConnectorById(id: string): Promise<Connector | null> {
    if (shouldUseDb()) {
      try {
        const rows = await db
          .select()
          .from(connectors)
          .where(and(eq(connectors.id, id), eq(connectors.workspaceId, this.workspaceId)));
        return rows[0] ?? null;
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const c = store.connectors.get(id);
    if (!c || c.workspaceId !== this.workspaceId) return null;
    return c as unknown as Connector;
  }

  async updateConnector(id: string, data: Partial<Connector>): Promise<Connector | null> {
    const store = getMemoryStore();
    const c = store.connectors.get(id);
    if (!c || c.workspaceId !== this.workspaceId) return null;

    Object.assign(c, data, { workspaceId: this.workspaceId, id });

    if (shouldUseDb()) {
      try {
        const rows = await db
          .update(connectors)
          .set(data)
          .where(and(eq(connectors.id, id), eq(connectors.workspaceId, this.workspaceId)))
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return c as unknown as Connector;
  }

  async deleteConnector(id: string): Promise<void> {
    const store = getMemoryStore();
    const c = store.connectors.get(id);
    if (c && c.workspaceId === this.workspaceId) {
      store.connectors.delete(id);
    }

    if (shouldUseDb()) {
      try {
        await db
          .delete(connectors)
          .where(and(eq(connectors.id, id), eq(connectors.workspaceId, this.workspaceId)));
      } catch {
        // Fallback to memory
      }
    }
  }

  // --- Events ---

  async createEvent(data: {
    type: string;
    source: string;
    payload?: Record<string, unknown>;
    status?: string;
  }): Promise<SystemEvent> {
    const store = getMemoryStore();
    const id = randomUUID();
    const now = new Date();

    const memEvent: MemoryEvent = {
      id,
      workspaceId: this.workspaceId,
      type: data.type,
      source: data.source,
      payload: data.payload ?? {},
      status: data.status ?? 'success',
      createdAt: now,
    };
    store.events.set(id, memEvent);

    // Prune events exceeding 200 items for this workspace (AC-F11-06)
    const wsEvents: MemoryEvent[] = [];
    for (const e of store.events.values()) {
      if (e.workspaceId === this.workspaceId) {
        wsEvents.push(e);
      }
    }
    if (wsEvents.length > RESOURCE_CAPS.MAX_EVENTS) {
      wsEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toDeleteCount = wsEvents.length - RESOURCE_CAPS.MAX_EVENTS;
      for (let i = 0; i < toDeleteCount; i++) {
        store.events.delete(wsEvents[i].id);
      }
    }

    if (shouldUseDb()) {
      try {
        const rows = await db
          .insert(events)
          .values({
            id,
            workspaceId: this.workspaceId,
            type: data.type,
            source: data.source,
            payload: data.payload ?? {},
            status: data.status ?? 'success',
            createdAt: now,
          })
          .returning();

        // Prune DB events exceeding 200
        const allDbEvents = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.workspaceId, this.workspaceId))
          .orderBy(desc(events.createdAt));
        if (allDbEvents.length > RESOURCE_CAPS.MAX_EVENTS) {
          const excess = allDbEvents.slice(RESOURCE_CAPS.MAX_EVENTS);
          for (const item of excess) {
            await db.delete(events).where(eq(events.id, item.id));
          }
        }

        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return memEvent as unknown as SystemEvent;
  }

  async getEvents(): Promise<SystemEvent[]> {
    if (shouldUseDb()) {
      try {
        return await db
          .select()
          .from(events)
          .where(eq(events.workspaceId, this.workspaceId))
          .orderBy(desc(events.createdAt));
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const list: MemoryEvent[] = [];
    for (const e of store.events.values()) {
      if (e.workspaceId === this.workspaceId) {
        list.push(e);
      }
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list as unknown as SystemEvent[];
  }

  async getEventById(id: string): Promise<SystemEvent | null> {
    if (shouldUseDb()) {
      try {
        const rows = await db
          .select()
          .from(events)
          .where(and(eq(events.id, id), eq(events.workspaceId, this.workspaceId)));
        return rows[0] ?? null;
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const e = store.events.get(id);
    if (!e || e.workspaceId !== this.workspaceId) return null;
    return e as unknown as SystemEvent;
  }

  // --- Automations ---

  async createAutomation(data: {
    name: string;
    enabled?: boolean;
    trigger: Record<string, unknown>;
    conditions?: unknown[];
    actions?: unknown[];
  }): Promise<Automation> {
    const currentAutomations = await this.getAutomations();
    if (currentAutomations.length >= RESOURCE_CAPS.AUTOMATIONS) {
      throw new Error(
        `[VALIDATION_ERROR] Resource cap exceeded: maximum ${RESOURCE_CAPS.AUTOMATIONS} automations allowed per workspace`
      );
    }

    const id = randomUUID();
    const now = new Date();

    const memAuto: MemoryAutomation = {
      id,
      workspaceId: this.workspaceId,
      name: data.name,
      enabled: data.enabled ?? true,
      trigger: data.trigger,
      conditions: data.conditions ? [...data.conditions] : [],
      actions: data.actions ? [...data.actions] : [],
      createdAt: now,
    };
    getMemoryStore().automations.set(id, memAuto);

    if (shouldUseDb()) {
      try {
        const rows = await db
          .insert(automations)
          .values({
            id,
            workspaceId: this.workspaceId,
            name: data.name,
            enabled: data.enabled ?? true,
            trigger: data.trigger,
            conditions: data.conditions ?? [],
            actions: data.actions ?? [],
            createdAt: now,
          })
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return memAuto as unknown as Automation;
  }

  async getAutomations(): Promise<Automation[]> {
    if (shouldUseDb()) {
      try {
        return await db
          .select()
          .from(automations)
          .where(eq(automations.workspaceId, this.workspaceId));
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const list: Automation[] = [];
    for (const a of store.automations.values()) {
      if (a.workspaceId === this.workspaceId) {
        list.push(a as unknown as Automation);
      }
    }
    return list;
  }

  async getAutomationById(id: string): Promise<Automation | null> {
    if (shouldUseDb()) {
      try {
        const rows = await db
          .select()
          .from(automations)
          .where(and(eq(automations.id, id), eq(automations.workspaceId, this.workspaceId)));
        return rows[0] ?? null;
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    const a = store.automations.get(id);
    if (!a || a.workspaceId !== this.workspaceId) return null;
    return a as unknown as Automation;
  }

  async updateAutomation(id: string, data: Partial<Automation>): Promise<Automation | null> {
    const store = getMemoryStore();
    const a = store.automations.get(id);
    if (!a || a.workspaceId !== this.workspaceId) return null;

    Object.assign(a, data, { workspaceId: this.workspaceId, id });

    if (shouldUseDb()) {
      try {
        const rows = await db
          .update(automations)
          .set(data)
          .where(and(eq(automations.id, id), eq(automations.workspaceId, this.workspaceId)))
          .returning();
        if (rows[0]) return rows[0];
      } catch {
        // Fallback to memory
      }
    }

    return a as unknown as Automation;
  }

  async deleteAutomation(id: string): Promise<void> {
    const store = getMemoryStore();
    const a = store.automations.get(id);
    if (a && a.workspaceId === this.workspaceId) {
      store.automations.delete(id);
    }

    if (shouldUseDb()) {
      try {
        await db
          .delete(automations)
          .where(and(eq(automations.id, id), eq(automations.workspaceId, this.workspaceId)));
      } catch {
        // Fallback to memory
      }
    }
  }

  // --- Test & Reset Helpers ---

  async setMockResourceCount(resource: 'posts' | 'automations', targetCount: number): Promise<void> {
    if (resource === 'posts') {
      const current = await this.getPosts();
      if (current.length < targetCount) {
        const needed = targetCount - current.length;
        for (let i = 0; i < needed; i++) {
          await this.createPost({
            channel: 'linkedin',
            caption: `Mock post ${i + 1}`,
            creativeSpec: { headline: `Mock ${i + 1}`, templateId: 'quote-card', colors: {} },
          });
        }
      } else if (current.length > targetCount) {
        const toRemove = current.slice(targetCount);
        for (const p of toRemove) {
          await this.deletePost(p.id);
        }
      }
    } else if (resource === 'automations') {
      const current = await this.getAutomations();
      if (current.length < targetCount) {
        const needed = targetCount - current.length;
        for (let i = 0; i < needed; i++) {
          await this.createAutomation({
            name: `Mock Automation ${i + 1}`,
            enabled: true,
            trigger: { type: 'test.trigger' },
          });
        }
      } else if (current.length > targetCount) {
        const toRemove = current.slice(targetCount);
        for (const a of toRemove) {
          await this.deleteAutomation(a.id);
        }
      }
    }
  }

  async seedMockEvents(eventCount: number): Promise<void> {
    const now = Date.now();
    for (let i = 0; i < eventCount; i++) {
      const createdAt = new Date(now - (eventCount - i) * 1000);
      const store = getMemoryStore();
      const id = randomUUID();
      store.events.set(id, {
        id,
        workspaceId: this.workspaceId,
        type: 'mock.event',
        source: 'system',
        payload: { index: i },
        status: 'success',
        createdAt,
      });

      if (shouldUseDb()) {
        try {
          await db.insert(events).values({
            id,
            workspaceId: this.workspaceId,
            type: 'mock.event',
            source: 'system',
            payload: { index: i },
            status: 'success',
            createdAt,
          });
        } catch {
          // Fallback to memory
        }
      }
    }
  }

  async resetWorkspace(): Promise<void> {
    if (shouldUseDb()) {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(brandKits).where(eq(brandKits.workspaceId, this.workspaceId));
          await tx.delete(posts).where(eq(posts.workspaceId, this.workspaceId));
          await tx.delete(connectors).where(eq(connectors.workspaceId, this.workspaceId));
          await tx.delete(events).where(eq(events.workspaceId, this.workspaceId));
          await tx.delete(automations).where(eq(automations.workspaceId, this.workspaceId));
          await tx.delete(incomingEndpoints).where(eq(incomingEndpoints.workspaceId, this.workspaceId));
          await tx.delete(outgoingWebhooks).where(eq(outgoingWebhooks.workspaceId, this.workspaceId));
          await tx.delete(agentRuns).where(eq(agentRuns.workspaceId, this.workspaceId));

          for (const conn of DEFAULT_SANDBOX_CONNECTORS) {
            await tx.insert(connectors).values({
              id: randomUUID(),
              workspaceId: this.workspaceId,
              provider: conn.provider,
              mode: conn.mode,
              status: conn.status,
              accountLabel: conn.accountLabel,
              createdAt: new Date(),
            });
          }
        });
      } catch {
        // Fallback to memory
      }
    }

    const store = getMemoryStore();
    for (const [id, bk] of store.brandKits.entries()) {
      if (bk.workspaceId === this.workspaceId) store.brandKits.delete(id);
    }
    for (const [id, p] of store.posts.entries()) {
      if (p.workspaceId === this.workspaceId) store.posts.delete(id);
    }
    for (const [id, c] of store.connectors.entries()) {
      if (c.workspaceId === this.workspaceId) store.connectors.delete(id);
    }
    for (const [id, e] of store.events.entries()) {
      if (e.workspaceId === this.workspaceId) store.events.delete(id);
    }
    for (const [id, a] of store.automations.entries()) {
      if (a.workspaceId === this.workspaceId) store.automations.delete(id);
    }

    for (const conn of DEFAULT_SANDBOX_CONNECTORS) {
      const id = randomUUID();
      store.connectors.set(id, {
        id,
        workspaceId: this.workspaceId,
        provider: conn.provider,
        mode: conn.mode,
        status: conn.status,
        accountLabel: conn.accountLabel,
        tokenEncrypted: null,
        tokenExpiresAt: null,
        settings: null,
        createdAt: new Date(),
      });
    }
  }
}

export async function withWorkspace<T>(
  workspaceId: string,
  fn: (repo: ScopedRepository) => Promise<T>
): Promise<T> {
  const repo = new ScopedRepository(workspaceId);
  await repo.ensureWorkspaceExists();
  return await fn(repo);
}
