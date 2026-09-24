# SEO technical foundation — implementation plan

### Task 1: Add canonical site configuration

**Files:**
- Create: `apps/web/src/lib/site-config.ts`
- Modify: `packages/core/src/server/env.ts` only if the existing APP_ORIGIN contract needs a typed export
- Test: `tests/unit/seo-site-config.test.ts`

**Interfaces:** `siteUrl`, `absoluteUrl(path)`, `siteMetadata`, and the site asset URLs are consumed by metadata routes and pages. The configuration uses `getEnv().APP_ORIGIN` and a local fallback.

- [ ] Add failing tests for apex production URL, absolute path joining, and rejection of query/fragment in canonical sitemap URLs.
- [ ] Implement the typed config without reading browser state or secrets.
- [ ] Run `pnpm test -- tests/unit/seo-site-config.test.ts` and confirm it passes.

### Task 2: Add robots and sitemap routes

**Files:**
- Create: `apps/web/src/app/robots.ts`
- Create: `apps/web/src/app/sitemap.ts`
- Create: `apps/web/src/lib/public-url-set.ts`
- Modify: `apps/web/src/lib/articles.ts` after the content contract is available
- Test: `tests/unit/seo-routes.test.ts`

**Interfaces:** `getPublishedPublicUrls(): Promise<string[]>` returns canonical public paths; `sitemap()` returns Next.js `MetadataRoute.Sitemap`; `robots()` returns `MetadataRoute.Robots`.

- [ ] Test that private paths and URL parameters are omitted, product URLs come from published products, and article URLs are included only when published.
- [ ] Implement routes with absolute `https://chonghub.com` URLs in production and a local origin in development.
- [ ] Ensure failures do not silently emit a partial URL list; expose a clear server error for endpoint monitoring.
- [ ] Run endpoint tests and XML parsing assertions.

### Task 3: Add metadata and JSON-LD

**Files:**
- Create: `apps/web/src/components/json-ld.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/products/page.tsx`
- Modify: `apps/web/src/app/products/[slug]/page.tsx`
- Modify: `apps/web/src/app/guide/page.tsx`
- Modify: `apps/web/src/app/screening/page.tsx`
- Test: `tests/unit/seo-rendering-contract.test.ts`

**Interfaces:** page `generateMetadata` functions return unique title/description/canonical/openGraph values; JSON-LD receives trusted serializable data and escapes `<`, `>`, and `&` before embedding.

- [ ] Add failing rendered-source assertions for unique descriptions, canonical URLs, OG values, Organization, BreadcrumbList, and Product/Offer fields.
- [ ] Implement metadata from site config and current catalog/settings values.
- [ ] Add visible breadcrumbs wherever BreadcrumbList is emitted.
- [ ] Mark order, login, account, and request-specific pages noindex without blocking Google from seeing the directive.
- [ ] Run focused tests, lint, typecheck, and build.

### Task 4: Normalize the production host

**Files:**
- Modify: `ops/deploy/Caddyfile.chonghub`
- Modify: `docs/deployment/tencent-cloud-production.md` if the validation sequence needs the redirect check
- Test/validation: HTTPS curl checks with apex, `www`, HTTP, Googlebot, and mobile user agents

- [ ] Add an explicit permanent redirect for `www` and HTTP variants to the apex HTTPS host while retaining the admin host block.
- [ ] Validate Caddy syntax before reload and verify `Location` headers after reload.
- [ ] Record rollback as restoration of the previous Caddy site blocks.

### Task 5: Run the technical gate

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build:web`.
- [ ] Run `pnpm dev:local`, `pnpm dev:local:check`, then stop the local service with the project launcher.
- [ ] Confirm existing screening E2E behavior remains intact.
