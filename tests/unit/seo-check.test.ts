import { describe, expect, it } from 'vitest';
import { inspectHtml, inspectRobots, inspectSitemap, redirectCheck } from '../../scripts/seo-check';

describe('SEO edge check helpers', () => {
  it('requires the canonical sitemap directive and allows route-level noindex', () => {
    const checks = inspectRobots('User-agent: *\nDisallow: /api/\nSitemap: https://chonghub.com/sitemap.xml\n', 'https://chonghub.com/sitemap.xml');
    expect(checks.every((check) => check.ok)).toBe(true);
  });

  it('rejects foreign and private sitemap locations', () => {
    const checks = inspectSitemap(
      '<urlset><url><loc>https://chonghub.com/</loc></url><url><loc>https://chonghub.com/orders/1</loc></url><url><loc>https://other.example/</loc></url></urlset>',
      'https://chonghub.com',
    );
    expect(checks.find((check) => check.name === 'sitemap has URL entries')?.ok).toBe(true);
    expect(checks.find((check) => check.name === 'sitemap uses the canonical origin')?.ok).toBe(false);
    expect(checks.find((check) => check.name === 'sitemap excludes private routes')?.ok).toBe(false);
  });

  it('checks canonical, OG, and JSON-LD in rendered HTML', () => {
    const html = '<head><link rel="canonical" href="https://chonghub.com/products"><meta property="og:title" content="Products"><meta property="og:description" content="Description"><script type="application/ld+json">{"@type":"Organization"}</script></head>';
    expect(inspectHtml(html, 'https://chonghub.com/products').every((check) => check.ok)).toBe(true);
  });

  it('accepts only permanent redirects to the apex URL', () => {
    const response = new Response(null, { status: 308, headers: { location: 'https://chonghub.com/' } });
    expect(redirectCheck('http://chonghub.com/', response, 'https://chonghub.com/').ok).toBe(true);
    const wrong = new Response(null, { status: 302, headers: { location: 'https://chonghub.com/' } });
    expect(redirectCheck('http://chonghub.com/', wrong, 'https://chonghub.com/').ok).toBe(false);
  });
});
