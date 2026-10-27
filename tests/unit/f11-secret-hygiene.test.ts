import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F11 Quota & Fallbacks: Secret Hygiene & Client Leak Prevention (AC-F11-08)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const srcDir = path.join(rootDir, 'src');

  describe('AC-F11-08: Environment Variable Prefix Enforcement', () => {
    it('AC-F11-08: NEXT_PUBLIC_GEMINI_API_KEY does not exist in any file', () => {
      const forbiddenVar = ['NEXT_PUBLIC', 'GEMINI_API_KEY'].join('_');

      function scanDir(dir: string): string[] {
        if (!fs.existsSync(dir)) return [];
        let matches: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            matches = matches.concat(scanDir(fullPath));
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.env') || entry.name.endsWith('.example'))) {
            if (path.resolve(fullPath) === path.resolve(__filename)) continue;
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(forbiddenVar)) {
              matches.push(path.relative(rootDir, fullPath));
            }
          }
        }
        return matches;
      }

      const foundIn = scanDir(rootDir);
      expect(
        foundIn,
        `Forbidden public variable "${forbiddenVar}" found in files: ${foundIn.join(', ')}`
      ).toEqual([]);
    });

    it('AC-F11-08: Client components ("use client") do not reference server-only environment secrets', () => {
      if (!fs.existsSync(srcDir)) return;

      const serverSecrets = [
        'GEMINI_API_KEY',
        'DATABASE_URL',
        'DATABASE_URL_UNPOOLED',
        'ENCRYPTION_KEY',
        'CRON_SECRET',
        'LINKEDIN_CLIENT_SECRET',
      ];

      function findClientFiles(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(findClientFiles(fullPath));
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("'use client'") || content.includes('"use client"')) {
              results.push(fullPath);
            }
          }
        }
        return results;
      }

      const clientFiles = findClientFiles(srcDir);
      const violations: { file: string; secret: string }[] = [];

      for (const clientFile of clientFiles) {
        const content = fs.readFileSync(clientFile, 'utf8');
        for (const secret of serverSecrets) {
          if (content.includes(`process.env.${secret}`)) {
            violations.push({
              file: path.relative(rootDir, clientFile),
              secret,
            });
          }
        }
      }

      expect(
        violations,
        `Found client components directly referencing server-only secrets: ${JSON.stringify(violations, null, 2)}`
      ).toEqual([]);
    });
  });

  describe('AC-F11-08: Logger Redaction & Error Masking', () => {
    it('AC-F11-08: sanitizeLogMessage replaces API keys and passwords with [REDACTED]', async () => {
      const { sanitizeLogMessage } = await import('@/server/security/sanitize');

      const sampleRawLog =
        'Error connecting to https://generativelanguage.googleapis.com with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 and db postgres://admin:secretPass123@host.neon.tech';

      const sanitized = sanitizeLogMessage(sampleRawLog);

      expect(sanitized).not.toContain('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6');
      expect(sanitized).not.toContain('secretPass123');
      expect(sanitized).toContain('[REDACTED]');
    });
  });
});
