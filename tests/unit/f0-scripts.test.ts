import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('F0 Foundation: Scripts and TypeScript Strictness', () => {
  const rootDir = path.resolve(__dirname, '../../');

  describe('AC-F0-01: package.json scripts configuration', () => {
    it('AC-F0-01: package.json exists and defines required scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      expect(fs.existsSync(packageJsonPath), 'package.json must exist in project root').toBe(true);

      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(pkg.scripts, 'package.json must contain scripts property').toBeDefined();

      const requiredScripts = [
        'lint',
        'typecheck',
        'test',
        'test:e2e',
        'dev',
        'build',
        'start',
      ];

      for (const scriptName of requiredScripts) {
        expect(pkg.scripts[scriptName], `Script "${scriptName}" must be defined in package.json`).toBeDefined();
        expect(typeof pkg.scripts[scriptName]).toBe('string');
        expect(pkg.scripts[scriptName].trim().length).toBeGreaterThan(0);
      }
    });

    it('AC-F0-01: script commands target appropriate tools (vitest, playwright, eslint/next)', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return;

      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = pkg.scripts || {};

      expect(scripts['test'], 'test script should invoke vitest').toMatch(/vitest/);
      expect(scripts['test:e2e'], 'test:e2e script should invoke playwright').toMatch(/playwright/);
      expect(scripts['typecheck'], 'typecheck script should invoke tsc with --noEmit').toMatch(/tsc.*--noEmit/);
      expect(scripts['lint'], 'lint script should run next lint or eslint').toMatch(/next lint|eslint/);
    });

    it('AC-F0-01: package.json defines database migration scripts', () => {
      const packageJsonPath = path.join(rootDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return;

      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = pkg.scripts || {};

      expect(scripts['db:generate'], 'db:generate script must exist').toBeDefined();
      expect(scripts['db:generate']).toMatch(/drizzle-kit/);
    });
  });

  describe('AC-F0-02: TypeScript Strict Mode & Zero Uncommented Any', () => {
    it('AC-F0-02: tsconfig.json enforces strict mode and path alias @/*', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath), 'tsconfig.json must exist in project root').toBe(true);

      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
      // Strip comments for JSON parsing
      const cleanJson = tsconfigContent.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
      const tsconfig = JSON.parse(cleanJson);

      const opts = tsconfig.compilerOptions || {};
      expect(opts.strict, 'compilerOptions.strict must be true').toBe(true);
      expect(
        opts.noImplicitAny !== false,
        'compilerOptions.noImplicitAny must not be disabled'
      ).toBe(true);
      expect(
        opts.strictNullChecks !== false,
        'compilerOptions.strictNullChecks must not be disabled'
      ).toBe(true);

      // Check path alias
      expect(opts.paths, 'compilerOptions.paths must be configured').toBeDefined();
      const hasAtAlias = Object.keys(opts.paths).some((key) => key === '@/*' || key.startsWith('@/'));
      expect(hasAtAlias, 'path mapping @/* must be configured in tsconfig.json').toBe(true);
    });

    it('AC-F0-02: scan source files to ensure no uncommented any is used', () => {
      const srcDir = path.join(rootDir, 'src');
      if (!fs.existsSync(srcDir)) {
        // If src directory is not created yet, skip scanning
        return;
      }

      function getAllFiles(dir: string, extList: string[]): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const dirent of list) {
          const res = path.resolve(dir, dirent.name);
          if (dirent.isDirectory()) {
            results = results.concat(getAllFiles(res, extList));
          } else if (extList.includes(path.extname(res))) {
            results.push(res);
          }
        }
        return results;
      }

      const tsFiles = getAllFiles(srcDir, ['.ts', '.tsx']);
      const violations: { file: string; line: number; text: string }[] = [];

      const anyPattern = /:\s*any\b|as\s+any\b|<any>/;
      const intentionalPattern = /\/\/\s*intentional\s+any/i;

      for (const filePath of tsFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          if (anyPattern.test(line)) {
            const prevLine = idx > 0 ? lines[idx - 1] : '';
            const isCommented = intentionalPattern.test(line) || intentionalPattern.test(prevLine);
            if (!isCommented) {
              violations.push({
                file: path.relative(rootDir, filePath),
                line: idx + 1,
                text: line.trim(),
              });
            }
          }
        });
      }

      expect(
        violations,
        `Found uncommented "any" usage in source files:\n${violations
          .map((v) => `  ${v.file}:${v.line} -> ${v.text}`)
          .join('\n')}`
      ).toEqual([]);
    });
  });
});
