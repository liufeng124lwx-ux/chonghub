import { describe, expect, test } from 'vitest';
import { isOwnedProcess, loadLocalEnvironment } from '../../scripts/local-dev';

describe('local development launcher safety', () => {
  test('only recycles a Next dev process from this checkout', () => {
    const root = '/workspace/chonghub';
    expect(isOwnedProcess('pnpm exec next dev --hostname localhost --port 3000', root, root)).toBe(true);
    expect(isOwnedProcess('/opt/other/node_modules/.bin/next dev --port 3000', root, root)).toBe(true);
    expect(isOwnedProcess('next-server (v15.5.25)', root, root)).toBe(true);
    expect(isOwnedProcess('node unrelated-server.js', root, root)).toBe(false);
    expect(isOwnedProcess('pnpm exec next start --port 3000', root, root)).toBe(false);
    expect(isOwnedProcess('pnpm exec next dev --port 3000', '/workspace/other', root)).toBe(false);
  });

  test('preserves explicit environment values and supplies safe local defaults', () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', DATABASE_URL: 'postgresql://explicit.example/db', AUTH_HMAC_KEY: 'explicit-key' };
    loadLocalEnvironment(env);
    expect(env.DATABASE_URL).toBe('postgresql://explicit.example/db');
    expect(env.AUTH_HMAC_KEY).toBe('explicit-key');
    expect(env.APP_ORIGIN).toBe('http://localhost:3000');
    expect(env.MAIL_TRANSPORT).toBe('local');
  });
});
