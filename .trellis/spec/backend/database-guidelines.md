# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

(To be filled by the team)

## ChongHub Manual-Fulfillment Contracts (2026-09)

### 1. Scope / Trigger

This contract applies to cross-layer order, screening, notification, guest-access, and after-sales changes. It is required because API payloads, PostgreSQL migrations, and browser/admin views share the same order state.

### 2. Signatures

- `POST /api/orders`: accepts `{skuId, contactEmail, declaredSubscription, note, guestPassword?, idempotencyKey}` and returns a public order snapshot; prices are read from the locked published SKU.
- `POST /api/orders/:number/screening`: accepts `{report, idempotencyKey}`; the report is a four-field `ScreeningReport` and the body is limited to 4 KiB.
- `POST /api/orders/:number/after-sales`: accepts `{type, description, idempotencyKey}` and returns `{id}`.
- `POST /api/admin/after-sales/:id/refunds`: accepts `{amountCents, refundedAt, reference, verifiedLossAt?, idempotencyKey, version}`.
- `db/migrations/007_after_sales_hardening.sql`, `008_idempotency.sql`, and `009_settings_policy_version.sql` are additive migrations; never edit an applied migration checksum.

### 3. Contracts

- Monetary fields are integer CNY cents. Public orders expose snapshots, statuses, timeline, and version only; no password digest, session JSON, or notification payload is public.
- Guest credentials are scrypt hashes and short-lived grants. Once an order is bound to a verified email user, guest access/reset is rejected.
- Outbox payloads are event-specific. OTP payloads are encrypted, and the worker clears them after successful delivery, expiry, or terminal failure.
- Attachments are private JPEG/PNG/WebP files, at most 5 MiB and 20 MP, re-encoded before atomic storage; attachment reads require order authorization.

### 4. Validation & Error Matrix

- Unknown/extra screening fields -> `INVALID_REQUEST`.
- Missing or mismatched mutation `Origin` -> `CSRF_REJECTED` (403).
- Reused idempotency key with a different body -> `IDEMPOTENCY_CONFLICT` (409).
- Stale order/after-sale version -> `VERSION_CONFLICT` (409).
- Refund above remaining confirmed receipts -> `INVALID_REQUEST`.
- Guest access to a different order or a user-bound order -> `NOT_FOUND`.
- Oversized JSON/attachment -> `REQUEST_TOO_LARGE`/`PAYLOAD_TOO_LARGE` (413).

### 5. Good / Base / Bad Cases

- Good: a guest creates one order with a 12–128 character password, submits a local screening report, and receives a 24-hour grant.
- Base: a duplicate request with the same idempotency key and body returns the original result without another event or refund.
- Bad: a client sends raw ChatGPT session JSON to an API, changes a quoted price, or uploads a renamed SVG; the server rejects it and does not persist the secret.

### 6. Tests Required

- Unit: screening report shape/status matrix, business-time calculation, and integer refund rounding.
- Integration: migration bootstrap, catalog snapshot, idempotent screening/message/refund, guest-boundary checks, and concurrent refund cap.
- E2E: browser screening must prove the synthetic token never appears in a request body and the textarea is cleared.
- Operational: migrate both a fresh `_test` database and an already-migrated database; run worker failure/retry without rolling back the order transaction.

### 7. Wrong vs Correct

#### Wrong

```ts
await client.query('UPDATE skus SET price_cents=$1 WHERE id=$2', [body.priceCents, body.skuId]);
```

#### Correct

```ts
// Lock and snapshot the published SKU inside the order-creation transaction.
const sku = await client.query('SELECT ... FROM skus ... FOR SHARE', [input.skuId]);
// Store the snapshot; later catalog edits cannot rewrite an existing order.
```

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

(To be filled by the team)

---

## Migrations

<!-- How to create and run migrations -->

(To be filled by the team)

---

## Naming Conventions

<!-- Table names, column names, index names -->

(To be filled by the team)

---

## Common Mistakes

### Test database selection

Vitest runs database-backed tests against `TEST_DATABASE_URL` when
`NODE_ENV=test`; the environment loader maps that value to the connection's
`DATABASE_URL` before the pool is created. This keeps catalog and future
integration tests isolated from the developer database.

Do not run an integration test with only `TEST_DATABASE_URL` while importing a
pool that reads `DATABASE_URL` directly. That either fails with a missing
configuration or accidentally points at `chonghub_dev`.

Required checks:

- The test URL must identify a database whose name ends in `_test`.
- Fresh and already-migrated test databases must both pass migration checks.
- Production and local development continue to use `DATABASE_URL`.

(To be filled by the team)
