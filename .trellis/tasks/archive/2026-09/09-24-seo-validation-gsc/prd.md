# SEO production validation and GSC baseline

## Goal

Validate the deployed SEO surface and establish a repeatable GSC measurement record after the technical and content children ship.

## Scope

In scope: production HTTP/HTTPS checks, Cloudflare/Caddy robots behavior, sitemap submission, representative URL Inspection, index and query baseline capture, and a dated review record. It does not include automated Google credentials, ranking guarantees, paid links, or changes to product logic.

## Requirements

- Verify apex, `www`, HTTP, mobile, normal browser, and Googlebot behavior for public URLs.
- Verify `/robots.txt` and `/sitemap.xml` at the edge, not only against a local Next server; record whether Cloudflare modifies or replaces the response.
- Verify core pages and at least one article with GSC URL Inspection after deployment.
- Submit the canonical sitemap once the endpoint is live; do not repeatedly request indexing for every URL.
- Capture GSC exports for queries, pages, dates, countries, devices, and page-indexing reasons when available.
- Record exact date range, property, export source, and limitations of static CSV data.
- Establish weeks 2, 4, and 8 review rules based on indexability, query relevance, impressions, clicks, CTR, and ranking range.

## Acceptance criteria

- [ ] A dated production check record covers redirects, status codes, content types, canonical/OG, robots, sitemap, and representative JSON-LD.
- [ ] GSC properties for apex and `www` are verified or the missing authorization is clearly recorded as a blocker.
- [ ] Sitemap submission result and any errors are recorded.
- [ ] URL Inspection results exist for homepage, product index, one product, guide, screening, article index, and one article.
- [ ] Baseline exports or an explicit “no data yet” record are stored without secrets or credentials.
- [ ] A next-review table assigns actions to indexability, intent, CTR, internal linking, or business-conversion findings.

## Risks and boundaries

- GSC data is delayed and CSV exports are snapshots; do not present them as real-time traffic.
- No browser plugin or OAuth credential is required for this child. The user can upload CSV exports when available.
- Cloudflare robots management may produce a syntax warning for non-Google directives; record the actual Googlebot result and preserve the application sitemap directive.
