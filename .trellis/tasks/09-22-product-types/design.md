# 商品类型与差异化上架：技术设计

## 1. 模型

在 `products` 增加 `product_type`：`recharge | account`，默认 `recharge`，保证旧商品兼容。`categories` 继续作为平台维度，公开/后台 DTO 同时返回 `platform.slug` 与 `platform.name`。首版平台种子为 ChatGPT、Claude、Google，后台允许复用或创建平台分类。

充值服务保留现有 `screening_method='gpt_session'|'none'`，账号商品默认 `none`；后台创建表单根据商品类型设置默认值，但服务端仍校验并保存配置。交付方式继续为 `manual`。

## 2. 数据流

`products.product_type + categories` → catalog repository → `ProductView/AdminProductView` → 公开卡片/详情与后台编辑器。

订单创建继续锁定 SKU 并保存快照；快照增加 `productType` 与 `platform`，账号商品的 screening 为 `none`，不会进入 ChatGPT 初筛流程。充值商品现有行为保持不变。

## 3. UI 规则

后台创建商品先选商品类型和平台。充值商品显示账号检测/订阅保障配置，账号商品显示人工交付和账号商品售后说明；当前两者都不显示库存/自动发货承诺。

公开目录按平台和商品类型展示标签。详情页只在 `screening='gpt_session'` 时渲染 ChatGPT 授权检测；账号商品展示人工交付说明、规格和商品售后文本。

## 4. 迁移与兼容

新增 `013_product_types.sql`，只做 additive migration：`product_type text NOT NULL DEFAULT 'recharge' CHECK (...)`，现有商品全部归为充值服务；不修改历史订单。应用回退保留字段，不做 down migration。

## 5. 风险

账号商品目前无库存扣减和自动发货，管理员必须确认人工交付能力后上架。支付资质和自动交付资质完成后另开任务，届时增加库存/凭据安全、支付状态和自动发货状态，不在本任务中预留未验证的接口。
