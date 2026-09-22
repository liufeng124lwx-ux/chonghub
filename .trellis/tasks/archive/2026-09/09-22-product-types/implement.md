# 商品类型与差异化上架实施计划

1. 新增 `products.product_type` additive migration 和平台种子，更新 catalog contracts/repository/admin create DTO。
2. 扩展公开与后台 ProductView，返回商品类型、平台名称和类型标签；保持旧 API 字段兼容。
3. 更新后台商品创建/编辑界面：选择充值服务或账号商品、平台；根据类型显示配置文案，禁止宣称自动发货或库存。
4. 更新公开商品列表、详情和 PurchaseFlow：账号商品不要求 ChatGPT session；充值商品保持原检测逻辑；订单创建快照增加类型/平台。
5. 更新订单后台/详情文案和运维说明，明确当前统一为人工交付。
6. 增加单元/集成/静态契约测试，覆盖旧商品默认 recharge、账号商品无检测、快照类型、公开页面标签和后台类型提交。

验证：`pnpm db:migrate`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build:web`、`pnpm build:admin`、`pnpm dev:local:check`、`pnpm dev:admin:check`。

回滚：优先回退 web/admin 应用；保留 `product_type` 字段和已写入数据，使用前向修复，不执行破坏性 down migration。
