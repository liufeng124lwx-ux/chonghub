# Deployment implementation plan

## Local preparation

1. Add production Compose, Caddy routing, env template, and deployment runbook under `ops/deploy/` and `docs/deployment/`.
2. Make the Dockerfile produce reproducible web/admin amd64 images and confirm standalone asset paths.
3. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:web`, `pnpm build:admin`, and `git diff --check`.

## Server preparation

4. Read-only verify the reference stack, disk, Docker architecture, ports, Caddy network, and current release before changing anything.
5. Create `/opt/chonghub/{releases,secrets,backups}` and a unique release directory without touching `/opt/second-growth` data.
6. Upload the exact release files and verify the source manifest; build native `linux/amd64` images.
7. Create and verify a custom-format PostgreSQL backup before any migration.

## Activation

8. Start the isolated PostgreSQL service and run forward migrations.
9. Bootstrap the admin through a protected shell environment; verify login without recording credentials.
10. Start web/admin and verify health/readiness and database-backed catalog access.
11. Add Cloudflare DNS records for `@`, `www`, and `admin` to `43.156.46.92` with proxy enabled, then validate Caddy and normal TLS.
12. Verify public web, admin login, anonymous admin API rejection, static assets, manual order creation, and reference-project health.

## Rollback points

- Before migration: remove only the new stopped release if validation fails.
- After migration but before activation: preserve the backup and stop the new stack; do not delete volumes.
- After activation: switch Caddy/Compose back to the previous ChongHub release and record the failed release and health evidence.

## Required evidence

- Release path and source SHA256 manifest.
- Image architecture and tags.
- Database backup path and `pg_restore --list` result.
- Migration output and schema version.
- Container health, HTTPS status, admin boundary, and browser checks.
- Final URLs and rollback release.

## Recorded deployment evidence (2026-09-22)

- Release: `/opt/chonghub/releases/2bbbc7d`; source manifest SHA256 `c063a2cb618db28fac7e11968142a850cab2bf8f30e218d863f53b0f1de307ca`.
- Images: `chonghub-web:2bbbc7d` and `chonghub-admin:2bbbc7d`, built on the Tencent x86_64 host.
- Backup: `/opt/chonghub/backups/pre-migrate-initial/chonghub.dump`; custom-format dump and `pg_restore --list` validation passed.
- Runtime: `chonghub-web-1`, `chonghub-admin-1`, and `chonghub-postgres-1` are healthy. Web/admin container probes and HTTPS probes for `chonghub.com`, `www.chonghub.com`, and `admin.chonghub.com` return 200. `review.secondgrowth.cn/healthz` remains 200.
- Boundary: `admin.chonghub.com/api/admin/products` returns 403 without an admin session. Admin credentials remain an operator handoff; SMTP/Feishu files are placeholders and automatic delivery is not enabled.

### Admin root hotfix (2026-09-22)

- Root `/` returned 404 because the admin middleware excluded it and no root page existed. Release `2fe275a` permits the exact root path and redirects it to `/login`.
- Deployed only admin: `chonghub-admin:2fe275a`; web remains `chonghub-web:2bbbc7d`. Shared Compose `RELEASE_TAG` now points at `2fe275a`; a subsequent whole-stack release must build its web image before activating it.
- Public root follows to `/login` with HTTP 200; login CSS and two JS resources return 200; admin `/readyz` returns 200 and anonymous product API remains 403. Web and reference health remain 200; all three ChongHub containers are healthy.
- Local typecheck, lint, and admin production build passed. Trellis check found no hotfix correctness or authorization issues. Admin account initialization and authenticated workflow validation remain pending; the overall deployment task is still in progress.

### Storefront information hierarchy release (2026-09-22)

- Pushed commit `cc601cb` to `origin/main` and uploaded the immutable source archive to `/opt/chonghub/releases/cc601cb`.
- Release integrity: remote archive SHA256 `6fa079c716be1376a99eaea1e6594e311ba225213e6f59209fd1950084078a0a`; source manifest recorded at `/opt/chonghub/releases/cc601cb/source-manifest.sha256`.
- Images built natively on the Tencent x86_64 host and verified as `amd64/linux`: `chonghub-web:cc601cb`, `chonghub-admin:cc601cb`, and `chonghub-migrate:cc601cb`.
- Backup before migration: `/opt/chonghub/backups/20260922-storefront-cc601cb/chonghub.dump`; custom-format `pg_restore --list` validation passed using the running PostgreSQL image. The validated list is retained as `chonghub.dump.list`.
- Migration log: `/opt/chonghub/backups/20260922-storefront-cc601cb/migrate.log`; the explicit `migrate` service exited successfully.
- Activation recreated only `chonghub` PostgreSQL/web/admin services with `RELEASE_TAG=cc601cb`; all three containers report healthy. Container `/healthz` and `/readyz` probes returned the expected service JSON.
- Public checks passed: `https://chonghub.com/healthz`, `https://www.chonghub.com/healthz`, and `https://admin.chonghub.com/healthz` return 200; homepage, catalog, and product detail contain the new information hierarchy markers; all ten homepage CSS/JS assets return 200; anonymous admin product API returns 403; `https://review.secondgrowth.cn/healthz` remains ready.
- Existing Caddy/DNS routing was reused because all three domains were already healthy; no shared `second-growth` service or Caddy container was recreated.
- Rollback references remain available in `/opt/chonghub/releases` and the pre-release database backup. Admin credential bootstrap and authenticated admin workflow validation remain operator handoff items; SMTP/Feishu integrations and automatic delivery are unchanged.
