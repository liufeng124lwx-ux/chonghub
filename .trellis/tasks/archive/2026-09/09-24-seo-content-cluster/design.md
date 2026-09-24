# SEO article cluster and trust content — design

## Content model

Use local reviewed MDX files with typed metadata. The loader reads only files under `apps/web/content/articles`, validates the frontmatter shape, filters drafts, and returns stable records to the article index, dynamic route, metadata generator, and sitemap provider. Article bodies render as server components; they never receive purchase-flow textarea state.

## Route model

- `/articles`: sorted published index with title, summary, update date, and intent-neutral link text.
- `/articles/[slug]`: `generateStaticParams` for published slugs, `dynamicParams = false`, metadata from frontmatter, visible breadcrumb, author/reviewer/update block, article body, and related links.

The first implementation may use explicit exported metadata objects in MDX or a small frontmatter parser, provided the loader validates all required keys and the route remains static/content-backed. Do not add a database or remote content fetch.

## Content rules

The safety and ban-risk articles must distinguish platform risk from ChongHub process claims. The password article must state that passwords and raw session content are not requested. The payment article must distinguish official subscription options from manual service limitations. The comparison article must use current product names/prices from product links and avoid unsupported feature claims.

The article page can render a current `ProductCard` or link to a product, but article markdown must not duplicate mutable price/stock/guarantee constants. Each page has one primary intent and related questions only when they improve the answer.

## Internal links

The article index links all published articles. Home and guide link selected articles. Product detail pages link to relevant safety/password/comparison content. Every article links to at least one product/`/products` page and one `/guide` or `/screening` page.

## Privacy boundary

No analytics, MDX component, syntax example, or JSON-LD path may read or serialize the raw ChatGPT session input. Content examples use placeholders such as “不要提交密码或令牌” and never include realistic credentials.
