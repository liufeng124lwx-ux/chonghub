# ChongHub 人工充值服务站实现

## Goal

Implement the approved ChongHub manual fulfillment product from the design and implementation plan.

## Requirements

- Build the approved ChongHub manual ChatGPT recharge service: public product site, guest and email-code user flows, browser-only account pre-screening, single-admin fulfillment console, after-sales, and notifications.
- Publish only three initial GPT SKUs: ChatGPT Plus monthly ¥145, ChatGPT Pro 5X monthly ¥750, and ChatGPT Pro 20X monthly ¥1,350. Prices remain editable from the admin console and existing order snapshots do not change.
- Allow guests to detect accounts directly on a product page, purchase without a query password, query an order using order number plus contact-email OTP, and open after-sales. Allow verified email-code users to see their own orders and associate eligible guest requests.
- After product-page detection passes, create the order with a loading animation, navigate to its detail, and open a dismissible WeChat dialog. Provide an order-page button to reopen it. Preserve a created order if subsequent detection-report persistence fails; never claim payment has occurred.
- Keep the pasted ChatGPT session JSON in the browser only. Do not upload, persist, log, email, notify, or call any account endpoint with it. Return only a constrained screening enum and rule version to the backend.
- Treat screening as preliminary only. `free` plus required fields is preliminary pass; known `prolite` is subscribed; missing, malformed, expired, or unknown data must not pass automatically.
- Fulfill manually through WeChat. The site records requests, quote, receipt confirmation, materials-ready time, delivery status, completion time, warranty window, and after-sales; it does not process online payment or upstream delivery in this phase.
- Use Beijing time, service hours 09:30–23:00, and complete within two operating hours after receipt and required materials are confirmed. Non-business hours pause the timer.
- Provide 30-day subscription warranty from actual recharge completion. Calculate suggested refund from paid amount and verified remaining time; record refunds manually and cap total refund at paid amount.
- Notify the single owner through a configured Feishu group and users through email, using an outbox with retry and deduplication. External delivery failures must not lose orders.
- Make the admin console responsive for phone use. Protect admin routes server-side; ordinary registration must never grant admin access.

## Acceptance Criteria

- [ ] Public pages show only published SKUs and the approved prices; an edited price affects new requests while an existing snapshot remains unchanged.
- [ ] A guest can submit, screen, query, and open after-sales without registering; invalid credentials cannot read another order.
- [ ] Email OTP is single-use, expires, rate-limited, and first verified login creates an account.
- [ ] Synthetic screening fixtures produce login guidance, subscribed, and preliminary-pass results; malformed, expired, unknown, or missing fields never produce an automatic pass.
- [ ] Browser-network and persistence checks show that the raw session JSON is never sent or stored; a forged client result cannot authorize fulfillment.
- [ ] Duplicate submissions and admin commands are idempotent; payment/receipt, refunds, notifications, and order creation cannot be double-applied.
- [ ] Quote, receipt, delivery, and after-sales are independent statuses with a visible customer timeline and separate private admin notes.
- [ ] Delivery due times cover business-hour boundaries and do not reset when an admin refreshes or edits current settings.
- [ ] Admin can edit products, quotes, receipt, delivery, after-sales, website settings, and notification retries from mobile and desktop.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, and `git diff --check` pass before reporting implementation complete.

## Notes

- Scope is defined by `docs/superpowers/specs/2026-09-20-chonghub-manual-fulfillment-design.md` and `docs/superpowers/plans/2026-09-20-chonghub-manual-fulfillment-implementation.md`.
- Online payment, upstream APIs, automatic fulfillment, Google accounts, Go/iOS/Team SKUs, cart, subscriptions, wallet balance, and multi-staff roles are out of scope.
- The first implementation milestone is the database-backed catalog and public site; later milestones must preserve the privacy and order-state boundaries above.
