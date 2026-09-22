# Production deployment design

## Topology

Create a separate Compose project named `chonghub` under `/opt/chonghub/releases/<release-tag>` on `second-growth-prod`.

- `chonghub-web`: the existing Dockerfile with `SERVICE=web`, internal port 3000.
- `chonghub-admin`: the existing Dockerfile with `SERVICE=admin`, internal port 3001.
- `chonghub-postgres`: a separate PostgreSQL 17 volume and database; no reference-project volume or network is reused.
- A shared private storage volume is mounted only where the current application needs it.
- The existing Caddy container receives a release-specific Caddyfile mount or an explicitly reviewed extension. It routes `chonghub.com` and `www.chonghub.com` to `chonghub-web:3000`, and `admin.chonghub.com` to `chonghub-admin:3001` through a shared external Docker network. The existing `second-growth` routes remain unchanged.

## Configuration and secrets

Keep non-secret values in `/opt/chonghub/compose.env` and secrets in `/opt/chonghub/secrets/` with restrictive permissions. Required production values include `DATABASE_URL`, `APP_ORIGIN=https://chonghub.com`, `ADMIN_ORIGIN=https://admin.chonghub.com`, `AUTH_HMAC_KEY`, `SETTINGS_ENCRYPTION_KEY`, SMTP settings, Feishu webhook settings if notifications are enabled, and `PRIVATE_STORAGE_DIR`.

Do not use `MAIL_TRANSPORT=local`, development passwords, or the local database URL. Bootstrap the admin from an ephemeral environment variable or protected shell session and never save the password in the release or task artifacts.

## Release and migration flow

1. Run local checks and build both services.
2. Create a release directory and deterministic source manifest; build `linux/amd64` images on the server.
3. Before the first migration, create a custom-format PostgreSQL dump and verify `pg_restore --list`.
4. Start the isolated PostgreSQL service, run `pnpm db:migrate` explicitly from the release image, then bootstrap the admin if needed.
5. Start web and admin, validate health/readiness, and then update Caddy routing and DNS records.
6. Verify normal HTTPS, public pages, anonymous admin access rejection (the current API returns 403), login, catalog reads, and an order creation path with manual fulfillment.

## Rollback

Keep the prior ChongHub image, release directory, Compose env backup, and database dump. For an application-only failure, restore the previous image and Caddyfile. For a migration failure, stop writes, restore only after verifying the backup and compatibility, and do not remove volumes or use `docker compose down -v`. Any schema change requiring destructive rollback is a deployment blocker.

## Trade-offs

- Two subdomains add two DNS records but keep origin checks and session cookies simple.
- A separate database costs disk/RAM but prevents reference-project data or migration state from being affected.
- Extending the existing Caddy container avoids competing for ports 80/443; it requires a reviewed Caddyfile update and a config validation before reload.
