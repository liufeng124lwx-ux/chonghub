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
7. 在 Cloudflare 添加 `@`、`www`、`admin` 三条 proxied A 记录后，验证正常 TLS、页面、CSS/JS、后台匿名 401 和登录。

`RELEASE_TAG` 必须使用 release 目录名；Compose 会为 web、admin 和 migrate 镜像保留同名 tag，回退时按上一 release tag 切换。

## Secret 文件

需要创建 `postgres_password`、`database_url`、`auth_hmac_key`、`settings_encryption_key`、SMTP 和 Feishu webhook 对应文件。密码、HMAC key 和加密 key 不能写入 Git、Compose env、镜像或日志。生产禁止 `MAIL_TRANSPORT=local`。

## 回退

保留上一版 release、镜像、Compose env 备份和数据库 dump。应用故障先恢复上一版 Compose/Caddy 配置；迁移故障先停止写入并核对备份和兼容性。禁止 `docker compose down -v`，禁止删除 PostgreSQL 数据卷。
