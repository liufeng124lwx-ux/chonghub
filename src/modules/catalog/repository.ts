import { query } from '@/server/db';
import type { ProductView } from './contracts';

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  eligibility_text: string;
  screening_method: 'gpt_session' | 'none';
  delivery_method: 'manual';
  sku_id: string;
  sku_slug: string;
  sku_name: string;
  cycle_text: string;
  price_cents: number;
  warranty_text: string;
};

const select = `
  SELECT p.id, p.slug, p.name, p.description, p.eligibility_text,
         p.screening_method, p.delivery_method,
         s.id AS sku_id, s.slug AS sku_slug, s.name AS sku_name,
         s.cycle_text, s.price_cents, s.warranty_text
  FROM products p
  JOIN skus s ON s.product_id = p.id
  WHERE p.status = 'published' AND s.status = 'published'
`;

function groupProducts(rows: ProductRow[]): ProductView[] {
  const products = new Map<string, ProductView>();
  for (const row of rows) {
    const existing = products.get(row.id) ?? {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      eligibilityText: row.eligibility_text,
      screening: row.screening_method,
      deliveryMethod: row.delivery_method,
      skus: [],
    };
    existing.skus.push({
      id: row.sku_id,
      slug: row.sku_slug,
      name: row.sku_name,
      cycleText: row.cycle_text,
      priceCents: row.price_cents,
      eligibilityText: row.eligibility_text,
      warrantyText: row.warranty_text,
    });
    products.set(row.id, existing);
  }
  return [...products.values()];
}

export async function findPublishedProducts(): Promise<ProductView[]> {
  const { rows } = await query<ProductRow>(`${select} ORDER BY p.sort_order, p.name, s.sort_order, s.price_cents`);
  return groupProducts(rows);
}

export async function findPublishedProduct(slug: string): Promise<ProductView | null> {
  const { rows } = await query<ProductRow>(`${select} AND p.slug = $1 ORDER BY s.sort_order, s.price_cents`, [slug]);
  return groupProducts(rows)[0] ?? null;
}
