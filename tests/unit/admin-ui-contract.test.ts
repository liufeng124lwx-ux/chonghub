import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(process.cwd());
const login = readFileSync(resolve(root, 'apps/admin/src/app/login/page.tsx'), 'utf8');
const layout = readFileSync(resolve(root, 'apps/admin/src/app/layout.tsx'), 'utf8');

describe('admin UI contract', () => {
  test('uses operations specific login copy', () => {
    expect(login).toContain('管理员入口');
    expect(login).toContain('订单履约');
    expect(login).toContain('商品状态');
    expect(login).toContain('进入管理后台');
    expect(login).not.toContain('登录 ChongHub');
    expect(login).not.toContain('游客查询订单');
    expect(login).not.toContain('登录 / 注册');
  });

  test('admin root layout does not mount public site chrome', () => {
    expect(layout).not.toContain('SiteHeader');
    expect(layout).not.toContain('site-footer');
    expect(layout).toContain('ChongHub Operations');
  });
});
