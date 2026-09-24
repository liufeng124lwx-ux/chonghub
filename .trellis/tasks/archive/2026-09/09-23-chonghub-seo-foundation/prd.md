# ChongHub SEO foundation and content strategy

## Goal

Improve ChongHub's ability to be crawled, understood, indexed, and selected for real Chinese ChatGPT subscription and recharge searches. The first eight-week cycle focuses on the three existing ChatGPT products and the purchase decisions that precede an order. The work must preserve truthful service boundaries and must not expose ChatGPT credentials or promise account outcomes that cannot be guaranteed.

## Confirmed current facts

- The production user application is `apps/web`; the duplicate root `src/app` tree is not the production SEO source.
- The catalog currently seeds ChatGPT Plus, ChatGPT Pro 5X, and ChatGPT Pro 20X products (`packages/core/src/modules/catalog/seed.ts`).
- Production configuration uses `https://chonghub.com` as `APP_ORIGIN`; Caddy currently serves both the apex and `www` host without a canonical redirect (`ops/deploy/Caddyfile.chonghub`).
- The live `/sitemap.xml` returns 404. The live `/robots.txt` currently contains Cloudflare content-signal comments and no Sitemap field.
- `apps/web` currently has thin root metadata and no sitemap, robots route, canonical, Open Graph, or JSON-LD implementation.
- Product screening parses the supplied ChatGPT session JSON in the browser and sends only a versioned screening report to the server (`apps/web/src/components/purchase-flow.tsx`, `packages/core/src/modules/screening/classify.client.ts`). This behavior must remain verifiable after SEO changes.
- Current privacy and terms pages describe draft policy language and must be reconciled with actual operations before trust content is published.

## Product intent

The primary SEO subject for the first eight weeks is ChatGPT Plus / Pro subscription recharge. The site should use one primary search intent per indexable page, with related long-tail questions handled naturally within that page. It should not mass-produce keyword-variant pages or imitate competitor URL counts without independent information gain.

## In scope

1. Choose and enforce `https://chonghub.com` as the canonical public host.
2. Add a valid, data-driven sitemap and robots endpoint for the production web app.
3. Add unique page metadata, canonical URLs, Open Graph fields, and truthful structured data.
4. Keep private operational pages out of the sitemap and search path.
5. Establish a version-controlled Markdown/MDX article area under `/articles`.
6. Publish and internally link five initial articles about safety, ban risk, passwords, payment alternatives, and Plus/Pro choice.
7. Improve product, guide, screening, and homepage copy so each page has a distinct intent and current business facts.
8. Establish GSC submission, crawl checks, index monitoring, and a four-week content review loop.
9. Review privacy, credential handling, service claims, refund language, and warranty language before publication.

## Out of scope

- Implementing a database-backed editorial CMS in the first cycle.
- Adding Codex, invoice, enterprise procurement, or other content without a corresponding real product or support workflow.
- Publishing translations or `hreflang` pages without complete equivalent content.
- Purchasing links, automated outreach, link networks, or mass-generated article variants.
- Guaranteeing rankings, indexing dates, traffic, conversions, or account safety.
- Changing the order fulfillment, payment, or account-screening business workflow.

## Requirements

### R1. Canonical and crawlability

- Apex HTTPS is the canonical host.
- `www` and HTTP variants redirect permanently to the canonical host.
- `/sitemap.xml` returns a valid XML sitemap containing only public, indexable URLs.
- `/robots.txt` returns 200 and includes an absolute canonical Sitemap URL.
- Sitemap generation uses published products and published article metadata, without query strings, fragments, order numbers, or private routes.

### R2. Page metadata and structured data

- Every public indexable route has a unique title, description, canonical URL, and Open Graph URL.
- Root metadata uses `metadataBase` from the production site configuration.
- Product detail pages may emit `Product` + `Offer` only from current product/SKU/availability data, with CNY pricing and no invented reviews or guarantees.
- Organization and breadcrumb data are emitted where the visible page supports them.
- Visible FAQ content remains useful without relying on `FAQPage` rich-result eligibility.

### R3. Content architecture

- `/articles` lists published articles; article routes use stable slugs and frontmatter.
- Each article has one primary intent, a direct answer, current service boundaries, author/reviewer metadata, update dates, and related internal links.
- Mutable price, stock, delivery, warranty, and contact facts are sourced from the product/settings services or linked to their current pages rather than duplicated as stale article constants.
- Every published article is reachable from the article index and at least one relevant commercial or guide page.

### R4. Trust and privacy

- Public copy does not promise zero ban risk, absolute safety, official authorization, or guaranteed outcomes.
- The screening flow continues to avoid transmitting raw session JSON; request, log, email, notification, and analytics checks must confirm this.
- Privacy, terms, warranty, refund, and contact statements match actual operations before content publication.
- Articles and forms explicitly tell users not to submit passwords, tokens, or raw session content in notes or support messages.

### R5. Measurement

- The canonical and `www` properties are verified in GSC.
- The sitemap is submitted after the endpoint is live.
- Baseline exports cover the latest 28 and 90 days when available.
- The review loop classifies pages by indexing state, query relevance, impressions, clicks, CTR, and ranking range; it does not use fixed keyword-density or word-count targets.

## Acceptance criteria

- [ ] The production apex host is canonical and `www` permanently redirects to it.
- [ ] `/sitemap.xml` returns HTTP 200, valid XML, and exactly the intended public URL set.
- [ ] `/robots.txt` returns HTTP 200 and names the absolute canonical sitemap URL.
- [ ] Homepage, product index, all published product pages, `/guide`, `/screening`, and published articles expose unique metadata and canonical URLs.
- [ ] Organization, breadcrumb, and eligible product structured data validate without invented fields.
- [ ] Private routes are absent from the sitemap and carry appropriate noindex or crawl controls.
- [ ] The first five articles are published only after fact, privacy, and service-claim review.
- [ ] Internal links connect article index, articles, guide, screening, and product pages with no orphaned published article.
- [ ] Local lint, typecheck, build, and endpoint checks pass; production checks cover normal, mobile, and Googlebot user agents.
- [ ] A GSC baseline and first review record exist; observations are reported as measurements rather than ranking guarantees.

## Risks and deferred decisions

- Search demand and competitor metrics supplied by third-party tools are estimates and may use the wrong country or language index. They are inputs for hypotheses, not acceptance evidence.
- Manual fulfillment and account screening create trust and policy risk. The site must publish precise boundaries and avoid claims that depend on an external platform's decisions.
- Article pages can become stale when products or policy change. The implementation must make mutable facts easy to update or link to a current source.
- Conversion attribution beyond GSC is deferred until a privacy-reviewed first-party measurement design is selected.

## Planning status

The user approved the four-part design in chat. This PRD is ready for review; implementation remains blocked until the planning artifacts are approved and the task is explicitly started.

## Child task map

- `09-24-seo-technical-foundation`: production user-app SEO infrastructure and canonical-host behavior.
- `09-24-seo-content-cluster`: version-controlled article routes, five articles, trust copy, and internal links.
- `09-24-seo-validation-gsc`: production crawl checks, GSC submission/baseline, and review cadence after the first two children ship.

The parent is a coordination and integration task. Child 2 depends on the public route and metadata contracts from Child 1. Child 3 depends on both children being deployed or available in a validation environment.
