import type { ProductView } from './contracts';
import { findAdminProducts, findPublishedProduct, findPublishedProducts } from './repository';
import type { AdminProductView } from './repository';

export function listPublishedProducts(): Promise<ProductView[]> {
  return findPublishedProducts();
}

export function getPublishedProduct(slug: string): Promise<ProductView | null> {
  return findPublishedProduct(slug);
}

export function listAdminProducts(): Promise<AdminProductView[]> {
  return findAdminProducts();
}
