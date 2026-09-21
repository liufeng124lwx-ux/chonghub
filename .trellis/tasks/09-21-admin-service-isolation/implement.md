# 独立后台服务与订单商品管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将公开站点和运营后台拆成可独立构建、启动、发布和回滚的两个 Next 服务，并补齐 SKU 级售罄管理、后台专用认证和订单一致性验证。

**Architecture:** 在当前 monorepo 中新增 `apps/web` 与 `apps/admin` 两个 Next 应用；把数据库、认证、订单、商品和通知等领域逻辑整理为共享 `packages/core`。公开应用只包含公开页面/API，后台应用只包含管理员页面/API；两者共享同一 PostgreSQL 和事务边界。

**Tech Stack:** Next.js 15、React 19、TypeScript、pnpm workspace、PostgreSQL/`pg`、Vitest、Playwright、Docker Compose。

**Spec:** `.trellis/tasks/09-21-admin-service-isolation/prd.md` 和 `.trellis/tasks/09-21-admin-service-isolation/design.md`

## Global Constraints

- 两个服务共享 PostgreSQL，不引入第二套业务数据库或跨库同步。
- SKU 售罄使用 `available/sold_out`，与 `draft/published/unlisted` 生命周期状态分离。
- 售罄提交后新订单必须拒绝；不实现库存扣减或“最多一单”语义。
- 后台使用独立域名/端口、独立构建产物和专用管理员 Cookie；普通用户会话不能访问后台。
- 数据库迁移只做向前兼容变更；回退使用应用镜像回滚或前向修复，不执行破坏性 down migration。
- 公开站点的根目录开发入口继续使用项目要求的 `pnpm dev:local`；后台增加明确的本地启动命令，不能让多个服务抢占 3000 端口。
- 每个写操作保留现有 CSRF、事务、幂等和审计约束；不把公开订单号当作认证凭据。

## 文件与边界地图

- `apps/web/`：公开 Next 应用入口、公开页面、公开 API、公开样式和 web 专用配置。
- `apps/admin/`：管理员 Next 应用入口、后台页面、后台 API、后台样式和 admin 专用配置。
- `packages/core/`：从当前 `src/modules/`、`src/server/` 中整理出的共享数据库、认证、订单、商品、售后、通知和类型模块；不依赖 Next 页面组件。
- `db/migrations/010_catalog_availability.sql`：SKU 可售状态迁移。
- `scripts/dev-web.ts`、`scripts/dev-admin.ts`、`scripts/build-web.ts`、`scripts/build-admin.ts`：本地和生产构建/启动包装脚本。
- `compose.dev.yml`：增加 admin 服务的本地编排，但保持 PostgreSQL/Mailpit 服务兼容。
- `tests/unit/catalog-availability.test.ts`、`tests/integration/catalog-availability.test.ts`、`tests/integration/service-isolation.test.ts`、`tests/e2e/admin-service.spec.ts`：分别验证状态规则、数据库一致性、进程隔离和关键 UI 流程。

---

### Task 1: 建立双应用 workspace 和共享包边界

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`
- Create: `apps/admin/package.json`, `apps/admin/tsconfig.json`, `apps/admin/next.config.ts`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`
- Modify: `package.json`, `tsconfig.json`, `next-env.d.ts`
- Move/modify: current `src/modules/**` and `src/server/**` into `packages/core/src/**`, preserving import-level module boundaries
- Test: `tests/unit/workspace-boundary.test.ts`

**Interfaces:**
- `@chonghub/core` exports the existing domain contracts and services without importing `next`, `react`, or `next/server`.
- `apps/web` and `apps/admin` consume `@chonghub/core` through workspace imports.
- Root scripts remain the compatibility entrypoint and delegate to the selected app.

- [ ] **Step 1: Record the current baseline**

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: all existing checks pass before moving files. Save the command output in the task journal; do not start the split on a failing baseline.

- [ ] **Step 2: Create workspace package manifests and path aliases**

Define `@chonghub/core` as a private workspace package. Configure each app to resolve `@chonghub/core/*` and its own `@/*` alias. Keep runtime dependencies in the package that executes them; do not rely on undeclared root hoisting.

