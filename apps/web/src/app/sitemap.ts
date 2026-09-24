import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-config';
import { getPublishedPublicPaths } from '@/lib/public-url-set';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getPublishedPublicPaths();
  return paths.map((path) => ({ url: absoluteUrl(path) }));
}
