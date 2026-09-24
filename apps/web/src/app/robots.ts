import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private HTML crawlable so a route-level noindex directive can be read.
      disallow: ['/api/', '/admin/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl.origin,
  };
}
