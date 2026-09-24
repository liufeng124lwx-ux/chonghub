import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const SEO_USER_AGENTS = {
  browser: 'Mozilla/5.0 (compatible; ChongHub SEO check; +https://chonghub.com/)',
  mobile: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
  googlebot: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
} as const;

export type SeoCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type SeoCheckResult = {
  label: string;
  target: string;
  checks: SeoCheck[];
  ok: boolean;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_PUBLIC_ROUTES = ['/', '/products', '/guide', '/screening'];
const PRIVATE_ROUTE_PREFIXES = ['/api', '/admin', '/login', '/orders', '/me', '/requests', '/guest/orders'];

function originOf(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`SEO target must use http or https: ${value}`);
  if (url.pathname !== '/' || url.search || url.hash) throw new Error(`SEO target must be an origin URL: ${value}`);
  return url;
}

function asUrl(origin: URL, path: string): URL {
  if (!path.startsWith('/')) throw new Error(`SEO route must start with '/': ${path}`);
  return new URL(path, origin);
}

function header(response: Response, name: string): string {
  return response.headers.get(name) ?? '';
}

function statusCheck(name: string, response: Response, expected: number): SeoCheck {
  return {
    name,
    ok: response.status === expected,
    detail: `HTTP ${response.status} (expected ${expected})`,
  };
}

export function inspectRobots(body: string, expectedSitemap: string): SeoCheck[] {
  const sitemap = body.match(/^\s*Sitemap:\s*(\S+)\s*$/im)?.[1] ?? '';
  return [
    {
      name: 'robots Sitemap directive',
      ok: sitemap === expectedSitemap,
      detail: sitemap ? `Sitemap: ${sitemap}` : 'Sitemap directive missing',
    },
    {
      name: 'robots does not hide public pages',
      ok: !/^\s*Disallow:\s*\/\s*$/im.test(body),
      detail: /^\s*Disallow:\s*\/\s*$/im.test(body) ? 'Disallow: / blocks the whole site' : 'No site-wide disallow found',
    },
  ];
}

export function inspectSitemap(body: string, expectedOrigin: string): SeoCheck[] {
  const locations = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]);
  const privateLocations = locations.filter((location) => {
    try {
      const path = new URL(location).pathname;
      return PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    } catch {
      return true;
    }
  });
  const expectedPrefix = `${expectedOrigin}/`;
  const foreignLocations = locations.filter((location) => !location.startsWith(expectedPrefix));
  return [
    {
      name: 'sitemap has URL entries',
      ok: locations.length > 0,
      detail: `${locations.length} <loc> entries`,
    },
    {
      name: 'sitemap uses the canonical origin',
      ok: foreignLocations.length === 0,
      detail: foreignLocations.length ? `Foreign or malformed URL: ${foreignLocations[0]}` : expectedOrigin,
    },
    {
      name: 'sitemap excludes private routes',
      ok: privateLocations.length === 0,
      detail: privateLocations.length ? `Private URL: ${privateLocations[0]}` : 'No private route found',
    },
  ];
}

export function inspectHtml(body: string, expectedCanonical: string): SeoCheck[] {
  const canonical = body.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]
    ?? body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']/i)?.[1]
    ?? '';
  const ogTitle = body.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1]
    ?? body.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)?.[1]
    ?? '';
  const ogDescription = body.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    ?? body.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i)?.[1]
    ?? '';
  const jsonLdCount = [...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)].length;
  return [
    {
      name: 'canonical link',
      ok: canonical === expectedCanonical,
      detail: canonical ? `canonical=${canonical}` : 'canonical link missing',
    },
    {
      name: 'Open Graph title',
      ok: ogTitle.trim().length > 0,
      detail: ogTitle ? `og:title present (${ogTitle.length} chars)` : 'og:title missing',
    },
    {
      name: 'Open Graph description',
      ok: ogDescription.trim().length > 0,
      detail: ogDescription ? `og:description present (${ogDescription.length} chars)` : 'og:description missing',
    },
    {
      name: 'JSON-LD',
      ok: jsonLdCount > 0,
      detail: `${jsonLdCount} JSON-LD script tag(s)`,
    },
  ];
}

