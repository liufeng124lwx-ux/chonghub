import { listPublishedProducts } from '@chonghub/core/modules/catalog/service';
import { canonicalPath } from './site-config';
import { listPublishedArticlePaths } from './articles';

const staticPublicPaths = ['/', '/products', '/guide', '/screening', '/articles'];

function productPath(slug: string): string {
  if (!slug || slug.includes('/') || slug.includes('?') || slug.includes('#')) {
    throw new Error(`Published product slug is not a safe URL segment: ${slug}`);
  }
  return `/products/${encodeURIComponent(slug)}`;
}

export async function getPublishedPublicPaths(): Promise<string[]> {
  const [products, articlePaths] = await Promise.all([
    listPublishedProducts(),
    listPublishedArticlePaths(),
  ]);
  const paths = [
    ...staticPublicPaths,
    ...products.map((product) => productPath(product.slug)),
    ...articlePaths.map((path) => canonicalPath(path)),
  ];
  return [...new Set(paths.map((path) => canonicalPath(path)))];
}
