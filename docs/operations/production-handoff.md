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
