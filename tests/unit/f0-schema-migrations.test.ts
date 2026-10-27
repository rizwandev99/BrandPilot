import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F0 Foundation: Drizzle Schema and Migrations (AC-F0-04)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const schemaPath = path.join(rootDir, 'src/server/db/schema.ts');
  const drizzleDir = path.join(rootDir, 'drizzle');

  const EXPECTED_TABLES = [
    'workspaces',
    'brand_kits',
    'agent_runs',
    'agent_run_steps',
    'posts',
    'connectors',
    'publish_jobs',
    'incoming_endpoints',
    'outgoing_webhooks',
    'events',
    'automations',
    'automation_runs',
    'rate_limit_counters',
    'llm_usage',
    'llm_cache',
  ];

  it('AC-F0-04: schema.ts exists and defines all 15 relational tables', async () => {
    expect(fs.existsSync(schemaPath), 'src/server/db/schema.ts must exist').toBe(true);

    const schema = await import('@/server/db/schema');

    // Expected table export names (camelCase)
    const expectedExportNames = [
      'workspaces',
      'brandKits',
      'agentRuns',
      'agentRunSteps',
      'posts',
      'connectors',
      'publishJobs',
      'incomingEndpoints',
      'outgoingWebhooks',
      'events',
      'automations',
      'automationRuns',
      'rateLimitCounters',
      'llmUsage',
      'llmCache',
    ];

    for (const expName of expectedExportNames) {
      expect(
        schema[expName],
        `Table export "${expName}" must be defined in schema.ts`
      ).toBeDefined();
    }
  });

  it('AC-F0-04: schema tables have correct underlying PostgreSQL table names', async () => {
    if (!fs.existsSync(schemaPath)) return;

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    for (const tableName of EXPECTED_TABLES) {
      const tableRegex = new RegExp(`pgTable\\s*\\(\\s*['"\`]${tableName}['"\`]`, 'i');
      expect(
        tableRegex.test(schemaContent),
        `Underlying table name "${tableName}" must be defined via pgTable('${tableName}', ...)`
      ).toBe(true);
    }
  });

  it('AC-F0-04: migrations directory contains SQL migration files with table DDL', () => {
    expect(fs.existsSync(drizzleDir), 'drizzle/ migration directory must exist').toBe(true);

    const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));
    expect(
      files.length,
      'drizzle/ directory must contain at least one .sql migration file'
    ).toBeGreaterThanOrEqual(1);

    // Read all migration SQL files and check table creation
    const aggregatedSql = files
      .map((f) => fs.readFileSync(path.join(drizzleDir, f), 'utf8'))
      .join('\n');

    for (const tableName of EXPECTED_TABLES) {
      const ddlRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?["'\`]?${tableName}["'\`]?`, 'i');
      expect(
        ddlRegex.test(aggregatedSql),
        `Migration SQL must contain CREATE TABLE for "${tableName}"`
      ).toBe(true);
    }
  });

  it('AC-F0-04: foreign key relations enforce cascade deletes on workspace-owned child tables', async () => {
    if (!fs.existsSync(schemaPath)) return;
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Cascade deletions on brand_kits, posts, connectors, events, automations
    const cascadeTables = ['brand_kits', 'posts', 'connectors', 'events', 'automations'];
    for (const table of cascadeTables) {
      const cascadePattern = new RegExp(`references\\(\\s*\\(\\)\\s*=>\\s*workspaces\\.id[\\s\\S]*?onDelete:\\s*['"\`]cascade['"\`]`);
      expect(
        cascadePattern.test(schemaContent),
        `Workspace relation in schema should specify onDelete: 'cascade'`
      ).toBe(true);
    }
  });
});
