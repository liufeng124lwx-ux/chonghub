# Technical design

## Scope and boundaries

The change set is limited to public SEO metadata and discoverability, public article rendering, indexability controls, and the production route needed to serve the Next.js generated metadata endpoints. Existing database/auth/order behavior is unchanged.

## Data flow

- `site-config.ts` defines the canonical production origin, metadata defaults, and OG image path.
- `robots.ts` emits the crawler policy and absolute sitemap URL.
- `sitemap.ts` derives public static, published product, and published article URLs from the same route/data sources used by the application.
- Article frontmatter is validated by `articles.ts`; only published articles enter public links and the sitemap.
- Public layouts/pages emit page-specific metadata and JSON-LD; private layouts emit `noindex,nofollow` and no canonical.
- The deployment release uploads source and immutable checksums, builds x86_64 tagged images on the Tencent host, runs migrations, recreates only ChongHub web/admin services, reloads the shared Caddy config, and probes all required routes.

## Rollout and rollback

1. Run the complete local quality gate and inspect the final diff.
2. Commit the reviewed change set with one release commit.
3. Upload the commit to an immutable release directory with SHA256 manifest.
4. Back up PostgreSQL, validate Compose, migrate, build tagged images, recreate web/admin, and reload Caddy only after health gates.
5. Verify public and reference routes. If a gate fails, keep the prior Caddy route and restore the prior release/tag as directed by the deployment runbook.
6. Verify GSC ownership and submit the sitemap after live endpoints are confirmed.

## GSC verification

Use the existing Chrome GSC property flow. Prefer DNS TXT verification for a URL-prefix property when the browser offers it because it does not require adding a second source change. The operator supplies the TXT record in Cloudflare; the agent then retries verification and submits the absolute sitemap URL. Do not expose the token in source, task artifacts, or final chat.
