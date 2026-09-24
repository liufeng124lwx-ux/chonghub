# SEO foundation deployment and GSC submission

## Requirements

- Publish the already implemented ChongHub SEO foundation to production at `https://chonghub.com`.
- Preserve the existing storefront, checkout, admin, database, and shared Caddy service boundaries.
- Production must expose a working `robots.txt` with a canonical sitemap directive and a working `sitemap.xml` containing only public indexable routes.
- Public pages must retain unique titles/descriptions/canonicals, Open Graph metadata, breadcrumb/organization/article/product structured data, and the five approved Chinese SEO articles.
- Private/account/admin routes must remain excluded from indexing and must not inherit a public canonical URL.
- Commit the complete reviewed change set on `main` with a reproducible release identifier.
- Deploy using the canonical Tencent Cloud runbook and record local and live verification evidence.
- Verify ownership of the `https://chonghub.com/` URL-prefix property in Google Search Console and submit `https://chonghub.com/sitemap.xml`. If DNS TXT verification is required, hand off only the DNS record value to the operator through the browser flow and resume after it propagates.

## Acceptance criteria

1. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:web`, `pnpm build:admin`, `git diff --check`, and the required compose/shell validations pass.
2. The committed diff contains the SEO foundation, article content, image assets, private noindex layouts, sitemap/robots routes, deployment routing changes, tests, and GSC runbook with no secrets.
3. Production deployment completes through the canonical release directory and tagged Compose workflow; web/admin/PostgreSQL are healthy, public HTTPS and reference health probes pass, and admin unauthenticated access remains protected.
4. Live `https://chonghub.com/robots.txt` returns 200 text/plain and includes `Sitemap: https://chonghub.com/sitemap.xml`.
5. Live `https://chonghub.com/sitemap.xml` returns 200 XML, parses successfully, and excludes private/admin/API paths.
6. Live homepage, articles index, one article, products, guide, and one product detail expose expected canonical/OG/JSON-LD signals; private login remains noindex without a canonical.
7. GSC reports the URL-prefix property verified and the sitemap submission accepted or pending with the exact submitted URL recorded. If verification is blocked by DNS propagation, record the exact pending state and leave the browser handoff ready.
8. The final report clearly separates committed/deployed/GSC-verified evidence from any remaining operator-dependent step.
