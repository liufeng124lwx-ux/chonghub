# SEO article cluster and trust content

## Goal

Add a reviewed, version-controlled content cluster that answers five real pre-purchase questions, connects users to the existing guide/screening/product flow, and does not make unsupported safety or service promises.

## Scope

In scope: article frontmatter/content loader, `/articles` and `/articles/[slug]`, five initial articles, article metadata, visible author/reviewer/update information, internal links from public commercial pages, and factual/privacy copy updates required before publication. A database CMS, translations, unsupported topics, and order workflow changes are out of scope.

## Requirements

- Store content under `apps/web/content/articles` with typed frontmatter: `slug`, `title`, `description`, `primaryIntent`, `publishedAt`, `updatedAt`, `author`, `reviewedBy`, `relatedProducts`, and `status`.
- Only `status: published` content is routable, listed, linked, or included in sitemap data.
- Publish five articles: `chatgpt-topup-safety`, `chatgpt-account-ban-risk`, `chatgpt-without-overseas-card`, `chatgpt-topup-password`, and `chatgpt-plus-vs-pro`.
- Each article starts with a direct answer, explains current ChongHub rules, states uncertainty and non-covered cases, and links to relevant products, `/guide`, or `/screening`.
- Do not use fixed keyword-density or word-count targets, copy competitor pages, or create one page for every query variation.
- Do not hardcode mutable prices, stock, delivery times, warranty days, or contact identifiers inside articles; link to current service data or render current product data through approved components.
- Update public trust copy so raw passwords, tokens, and session JSON are never requested in notes or support messages. Reconcile draft privacy/terms wording with the actual current flow before marking articles published.
- Add article links to the home page, guide, product list/detail pages, and article index without creating orphaned articles.

## Acceptance criteria

- [ ] `/articles` lists exactly the published initial articles and no drafts.
- [ ] Each article has a stable canonical URL, unique title/description, author/reviewer/update fields, and a direct answer above the fold.
- [ ] All five articles link to at least one relevant commercial/guide/screening page, and each is reachable from a public page other than the index.
- [ ] Article content contains no unsupported zero-risk/no-ban/official-authorization claims and no credential examples.
- [ ] Product and guide pages expose the relevant article links with natural anchor text.
- [ ] Article metadata is available to the technical sitemap provider without importing client-side purchase state.
- [ ] Draft filtering, frontmatter validation, link resolution, and existing application typecheck/build pass.

## Dependencies and risks

- Depends on the public metadata and sitemap contracts from `09-24-seo-technical-foundation`.
- Actual service-policy facts come from current code/settings and must be reviewed before publication; article copy must not invent business promises.
- MDX support may require adding build-time dependencies; keep the dependency set minimal and avoid a CMS migration.
