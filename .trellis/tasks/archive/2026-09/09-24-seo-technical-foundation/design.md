# SEO technical foundation — design

## Boundaries

The web app owns metadata routes and rendered HTML. The core catalog service remains the source of published products, SKU price, and availability. Caddy owns host normalization. Content code exposes a typed published article URL list to the sitemap without leaking article internals into the catalog service.

## Components

- `apps/web/src/lib/site-config.ts`: canonical origin, site name, logo, default description, OG image, and URL helpers.
- `apps/web/src/components/json-ld.tsx`: safe server-rendered JSON-LD serializer.
- `apps/web/src/app/robots.ts`: robots response and absolute sitemap location.
- `apps/web/src/app/sitemap.ts`: canonical public URL list.
- `apps/web/src/app/layout.tsx`: metadata base, defaults, Organization data, and private-route defaults.
- Public page modules: page-specific metadata and visible breadcrumbs/data needed by JSON-LD.
- `ops/deploy/Caddyfile.chonghub`: apex canonical redirect for `www` and HTTP.

## Data flow

`getEnv().APP_ORIGIN` -> site config -> metadata/OG/canonical/robots/sitemap/JSON-LD. `listPublishedProducts()` / `getPublishedProduct()` -> Product/Offer and product URLs. The article loader -> published slugs and article metadata once Child 2 is integrated. No SEO component imports the purchase-flow client state or raw textarea value.

## Indexing controls

Use `robots: { index: false, follow: false }` or route-level response controls for private pages where appropriate. Do not block a page in robots.txt and expect `noindex` to be seen; pages requiring noindex remain crawlable enough for Google to read the directive. Sitemap membership is reserved for public canonical pages.

## Compatibility and rollback

Next.js 15 metadata routes and existing TypeScript aliases are used. No external SEO runtime package is required. If structured data fails validation, disable the affected JSON-LD component while preserving visible page content. If host normalization causes an issue, restore the previous Caddy site blocks and keep app metadata unchanged.
