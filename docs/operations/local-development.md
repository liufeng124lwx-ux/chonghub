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

## 商品日常运营

登录 `http://localhost:3001/admin/products`（生产环境使用 admin 专用域名）后：

- **上新**：填写商品名称、唯一 slug、商品说明、首个套餐和人民币价格。默认保存为草稿；确认内容无误后点击“发布商品”。也可以选择“创建并立即上架”，让商品和首个套餐一起进入公开目录。
- **调价**：在对应套餐行保存价格。订单会保留创建时的商品/价格快照，调价不会改写历史订单。
- **临时停售**：点击“标记售罄”。套餐仍展示在公开页，但不能创建新订单；恢复售卖即可重新接受订单。
- **下架或删除**：使用“归档商品”或“下架套餐”。系统不做物理删除，以免破坏历史订单关联；归档后可通过先上架套餐、再发布商品恢复。

商品状态分为草稿、已上架、已归档；套餐的上架状态和售罄状态独立维护。每次写入都有管理员鉴权、幂等操作标识和审计记录。
