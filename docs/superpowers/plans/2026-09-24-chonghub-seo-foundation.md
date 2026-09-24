# ChongHub SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ChongHub crawlable and semantically clear, then add five reviewed ChatGPT pre-purchase articles and a measured GSC validation loop.

**Architecture:** The production `apps/web` app owns metadata routes, public HTML, JSON-LD, article rendering, and the sitemap URL contract. Caddy normalizes the public host. The catalog/settings services remain sources for mutable product facts; local MDX files provide reviewed article bodies and metadata. A final validation child checks the edge and GSC instead of treating local tests as production proof.

**Tech Stack:** Next.js 15 App Router, TypeScript, React Server Components, existing catalog/settings services, Caddy, Vitest, Playwright, Markdown/MDX with the smallest required build-time dependency set.

**Spec:** `docs/superpowers/specs/2026-09-23-chonghub-seo-foundation-design.md`

## Global Constraints

- Production SEO source is `apps/web`; do not edit the inactive root `src/app` tree for this work.
- Canonical public origin is `https://chonghub.com`; production metadata must not contain localhost.
- Sitemap contains only public canonical URLs; drafts, orders, API, admin, login, and personal routes are excluded.
- Raw ChatGPT session JSON must remain browser-local and must not enter analytics, logs, notifications, JSON-LD, or article components.
- Do not use fixed keyword density, fixed article word counts, purchased links, link networks, or unsupported safety/no-ban/official-authorization claims.
- Mutable price, availability, delivery, warranty, and contact facts come from live services or links to live pages.
- Use `pnpm dev:local` for local development; do not start multiple Next dev servers.

## Review Focus

- Cloudflare replacing or augmenting `robots.txt`: edge response must still expose the canonical sitemap and not accidentally block Googlebot.
- `noindex` combined with robots disallow: routes requiring noindex must remain crawlable enough for Google to see the directive.
- Product/SKU price and availability changes: Product JSON-LD and visible copy must use the same current values and omit fabricated reviews.
- Draft article leakage: draft files must not route, link, or enter sitemap output.
- Screening secret leakage: SEO rendering, analytics, logs, and article examples must never serialize the raw session value.

### Child Task 1: Technical SEO foundation

**Files:** see `.trellis/tasks/09-24-seo-technical-foundation/implement.md`.

- [ ] Add site config, robots, sitemap URL provider, metadata, JSON-LD, route controls, and Caddy redirect.
- [ ] Add focused tests for URL sets, metadata, JSON-LD, and redirect behavior.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build:web`.
- [ ] Preserve the existing screening E2E contract.

### Child Task 2: Article cluster and trust content

**Files:** see `.trellis/tasks/09-24-seo-content-cluster/implement.md`.

- [ ] Add typed article loader and published/draft filtering.
- [ ] Add `/articles` and `/articles/[slug]` routes with stable metadata and breadcrumbs.
- [ ] Write and review the five agreed articles.
- [ ] Add natural internal links from homepage, guide, products, and article index.
- [ ] Run article tests, lint, typecheck, and build.

### Child Task 3: Production validation and GSC baseline

**Files:** see `.trellis/tasks/09-24-seo-validation-gsc/implement.md`.

- [ ] Run local and edge endpoint checks for normal, mobile, and Googlebot agents.
- [ ] Confirm Cloudflare/Caddy behavior and the canonical redirect.
- [ ] Submit sitemap and inspect representative URLs in GSC.
- [ ] Store a dated baseline or an explicit no-data record.
- [ ] Establish week-2, week-4, and week-8 review actions.

## Integration Gate

- [ ] Combined sitemap contains the intended public URL set with no orphan articles.
- [ ] Combined rendered HTML has unique metadata and consistent canonical URLs.
- [ ] Private routes are excluded or noindexed correctly.
- [ ] Privacy and service claims match the current fulfillment workflow.
- [ ] All local quality gates pass before production validation.
