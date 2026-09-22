# Frontend Service Boundaries

## 1. Scope / Trigger

This contract applies to pages, components, middleware, and API routes in `apps/web` and `apps/admin`.

## 2. Signatures

- Web owns public pages and `/api/[...path]`.
- Admin owns `/admin/**` and `/api/admin/[...path]`.
- Admin availability controls call `PATCH /api/admin/products/:productId/skus/:skuId/availability`.

## 3. Contracts

- Web middleware returns 404 for `/admin` and `/api/admin/**`.
- Admin middleware allows only admin pages, admin API, login, and health endpoints.
- Sold-out `<option>` elements are disabled; the purchase button is disabled and the submit handler rechecks `isPurchasable`.
- Admin controls send `productId`, `skuId`, `availability`, `expectedVersion`, and a fresh idempotency key.

## 4. Validation & Error Matrix

- `isPurchasable === false` -> show sold-out state and block submission.
- API `409` -> preserve the editor and ask the operator to refresh.
- Cross-service route -> 404 from middleware and no handler in the other app's source tree.

## 5. Good/Base/Bad Cases

- Good: keep admin components and API imports under `apps/admin`.
- Base: shared DTOs come from `@chonghub/core`; UI components remain app-local.
- Bad: copying the full public API into the admin catch-all or relying only on middleware to hide it.

## 6. Tests Required

- Static route ownership assertions.
- Independent web/admin typecheck and production builds.
- Component contract tests for sold-out display, disabled selection, and conflict handling.

## 7. Wrong vs Correct

### Wrong

```tsx
<button onClick={buy}>立即购买</button>
```

### Correct

```tsx
<button disabled={!selectedSku?.isPurchasable} onClick={buy}>立即购买</button>
```

## 8. Admin Product Workflow

- The admin page must list all lifecycle states through an admin DTO. It must provide a create form, explicit publish action, and archive action with copy explaining that historical orders remain intact.
- Product status (`draft`, `published`, `unlisted`) and SKU availability (`available`, `sold_out`) are separate controls. A sold-out SKU remains visible but cannot be selected for a new public order.
- The admin editor sends a fresh idempotency key for create, publish, archive, SKU lifecycle, and availability writes. A conflict preserves the editor and asks the operator to refresh.

## 9. Product Type Presentation

- The admin editor requires an explicit product type (`会员充值服务` or `账号商品`) and platform (`ChatGPT`, `Claude`, or `Google`).
- Account product purchase flows skip ChatGPT session screening and show manual fulfillment copy; recharge flows retain the screening gate.
- Public cards and detail pages display the platform and product type. Account copy must say that the customer submits a request for manual confirmation and that online payment/automatic delivery are not currently connected.
