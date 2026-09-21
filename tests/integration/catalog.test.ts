import { describe, expect, test } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const canRunDatabaseTests = Boolean(databaseUrl && databaseUrl.match(/(?:^|[/:_-])[^/]+_test(?:$|[?])/));

describe.skipIf(!canRunDatabaseTests)('catalog integration', () => {
  test('only publishes the three approved prices', async () => {
    const { listPublishedProducts } = await import('../../src/modules/catalog/service');
    const products = await listPublishedProducts();
    expect(products.flatMap((product) => product.skus.map((sku) => sku.priceCents)).sort((a, b) => a - b))
      .toEqual([14500, 75000, 135000]);
    expect(JSON.stringify(products)).not.toMatch(/upstream|costCents/i);
  });

  test('does not expose unpublished products', async () => {
    const { getPublishedProduct } = await import('../../src/modules/catalog/service');
    expect(await getPublishedProduct('google-account')).toBeNull();
  });
});
