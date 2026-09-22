# 生产交接清单

公开服务与后台服务分别运行在 web（3000）和 admin（3001）上，共享同一个 PostgreSQL；数据库故障会同时影响两个服务，服务进程可以独立回滚。

本地启动顺序：先执行 `docker compose -f compose.dev.yml up -d postgres mailpit`，再执行 `pnpm dev:local` 与 `pnpm dev:admin`。用 `pnpm health:web`、`pnpm health:admin` 验证 `/healthz`、`/readyz` 以及首页 CSS/JS 资源；`healthz` 本身不代表数据库可用。

首版只支持微信人工确认、人工收款和人工履约；没有在线支付、上游自动充值或多员工权限。

上线前必须完成：

- 配置 PostgreSQL、`AUTH_HMAC_KEY`（至少 32 字节）和独立的 `PRIVATE_STORAGE_DIR`；数据库不暴露公网。
- 配置已认证 SMTP，禁止生产使用 `MAIL_TRANSPORT=local`。
- 配置 HTTPS 飞书机器人 webhook（仅允许官方域名）及签名密钥，并单独运行 `pnpm worker`。
- 初始化并验证唯一管理员邮箱；确认正式服务条款、隐私说明、数据保留和客服二维码。
- 备份数据库并在独立测试库执行迁移恢复演练；不要对已有订单执行破坏性 down migration。

发布顺序：先执行数据库向前迁移并完成备份恢复演练，再发布 web，确认 web 健康后发布 admin。切换 admin DNS 前确认 admin 健康检查通过。回退时暂停后台写入（停止 admin 或撤销后台入口），停止 worker，再回滚对应应用镜像；数据库优先使用前向修复，恢复备份前核对恢复点之后的订单。不要执行破坏性 down migration。验证备份恢复时使用独立测试库并记录迁移版本、订单数量和关键商品快照。

## 交接时的部署排障

发布目录、镜像和 Compose 环境必须使用同一个 release tag。先运行 `config --quiet`，再运行显式迁移，最后用 `up -d --build --force-recreate web admin` 激活；只看到容器启动并不能证明数据库迁移或静态资源可用。生产主机为 x86_64，不能直接复用 Apple Silicon 本地构建的镜像。

域名问题按三层排查：Cloudflare DNS 记录和代理状态、Caddy 配置校验/reload、应用健康与页面资源。变更共享 Caddy 前保留配置备份，并在 reload 后复查参考项目健康接口。`/healthz` 返回 200 只证明进程存活，还要检查 `/readyz`、首页 CSS/JS 和后台 API 的认证边界。

管理员初始化由交接人通过 SSH 交互完成：密码用隐藏输入传给一次性 `bootstrap-admin.ts`，不写入脚本、历史或工单，完成后清除环境变量。若终端出现 `heredoc>`，说明 heredoc 未闭合；按 `Ctrl-C` 后改成登录远程 shell、分段执行，避免把半截命令继续粘贴到生产终端。

验收记录至少包含：release 路径和 manifest、迁移/备份结果、三个服务的容器健康、三个公网 `/healthz`、登录页静态资源、匿名后台 403、管理员登录验证、参考项目健康，以及 SMTP/飞书/自动发货当前是否启用。
