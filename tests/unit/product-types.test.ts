import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync('db/migrations/013_product_types.sql', 'utf8');
const catalog = readFileSync('packages/core/src/modules/catalog/admin.ts', 'utf8');
const purchase = readFileSync('apps/web/src/components/purchase-flow.tsx', 'utf8');
const detail = readFileSync('apps/web/src/app/products/[slug]/page.tsx', 'utf8');
const order = readFileSync('apps/web/src/app/orders/[number]/page.tsx', 'utf8');

describe('product type contract', () => {
  test('adds an additive, constrained product type with recharge compatibility', () => {
    expect(migration).toContain("DEFAULT 'recharge'");
    expect(migration).toContain("product_type IN ('recharge', 'account')");
    expect(catalog).toContain("productType === 'account' ? 'none' :");
  });

  test('account products bypass the ChatGPT screening flow and show manual delivery copy', () => {
    expect(purchase).toContain("product.screening === 'gpt_session'");
    expect(purchase).toContain('当前暂不接入在线支付或自动发货');
    expect(detail).toContain("product.productType === 'account'");
    expect(order).toContain("!isAccount && <Link className=\"button button-secondary\"");
  });
});
