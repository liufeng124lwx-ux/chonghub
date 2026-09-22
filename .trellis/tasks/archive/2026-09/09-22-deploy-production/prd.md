# 部署 ChongHub 到现有腾讯云服务器

## Goal

TBD.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
# Deploy ChongHub to the existing Tencent Cloud server

## Goal

Deploy the current ChongHub web and admin services to the same Tencent Cloud host that runs `scsy_fenxiao`, while keeping the two projects operationally isolated. The result must be a reproducible production deployment with database backup, forward migrations, HTTPS routing, health checks, and a documented rollback point.

## Confirmed facts

- The reference deployment entry is `/Users/lwx/Workspace/opc/scsy_fenxiao/docs/deployment/tencent-cloud-production.md`; only its deployment information is in scope for reference.
- The host alias is `second-growth-prod`, running Ubuntu `x86_64`, with Docker and an existing Caddy container on ports 80/443.
- The reference stack uses `/opt/second-growth`, a release directory, Compose, Caddy, a private secrets directory, and a PostgreSQL container. Its current app and database must not be replaced or share a data volume with ChongHub.
- ChongHub currently has two Next services: web on 3000 and admin on 3001, sharing PostgreSQL. The repository has a production-capable `Dockerfile`, but no production Compose or Caddy deployment files yet.
- ChongHub requires PostgreSQL migrations, `AUTH_HMAC_KEY`, a private storage directory, an administrator bootstrap, and production notification settings. The current business flow is manual WeChat confirmation, manual collection, and manual fulfillment; payment and automatic delivery are not part of this deployment.
- Current local verification before deployment: typecheck, lint, tests, web/admin builds, and local web/admin health checks pass.

## Requirements

1. Add a separate ChongHub production deployment definition, with isolated app containers, PostgreSQL storage, secrets, volumes, and Compose project name.
2. Route public web and admin traffic through the existing Caddy instance without changing the reference project's domains or containers.
3. Build native `linux/amd64` images on the server or otherwise verify the image architecture before activation.
4. Back up any existing ChongHub production database before migration; run migrations explicitly and retain the backup and release directory for rollback.
5. Configure production environment values without committing or printing secrets. Production must not use local mail transport or development credentials.
6. Bootstrap and verify the initial admin account through a controlled command; do not put the password in Git, logs, or task artifacts.
7. Verify container health/readiness, public HTTPS, admin authentication boundary, static assets, and database-backed catalog access after activation.
8. Document the exact release path, image tags, Compose commands, health checks, DNS assumptions, and rollback procedure.

## Acceptance criteria

- The reference `second-growth` containers remain healthy and their domains continue to pass their existing health checks.
- ChongHub web and admin containers are healthy on an isolated Compose network; PostgreSQL is not exposed publicly.
- The selected public web/admin HTTPS endpoints return expected health, page, CSS, and JS responses; unauthenticated admin API access is rejected.
- The production database migration completes from a backup and the catalog page reads real database data.
- The admin can log in and manage products; the public site can display products and create a manual-fulfillment order without enabling online payment or automatic delivery.
- A prior ChongHub release or image and database backup remain available, and the documented rollback does not delete data volumes.
- Deployment evidence includes release manifest/hash, image architecture, migration result, health results, and final URLs.

## Out of scope

- Replacing, upgrading, or inspecting non-deployment business code in `scsy_fenxiao`.
- Sharing the reference project's PostgreSQL database, Docker volumes, secrets, or application container.
- Payment gateway qualification, automatic fulfillment, supplier API integration, credential storage, inventory deduction, or employee roles.
- DNS registration or certificate issuance for a domain not supplied or authorized by the user.

## Domain decision for review

- Cloudflare zone `chonghub.com` is active under the user's account, but the DNS records page currently shows zero records.
- Recommended binding: `chonghub.com` and `www.chonghub.com` to the public web service, and `admin.chonghub.com` to the admin service. All three records point to `43.156.46.92` and remain proxied through Cloudflare. The origin Caddy server routes the hostnames to the internal web/admin containers.
- This keeps web and admin origins explicit for CSRF and cookie behavior. A single-domain `/admin` layout is not needed.
