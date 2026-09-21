import { withTransaction } from '@chonghub/core/server/db';

export const initialCatalog = [
  {
    categorySlug: 'chatgpt',
    categoryName: 'ChatGPT 会员充值',
    productSlug: 'chatgpt-plus',
    productName: 'ChatGPT Plus · 月卡',
    description: '为已有 ChatGPT 账号提供人工会员充值服务。先检测账号状态，再由客服确认条件、报价与交付。',
    skuSlug: 'chatgpt-plus-monthly',
    skuName: 'Plus 月卡',
    priceCents: 14500,
  },
  {
    categorySlug: 'chatgpt',
    categoryName: 'ChatGPT 会员充值',
    productSlug: 'chatgpt-pro-5x',
    productName: 'ChatGPT Pro 5X · 月卡',
    description: '适用于符合受理条件的已有 ChatGPT 账号，人工确认后完成充值。',
    skuSlug: 'chatgpt-pro-5x-monthly',
    skuName: 'Pro 5X 月卡',
    priceCents: 75000,
  },
  {
    categorySlug: 'chatgpt',
    categoryName: 'ChatGPT 会员充值',
    productSlug: 'chatgpt-pro-20x',
    productName: 'ChatGPT Pro 20X · 月卡',
    description: '适用于符合受理条件的已有 ChatGPT 账号，人工确认后完成充值。',
    skuSlug: 'chatgpt-pro-20x-monthly',
    skuName: 'Pro 20X 月卡',
    priceCents: 135000,
  },
] as const;

export async function seedCatalog() {
  return withTransaction(async (client) => {
    for (const item of initialCatalog) {
      const category = await client.query<{ id: string }>(
        `INSERT INTO categories (slug, name) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [item.categorySlug, item.categoryName],
      );
      const categoryId = category.rows[0]?.id;
      if (!categoryId) throw new Error(`Unable to seed category ${item.categorySlug}`);

      const product = await client.query<{ id: string }>(
        `INSERT INTO products (category_id, slug, name, description, eligibility_text, delivery_method, screening_method, status, sort_order)
         VALUES ($1, $2, $3, $4, $5, 'manual', 'gpt_session', 'published', $6)
         ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description,
           eligibility_text = EXCLUDED.eligibility_text, delivery_method = EXCLUDED.delivery_method,
           screening_method = EXCLUDED.screening_method, updated_at = now()
         RETURNING id`,
        [categoryId, item.productSlug, item.productName, item.description, '仅支持当前无有效订阅的账号；实际能否充值以人工复核为准。', initialCatalog.indexOf(item)],
      );
      const productId = product.rows[0]?.id;
      if (!productId) throw new Error(`Unable to seed product ${item.productSlug}`);

      await client.query(
        `INSERT INTO skus (product_id, slug, name, cycle_text, price_cents, status, warranty_text, sort_order)
         VALUES ($1, $2, $3, '月卡', $4, 'published', '充值成功后提供 30 天订阅保障；账号封禁不在该保障范围内。', 0)
         ON CONFLICT (slug) DO UPDATE SET product_id = EXCLUDED.product_id, name = EXCLUDED.name,
           cycle_text = EXCLUDED.cycle_text, warranty_text = EXCLUDED.warranty_text, updated_at = now()`,
        [productId, item.skuSlug, item.skuName, item.priceCents],
      );
    }

    await client.query(
      `INSERT INTO site_settings (key, value) VALUES
       ('service_policy', $1::jsonb),
       ('customer_service', $2::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [
        JSON.stringify({ version: 1, zone: 'Asia/Shanghai', opensAt: '09:30', closesAt: '23:00', deliveryMinutes: 120, warrantyDays: 30, termsVersion: 'draft-v1' }),
        JSON.stringify({ nickname: '流风', wechatId: 'wxid_7ccixhrr9gtk22', qrPath: '/images/customer-service-wechat.jpg' }),
      ],
    );
  });
}
