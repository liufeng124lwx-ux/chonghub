import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.DATABASE_URL ??= 'postgresql://test:password@127.0.0.1:5432/chonghub_test'; });
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DURATION_MS, adminSessionCookie } from '../../packages/core/src/modules/auth/admin-session';
import { hashPassword, serializePasswordHash } from '../../packages/core/src/server/crypto';
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

  it('uses username/password login and leaves public OTP login untouched', () => {
    const route = readFileSync('apps/admin/src/app/api/admin/[...path]/route.ts', 'utf8');
    const page = readFileSync('apps/admin/src/app/login/page.tsx', 'utf8');
    const webRoute = readFileSync('apps/web/src/app/api/[...path]/route.ts', 'utf8');
    expect(route).toContain("path === '/auth/login'");
    expect(route).toContain('authenticateAdmin');
    expect(route).not.toContain('sendOtp');
    expect(route).not.toContain('verifyLogin');
    expect(page).toContain('管理员用户名');
    expect(page).toContain('管理员密码');
    expect(page).not.toContain('邮箱验证码');
    expect(webRoute).toContain("path === '/auth/otp'");
    expect(webRoute).toContain("path === '/auth/verify'");
  });

  it('stores an encoded password digest instead of the plaintext', async () => {
    const plaintext = 'correct horse battery staple';
    const encoded = serializePasswordHash(await hashPassword(plaintext));
    expect(encoded).toMatch(/^scrypt\$N=\d+\$r=\d+\$p=\d+\$/);
    expect(encoded).not.toContain(plaintext);
    expect(encoded).not.toContain('correct');
  });
});
