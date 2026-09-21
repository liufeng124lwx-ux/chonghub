import type { ProductView } from './contracts';
import { findPublishedProduct, findPublishedProducts } from './repository';

export function listPublishedProducts(): Promise<ProductView[]> {
  return findPublishedProducts();
}

export function getPublishedProduct(slug: string): Promise<ProductView | null> {
  return findPublishedProduct(slug);
}
