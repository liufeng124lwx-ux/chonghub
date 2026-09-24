# SEO article cluster and trust content — implementation plan

### Task 1: Add the validated article model and loader

**Files:**
- Create: `apps/web/content/articles/*.mdx` (initially one fixture article for the loader test)
- Create: `apps/web/src/lib/articles.ts`
- Create: `tests/unit/articles.test.ts`

**Interfaces:** `ArticleFrontmatter`, `PublishedArticle`, `listPublishedArticles()`, `getPublishedArticle(slug)`, and `listPublishedArticleUrls()` are consumed by article routes and the sitemap task.

- [ ] Add tests for required frontmatter, draft filtering, stable sorting, unknown slugs, and path traversal rejection.
- [ ] Implement the loader and typed validation with no database/network access.
- [ ] Run the focused article tests.

### Task 2: Add article routes and rendering

**Files:**
- Create: `apps/web/src/app/articles/page.tsx`
- Create: `apps/web/src/app/articles/[slug]/page.tsx`
- Create/modify: `apps/web/src/components/article-layout.tsx`, `apps/web/src/components/article-links.tsx`
- Modify: `apps/web/next.config.ts` and package manifests only if the chosen MDX parser requires it
- Test: `tests/unit/article-routes.test.ts`, `tests/e2e/seo-pages.spec.ts`

- [ ] Add tests that drafts 404/are absent, published pages render server HTML, metadata is unique, and required internal links exist.
- [ ] Implement `/articles` and static `/articles/[slug]` using the loader contract.
- [ ] Render the author/reviewer/update block and visible breadcrumb.
- [ ] Keep the dependency set minimal; use existing Next.js conventions and do not introduce a CMS.
- [ ] Run focused tests and build.

### Task 3: Write and review five articles

**Files:**
- Create: `apps/web/content/articles/chatgpt-topup-safety.mdx`
- Create: `apps/web/content/articles/chatgpt-account-ban-risk.mdx`
- Create: `apps/web/content/articles/chatgpt-without-overseas-card.mdx`
- Create: `apps/web/content/articles/chatgpt-topup-password.mdx`
- Create: `apps/web/content/articles/chatgpt-plus-vs-pro.mdx`
- Modify: `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx` only to remove inaccurate draft claims that conflict with the actual flow

- [ ] Start each article with a direct answer and identify the primary intent in frontmatter.
- [ ] Include current process links, risk boundary, user checklist, and a relevant CTA.
- [ ] Avoid fixed keyword density, fixed word count, absolute safety/no-ban claims, official-authorization claims, credentials, and stale mutable facts.
- [ ] Fact-review product names, eligibility, local screening, manual confirmation, payment, delivery, warranty, and privacy wording against current code/settings.

### Task 4: Add internal links from public pages

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/products/page.tsx`
- Modify: `apps/web/src/app/products/[slug]/page.tsx`
- Modify: `apps/web/src/app/guide/page.tsx`

- [ ] Add a small set of natural guide/article links to each relevant page.
- [ ] Ensure every published article is reachable from the index and at least one commercial/guide page.
- [ ] Verify no link serializes client purchase state or raw screening text.

### Task 5: Run the content gate

- [ ] Run article and SEO page tests.
- [ ] Run `pnpm lint`, `pnpm typecheck`, and `pnpm build:web`.
- [ ] Inspect rendered HTML for title, canonical, visible headings, links, and privacy text.
- [ ] Mark any article requiring business confirmation as draft rather than publishing an unsupported claim.
