import { afterEach, expect, test, vi } from 'vitest';
import { checkService } from '../../scripts/healthcheck-service';

afterEach(() => vi.unstubAllGlobals());

test('admin readiness failure fails health even when process is alive', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('{}', { status: 503 })));
  await expect(checkService('admin')).rejects.toThrow('/readyz');
});

test('checks admin login and its CSS and JS resources', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('{}'))
    .mockResolvedValueOnce(new Response('<link href="/_next/static/css/app.css"><script src="/_next/static/chunks/app.js"></script>'))
    .mockResolvedValueOnce(new Response('body{}')).mockResolvedValueOnce(new Response('console.log(1)'));
  vi.stubGlobal('fetch', fetcher);
  await expect(checkService('admin')).resolves.toMatchObject({ service: 'admin', css: 200, js: 200 });
  expect(String(fetcher.mock.calls[2][0])).toBe('http://localhost:3001/login');
});
