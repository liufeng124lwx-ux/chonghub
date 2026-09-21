import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('service entrypoint isolation', () => {
  it('declares independent web and admin builds', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(packageJson.scripts['build:web']).toContain('@chonghub/web');
    expect(packageJson.scripts['build:admin']).toContain('@chonghub/admin');
    expect(packageJson.scripts['start:web']).toContain('apps/web/.next-build');
    expect(packageJson.scripts['start:admin']).toContain('apps/admin/.next-build');
  });

  it('has service-specific health endpoints and route guards', () => {
    expect(read('apps/web/src/app/healthz/route.ts')).toContain("service: 'web'");
    expect(read('apps/admin/src/app/healthz/route.ts')).toContain("service: 'admin'");
    expect(read('apps/web/src/middleware.ts')).toContain("pathname.startsWith('/admin/')");
    expect(read('apps/admin/src/middleware.ts')).toContain("pathname.startsWith('/api/admin')");
  });

  it('keeps API ownership in separate route modules', () => {
    const webRoute = read('apps/web/src/app/api/[...path]/route.ts');
    const adminRoute = read('apps/admin/src/app/api/admin/[...path]/route.ts');
    expect(webRoute).not.toMatch(/admin\//);
    expect(webRoute).not.toMatch(/executeAdminCommand|updateCatalogEntry|publishProduct|recordRefund|retryNotification/);
    expect(adminRoute).not.toMatch(/listPublishedProducts|getPublishedProduct|createRequest|verifyGuestAccess|verifyGuestReset|saveAttachment/);
    expect(existsSync(resolve(root, 'apps/admin/src/app/api/[...path]/route.ts'))).toBe(false);
  });
});
