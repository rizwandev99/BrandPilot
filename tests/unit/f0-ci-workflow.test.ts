import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F0 Foundation: CI Workflow (AC-F0-07)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const ciPath = path.join(rootDir, '.github/workflows/ci.yml');

  it('AC-F0-07: .github/workflows/ci.yml exists and is non-empty', () => {
    expect(fs.existsSync(ciPath), 'CI workflow file .github/workflows/ci.yml must exist').toBe(true);
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('AC-F0-07: CI workflow triggers on push events to primary branches', () => {
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toMatch(/on:\s*[\s\S]*?\bpush:/i);
  });

  it('AC-F0-07: CI workflow includes required steps for lint, typecheck, and tests', () => {
    const content = fs.readFileSync(ciPath, 'utf8');

    // Verify presence of lint execution
    expect(content).toMatch(/pnpm\s+lint/);

    // Verify presence of typecheck execution
    expect(content).toMatch(/pnpm\s+typecheck/);

    // Verify presence of test execution
    expect(content).toMatch(/pnpm\s+test/);
  });

  it('AC-F0-07: CI workflow configures pnpm and Node.js environment', () => {
    const content = fs.readFileSync(ciPath, 'utf8');

    // Verify pnpm setup action
    expect(content).toMatch(/pnpm\/action-setup/);

    // Verify actions/setup-node
    expect(content).toMatch(/actions\/setup-node/);

    // Verify checkout
    expect(content).toMatch(/actions\/checkout/);
  });
});
