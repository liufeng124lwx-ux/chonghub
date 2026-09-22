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

## 8. Admin Catalog Lifecycle

### Signatures

- `POST /api/admin/products` creates one product and its first SKU. It accepts unique lower-case slugs, descriptive text, integer `priceCents`, optional `status` (`draft` by default), and an idempotency key.
- `POST /api/admin/products/:productId/publish` publishes a product only when it has a published SKU.
- `POST /api/admin/products/:productId/archive` changes the product to `unlisted` and records an audit event.
- `PATCH /api/admin/products/:productId/skus/:skuId/status` changes SKU lifecycle independently from `availability`.
- `012_catalog_commands.sql` stores create, publish, archive, and SKU lifecycle command keys for replay protection.

### Contracts

- The admin catalog DTO includes draft, published, and archived products. Public catalog queries remain filtered to published products and SKUs.
- “Delete” is an archive operation. Product and SKU rows are retained so historical order snapshots and restoration remain safe.
- Publishing and archive actions require the dedicated admin session, a fresh idempotency key, a transaction, and an audit event.

### Validation & Error Matrix

| Condition | Result |
|---|---|
| Duplicate product or SKU slug | `CONFLICT`, no product inserted |
| Publish without a published SKU | `INVALID_REQUEST`, product remains unchanged |
| Archive product | `unlisted`, no physical delete, audit event recorded |
| Replayed catalog command | original result/no second state transition |

### Good / Base / Bad Cases

- Good: create a draft, review it, publish its SKU, then publish the product.
- Base: mark one SKU sold out while keeping the product and other SKUs visible.
- Bad: use `listPublishedProducts()` for the admin page or run SQL `DELETE` against a product with historical orders.

### Tests Required

- Integration: create idempotency replay, slug conflicts, publish precondition, archive visibility, and SKU status/availability independence.
- UI: draft/published/archived summary counts, price save, sold-out toggle, publish, and archive copy.

### Wrong vs Correct

```sql
-- Wrong
DELETE FROM products WHERE id = $1;

-- Correct
UPDATE products SET status = 'unlisted', updated_at = now() WHERE id = $1;
```

## 9. Product Type and Platform

- `products.product_type` is `recharge | account`; the migration default is `recharge` so existing rows keep their behavior.
- `categories` remains the platform dimension (`chatgpt | claude | google` in the current catalog). Product DTOs expose both `productType` and `platform`.
- Account products use `screening_method = 'none'`, retain `delivery_method = 'manual'`, and create an order snapshot without ChatGPT screening data.
- Recharge products keep the existing `gpt_session` screening contract unless an explicit no-screening product is created by the operator.
- Current account fulfillment is a human WeChat workflow. Payment, credential storage, inventory deduction, and automatic delivery are out of scope until a separate qualification and implementation task is approved.

### Validation

- Admin create normalizes account products to `screening_method = 'none'` and preserves the selected platform.
- Public catalog and order snapshots expose product type and platform so account and recharge copy cannot be conflated.
