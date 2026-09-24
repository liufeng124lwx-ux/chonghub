export type JsonLdValue = Record<string, unknown>;

function serialize(value: JsonLdValue): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function JsonLd({ data }: { data: JsonLdValue }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />;
}

export function organizationJsonLd({
  name,
  url,
  logo,
}: {
  name: string;
  url: string;
  logo: string;
}): JsonLdValue {
  return { '@context': 'https://schema.org', '@type': 'Organization', name, url, logo };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleJsonLd({
  headline,
  description,
  url,
  image,
  publishedAt,
  updatedAt,
  author,
  publisher,
}: {
  headline: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  publisher: { name: string; url: string; logo: string };
}): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    image: [image],
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: { '@type': 'Organization', name: author },
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
      url: publisher.url,
      logo: { '@type': 'ImageObject', url: publisher.logo },
    },
  };
}

export function productJsonLd({
  name,
  description,
  url,
  image,
  brand,
  skus,
}: {
  name: string;
  description: string;
  url: string;
  image: string;
  brand: string;
  skus: Array<{ name: string; priceCents: number; availability: 'available' | 'sold_out'; sku: string }>;
}): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    image: [image],
    brand: { '@type': 'Brand', name: brand },
    offers: skus.map((sku) => ({
      '@type': 'Offer',
      name: sku.name,
      sku: sku.sku,
      priceCurrency: 'CNY',
      price: (sku.priceCents / 100).toFixed(2),
      availability: `https://schema.org/${sku.availability === 'available' ? 'InStock' : 'OutOfStock'}`,
      url,
    })),
  };
}
