# ChongHub SEO foundation and content strategy — technical design

## 1. Scope and production boundary

The production public site is the Next.js application under `apps/web`. All SEO routes, metadata, article rendering, and validation described here belong to that application. The duplicate root `src/app` tree is excluded from production SEO work to avoid editing an inactive implementation.

The first cycle is intentionally narrow: ChatGPT Plus / Pro recharge. The catalog and fulfillment workflow remain unchanged. SEO adds discoverability and content boundaries around existing behavior; it does not add payment automation, account access, or a new fulfillment channel.

## 2. URL and host model

Use `https://chonghub.com` as the sole canonical origin. Caddy performs permanent redirects from `www` and HTTP variants before requests reach Next.js. `APP_ORIGIN` remains the single production source for absolute URLs. Local development may use a local origin, but production metadata must never contain localhost.

Indexable URL classes:

- `/`
- `/products`
- `/products/[slug]` for published products
- `/guide`
- `/screening`
- `/articles`
- `/articles/[slug]` for published articles

Operational URL classes (orders, guest orders, login, personal center, admin, API, verification, and request-specific screens) are not included in the sitemap and receive suitable noindex/crawl controls where applicable.

## 3. SEO infrastructure

### Site configuration

Create a small typed site configuration module used by metadata, sitemap, robots, JSON-LD, and article links. It exposes the canonical origin, site name, logo URL, default description, and OG image URL. It reads the production origin from the existing environment contract and has an explicit local fallback for development.

### Robots and sitemap

Use Next.js metadata routes or equivalent app routes in `apps/web/src/app`:

- `robots.ts` returns an allow rule for public content, targeted disallows for operational paths, and `Sitemap: https://chonghub.com/sitemap.xml`.
- `sitemap.ts` loads published catalog entries and published article metadata, then emits canonical absolute URLs. It must not emit query strings, fragments, order numbers, private routes, or drafts.

Sitemap generation should fail closed if the published URL set cannot be loaded, with an operational error rather than silently returning a partial sitemap. The endpoint is monitored after deployment.

### Metadata

The root layout defines `metadataBase`, default title template, default description, default Open Graph values, and default robots behavior. Route metadata overrides the description and title for its specific intent. Product metadata is generated from the product record and its current minimum purchasable SKU. Article metadata is generated from frontmatter.

### Structured data

Add a small JSON-LD component that serializes trusted objects and escapes `<`/`>` characters before embedding them in a script tag.

- Root layout: `Organization` with name, URL, and crawlable logo.
- Product and article pages: visible breadcrumb plus `BreadcrumbList` JSON-LD.
- Product detail pages: `Product` with `Offer` from current product/SKU data, CNY currency, truthful availability, and no rating fields unless real review data exists.
- Articles: `Article` may be added if author, publication, and update fields are real and maintained.
- Do not add `FAQPage` as a traffic promise. Visible FAQs remain normal page content.

## 4. Content architecture

Store initial articles as reviewed Markdown/MDX files under `apps/web/content/articles`. A typed frontmatter schema includes:

```text
slug, title, description, primaryIntent,
publishedAt, updatedAt, author, reviewedBy,
relatedProducts, status
```

The article index filters to `status: published`; drafts are not routable or listed in the sitemap. The renderer supports trusted internal link helpers, product cards, guide/screening links, author/update blocks, and a service-policy notice that links to current mutable data rather than copying it.

The first five slugs and intents are:

1. `chatgpt-topup-safety` — safety and service boundaries;
2. `chatgpt-account-ban-risk` — ban-risk uncertainty and user checks;
3. `chatgpt-without-overseas-card` — payment alternatives;
4. `chatgpt-topup-password` — credential handling;
5. `chatgpt-plus-vs-pro` — product choice.

Each page opens with a direct answer, explains the current ChongHub process, states limitations, and links to one or more relevant product/guide/screening pages. Content review rejects unsupported guarantees, copied competitor claims, raw credentials, and stale mutable facts.

## 5. Internal linking and page roles

The home page exposes a small set of current guides. `/guide` links to risk and payment articles. Product pages link to the most relevant guide and article. Articles link to one relevant product or `/products`, plus `/guide` or `/screening`. `/articles` links to every published article. This creates a crawlable graph with no orphaned article.

Page roles remain distinct:

- commercial pages describe the offer and convert;
- guide pages explain the current process and rules;
- screening explains eligibility and local checking;
- articles answer broader pre-purchase questions.

## 6. Privacy and security boundary

The existing client-side screening implementation parses raw ChatGPT session JSON locally, clears the raw input after classification, and sends a small versioned report after order creation. SEO work must not add analytics, structured data, error reporting, or article components that capture the raw textarea value. A production verification pass checks browser requests, server logs, mail/outbox payloads, Feishu payloads, and analytics configuration.

Public copy must tell users not to put passwords, tokens, or session JSON into notes or support messages. Privacy and terms pages must be updated from draft language to the actual operator and retention practices before article publication.

## 7. Deployment and compatibility

The implementation uses existing Next.js 15 app-router conventions, existing `@/*` aliases, and the existing catalog/settings services. It does not require a new external SEO package or database migration for the initial article set. The article route is static/content-backed; catalog and policy facts remain service-backed. Caddy configuration changes are deployed separately from the application image and validated with HTTPS requests.

## 8. Validation and rollback

Local checks:

- `pnpm dev:local`
- `pnpm dev:local:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- endpoint checks for sitemap, robots, canonical, OG, JSON-LD, and private-route controls

Production checks:

- apex and `www` redirect behavior;
- 200 responses and content types for public pages;
- Googlebot and mobile UA access;
- GSC URL Inspection and sitemap report;
- Rich Results Test for Organization, Breadcrumb, and Product data;
- no raw session data in network, logs, notifications, or analytics.

Each change is independently reversible: Caddy redirect, SEO route additions, metadata, structured data, and article publication are separate deployment units. If a new article is defective, mark it draft/noindex or redirect it to a validated equivalent; do not silently delete an indexed URL.

## 9. Non-goals and trade-offs

This design favors a small, auditable content set over rapid page-count growth. It does not promise rankings or use fixed keyword density, word count, competitor traffic estimates, or FAQ rich results as success criteria. It defers translations, a CMS, advanced attribution, and unsupported product topics until there is a real operational need.
