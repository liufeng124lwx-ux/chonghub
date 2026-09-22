# 本地开发

## 启动

```bash
cp .env.example .env.local
docker compose -f compose.dev.yml up -d postgres
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

默认商品来自 PostgreSQL，不可用时页面显示错误状态，不会切换到内存演示数据。`MAIL_TRANSPORT=local` 会尝试投递到 Mailpit；SMTP 不可用时写入 `var/mail`，该目录已被忽略，不可用于生产。

管理员初始化：

```bash
ADMIN_USERNAME=ops ADMIN_PASSWORD='<至少 12 位密码>' ADMIN_EMAIL=ops@example.test \
  pnpm exec tsx scripts/bootstrap-admin.ts
```

`ADMIN_PASSWORD` 只用于初始化时生成 scrypt 哈希，不会写入数据库或日志。也可以将用户名、密码和邮箱作为脚本参数传入；生产环境请使用受控的环境变量或密钥管理器，不要把真实密码提交到仓库。

另开终端运行常驻的 `pnpm worker` 处理邮件和飞书 outbox；用 Ctrl-C 或 SIGTERM 停止。浏览器初筛页面只将有限枚举报告提交给服务器，原始会话 JSON 不进入网络请求。
