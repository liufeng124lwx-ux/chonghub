import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const coreRoot = join(root, 'packages/core/src');

async function sourceFiles(directory: string): Promise<string[]> {
  const { readdir, stat } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
    else if ((await stat(path)).isFile() && entry.name.endsWith('.mts')) files.push(path);
  }
  return files;
}

describe('workspace package boundaries', () => {
  test('core source stays independent from UI and Next server modules', async () => {
    const files = await sourceFiles(coreRoot);
    const forbidden = /(?:from\s+|import\s*\()(['"])(?:next(?:\/|['"])|react(?:\/|['"])|(?:\.\.\/)*apps\/(?:web|admin)|(?:\.\.\/)*src\/app(?:\/|['"]))/;
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (forbidden.test(source)) violations.push(relative(root, file));
    }
    expect(violations).toEqual([]);
  });

  test('both application manifests consume the shared core package', async () => {
    for (const app of ['web', 'admin']) {
      const manifest = JSON.parse(await readFile(join(root, 'apps', app, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      expect(manifest.dependencies?.['@chonghub/core']).toBe('workspace:*');
      const config = await readFile(join(root, 'apps', app, 'next.config.ts'), 'utf8');
      expect(config).toContain("transpilePackages: ['@chonghub/core']");
      const tsconfig = JSON.parse(await readFile(join(root, 'apps', app, 'tsconfig.json'), 'utf8')) as {
        compilerOptions?: { paths?: Record<string, string[]> };
      };
      expect(tsconfig.compilerOptions?.paths?.['@chonghub/core']).toEqual(['../../packages/core/src/index.ts']);
      expect(tsconfig.compilerOptions?.paths?.['@chonghub/core/*']).toEqual(['../../packages/core/src/*']);
    }
  });

  test('operational scripts import core through its package boundary', async () => {
    for (const script of ['seed.ts', 'migrate.ts', 'worker.ts', 'bootstrap-admin.ts']) {
      const source = await readFile(join(root, 'scripts', script), 'utf8');
      expect(source).toContain('@chonghub/core/');
      expect(source).not.toMatch(/from ['"]\.\.\/src\/(?:modules|server)\//);
    }
  });
});
