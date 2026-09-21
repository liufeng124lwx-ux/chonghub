import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.DATABASE_URL ??= 'postgresql://test:password@127.0.0.1:5432/chonghub_test'; });
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DURATION_MS, adminSessionCookie } from '../../packages/core/src/modules/auth/admin-session';
import { readFileSync } from 'node:fs';

describe('admin session boundary', () => {
  it('uses a dedicated 12-hour cookie with secure production attributes', () => {
    expect(ADMIN_SESSION_COOKIE).toBe('chonghub_admin_session');
    expect(ADMIN_SESSION_DURATION_MS).toBe(12 * 60 * 60 * 1000);
    const cookie = adminSessionCookie('token', new Date(Date.now() + 12 * 60 * 60 * 1000), true);
    expect(cookie).toContain('chonghub_admin_session=token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
  });

  it('admin app consumes only admin session APIs', () => {
    const route = readFileSync('apps/admin/src/app/api/admin/[...path]/route.ts', 'utf8');
    const layout = readFileSync('apps/admin/src/app/admin/layout.tsx', 'utf8');
    expect(route).toContain('readAdminActor');
    expect(route).toContain('revokeAdminSession');
    expect(layout).toContain('readAdminActor');
    expect(route).not.toContain('readActor');
  });
});