- [ ] **Step 3: Move server-only domain code into `packages/core/src`**

Move database, environment, crypto, HTTP error, auth, catalog, orders, fulfillment, after-sales, settings, notification, and screening modules. Replace page-relative imports with package-local imports and add an explicit `server-only` boundary in database and credential modules.

- [ ] **Step 4: Add the boundary regression test**

Test that `packages/core/src` contains no imports from `next`, `react`, or app route files, and that both app TypeScript configs resolve the package. The test should fail if a UI module is imported into the shared package.

- [ ] **Step 5: Run the package checks**

Run:

```bash
pnpm install
pnpm typecheck
pnpm test tests/unit/workspace-boundary.test.ts
```

Expected: the package graph resolves and the existing unit suite remains green.

- [ ] **Step 6: Commit the boundary change**

```bash
git add pnpm-workspace.yaml package.json tsconfig.json apps packages tests/unit/workspace-boundary.test.ts
git commit -m "refactor: split web and admin workspace boundaries"
```

Rollback: if package resolution or the baseline suite fails, revert only this commit before continuing; do not alter database files.

### Task 2: Create isolated web and admin app entrypoints

**Files:**
- Create: `apps/web/src/app/**` for all current public pages, `apps/web/src/app/api/**`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
- Create: `apps/admin/src/app/**` for current admin pages, admin API routes, admin layout and admin styles
- Create: `apps/web/src/middleware.ts`, `apps/admin/src/middleware.ts`
- Modify: `apps/web/next.config.ts`, `apps/admin/next.config.ts`, root `next.config.ts`
- Modify: `Dockerfile`, `package.json`
- Test: `tests/integration/service-isolation.test.ts`

**Interfaces:**
- Web app owns `/`, `/products/**`, `/requests/**`, `/orders/**`, `/me`, `/guest/**`, `/login`, public `/api/**`.
- Admin app owns `/admin/**`, `/login` for administrator entry, and `/api/admin/**`.
- Neither app serves the other app's route set; both use the shared core package for data access.

- [ ] **Step 1: Create the web app from the existing public route set**

Move public pages and the current public API route into `apps/web/src/app`. Keep all existing URLs and public DTO shapes. Update imports to `@chonghub/core` and keep public `APP_ORIGIN` checks scoped to the web origin.

- [ ] **Step 2: Create the admin app from the existing admin route set**

Move admin pages, order actions, product editor, settings editor, and admin API handlers into `apps/admin/src/app`. The admin app must not import public page components to decide authorization; authorization lives in core and is checked again inside each API handler.

- [ ] **Step 3: Add route allowlists and health endpoints**

Add a lightweight `/healthz` endpoint to each app returning `{ service: 'web'|'admin', ok: true }` without a database query, plus `/readyz` that checks PostgreSQL. Middleware must reject the other service's route prefix with 404. Do not treat `/healthz` as proof that PostgreSQL is healthy.

- [ ] **Step 4: Add independent build and start commands**

Configure distinct build directories and standalone output for web and admin. Add root scripts:

```json
{
  "dev:web": "pnpm --filter @chonghub/web dev",
  "dev:admin": "pnpm --filter @chonghub/admin dev",
  "build:web": "pnpm --filter @chonghub/web build",
  "build:admin": "pnpm --filter @chonghub/admin build",
  "start:web": "node apps/web/.next-build/standalone/server.js",
  "start:admin": "node apps/admin/.next-build/standalone/server.js"
}
```

Use ports 3000 and 3001 in local development. Update `scripts/local-dev.ts` only for the public service; add a separate admin launcher that refuses to terminate a process it cannot prove belongs to this checkout.

- [ ] **Step 5: Test route and process isolation**

Run:

```bash
pnpm build:web
pnpm build:admin
pnpm test tests/integration/service-isolation.test.ts
```

Expected: each build succeeds independently; web returns 404 for admin routes and admin returns 404 for public-only route handlers; both health endpoints identify the correct service.

- [ ] **Step 6: Commit the two app entrypoints**

```bash
git add apps Dockerfile package.json next.config.ts scripts tests/integration/service-isolation.test.ts
git commit -m "feat: add isolated web and admin services"
```

