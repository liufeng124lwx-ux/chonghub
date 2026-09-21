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
