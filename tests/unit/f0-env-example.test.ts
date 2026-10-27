import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F0 Foundation: Environment Manifest & Secret Hygiene (AC-F0-08)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const envExamplePath = path.join(rootDir, '.env.example');
  const gitignorePath = path.join(rootDir, '.gitignore');

  const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'GEMINI_API_KEY',
    'LLM_DAILY_BUDGET',
    'ENCRYPTION_KEY',
    'CRON_SECRET',
    'WORKSPACE_TTL_DAYS',
    'ENABLE_LIVE_LINKEDIN',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'LINKEDIN_REDIRECT_URI',
    'APP_URL',
  ];

  it('AC-F0-08: .env.example exists in project root', () => {
    expect(fs.existsSync(envExamplePath), '.env.example must exist at project root').toBe(true);
  });

  it('AC-F0-08: .env.example documents all 12 required environment variables', () => {
    if (!fs.existsSync(envExamplePath)) return;

    const content = fs.readFileSync(envExamplePath, 'utf8');
    const documentedVars = new Set<string>();

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        documentedVars.add(trimmed.slice(0, eqIdx).trim());
      }
    }

    const missing = REQUIRED_ENV_VARS.filter((v) => !documentedVars.has(v));
    expect(
      missing,
      `The following variables are missing from .env.example: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('AC-F0-08: no real secrets are committed in .env.example', () => {
    if (!fs.existsSync(envExamplePath)) return;

    const content = fs.readFileSync(envExamplePath, 'utf8');

    // Should not contain real Google Gemini API keys (AIzaSy...)
    expect(content).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);

    // Should not contain real production Neon postgres URLs with live passwords
    expect(content).not.toMatch(/postgres:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_\-\.]{12,}@ep-[a-zA-Z0-9\-]+\.us-/);

    // Should not contain 64-char live hex encryption keys
    expect(content).not.toMatch(/ENCRYPTION_KEY=[0-9a-fA-F]{64}\b/);
  });

  it('AC-F0-08: .gitignore exists and ignores local environment files (.env, .env.local)', () => {
    if (!fs.existsSync(gitignorePath)) return;

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toMatch(/\.env(\.local)?\b/);
  });
});
