# Execution plan

1. Load the Trellis before-development context and inspect the final worktree/diff for scope and secrets.
2. Run local checks: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build:web`, `pnpm build:admin`, and deployment shell/Compose validation.
3. Inspect built robots/sitemap/static HTML for canonical, OG, JSON-LD, private noindex, and article route behavior.
4. Review and commit all intended SEO changes on `main`; record the commit SHA and release tag.
5. Follow `docs/deployment/tencent-cloud-production.md` and `.trellis/spec/backend/deployment.md` to upload, checksum, back up, migrate, build, recreate, reload, and probe production.
6. Run live smoke checks for canonical host, `www` redirect, robots, sitemap, public pages, private noindex, web/admin health, admin 403, and reference health.
7. In the existing GSC browser tab, complete ownership verification. If Cloudflare TXT is required, stop at the DNS record handoff and resume after the operator confirms propagation.
8. Submit `https://chonghub.com/sitemap.xml`; capture the visible GSC status and date.
9. Update the task/journal with evidence, archive the task, and report any remaining operator-dependent item.
