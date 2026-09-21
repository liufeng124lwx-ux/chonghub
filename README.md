# chonghub
# ChongHub

ChongHub is a database-backed manual fulfillment storefront for digital services. The first milestone publishes three ChatGPT monthly recharge SKUs and explains the WeChat-assisted fulfillment flow.

## Local development

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` if needed.
2. Start PostgreSQL with `docker compose -f compose.dev.yml up -d postgres`.
3. Run `pnpm install`, `pnpm db:migrate`, and `pnpm db:seed`.
4. Start the site with `pnpm dev:local` and open `http://localhost:3000`.
5. Start the independent administrator service with `pnpm dev:admin` and open `http://localhost:3001/admin`. Its PID/log files are `var/admin-dev.pid` and `var/admin-dev.log`; use `dev:admin:status`, `dev:admin:check`, and `dev:admin:stop` to manage it.
6. Verify both services with `pnpm health:web` and `pnpm health:admin`. Build independently using `pnpm build:web` and `pnpm build:admin`. See [production handoff](docs/operations/production-handoff.md) for migration and rollback order.

## 首版业务入口

- `/`、`/products/:slug`：数据库商品展示；初始上架 Plus ¥145、Pro 5X ¥750、Pro 20X ¥1,350。
- `/requests/new`：游客或已登录用户提交需求。访客会获得 24 小时 HttpOnly 查单授权。
- `/requests/:number/screening`：在浏览器内完成 ChatGPT 会话状态初筛，原始 JSON 不会发往 API。
- `/guest/orders`、`/me`、`/orders/:number`、`/orders/:number/after-sales`：游客查单、邮箱登录后的个人中心、订单进度和售后申请/附件。
- `/admin`：单管理员工作台；用 `pnpm exec tsx scripts/bootstrap-admin.ts admin@example.com` 初始化管理员身份。商品价格、营业规则、客服入口和退款登记均在后台处理，历史订单保留快照。

首版没有在线支付或上游自动充值接口。通过初筛后，用户扫码添加微信「流风」确认报价、收款和人工交付。

## 邮件与通知

开发环境可设置 `MAIL_TRANSPORT=local`。worker 会优先投递到 SMTP/Mailpit；SMTP 不可用时写入 `var/mail` 本地接收器（仅开发使用）。生产必须配置已验证的 SMTP，并设置至少 32 字节的 `AUTH_HMAC_KEY`。

```bash
pnpm db:migrate
pnpm db:seed
pnpm worker
```

The public catalog reads from PostgreSQL on every request. If the database is unavailable, the site shows an error state rather than inventing fallback products.
