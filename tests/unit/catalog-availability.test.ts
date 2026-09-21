import { describe, expect, it } from 'vitest';
import { isSkuPurchasable } from '../../packages/core/src/modules/catalog/contracts';

describe('SKU availability rules', () => {
  it('only permits published and available SKUs', () => {
    expect(isSkuPurchasable('published', 'published', 'available')).toBe(true);
    expect(isSkuPurchasable('published', 'published', 'sold_out')).toBe(false);
    expect(isSkuPurchasable('draft', 'published', 'available')).toBe(false);
    expect(isSkuPurchasable('published', 'draft', 'available')).toBe(false);
  });

  it('keeps availability independent from lifecycle status', () => {
    expect(isSkuPurchasable('draft', 'draft', 'sold_out')).toBe(false);
    expect(isSkuPurchasable('unlisted', 'published', 'available')).toBe(false);
  });
});
