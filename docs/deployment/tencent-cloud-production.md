# ChongHub 腾讯云生产部署

本项目与 `scsy_fenxiao` 共用同一台服务器，但使用独立的 Compose 项目、PostgreSQL 数据卷、应用数据卷和 secret 文件。参考项目的部署资料只用于确认服务器、Caddy 和发布流程，不共享业务数据库或密钥。

## 入口

- `https://chonghub.com`、`https://www.chonghub.com`：用户端
- `https://admin.chonghub.com`：管理后台
- Cloudflare DNS：三个记录均指向 `43.156.46.92`，使用代理
- Caddy：把三个主机名分别转发到 `chonghub-web:3000` 和 `chonghub-admin:3001`

## 服务器目录

```text
/opt/chonghub/
  compose.env
  secrets/                 # root-only, one value per file
  releases/<release-tag>/ # uploaded source and ops/deploy/compose.yml
  backups/<timestamp>/
```

不要读取或打印 `/opt/second-growth/secrets/` 中的内容。不要在参考项目 release 目录内保存 ChongHub 文件。

## 发布顺序

1. 本地运行 typecheck、lint、test 和 web/admin production build。
2. 上传明确的 release 文件并生成 SHA256 manifest；服务器构建 `linux/amd64` 镜像。
3. 首次迁移前对 ChongHub PostgreSQL 执行 `pg_dump --format=custom`，并检查 `pg_restore --list`。
4. 运行 `docker compose -f ops/deploy/compose.yml --env-file /opt/chonghub/compose.env run --rm migrate`。
5. 运行 `docker compose ... up -d postgres web admin`，确认容器 healthcheck 和 `/readyz`。
6. 将 `ops/deploy/Caddyfile.chonghub` 合并到现有 Caddy 配置，先 `caddy validate`，再 reload；不得删除参考项目站点块。
7. 在 Cloudflare 添加 `@`、`www`、`admin` 三条 proxied A 记录后，验证正常 TLS、页面、CSS/JS、后台匿名访问被拒绝（当前 API 返回 403）和登录。

`RELEASE_TAG` 必须使用 release 目录名；Compose 会为 web、admin 和 migrate 镜像保留同名 tag，回退时按上一 release tag 切换。

## 发布上传与构建要点

每次发布都创建不可变目录，不要直接覆盖正在运行的 release。上传完成后在服务器核对 manifest，再从该目录执行 Compose 命令：

```bash
cd /opt/chonghub/releases/<release-tag>
sudo docker compose --env-file /opt/chonghub/compose.env \
  -f ops/deploy/compose.yml config --quiet
sudo docker compose --env-file /opt/chonghub/compose.env \
  -f ops/deploy/compose.yml up -d --build --force-recreate web admin
```

构建机是腾讯云的 x86_64 主机；不要把本地 arm64 镜像直接当作生产镜像。构建后检查 `docker compose ps` 和镜像 tag，确认运行中的 web/admin 都使用 `<release-tag>`。迁移单独执行并记录输出，不能用 `up` 隐式代替迁移。

## Caddy 与 Cloudflare 验证

修改共享 Caddy 配置前先复制备份，只追加 ChongHub 的三个站点块，不要删除或重建参考项目容器。按顺序执行：

1. 在 Caddy 容器内执行配置校验。
2. reload Caddy，确认参考项目的 `/healthz` 仍返回 200。
3. 在 Cloudflare 确认 `@`、`www`、`admin` 三条 A 记录均指向 origin，并保持代理状态。
4. 用带 `--resolve` 的 HTTPS 请求分别检查三个域名的 `/healthz`，再检查首页、CSS/JS 和后台登录页。

Cloudflare 记录显示存在并不代表源站路由正确；只有 HTTPS、Caddy 和应用三层都返回预期状态，才算绑定完成。

## 安全初始化管理员

管理员初始化应在操作者自己的受保护 SSH 终端中完成。先连接服务器，再逐行执行 `read -s` 读取密码，最后以临时环境变量运行 `bootstrap-admin.ts`；不要把密码写入命令行历史、release 文件、任务记录或聊天。初始化后立即执行 `unset ADMIN_PASSWORD`，并用登录页和一个需要会话的后台 API 验证登录。

如果通过本地 shell 的 heredoc 执行，终端出现 `heredoc>` 说明结束标记没有被完整粘贴，命令尚未运行。按 `Ctrl-C` 退出，改为先 `ssh -t second-growth-prod`，进入远程 shell 后分段粘贴命令。不要把 `heredoc>` 当作命令输入，也不要在密码尚未清除时共享终端输出。

## 分层验收

发布完成前按由内到外的顺序验收：Compose 配置 → PostgreSQL 与迁移 → web/admin 容器健康 → 容器内 `/healthz` 与 `/readyz` → Caddy 配置和 reload → 三个公网 HTTPS 域名 → 登录页静态资源 → 匿名后台 API 返回 403 → 管理员登录后的商品读取。最后再次检查参考项目健康状态，并记录人工履约、SMTP/飞书和自动发货是否仍处于未配置状态。

## Secret 文件

需要创建 `postgres_password`、`database_url`、`auth_hmac_key`、`settings_encryption_key`、SMTP 和 Feishu webhook 对应文件。密码、HMAC key 和加密 key 不能写入 Git、Compose env、镜像或日志。生产禁止 `MAIL_TRANSPORT=local`。

## 回退

保留上一版 release、镜像、Compose env 备份和数据库 dump。应用故障先恢复上一版 Compose/Caddy 配置；迁移故障先停止写入并核对备份和兼容性。禁止 `docker compose down -v`，禁止删除 PostgreSQL 数据卷。
