# SEO production validation and GSC baseline — implementation plan

### Task 1: Add reproducible local/edge SEO check scripts

**Files:**
- Create: `scripts/seo-check.ts` or an equivalent existing validation script
- Create: `tests/unit/seo-check.test.ts` if logic is extracted
- Modify: `package.json` with a `seo:check` script only if it improves repeatability

- [x] Check public status/content type, redirect locations, sitemap XML, robots Sitemap field, canonical, OG, and representative JSON-LD.
- [x] Support normal, mobile, and Googlebot user-agent headers.
- [x] Redact response bodies and never log cookies, tokens, or form contents.
- [x] Run the script against local and production targets with explicit target labels.

### Task 2: Validate the deployed edge

- [ ] Run the project’s required local checks first.
- [ ] Check `https://chonghub.com` and `https://www.chonghub.com` with `curl -I` and full HTML requests.
- [ ] Check HTTP-to-HTTPS and `www`-to-apex permanent redirects.
- [ ] Check `/robots.txt` and `/sitemap.xml` through Cloudflare, record edge headers/content, and compare to local output.
- [ ] Check representative public and private routes; ensure private route controls are visible to Googlebot where `noindex` is used.
- [ ] Check product and article JSON-LD with Rich Results Test or equivalent parser.

### Task 3: Submit GSC and capture baseline

- [ ] Verify/record apex and `www` properties.
- [ ] Submit `https://chonghub.com/sitemap.xml` once.
- [ ] Inspect homepage, product index, one product, guide, screening, article index, and one article.
- [ ] Export queries, pages, dates, countries, devices, and page-indexing reasons for the latest available 28/90-day ranges.
- [ ] Store a dated summary without credentials and note data delay/coverage limitations.

### Task 4: Establish review actions

- [x] Create week-2, week-4, and week-8 review tables.
- [x] Map each observation to indexability, query relevance, CTR/title, internal linking, or conversion follow-up.
- [x] Do not change article content solely because a third-party tool estimates a keyword volume.
