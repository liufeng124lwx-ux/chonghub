# Production Deployment Contract

## Scenario: Tencent Cloud production release

### 1. Scope / Trigger

- Trigger: Any production release or infrastructure change for the ChongHub web and admin services.
- Scope: Docker Compose, PostgreSQL, Caddy routing, Cloudflare DNS, and file-backed secrets.
- Isolation: ChongHub uses its own Compose project, database, named volume, release directory, and secret files. The shared Caddy process may be reloaded, but the `second-growth` application and database must remain healthy.

### 2. Signatures

- Release command: `docker compose --env-file /opt/chonghub/compose.env -f ops/deploy/compose.yml up -d --build --force-recreate web admin`
- Migration command: `docker compose --env-file /opt/chonghub/compose.env -f ops/deploy/compose.yml run --rm migrate`
- Service probes: `GET /healthz` on web (`:3000`) and admin (`:3001`); Caddy routes `chonghub.com` and `www.chonghub.com` to web and `admin.chonghub.com` to admin.
- Database backup: `pg_dump -Fc` before the first migration or any migration that changes schema.

### 3. Contracts

- Required release environment: `POSTGRES_USER`, `POSTGRES_DB`, `RELEASE_TAG`, `APP_ORIGIN`, `ADMIN_ORIGIN`, and `MAIL_TRANSPORT`.
- Required secret files under `/opt/chonghub/secrets` (mode `0400`): `postgres_password`, `database_url`, `auth_hmac_key`, and `settings_encryption_key`.
- Optional integration secret files are mounted as `*_FILE` variables and loaded by `ops/deploy/entrypoint.sh`; empty SMTP/Feishu files mean those integrations are not configured.
- Images must be tagged with the release identifier (`chonghub-web:$RELEASE_TAG`, `chonghub-admin:$RELEASE_TAG`) so rollback can select an earlier release without rebuilding source.

### 4. Validation & Error Matrix

| Condition | Required result | Action on failure |
|---|---|---|
| Compose config | `docker compose ... config --quiet` exits 0 | Fix env, paths, or YAML before build |
| Migration | `migrate` exits 0 | Restore the pre-migration dump before retrying a destructive fix |
| Container readiness | web/admin/PostgreSQL report `healthy` | Inspect logs; do not reload Caddy |
| Public routing | all three HTTPS `/healthz` probes return 200 | Validate Caddy and DNS; keep the prior route until fixed |
| Reference app | `https://review.secondgrowth.cn/healthz` returns 200 | Stop and investigate shared Caddy impact |
| Admin authentication | unauthenticated API returns 403 | Bootstrap credentials through an operator handoff; never print or commit a password |

### 5. Good/Base/Bad Cases

- Good: upload an immutable release directory, validate config, back up the database, migrate, build tagged images, recreate only ChongHub services, reload Caddy, and probe all routes.
- Base: rerun a no-op migration and recreate tagged web/admin containers while PostgreSQL remains healthy.
- Bad: use `latest`, reuse the reference database, expose secrets in shell output, or recreate the shared Caddy/`second-growth` containers.

### 6. Tests Required

- Local: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:web`, `pnpm build:admin`, Compose config validation, shell syntax validation, and `git diff --check`.
- Server: `docker compose ps` shows all required services healthy; container probes return the expected JSON; HTTPS probes for root, `www`, and `admin` return 200; the reference health probe remains 200.
- Post-deploy: verify the admin API is protected (403 without a session) and record whether operator credentials and SMTP/Feishu integrations were configured.

### 7. Wrong vs Correct

#### Wrong

```sh
docker compose up -d
```

This can reuse an untagged image, skip the intended release, and provide no migration or shared-Caddy safety boundary.

#### Correct

```sh
docker compose --env-file /opt/chonghub/compose.env \
  -f ops/deploy/compose.yml up -d --build --force-recreate web admin
```

Then run the health and reference-service probes before declaring the release complete.
