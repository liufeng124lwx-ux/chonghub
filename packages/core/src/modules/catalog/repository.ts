import { query } from '@chonghub/core/server/db';
import { isSkuPurchasable, type ProductView, type SkuAvailability } from './contracts';

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  eligibility_text: string;
  screening_method: 'gpt_session' | 'none';
  delivery_method: 'manual';
  product_type: 'recharge' | 'account';
  platform_slug: string;
  platform_name: string;
  sku_id: string;
  sku_slug: string;
  sku_name: string;
  cycle_text: string;
  price_cents: number;
  version: number;
  warranty_text: string;
  availability: SkuAvailability;
};

export type AdminProductView = ProductView & {
  status: 'draft' | 'published' | 'unlisted';
  createdAt: string;
  updatedAt: string;
  skus: Array<ProductView['skus'][number] & { status: 'draft' | 'published' | 'unlisted' }>;
};

function platformLabel(slug: string, name: string): string {
  return ({ chatgpt: 'ChatGPT', claude: 'Claude', google: 'Google' } as Record<string, string>)[slug] ?? name;
}

const select = `
  SELECT p.id, p.slug, p.name, p.description, p.eligibility_text,
         p.screening_method, p.delivery_method,
         p.product_type, c.slug AS platform_slug, c.name AS platform_name,
         s.id AS sku_id, s.slug AS sku_slug, s.name AS sku_name,
         s.cycle_text, s.price_cents, s.warranty_text, s.availability, s.version
  FROM products p
  JOIN categories c ON c.id = p.category_id
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
      productType: row.product_type,
      platform: { slug: row.platform_slug, name: platformLabel(row.platform_slug, row.platform_name) },
      skus: [],
    };
    existing.skus.push({
      id: row.sku_id,
      slug: row.sku_slug,
      name: row.sku_name,
      cycleText: row.cycle_text,
      priceCents: row.price_cents,
      version: row.version,
      eligibilityText: row.eligibility_text,
      warrantyText: row.warranty_text,
      availability: row.availability,
      isPurchasable: isSkuPurchasable('published', 'published', row.availability),
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

type AdminProductRow = ProductRow & {
  product_status: AdminProductView['status'];
  sku_status: AdminProductView['status'];
  created_at: Date;
  updated_at: Date;
};

export async function findAdminProducts(): Promise<AdminProductView[]> {
  const { rows } = await query<AdminProductRow>(`
    SELECT p.id, p.slug, p.name, p.description, p.eligibility_text,
           p.screening_method, p.delivery_method, p.status AS product_status,
           p.product_type, c.slug AS platform_slug, c.name AS platform_name,
           p.created_at, p.updated_at,
           s.id AS sku_id, s.slug AS sku_slug, s.name AS sku_name,
           s.cycle_text, s.price_cents, s.warranty_text, s.status AS sku_status,
           s.availability, s.version
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN skus s ON s.product_id = p.id
    ORDER BY CASE p.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
             p.sort_order, p.updated_at DESC, p.name, s.sort_order, s.price_cents
  `);
  const products = new Map<string, AdminProductView>();
  for (const row of rows) {
    const existing = products.get(row.id) ?? {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      eligibilityText: row.eligibility_text,
      productType: row.product_type,
      platform: { slug: row.platform_slug, name: platformLabel(row.platform_slug, row.platform_name) },
      screening: row.screening_method,
      deliveryMethod: row.delivery_method,
      status: row.product_status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      skus: [],
    };
    if (row.sku_id) {
      existing.skus.push({
        id: row.sku_id,
        slug: row.sku_slug,
        name: row.sku_name,
        cycleText: row.cycle_text,
        priceCents: row.price_cents,
        version: row.version,
        eligibilityText: row.eligibility_text,
        warrantyText: row.warranty_text,
        availability: row.availability,
        isPurchasable: isSkuPurchasable(row.product_status, row.sku_status, row.availability),
        status: row.sku_status,
      });
    }
    products.set(row.id, existing);
  }
  return [...products.values()];
}
