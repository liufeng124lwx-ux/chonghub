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

## Execution evidence (2026-09-24)

- Local gates passed: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (41 passed, 2 skipped), `pnpm build:web`, `pnpm build:admin`, Compose config validation with test-only secret files, shell syntax validation, and Caddy validation.
- Commits pushed to `origin/main`: `9314159` (SEO foundation/content cluster), `cd10d5f` (production public asset copy), and `684c94a` (Google Search Console verification meta). Worktree is clean.
- Final immutable release: `/opt/chonghub/releases/684c94a`; archive SHA256 `775d13b6f289f17abacc94cd0ea08e5488eda6a056d028c7259f0356c53cffb4` matched local and remote. Images `chonghub-web:684c94a` and `chonghub-admin:684c94a` were built on the x86_64 host and verified `amd64/linux`.
- Database backup and restore-list validation: `/opt/chonghub/backups/20260924-seo-684c94a/chonghub.dump` and `chonghub.dump.list`; explicit `migrate` completed successfully with log at `migrate.log`.
- Production web/admin/PostgreSQL containers report healthy with the final tag. Caddy was validated and reloaded through its API without recreating the shared Caddy container; the prior Caddyfile is retained as `.bak-9314159`. The reference `https://review.secondgrowth.cn/healthz` remains healthy.
- Live smoke checks passed: `robots.txt` 200 text/plain with the sitemap directive; `sitemap.xml` 200 application/xml and XML parses with only public URLs; public pages expose canonical/OG/JSON-LD; login is noindex without canonical; OG image is 200 PNG; `www` redirects 301 to the canonical host; admin unauthenticated API is 403. Googlebot and Google Inspection Tool user agents receive 200 for robots and sitemap.
- GSC ownership verification completed using the HTML meta-tag method. `https://chonghub.com/sitemap.xml` was submitted twice and both submissions returned the visible “已成功提交站点地图” confirmation on 2026-09-24. The sitemap table still temporarily shows “无法抓取 / 0”; GSC live URL inspection for the same sitemap completed and reports “网址可编入 Google 索引”, so the remaining state is Search Console sitemap-report processing rather than a confirmed public fetch failure.
