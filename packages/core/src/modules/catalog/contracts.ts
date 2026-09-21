export interface ProductView {
  id: string;
  slug: string;
  name: string;
  description: string;
  eligibilityText: string;
  screening: 'gpt_session' | 'none';
  deliveryMethod: 'manual';
  skus: Array<{
    id: string;
    slug: string;
    name: string;
    cycleText: string;
    priceCents: number;
    version: number;
    eligibilityText: string;
    warrantyText: string;
    availability: SkuAvailability;
    isPurchasable: boolean;
  }>;
}

export type SkuAvailability = 'available' | 'sold_out';

export function isSkuPurchasable(productStatus: string, skuStatus: string, availability: SkuAvailability): boolean {
  return productStatus === 'published' && skuStatus === 'published' && availability === 'available';
}
