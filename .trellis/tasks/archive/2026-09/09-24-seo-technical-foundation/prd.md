# SEO technical foundation

## Goal

Make the production `apps/web` application crawlable and semantically clear through a single canonical origin, data-driven robots/sitemap routes, page metadata, truthful JSON-LD, and private-route indexing controls.

## Scope

In scope: `apps/web`, the shared catalog/settings read paths used by public SEO output, and `ops/deploy/Caddyfile.chonghub` for the public host redirect. The root `src/app` tree, article body writing, GSC account actions, order workflow, and payment workflow are out of scope.

## Requirements

- Use `https://chonghub.com` as the canonical public origin while retaining a local development fallback.
- Redirect `www` and HTTP user-facing variants permanently to the apex HTTPS origin at the Caddy layer.
- Add `apps/web/src/app/robots.ts` with public allow behavior, operational path controls, and an absolute canonical sitemap URL.
- Add `apps/web/src/app/sitemap.ts` that lists `/`, `/products`, `/guide`, `/screening`, published product URLs, `/articles`, and published article URLs supplied by the content loader contract. Never list query strings, order numbers, drafts, API routes, login, admin, or personal pages.
- Add shared metadata configuration and unique metadata for homepage, product list, product details, guide, screening, and article route contracts.
- Add safe JSON-LD helpers for Organization, BreadcrumbList, Product/Offer, and optionally Article when its author and dates are real.
- Generate Product/Offer values from real current product/SKU data, use CNY, omit invented reviews, and represent sold-out state truthfully.
- Keep private pages crawlable enough for Google to see `noindex` when that mechanism is used; do not rely on robots disallow as an indexing removal mechanism.
- Do not add analytics or metadata code that reads or serializes raw ChatGPT screening textarea content.

## Acceptance criteria

- [ ] `/sitemap.xml` and `/robots.txt` return 200 locally with correct content types and expected URL/directive sets.
- [ ] `www` redirect is permanent and preserves path/query only when safe for the public host redirect.
- [ ] Core public HTML contains unique title, description, canonical, OG URL/title/description, and site metadata without localhost in production configuration.
- [ ] Representative product HTML contains valid Product/Offer JSON-LD with current CNY price and availability, with no ratings unless real data exists.
- [ ] Breadcrumb JSON-LD is emitted only where visible breadcrumb content exists.
- [ ] Private route metadata is noindex where required and those routes are absent from the sitemap.
- [ ] Existing screening and purchase tests continue to pass, including the assertion that the raw session secret is not sent.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build:web` pass.

## Dependencies and risks

- The sitemap needs a typed published-article URL provider from the content child. Until that child lands, the provider returns the empty published set without breaking product routes.
- Cloudflare may serve or augment `robots.txt`; production validation must confirm that the application route and edge response agree.
- Caddy changes are deployment-sensitive and must be validated before reload; rollback is the previous site block.