Rollback: keep the existing root app start command available until both new builds and route checks pass; switch the deployment back to the prior image if either service fails health checks.

### Task 3: Split administrator authentication and API ownership

**Files:**
- Modify: `packages/core/src/modules/auth/session.ts`, `packages/core/src/modules/auth/access.ts`, `packages/core/src/modules/auth/otp.ts`
- Create: `packages/core/src/modules/auth/admin-session.ts`
- Modify: `apps/web/src/app/login/page.tsx`, `apps/admin/src/app/login/page.tsx`, `apps/admin/src/app/admin/layout.tsx`
- Modify: `apps/admin/src/app/api/[...path]/route.ts`, `apps/web/src/app/api/[...path]/route.ts`
- Create: `tests/integration/admin-auth.test.ts`

**Interfaces:**
- `createAdminSession(userId: string): Promise<{ token: string; expiresAt: Date }>`
- `readAdminActor(request: Request): Promise<Extract<Actor, { kind: 'admin' }> | null>`
- `adminSessionCookie(token: string, expiresAt: Date): string`
- Web `readActor` accepts only the public session cookie; admin `readAdminActor` accepts only the admin cookie.

- [ ] **Step 1: Write failing authentication tests**

Cover these cases: administrator can log in from admin service; public user cookie cannot call admin API; admin cookie cannot create a public user session; unauthenticated admin page redirects to admin login; logout revokes the admin session.

- [ ] **Step 2: Add the admin-only session cookie path**

Use a separate cookie name and the existing hashed session storage. Preserve the 12-hour admin expiration, `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Keep admin identity lookup against `admin_identity`; no settings API may grant admin access.

- [ ] **Step 3: Move admin handlers behind the admin actor**

Every admin API branch must call `readAdminActor` and return the existing forbidden error for all other actors. Public route code must not mount `/api/admin/**` handlers.

- [ ] **Step 4: Pass auth and CSRF tests**

Run:

```bash
pnpm test tests/integration/admin-auth.test.ts
pnpm typecheck
```

Expected: all cookie and authorization cases pass without exposing token values in test output.

- [ ] **Step 5: Commit the authentication boundary**

```bash
git add packages/core/src/modules/auth apps/web/src/app/login apps/admin/src/app/login apps/admin/src/app/admin apps/*/src/app/api tests/integration/admin-auth.test.ts
git commit -m "feat: isolate administrator authentication"
```

### Task 4: Add SKU availability and enforce order consistency

**Files:**
- Create: `db/migrations/010_catalog_availability.sql`
- Modify: `packages/core/src/modules/catalog/contracts.ts`, `packages/core/src/modules/catalog/repository.ts`, `packages/core/src/modules/catalog/admin.ts`, `packages/core/src/modules/catalog/service.ts`
- Modify: `packages/core/src/modules/orders/create.ts`, `packages/core/src/modules/orders/contracts.ts`
- Modify: `apps/web/src/components/product-card.tsx`, `apps/web/src/app/products/[slug]/page.tsx`, `apps/admin/src/components/admin-product-editor.tsx`
- Create: `packages/core/src/modules/catalog/availability.ts`
- Test: `tests/unit/catalog-availability.test.ts`, `tests/integration/catalog-availability.test.ts`

**Interfaces:**
- `type SkuAvailability = 'available' | 'sold_out'`
- `setSkuAvailability(id: string, availability: SkuAvailability, actor: AdminActor, key: string): Promise<void>`
- `assertSkuPurchasable(client: PoolClient, skuId: string): Promise<CatalogSkuSnapshot>`
- Public `ProductView.skus[]` adds `availability` and `isPurchasable`.

- [ ] **Step 1: Write unit tests for state rules**

Verify available → sold_out → available, reject unknown values, keep `status` independent from `availability`, and derive `isPurchasable` only when both product/SKU lifecycle status is `published` and availability is `available`.

- [ ] **Step 2: Write the migration**

Add `skus.availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available','sold_out'))` and an index that supports published/available catalog reads. The migration must be idempotent under the repository migration runner and must not rewrite order snapshots.

- [ ] **Step 3: Extend public and admin catalog contracts**

Return availability in public DTOs, show sold-out options without enabling purchase, and expose all lifecycle/availability values in the admin DTO. Keep existing price and product snapshot fields unchanged.

