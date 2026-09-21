import { pathToFileURL } from 'node:url';

export async function checkService(service = 'web') {
const port = service === 'admin' ? 3001 : 3000;
const baseUrl = `http://localhost:${port}`;
if (!['web', 'admin'].includes(service)) throw new Error('用法：tsx scripts/healthcheck-service.ts web|admin');
const get = (path: string) => fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(5000), headers: { Accept: 'text/html,*/*' } });
const health = await get('/healthz');
if (!health.ok) throw new Error(`${service} /healthz 返回 HTTP ${health.status}`);
const ready = await get('/readyz');
if (!ready.ok) throw new Error(`${service} /readyz 返回 HTTP ${ready.status}`);
const home = await get(service === 'admin' ? '/login' : '/');
if (!home.ok) throw new Error(`${service} 首页返回 HTTP ${home.status}`);
const html = await home.text();
const resources = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((m) => m[1]).filter((v) => /\/_next\/static\/(?:css|[^/]+\/.*\.js)/.test(v));
const css = resources.find((v) => /\/css\//.test(v));
const js = resources.find((v) => /\.js(?:\?|$)/.test(v));
if (!css || !js) throw new Error(`${service} 首页缺少 CSS/JS 静态资源引用`);
for (const [kind, path] of [['CSS', css], ['JS', js]] as const) { const response = await get(path); if (!response.ok || (await response.text()).trim().length === 0) throw new Error(`${service} ${kind} 资源检查失败：HTTP ${response.status}`); }
return { service, health: health.status, ready: ready.status, homepage: home.status, css: 200, js: 200 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkService(process.argv[2]).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
