# Design: public storefront information hierarchy refresh

## Boundary

The behavior gap is presentation hierarchy: the current public pages expose all utility links in the main header and spread the decision path across cards, process copy, and long detail content. The data and purchase behavior are already owned by the existing page components and `PurchaseFlow`; this task changes composition and styling only.

Expected files:

- `apps/web/src/components/site-header.tsx`: reduce top-level navigation while keeping route ownership and active states.
- `apps/web/src/app/page.tsx`: refine section copy/order and add explicit trust/fit framing without changing product queries or actions.
- `apps/web/src/components/product-card.tsx`: surface fit, price, proof points, and CTA hierarchy using existing product data.
- `apps/web/src/app/products/page.tsx`: strengthen catalog/pricing page framing and comparison guidance.
- `apps/web/src/app/products/[slug]/page.tsx`: adjust the detail composition around the existing purchase flow and trust content.
- `apps/web/src/app/globals.css`: implement the shared light, teal-accent, editorial commerce treatment and responsive layouts.

Explicitly unchanged: `PurchaseFlow` logic, catalog contracts/services, API routes, middleware, database, admin app, and deployment files.

## Reference lock

- Primary foundation: existing ChongHub light canvas and teal trust accent, sharpened with RevenueCat's single-accent discipline and Shop's compact product presentation.
- Borrowed structure: FlowMapp's pricing sequence (plans, comparison/help) and AVNIER's product-detail split (information/selection/action), adapted to manual fulfillment.
- Preserve: data-driven prices and eligibility, clear manual-confirmation language, existing teal status semantics, visible CTA states, and mobile collapse behavior.
- Reject: SaaS annual/monthly toggles, instant-payment language, cart semantics, decorative hero photography, and extra top-level utility links.

## Layout decisions

- Header: brand left; `商品`, `购买说明`, `订单查询` as primary discovery; `个人中心` as utility; `先检测账号` as the single high-intent action. Privacy stays in footer.
- Home: hero promise and trust facts, product selection, manual fulfillment process, FAQ.
- Catalog/pricing: title and manual-confirmation note, three product cards, a short “how to choose” strip, and guidance link.
- Product detail: back link, two-column hero with eligibility and starting price, existing purchase flow immediately below/alongside, then service points and after-sales sidebar.
- Visual system: existing teal remains the only strong interactive accent; neutral surfaces, thin borders, moderate radius, minimal shadow, and generous section rhythm.