- [ ] **Step 4: Add transactional admin commands**

Implement availability updates with row locking, actor authorization, idempotency digest, and an audit event. Reject an update for a missing SKU or a SKU belonging to another product. Keep product publish/unpublish operations separate from sold-out operations.

- [ ] **Step 5: Enforce the order-side check**

In the order creation transaction, lock the selected SKU and require `status='published' AND availability='available'` before creating the order snapshot. Return a typed unavailable error without inserting an order when the check fails. A concurrent admin update and order resolve by database lock/commit order; after the sold-out update commits, later orders fail.

- [ ] **Step 6: Run migration and behavior tests**

Run:

```bash
pnpm db:migrate
pnpm test tests/unit/catalog-availability.test.ts tests/integration/catalog-availability.test.ts
pnpm typecheck
```

Expected: existing catalog/order tests remain green; public reads expose sold-out status; sold-out SKUs cannot create new orders; existing order snapshots remain unchanged.

- [ ] **Step 7: Commit the availability behavior**

```bash
git add db/migrations/010_catalog_availability.sql packages/core/src/modules/catalog packages/core/src/modules/orders apps/web/src/components apps/web/src/app/products apps/admin/src/components tests/unit/catalog-availability.test.ts tests/integration/catalog-availability.test.ts
git commit -m "feat: add sku availability management"
```

Rollback: stop availability writes and roll back application images. Leave the additive column in place; repair incorrect rows with a forward migration or an audited admin command.

### Task 5: Port and complete the admin product and order workbench

**Files:**
- Modify: `apps/admin/src/app/admin/page.tsx`, `apps/admin/src/app/admin/orders/page.tsx`, `apps/admin/src/app/admin/orders/[number]/page.tsx`, `apps/admin/src/app/admin/products/page.tsx`
- Modify: `apps/admin/src/components/admin-product-editor.tsx`, `apps/admin/src/components/admin-order-actions.tsx`, `apps/admin/src/components/admin-after-sales.tsx`, `apps/admin/src/components/admin-settings-editor.tsx`
- Create: `apps/admin/src/components/admin-availability-control.tsx`
- Modify: admin styles under `apps/admin/src/app/globals.css`
- Test: `tests/e2e/admin-service.spec.ts`

**Interfaces:**
- Product editor sends `{ skuId, availability, expectedVersion, idempotencyKey }` to the admin API.
- Order pages continue consuming the existing public order DTO plus admin-only action metadata; no raw database rows are rendered.

- [ ] **Step 1: Add UI tests for the operator workflow**

Cover admin login, order list/search, opening an order, changing a SKU to sold out, seeing the sold-out label, restoring availability, and receiving a conflict/error message without losing unsaved fields.

- [ ] **Step 2: Port existing admin pages to the admin app**

Keep current order status labels and manual fulfillment actions. Change relative fetch URLs to the admin service API and remove any dependency on public service navigation.

- [ ] **Step 3: Add explicit availability controls**

Show lifecycle status and availability as separate controls. A sold-out SKU remains listed with a visible label. The action must require the current version/idempotency key and refresh the row after success.

- [ ] **Step 4: Run the browser workflow**

Run:

```bash
pnpm exec playwright test tests/e2e/admin-service.spec.ts
```

Expected: the admin service can complete order viewing and SKU availability management while the public app remains reachable on its own port.

- [ ] **Step 5: Commit the admin workbench**

```bash
git add apps/admin/src tests/e2e/admin-service.spec.ts
git commit -m "feat: port order and catalog workbench to admin service"
```

### Task 6: Add local/production operations and rollback checks

**Files:**
- Modify: `compose.dev.yml`, `Dockerfile`, `README.md`, `docs/operations/production-handoff.md`
- Create: `Dockerfile.web`, `Dockerfile.admin`, `scripts/dev-admin.ts`, `scripts/healthcheck-service.ts`
- Modify: `.env.example`
- Test: `tests/unit/local-dev.test.ts`, `tests/integration/service-isolation.test.ts`

