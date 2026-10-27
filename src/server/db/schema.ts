import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Workspaces
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Brand Kits
export const brandKits = pgTable(
  'brand_kits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url'), // nullable for sample brand
    name: text('name').notNull(),
    summary: text('summary').notNull(),
    tone: text('tone').array().notNull(),
    dos: text('dos').array().notNull(),
    donts: text('donts').array().notNull(),
    audience: text('audience').notNull(),
    colors: jsonb('colors')
      .$type<{
        primary: string;
        secondary: string;
        background: string;
        text: string;
      }>()
      .notNull(),
    keywords: text('keywords').array().notNull(),
    provider: text('provider').notNull().default('gemini'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('brand_kits_workspace_idx').on(table.workspaceId),
  })
);

// 3. Agent Runs
export const agentRuns = pgTable(
  'agent_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandKitId: uuid('brand_kit_id')
      .notNull()
      .references(() => brandKits.id, { onDelete: 'cascade' }),
    goal: text('goal').notNull(),
    channels: text('channels').array().notNull(),
    postCount: integer('post_count').notNull(),
    status: text('status').notNull().default('queued'), // queued | running | succeeded | failed
    currentStep: text('current_step'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('agent_runs_workspace_idx').on(table.workspaceId),
    brandKitIdx: index('agent_runs_brand_kit_idx').on(table.brandKitId),
  })
);

// 4. Agent Run Steps
export const agentRunSteps = pgTable(
  'agent_run_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // idea | creative | campaign
    status: text('status').notNull().default('pending'), // pending | running | succeeded | failed
    input: jsonb('input'),
    output: jsonb('output'),
    provider: text('provider').notNull().default('gemini'), // gemini | fallback | fake
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
  },
  (table) => ({
    runIdx: index('agent_run_steps_run_idx').on(table.runId),
  })
);

// 5. Posts
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    channel: text('channel').notNull(), // linkedin | instagram | x | facebook
    caption: text('caption').notNull(),
    hashtags: text('hashtags').array().notNull().default(sql`'{}'::text[]`),
    creativeSpec: jsonb('creative_spec')
      .$type<{
        headline: string;
        subline?: string;
        templateId: string;
        colors: Record<string, string>;
      }>()
      .notNull(),
    status: text('status').notNull().default('draft'), // draft | in_review | approved | held | rejected | scheduled | publishing | published | failed
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    holdReason: text('hold_reason'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('posts_workspace_idx').on(table.workspaceId),
    runIdx: index('posts_run_idx').on(table.runId),
    statusIdx: index('posts_status_idx').on(table.status),
  })
);

// 6. Connectors
export const connectors = pgTable(
  'connectors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // linkedin | instagram | x | facebook
    mode: text('mode').notNull().default('sandbox'), // sandbox | live
    status: text('status').notNull().default('connected'), // connected | disconnected | needs_reconnect | error
    accountLabel: text('account_label').notNull(),
    tokenEncrypted: text('token_encrypted'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    settings: jsonb('settings').$type<{
      simulateFailure?: 'none' | 'temporary' | 'rate_limit' | 'permanent';
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('connectors_workspace_idx').on(table.workspaceId),
  })
);

// 7. Publish Jobs
export const publishJobs = pgTable(
  'publish_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    connectorId: uuid('connector_id')
      .notNull()
      .references(() => connectors.id, { onDelete: 'cascade' }),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    attempt: integer('attempt').notNull().default(0),
    status: text('status').notNull().default('queued'), // queued | running | succeeded | failed | retrying
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    externalId: text('external_id'),
    externalUrl: text('external_url'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index('publish_jobs_post_idx').on(table.postId),
    connectorIdx: index('publish_jobs_connector_idx').on(table.connectorId),
    statusNextAttemptIdx: index('publish_jobs_status_next_attempt_idx').on(
      table.status,
      table.nextAttemptAt
    ),
  })
);

// 8. Incoming Webhook Endpoints
export const incomingEndpoints = pgTable(
  'incoming_endpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    publicToken: text('public_token').notNull().unique(),
    secretEncrypted: text('secret_encrypted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('incoming_endpoints_workspace_idx').on(table.workspaceId),
  })
);

// 9. Outgoing Webhooks
export const outgoingWebhooks = pgTable(
  'outgoing_webhooks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secretEncrypted: text('secret_encrypted').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('outgoing_webhooks_workspace_idx').on(table.workspaceId),
  })
);

// 10. Events (Activity Log)
export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    source: text('source').notNull(), // incoming | outgoing | system
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    status: text('status').notNull().default('success'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('events_workspace_idx').on(table.workspaceId),
    createdIdx: index('events_created_idx').on(table.createdAt),
  })
);

// 11. Automations
export const automations = pgTable(
  'automations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    trigger: jsonb('trigger').notNull(),
    conditions: jsonb('conditions').notNull().default(sql`'[]'::jsonb`),
    actions: jsonb('actions').notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('automations_workspace_idx').on(table.workspaceId),
  })
);

// 12. Automation Runs
export const automationRuns = pgTable(
  'automation_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    automationId: uuid('automation_id')
      .notNull()
      .references(() => automations.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // succeeded | failed | skipped
    log: jsonb('log').notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    automationIdx: index('automation_runs_automation_idx').on(table.automationId),
    eventIdx: index('automation_runs_event_idx').on(table.eventId),
  })
);

// 13. Rate Limit Counters (F11)
export const rateLimitCounters = pgTable(
  'rate_limit_counters',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(1),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.key, table.windowStart] }),
  })
);

// 14. LLM Usage Daily Budget Tracker (F11)
export const llmUsage = pgTable('llm_usage', {
  day: date('day').primaryKey(), // YYYY-MM-DD
  calls: integer('calls').notNull().default(0),
});

// 15. LLM Response Cache (F11)
export const llmCache = pgTable('llm_cache', {
  key: text('key').primaryKey(),
  response: jsonb('response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export inferred types for convenience
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type BrandKit = typeof brandKits.$inferSelect;
export type NewBrandKit = typeof brandKits.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type AgentRunStep = typeof agentRunSteps.$inferSelect;
export type NewAgentRunStep = typeof agentRunSteps.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Connector = typeof connectors.$inferSelect;
export type NewConnector = typeof connectors.$inferInsert;

export type PublishJob = typeof publishJobs.$inferSelect;
export type NewPublishJob = typeof publishJobs.$inferInsert;

export type IncomingEndpoint = typeof incomingEndpoints.$inferSelect;
export type NewIncomingEndpoint = typeof incomingEndpoints.$inferInsert;

export type OutgoingWebhook = typeof outgoingWebhooks.$inferSelect;
export type NewOutgoingWebhook = typeof outgoingWebhooks.$inferInsert;

export type SystemEvent = typeof events.$inferSelect;
export type NewSystemEvent = typeof events.$inferInsert;

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;

export type AutomationRun = typeof automationRuns.$inferSelect;
export type NewAutomationRun = typeof automationRuns.$inferInsert;

export type RateLimitCounter = typeof rateLimitCounters.$inferSelect;
export type NewRateLimitCounter = typeof rateLimitCounters.$inferInsert;

export type LlmUsage = typeof llmUsage.$inferSelect;
export type NewLlmUsage = typeof llmUsage.$inferInsert;

export type LlmCache = typeof llmCache.$inferSelect;
export type NewLlmCache = typeof llmCache.$inferInsert;
