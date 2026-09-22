# Service Isolation and Catalog Availability

## 1. Scope / Trigger

This contract applies to the split web/admin services, administrator sessions, SKU availability changes, and order creation. It is required for changes that cross Next apps, shared core modules, PostgreSQL migrations, or admin APIs.

## 2. Signatures

- `setSkuAvailability(productId, skuId, availability, actor, idempotencyKey, expectedVersion)` updates one SKU inside a transaction.
- `createRequest(...)` locks the selected SKU before creating an order.
- Admin endpoint: `PATCH /api/admin/products/:productId/skus/:skuId/availability`.
- Public endpoint: `POST /api/orders`.

## 3. Contracts

- `availability` is exactly `available | sold_out`; lifecycle `status` remains `draft | published | unlisted`.
- Admin requests include `productId`, `skuId`, `availability`, `expectedVersion`, and `idempotencyKey`.
- A public SKU is purchasable only when product and SKU status are `published` and availability is `available`.
- Admin login accepts a normalized username and password through `POST /api/admin/auth/login`; passwords are stored as scrypt digests in `admin_credentials`. Admin sessions use `chonghub_admin_session`; public sessions use `chonghub_session`.
- Web runs on 3000 and admin on 3001. Both share PostgreSQL; `healthz` is process health and `readyz` checks PostgreSQL.

## 4. Validation & Error Matrix

| Condition | Result |
|---|---|
| Unknown availability or missing version/key | `INVALID_REQUEST` |
| SKU missing or not owned by `productId` | `NOT_FOUND` |
| Stale version | `CONFLICT` |
| Repeated `(skuId, idempotencyKey)` | idempotent replay, no second version increment |
| Sold-out or unpublished SKU at order commit | `SKU_UNAVAILABLE`, no order inserted |
| Unknown or invalid admin credentials | `INVALID_CREDENTIALS`, no session issued |

## 5. Good/Base/Bad Cases

- Good: lock the SKU with `FOR UPDATE`, validate status and availability, then insert the order snapshot.
- Base: a sold-out SKU remains visible in the public catalog with `isPurchasable: false`.
- Bad: placing admin handlers in the web catch-all route, or treating a public order number as admin authentication.

## 6. Tests Required

- Unit: availability derivation and invalid values.
- Integration: migration idempotency, product/SKU ownership, idempotency replay, and sold-out order rejection.
- Service: web/admin route ownership, health/readiness, independent builds.
- Auth: cookie names, admin actor checks, revocation, and cross-cookie rejection.

## 7. Wrong vs Correct

### Wrong

```sql
SELECT id FROM skus WHERE id = $1 FOR SHARE;
```

### Correct

```sql
SELECT id, availability FROM skus
WHERE id = $1 AND product_id = $2
FOR UPDATE;
```