**Interfaces:**
- `pnpm dev:local` starts/checks web on 3000 using the existing safe launcher.
- `pnpm dev:admin` starts/checks admin on 3001 and refuses to kill unowned processes.
- `pnpm health:web` and `pnpm health:admin` check `/healthz`, `/readyz`, CSS and JS assets.

- [ ] **Step 1: Add local environment variables**

Document `WEB_ORIGIN`, `ADMIN_ORIGIN`, `ADMIN_SESSION_COOKIE`, and the shared `DATABASE_URL`. Keep secrets out of committed files; retain the existing local key generation behavior for development.

- [ ] **Step 2: Add the admin local launcher**

Mirror the ownership checks in `scripts/local-dev.ts`, use port 3001, write `var/admin-dev.log` and `var/admin-dev.pid`, and verify the admin HTML plus static assets before reporting success.

- [ ] **Step 3: Add compose and image entrypoints**

Expose web and admin as separate services with separate health checks and the same PostgreSQL dependency. Run migration as a one-shot job before either app is marked ready. Keep the worker as its own process.

- [ ] **Step 4: Document deployment order and rollback**

Document: backup/restore drill, additive migration, web deploy, admin deploy, health checks, admin DNS cutover, pausing admin writes, image rollback, and forward-only database repair. State that a database outage remains a shared failure domain.

- [ ] **Step 5: Verify process isolation**

Run:

```bash
pnpm dev:local
pnpm dev:admin
pnpm health:web
pnpm health:admin
pnpm test tests/unit/local-dev.test.ts tests/integration/service-isolation.test.ts
```

Expected: stopping admin leaves web checks green; stopping web leaves admin health/API checks green while PostgreSQL is available; unowned port occupants are never terminated.

- [ ] **Step 6: Commit the operations boundary**

```bash
git add compose.dev.yml Dockerfile Dockerfile.web Dockerfile.admin README.md docs/operations/production-handoff.md .env.example scripts tests/unit/local-dev.test.ts tests/integration/service-isolation.test.ts
git commit -m "ops: run web and admin as separate services"
```

### Task 7: Full regression, review, and handoff

**Files:**
- Modify: `.trellis/tasks/09-21-admin-service-isolation/check.jsonl`
- Modify: `.trellis/tasks/09-21-admin-service-isolation/implement.jsonl`
- Modify: `.trellis/tasks/09-21-admin-service-isolation/prd.md` only if acceptance wording needs evidence anchors
- Modify: `.trellis/spec/backend/**` or `.trellis/spec/frontend/**` only for conventions discovered during implementation

- [ ] **Step 1: Run the full local checks**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm build:admin
pnpm exec playwright test
```

- [ ] **Step 2: Run the migration restore check**

Apply all migrations to a disposable PostgreSQL database, seed it, start both services against it, and verify public catalog reads, admin availability changes, order creation rejection after sold out, and history preservation.

- [ ] **Step 3: Review the diff for isolation leaks**

Search for public imports of admin pages/API, admin cookie parsing in web routes, raw database rows in UI components, hard-coded sold-out state, and any destructive migration. Remove each leak before final review.

- [ ] **Step 4: Update the Trellis manifests**

Record the backend/frontend spec files and relevant research files in `implement.jsonl` and `check.jsonl`; do not leave `_example` seed rows.

- [ ] **Step 5: Record evidence and handoff**

Attach command results, service ports, migration version, and known shared-database failure boundary to the task journal. Only after all checks pass may the task be started/implemented through the approved execution workflow.

## Rollback Points

- Before Task 2: restore the existing single-app build and runtime.
- After Task 2: deploy the previous image if either service route allowlist or health check fails.
- After Task 4: stop availability writes and use forward repair; retain the additive column.
- After Task 6: revert service orchestration/image tags independently; keep database migrations applied.

## Final Acceptance

- Web and admin build, start, health-check, and roll back independently.
- Admin service failure does not interrupt public browsing or order creation while PostgreSQL is healthy.
- Admin can inspect orders and perform existing manual fulfillment actions.
- Admin can publish/unpublish and mark individual SKUs sold out or available.
- Public pages display sold-out SKUs and reject new orders after the state commit.
- Historical orders preserve their original product/price snapshot.
- Admin authentication, CSRF, idempotency, audit, migration, and rollback checks pass.