export function redirectCheck(url: string, response: Response, expectedLocation: string): SeoCheck {
  const location = header(response, 'location');
  return {
    name: `redirect ${url}`,
    ok: [301, 308].includes(response.status) && location === expectedLocation,
    detail: `HTTP ${response.status}, Location: ${location || '(missing)'}`,
  };
}

async function fetchText(fetchImpl: FetchLike, url: URL, userAgent: string): Promise<{ response: Response; body: string }> {
  const response = await fetchImpl(url, {
    redirect: 'manual',
    headers: { accept: 'text/html,application/xml,text/plain;q=0.9,*/*;q=0.8', 'user-agent': userAgent },
    signal: AbortSignal.timeout(10_000),
  });
  return { response, body: await response.text() };
}

export async function checkTarget(options: {
  target: string;
  label?: string;
  fetchImpl?: FetchLike;
  publicRoutes?: string[];
}): Promise<SeoCheckResult> {
  const origin = originOf(options.target);
  const target = origin.toString().replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const checks: SeoCheck[] = [];
  const publicRoutes = options.publicRoutes ?? DEFAULT_PUBLIC_ROUTES;

  const robotsUrl = asUrl(origin, '/robots.txt');
  const robots = await fetchText(fetchImpl, robotsUrl, SEO_USER_AGENTS.googlebot);
  checks.push(statusCheck('robots status', robots.response, 200));
  checks.push({ name: 'robots content type', ok: header(robots.response, 'content-type').includes('text/plain'), detail: header(robots.response, 'content-type') || '(missing)' });
  checks.push(...inspectRobots(robots.body, `${target}/sitemap.xml`));

  const sitemapUrl = asUrl(origin, '/sitemap.xml');
  const sitemap = await fetchText(fetchImpl, sitemapUrl, SEO_USER_AGENTS.googlebot);
  checks.push(statusCheck('sitemap status', sitemap.response, 200));
  checks.push({ name: 'sitemap content type', ok: /xml|text\/plain/i.test(header(sitemap.response, 'content-type')), detail: header(sitemap.response, 'content-type') || '(missing)' });
  checks.push(...inspectSitemap(sitemap.body, target));

  for (const [routeIndex, route] of publicRoutes.entries()) {
    const page = await fetchText(fetchImpl, asUrl(origin, route), routeIndex === 0 ? SEO_USER_AGENTS.browser : SEO_USER_AGENTS.mobile);
    checks.push(statusCheck(`${route} status`, page.response, 200));
    checks.push({ name: `${route} content type`, ok: header(page.response, 'content-type').includes('text/html'), detail: header(page.response, 'content-type') || '(missing)' });
    // Next.js serializes the root canonical URL without a trailing slash even
    // when the metadata helper receives `/`. Keep the check aligned with the
    // rendered edge value while preserving the slash on non-root paths.
    checks.push(...inspectHtml(page.body, `${target}${route === '/' ? '' : route}`));
  }

  const googlebotHome = await fetchText(fetchImpl, asUrl(origin, '/'), SEO_USER_AGENTS.googlebot);
  checks.push(statusCheck('Googlebot homepage status', googlebotHome.response, 200));
  checks.push({ name: 'Googlebot homepage content type', ok: header(googlebotHome.response, 'content-type').includes('text/html'), detail: header(googlebotHome.response, 'content-type') || '(missing)' });

  if (origin.protocol === 'https:') {
    const variants = [new URL(`http://${origin.hostname}/`), new URL(`https://www.${origin.hostname}/`)].filter((url) => url.hostname !== origin.hostname || url.protocol !== origin.protocol);
    for (const variant of variants) {
      const response = await fetchImpl(variant, { redirect: 'manual', headers: { 'user-agent': SEO_USER_AGENTS.browser }, signal: AbortSignal.timeout(10_000) });
      checks.push(redirectCheck(variant.toString(), response, `${target}/`));
    }
  }

  return { label: options.label ?? target, target, checks, ok: checks.every((check) => check.ok) };
}

function cliValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const target = cliValue('target') ?? process.env.SEO_BASE_URL ?? 'https://chonghub.com';
  const result = await checkTarget({ target, label: cliValue('label') });
  console.log(`[${result.ok ? 'PASS' : 'FAIL'}] ${result.label} (${result.target})`);
  for (const check of result.checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
