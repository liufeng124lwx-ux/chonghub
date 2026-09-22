# ChongHub storefront information hierarchy refresh

## Goal

Refresh the public ChongHub homepage, product catalog/pricing view, and product detail page so visitors can understand eligibility, pricing, manual fulfillment, and the next action faster without changing order or screening behavior.

## Requirements

- Keep the existing database-backed products, prices, SKU availability, screening gate, order creation, WeChat handoff, and warranty content intact.
- Improve header navigation hierarchy: keep product discovery, purchase guidance, order lookup, account access, and one primary action visible without exposing every utility link at the same level.
- Make the homepage communicate one clear promise, operational trust signals, product choices, fulfillment steps, and FAQ in that order.
- Treat `/products` as the catalog plus pricing page: show audience/fit, starting price, included service, eligibility, and a clear detail CTA for each product; do not introduce annual/monthly billing controls or online payment claims.
- Make `/products/:slug` a two-column detail and purchase layout with the existing purchase flow near the first viewport, followed by service explanation and after-sales guidance.
- Preserve responsive behavior, keyboard navigation, visible focus states, sold-out semantics, product type labels, and the existing customer-service widget.
- Use the Refero research synthesis: light canvas, restrained single accent, strong content hierarchy, compact navigation, plan comparison/FAQ structure, and product detail selection hierarchy.

## Acceptance Criteria

- [ ] `/`, `/products`, and a published `/products/:slug` render with the refreshed hierarchy and no new API/database dependencies.
- [ ] Existing product names, prices, SKU availability, screening requirements, and purchase flow actions remain data-driven and behaviorally unchanged.
- [ ] Header has a reduced primary navigation and one clear primary action on desktop and mobile; privacy remains discoverable from the footer.
- [ ] Product cards expose product type/platform, fit or eligibility, starting price, service proof points, and a detail CTA without implying instant payment or automatic delivery.
- [ ] Product detail keeps screening and order creation states intact, including sold-out handling and live status messaging.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:web`, and `git diff --check` pass.
- [ ] Local route checks confirm HTTP 200 and CSS/JS asset loading for the affected pages.

## Out of scope

- Database schema, catalog service, API contracts, payment, fulfillment, screening logic, admin UI, deployment, DNS, or production configuration.
- Adding a new online checkout, cart, annual/monthly plan toggle, or fabricated testimonials/reviews.
