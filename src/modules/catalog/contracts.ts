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
    eligibilityText: string;
    warrantyText: string;
  }>;
}
