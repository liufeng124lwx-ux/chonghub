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
